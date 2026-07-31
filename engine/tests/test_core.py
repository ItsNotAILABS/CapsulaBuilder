"""Production test suite for THESIS engine v0.3."""

from fastapi.testclient import TestClient

from thesis_forge import __version__
from thesis_forge.academy import grade_quest, list_quests
from thesis_forge.brand import PRODUCT
from thesis_forge.agents import propose_plans
from thesis_forge.api import app
from thesis_forge.codegen import generate_package, package_stats
from thesis_forge.compiler import compile_manifest
from thesis_forge.models import Action, BuildRequest, Category, Policy
from thesis_forge.network import get_network
from thesis_forge.pipeline import run_pipeline
from thesis_forge.policy import arbitrate, arena_report, evaluate
from thesis_forge.receipts import reset_chain, seal
from thesis_forge.workspace import list_projects, load_project


def request():
    return BuildRequest(
        name="Sovereign DeFi",
        objective="Coordinate Monad protocols under user-owned financial laws.",
        categories=list(Category),
    )


def test_network_constants():
    t = get_network("monad-testnet")
    m = get_network("monad-mainnet")
    assert t["chain_id"] == 10143
    assert m["chain_id"] == 143


def test_manifest_chain():
    m = compile_manifest(request())
    assert m.chain_id == 10143
    assert len(m.contracts) == 6
    assert "SovereignVault" in m.contracts
    assert m.deploy_plan["primary_submission_contract"] == "SovereignVault"


def test_codegen_package():
    m = compile_manifest(request())
    files = generate_package(m)
    stats = package_stats(files)
    assert stats["n_files"] >= 8
    assert "README.md" in files
    assert "docs/AGENT.md" in files
    assert "policy/lawbook.json" in files
    assert "src/config.ts" in files


def test_pipeline_full():
    reset_chain()
    out = run_pipeline(request(), persist=True)
    assert out["ok"]
    assert out["progress"]["complete"] >= 8
    assert out["file_stats"]["n_files"] >= 8
    assert out["arena"]["n_rejected"] >= 1
    assert out["workspace"]["ok"]
    loaded = load_project(out["project_id"])
    assert loaded and loaded.get("files")
    assert any(p["project_id"] == out["project_id"] for p in list_projects())


def test_agents_propose_and_arena():
    req = request()
    plans = propose_plans(req)
    assert len(plans) >= 3
    rep = arena_report(plans, req.policy)
    assert rep["n_rejected"] >= 1
    assert rep["n_accepted"] >= 1
    assert rep["reject_is_a_feature"] is True
    assert rep["doctrine"]
    assert rep["scoreboard"]
    assert rep["scoreboard"][0]["accepted"] is True
    assert len(rep["rules_applied"]) >= 6
    assert "slippage-limit" in rep["rules_applied"]


def test_policy_accepts_lawful_action():
    a = Action(
        agent="yield",
        category=Category.VAULT,
        protocol="beefy",
        action="deposit",
        value=100,
        slippage_bps=10,
        resulting_protocol_exposure_bps=1000,
        resulting_liquid_reserve_bps=4000,
        resulting_leverage_bps=10000,
        expected_gain_bps=500,
        risk_bps=80,
    )
    e = evaluate(a, Policy())
    assert e.accepted
    assert "ACCEPTED" in e.human_summary


def test_policy_rejects_multiple_violations():
    a = Action(
        agent="reckless",
        category=Category.PERPS,
        protocol="perpl",
        action="open",
        value=5000,
        slippage_bps=900,
        resulting_protocol_exposure_bps=9000,
        resulting_liquid_reserve_bps=100,
        resulting_leverage_bps=50000,
    )
    e = evaluate(a, Policy())
    assert not e.accepted
    assert len(e.violations) >= 4
    assert e.reasons


def test_arena_selects_best_lawful_plan():
    p = Policy()
    safe = Action(
        agent="safe",
        category=Category.LENDING,
        protocol="aave",
        action="supply",
        value=100,
        slippage_bps=5,
        resulting_protocol_exposure_bps=1000,
        resulting_liquid_reserve_bps=5000,
        resulting_leverage_bps=10000,
        expected_gain_bps=300,
        risk_bps=30,
    )
    best = Action(
        agent="balanced",
        category=Category.VAULT,
        protocol="beefy",
        action="deposit",
        value=100,
        slippage_bps=5,
        resulting_protocol_exposure_bps=1200,
        resulting_liquid_reserve_bps=4000,
        resulting_leverage_bps=10000,
        expected_gain_bps=500,
        risk_bps=80,
    )
    bad = Action(
        agent="bad",
        category=Category.PERPS,
        protocol="perpl",
        action="open",
        value=100,
        slippage_bps=5,
        resulting_protocol_exposure_bps=1200,
        resulting_liquid_reserve_bps=4000,
        resulting_leverage_bps=30000,
        expected_gain_bps=900,
        risk_bps=100,
    )
    _, winner = arbitrate([safe, best, bad], p)
    assert winner and winner[0].agent == "balanced"


def test_receipt_chain():
    reset_chain()
    r1 = seal("build", {"x": 1})
    r2 = seal("deploy", {"x": 2}, r1["receipt_hash"])
    assert r2["previous_hash"] == r1["receipt_hash"]


def test_academy():
    assert len(list_quests()) >= 4
    assert not grade_quest("slippage-trap", 0, understood=True)["passed"]
    assert grade_quest("slippage-trap", 1, understood=True)["passed"]


def test_trading_desk():
    from thesis_forge.trading import (
        TradeTicket,
        load_desk,
        paper_fill,
        propose_ticket,
        reset_desk,
        run_desk_arena,
    )

    desk = reset_desk()
    arena = run_desk_arena(desk)
    assert arena["n_rejected"] >= 1
    assert arena["n_accepted"] >= 1

    desk = load_desk()
    good = TradeTicket(
        agent="mm-bot",
        venue_id="kuru",
        pair="MON/USDC",
        side="buy",
        qty=10,
        limit_price=1.0,
        slippage_bps=20,
        leverage_bps=10000,
        rationale="unit test buy",
    )
    t = propose_ticket(desk, good)
    assert t.status == "risk_accepted", (t.violations, t.reasons)
    filled = paper_fill(desk, t.ticket_id)
    assert filled.status == "paper_filled"
    assert desk.cash_usdc < 10_000

    bad = TradeTicket(
        agent="degen",
        venue_id="perpl",
        pair="MON-PERP",
        side="buy",
        qty=1000,
        limit_price=1.0,
        slippage_bps=900,
        leverage_bps=50000,
        rationale="should reject",
    )
    t2 = propose_ticket(load_desk(), bad)
    assert t2.status == "risk_rejected"


def test_marks_strategies_vault_route():
    from thesis_forge.marks import live_marks, apply_marks_to_desk
    from thesis_forge.strategies import run_strategy
    from thesis_forge.trading import TradeTicket, load_desk, paper_fill, propose_ticket, reset_desk
    from thesis_forge.vault_route import simulate_vault_route

    feed = live_marks("monad-testnet")
    assert "MON/USDC" in feed["marks"]
    assert feed["marks"]["MON/USDC"] > 0

    desk = reset_desk()
    apply_marks_to_desk(desk, "monad-testnet")
    assert desk.marks.get("MON/USDC")

    mm = run_strategy("market-make", submit=True)
    assert mm["ok"] and mm["n"] >= 2

    desk = load_desk()
    t = propose_ticket(
        desk,
        TradeTicket(
            agent="route-test",
            venue_id="kuru",
            pair="MON/USDC",
            side="buy",
            qty=5,
            limit_price=1.0,
            slippage_bps=15,
            leverage_bps=10000,
            rationale="vault route test",
        ),
    )
    assert t.status == "risk_accepted"
    paper_fill(desk, t.ticket_id)
    route = simulate_vault_route(t.ticket_id)
    assert route["ok"] and route["would_execute"]
    assert route["calldata"]["function"].startswith("execute")


def test_daily_home_loop():
    from thesis_forge.daily import complete_mission, home

    h = home("monad-testnet")
    assert h["missions"]
    assert h["pitch"]["roommate"]
    r = complete_mission("checkin", payload={})
    assert r["ok"]
    r2 = complete_mission("gas-tip", payload={"acknowledged": True})
    assert r2["ok"]
    r3 = complete_mission("ecosystem-glance", payload={"viewed": True})
    assert r3["ok"]
    assert r3["home"]["xp"] > 0


def test_sandbox_ai_wallets():
    from thesis_forge.ai_node import ai_chat, ensure_ai_node, node_status
    from thesis_forge.sandbox import ensure_default_sandbox, mutate_twin, set_twin
    from thesis_forge.wallets import link_wallet, sync_twins_from_wallets

    sb = ensure_default_sandbox()
    set_twin(sb.sandbox_id, "MON", 10.0, twin_of="test:native", source_chain="eip155:10143")
    mutate_twin(sb.sandbox_id, "MON", -1.0, reason="unit")
    w = link_wallet(
        "phantom",
        "So11111111111111111111111111111111111111112",
        chain="solana",
        balances={"SOL": 3.5, "USDC": 100},
    )
    assert w.kind == "phantom"
    syn = sync_twins_from_wallets(sb.sandbox_id, link_id=w.link_id)
    assert syn["ok"]
    node = ensure_ai_node()
    assert node.sandbox_id
    st = node_status()
    assert st["capabilities"]["real_key_access"] is False
    chat = ai_chat("show balances and gas tip")
    assert "answer" in chat
    # reject secrets
    try:
        link_wallet("manual", "0xabc", meta={"private_key": "0xdead"})
        assert False, "should reject secrets"
    except ValueError:
        pass


def test_ecosystem_laws_runtime_embed():
    from thesis_forge.ecosystem_laws import (
        check_proposal_against_ecosystem,
        embed_ecosystem_laws,
        get_ecosystem_laws,
        laws_for_pillar,
    )

    book = embed_ecosystem_laws(force=True)
    assert book["law_count"] >= 15
    assert "system_self" in book["domains"]
    assert "monad_network" in book["domains"]
    assert "protocols" in book["domains"]
    assert laws_for_pillar("safety")
    # blob tx illegal on Monad
    ok, viol, _ = check_proposal_against_ecosystem({"tx_type": 3, "title": "blob"})
    assert not ok and "monad.tx-types" in viol
    # cached get
    assert get_ecosystem_laws()["law_count"] == book["law_count"]


def test_company_os_commercial():
    from thesis_forge.company import (
        act_on_mission,
        headquarters,
        morning_brief,
        performance,
        run_objective,
    )

    brief = morning_brief()
    assert "narrative" in brief and brief["bullets"]
    out = run_objective(
        "Grow my Monad position, keep 30% liquid, avoid leverage, and teach me what is happening."
    )
    assert out["ok"]
    assert out["sla_all_met"] is True
    m = out["mission"]
    assert m["reports"]
    depts = {r["department"] for r in m["reports"]}
    assert "SENSUS" in depts and "NOMOS" in depts and "AGORA" in depts
    # degen must be blocked among proposals
    assert any(not p["lawful"] for p in m["proposals"])
    if m["status"] == "awaiting_approval":
        dec = act_on_mission(m["mission_id"], "approve")
        assert dec["ok"]
    perf = performance()
    assert "kpis" in perf
    hq = headquarters()
    assert hq["pitch"]["roommate"]


def test_trading_desk_order_types_and_multi_asset():
    from thesis_forge.trading import (
        TradeTicket,
        list_venues,
        load_desk,
        paper_fill,
        propose_ticket,
        reset_desk,
    )

    desk = reset_desk()

    # market order fills against the live mark, not the submitted limit_price
    market = propose_ticket(
        desk,
        TradeTicket(
            agent="quant-bot",
            venue_id="alpaca-equities",
            pair="AAPL",
            side="buy",
            order_type="market",
            qty=1,
            limit_price=1.0,  # deliberately wrong — market orders ignore this
            slippage_bps=10,
            rationale="market order test",
        ),
    )
    assert market.status == "risk_accepted"
    filled = paper_fill(desk, market.ticket_id)
    assert filled.status == "paper_filled"
    assert filled.fill_price > 100  # AAPL mark, not the bogus $1 limit

    # stop order must not fill until the mark crosses stop_price
    desk = load_desk()
    stop = propose_ticket(
        desk,
        TradeTicket(
            agent="quant-bot",
            venue_id="alpaca-equities",
            pair="AAPL",
            side="buy",
            order_type="stop",
            qty=1,
            limit_price=desk.marks["AAPL"],
            stop_price=desk.marks["AAPL"] * 10,  # far above mark — should not trigger
            slippage_bps=10,
            rationale="stop order test",
        ),
    )
    assert stop.status == "risk_accepted"
    try:
        paper_fill(desk, stop.ticket_id)
        assert False, "stop should not have triggered"
    except ValueError as e:
        assert "stop-not-triggered" in str(e)

    # multi-asset venues are present alongside the Monad-native ones
    venues = list_venues()
    asset_classes = {v.get("asset_class") for v in venues}
    assert "equities" in asset_classes
    assert "forex" in asset_classes
    assert "crypto_cex" in asset_classes
    assert "crypto_dex" in asset_classes


def test_broker_readiness_and_live_gate():
    c = TestClient(app)

    brokers = c.get("/brokers").json()
    assert brokers["status"]["count"] >= 8
    by_class = brokers["status"]["by_asset_class"]
    assert "equities" in by_class and "forex" in by_class and "crypto_cex" in by_class
    assert all(b.get("posture") for b in brokers["brokers"])

    one = c.get("/brokers/alpaca_sandbox").json()
    assert one["asset_class"] == "equities"
    assert c.get("/brokers/does-not-exist").status_code == 404

    # live routes are always denied — paper/sandbox posture only
    denied = c.post("/brokers/execute")
    assert denied.status_code == 403
    assert denied.json()["detail"]["live_execution_enabled"] is False

    gate = c.get("/live-gate").json()
    assert gate["total"] >= 10
    assert gate["ready_for_live"] is False

    updated = c.post(
        "/live-gate/evidence",
        json={"key": "kill_switch_enabled", "satisfied": True, "note": "unit test"},
    ).json()
    assert updated["satisfied_count"] >= 1

    packet = c.post("/live-gate/approval-packet").json()
    assert packet["ready_for_live"] is False
    assert "kill_switch_enabled" not in packet["missing_evidence"]
    assert packet["live_execution_enabled"] is False

    denied2 = c.post("/live-gate/execute")
    assert denied2.status_code == 403


def test_agent_vaults_monad_tailored():
    c = TestClient(app)

    created = c.post("/vaults", json={"name": "Alpha Desk Vault", "network": "monad-testnet"}).json()
    assert created["chain_id"] == 10143
    assert created["wallets"]["MON"] == 100.0
    assert created["boundary"]["no_custody"] is True
    assert created["boundary"]["live_execution"] is False
    vault_id = created["vault_id"]

    fetched = c.get(f"/vaults/{vault_id}").json()
    assert fetched["vault_id"] == vault_id
    assert c.get("/vaults/does-not-exist").status_code == 404

    listed = c.get("/vaults").json()
    assert any(v["vault_id"] == vault_id for v in listed["vaults"])

    conn = c.post(f"/vaults/{vault_id}/connectors", json={"connector_id": "kuru"}).json()
    assert any(x["id"] == "kuru" for x in conn["connectors"])
    assert c.post(f"/vaults/{vault_id}/connectors", json={"connector_id": "not-a-real-venue"}).status_code == 400

    agents = c.post(f"/vaults/{vault_id}/agents", json={"agent_id": "mm-bot", "role": "market-maker"}).json()
    assert any(a["agent_id"] == "mm-bot" for a in agents["agents"])

    ok_transfer = c.post(
        f"/vaults/{vault_id}/ledger/transfer",
        json={"from_symbol": "MON", "to_symbol": "USDC", "amount": 10, "note": "rebalance"},
    ).json()
    assert ok_transfer["ledger_recent"][0]["accepted"] is True
    assert ok_transfer["wallets"]["MON"] == 90.0

    over_transfer = c.post(
        f"/vaults/{vault_id}/ledger/transfer",
        json={"from_symbol": "MON", "to_symbol": "USDC", "amount": 999_999, "note": "too much"},
    ).json()
    assert over_transfer["ledger_recent"][0]["accepted"] is False
    assert "insufficient-vault-balance" in over_transfer["ledger_recent"][0]["violations"]

    denied = c.post(f"/vaults/{vault_id}/live-execute")
    assert denied.status_code == 403
    assert denied.json()["detail"]["live_execution_enabled"] is False


def test_api_surface():
    c = TestClient(app)
    assert c.get("/health").json()["version"] == __version__
    assert c.get("/health").json().get("kind") == "platform"
    plat = c.get("/platform").json()
    assert plat.get("product") == PRODUCT
    assert plat.get("kernel", {}).get("primitives_total", 0) >= 10
    assert (plat.get("apps") or {}).get("first_party_count", 0) >= 10
    assert any(p.get("id") == "local_ai" for p in plat.get("primitives") or [])
    assert any(p.get("id") == "cloud" for p in plat.get("primitives") or [])
    assert any(a.get("id") == "app.cloud" for a in (plat.get("apps") or {}).get("first_party") or [])
    inv = c.post(
        "/platform/apps/app.desk/invoke",
        json={"action": "arena", "network": "monad-testnet"},
    ).json()
    assert inv.get("ok") and inv.get("law", {}).get("laws_consulted", 0) >= 1
    # cloud engines
    eng = c.get("/engines").json()
    assert eng.get("count", 0) >= 6
    law = c.post("/engines/law/run", json={"network": "monad-testnet", "params": {"op": "status"}}).json()
    assert law.get("ok") and law.get("result", {}).get("ok")
    sec = c.post(
        "/engines/security/run",
        json={"params": {"text": "exact approval and 7.5% gas margin"}},
    ).json()
    assert sec.get("ok")
    sys = c.get("/system").json()
    assert sys.get("laws", 0) >= 15 and sys.get("surfaces")
    run = c.post(
        "/system/run",
        json={
            "network": "monad-testnet",
            "query": "gas and vault",
            "run_company": True,
            "run_desk": True,
            "run_cloud": False,
            "run_vault_route": True,
        },
    ).json()
    assert run.get("ok") and run.get("steps")
    assert any(s.get("step") == "desk.arena" for s in run["steps"])
    # polyglot catalog always present
    pg = c.get("/polyglot").json()
    assert "julia" in pg and "node" in pg and "python" in pg
    py = c.post("/polyglot/run", json={"lang": "python", "cmd": "intel", "params": {}}).json()
    assert py.get("ok")
    uc = c.get("/use-cases").json()
    assert uc.get("count") == 20
    laws = c.get("/laws").json()
    assert laws.get("embedded") and laws.get("law_count", 0) >= 15
    land = c.get("/landing").json()
    assert land.get("ticker") and land.get("stream") and land.get("ai_brief")
    assert land.get("apps", {}).get("modules")
    assert land.get("platform") or True
    j = c.get("/judge").json()
    assert j["vaporware"] is False
    body = {
        "name": "API Vault",
        "objective": "Coordinate Monad portfolio under user-owned financial laws safely.",
        "categories": ["vault", "dex"],
        "network": "monad-testnet",
        "persist": True,
    }
    r = c.post("/pipeline", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["ok"]
    assert data["file_stats"]["n_files"] >= 8
    assert data["arena"]["n_rejected"] >= 1
    ar = c.post("/arena/auto", json=body)
    assert ar.status_code == 200
    assert ar.json()["n_rejected"] >= 1
    nom = c.get("/nomos").json()
    assert nom["department"] == "NOMOS" and nom["reject_is_a_feature"] is True
    nr = c.post("/nomos/run", json=body).json()
    assert nr["n_rejected"] >= 1
    g = c.post(
        "/academy/grade",
        json={"quest_id": "slippage-trap", "selected_action_index": 1, "understood": True},
    )
    assert g.json()["passed"] is True
    d = c.get("/desk").json()
    assert d["paper_mode"] is True
    hm = c.get("/home").json()
    assert hm["missions"]
    c.post("/home/mission", json={"mission_id": "checkin"})
    assert c.get("/intelligence/coach").json()["tips"]
    assert c.get("/ecosystem").json()["infra"]
    assert c.post("/gas/margin", json={"chain_id": 10143, "estimated_gas": 80000}).json()[
        "recommended_gas_limit"
    ]
    ar = c.post("/desk/arena").json()
    assert ar["n_rejected"] >= 1
    tk = c.post(
        "/desk/ticket",
        json={
            "agent": "api-bot",
            "venue_id": "kuru",
            "pair": "MON/USDC",
            "side": "buy",
            "qty": 5,
            "limit_price": 1.0,
            "slippage_bps": 15,
            "leverage_bps": 10000,
            "rationale": "api test",
        },
    ).json()
    assert tk["ticket"]["status"] in ("risk_accepted", "risk_rejected")
