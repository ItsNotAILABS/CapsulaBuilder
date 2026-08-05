"""THESIS Forge HTTP API — full workstation surface v0.3."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from . import __version__
from .academy import get_quest, grade_quest, list_quests
from .agents import propose_plans
from .atlas import all_protocols, get_protocol
from .codegen import generate_package, package_stats
from .compiler import compile_manifest, studio_scaffold_files
from .events import pipeline_stages
from .models import (
    AcademyGradeRequest,
    Action,
    ArenaRequest,
    BuildRequest,
    DeploymentRecord,
    Policy,
)
from .network import PILLARS, get_network
from .pipeline import run_pipeline
from .policy import arena_report, evaluate
from .receipts import recent, seal, tip
from .rpc_probe import probe_network
from .daily import complete_mission, home as daily_home, leaderboard_self
from .ecosystem import ecosystem_bundle
from .gas_intel import apply_gas_limit_margin, gas_coach, should_warn_overspend
from .intelligence import coach, quick_reject_demo
from .marks import apply_marks_to_desk, live_marks
from .strategies import list_strategies, run_strategy
from .trading import (
    TradeTicket,
    TradingLimits,
    desk_snapshot,
    load_desk,
    list_venues,
    paper_fill,
    propose_ticket,
    reset_desk,
    run_desk_arena,
    set_mark,
    update_limits,
    update_policy,
)
from .broker_readiness import broker_status, get_broker, list_brokers
from .live_gate import approval_packet, denial, gate_status, submit_evidence
from .agent_vault import (
    add_connector,
    create_vault,
    get_vault,
    ledger_transfer,
    list_vaults,
    register_agent,
)
from .portfolio import portfolio_snapshot
from .security_intelligence import (
    capability_matrix as security_capability_matrix,
    decide_approval,
    get_approval,
    get_career,
    get_use_case,
    list_approvals,
    list_careers,
    list_use_cases,
    search_capabilities,
    search_careers,
    search_use_cases,
    security_briefing,
)
from .ai_node import ai_chat, ensure_ai_node, node_status, promote_request
from .sandbox import (
    create_sandbox,
    ensure_default_sandbox,
    kill_sandbox,
    list_sandboxes,
    sandbox_snapshot,
)
from .vault_route import simulate_vault_route
from .wallets import (
    link_wallet,
    list_supported,
    registry_snapshot,
    sync_twins_from_wallets,
    unlink,
    update_balances,
)
from .workspace import list_projects, load_project, save_project
from .company import (
    act_on_mission,
    constitution_get,
    constitution_set,
    get_mission,
    headquarters,
    inbox,
    morning_brief,
    performance,
    run_objective,
)
from .ecosystem_laws import (
    embed_ecosystem_laws,
    get_ecosystem_laws,
    get_law,
    laws_for_pillar,
    runtime_status,
)
from .live_feed import landing_feed
from .competition import competition_pack, run_win_path, scorecard_live
from .platform import get_app, invoke_app, list_apps, platform_status
from .engines import engine_catalog, get_engine, list_engines, run_engine
from .engines.orchestrator import run_cloud_pipeline
from .unified import run_system, system_status
from .polyglot import polyglot_catalog, polyglot_mesh, run_polyglot
from .use_cases import use_case_by_id, use_cases_payload
from .nomos import nomos_payload, run_nomos_arena
from .tools import get_tool, mcp_tool_list, run_tool, tools_catalog
from .lawbook import lawbook_payload
from .terminal import exec_line, terminal_banner, terminal_history
from .reports import list_reports, resolve_report_file, write_full_report
from .signals import generate_signals, signal_to_ticket
from .auto_exec import auto_loop, auto_paper_from_signals, auto_strategy_run, intelligence_pulse
from .hybrid import hybrid_catalog, run_hybrid_node
from .brand import PRODUCT, PRODUCT_SHORT, TAGLINE, brand_payload
from .builder import builder_home, daily_ai_brief, run_morning, utilities_catalog, utility_now
from .delta_ai import agent_status, long_horizon_step
from .x_marketing import (
    draft_from_recent_actions,
    draft_post,
    list_queue,
    mark_posted,
    x_catalog,
)
from .edge_workers import edge_catalog, edge_run_local

app = FastAPI(
    title=f"{PRODUCT} API",
    description=(
        f"{PRODUCT} — AI-delivered Monad DeFi Company OS. "
        f"Daily briefs, seatbelt loops, signals, hybrid workers. Engine: THESIS. {TAGLINE}"
    ),
    version=__version__,
)

_origins = os.environ.get("THESIS_CORS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_ROOT = Path(__file__).resolve().parents[2]
_DEPLOY_PATH = _ROOT / "receipts" / "deployment.json"


def _load_deployment() -> dict[str, Any]:
    if _DEPLOY_PATH.exists():
        try:
            return json.loads(_DEPLOY_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {
        "schema": "thesis.deployment.v1",
        "status": "not_deployed",
        "hint": "Run ./scripts/deploy.sh testnet after funding a deployer.",
        "primary_submission_address": "",
        "network": "monad-testnet",
        "chainId": 10143,
    }


class PipelineRequest(BuildRequest):
    persist: bool = True


class ProposeRequest(BaseModel):
    request: BuildRequest
    policy: Policy | None = None


class JudgeBundle(BaseModel):
    repo: str = "https://github.com/ItsNotAILABS/Monad-Hackaton"
    hosted_url: str = ""
    demo_video_url: str = ""
    social_post_url: str = ""


# ── Core ──────────────────────────────────────────────────────────


class MissionComplete(BaseModel):
    mission_id: str
    acknowledged: bool = False
    viewed: bool = False
    passed: bool = False
    n_rejected: int | None = None
    selected_action_index: int | None = None
    understood: bool = False


class GasMarginIn(BaseModel):
    chain_id: int = 10143
    estimated_gas: int = Field(gt=0)
    gas_limit: int | None = None


class WalletLinkIn(BaseModel):
    kind: str = "metamask"
    address: str
    chain: str = "eip155:10143"
    label: str = ""
    balances: dict[str, float] = Field(default_factory=dict)


class WalletBalancesIn(BaseModel):
    balances: dict[str, float]


class AIChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    network: str = "monad-testnet"


class PromoteIn(BaseModel):
    symbol: str
    amount: float = Field(gt=0)


class SandboxCreateIn(BaseModel):
    name: str = "AI sandbox"
    mode: str = "agent"


class CompanyObjectiveIn(BaseModel):
    objective: str | None = None


class MissionActIn(BaseModel):
    decision: str  # approve | reject | simulate_again | revise
    note: str = ""


class ConstitutionIn(BaseModel):
    owner_label: str | None = None
    objective_default: str | None = None
    min_liquid_reserve_bps: int | None = None
    max_protocol_exposure_bps: int | None = None
    max_slippage_bps: int | None = None
    max_leverage_bps: int | None = None
    max_action_value: float | None = None
    allow_leverage: bool | None = None
    allow_perps: bool | None = None
    network: str | None = None


# ── Company OS (commercial headquarters) ─────────────────────────


@app.on_event("startup")
def _embed_laws_on_startup():
    """Embed ecosystem laws at process boot — same class of runtime as owner constitution."""
    try:
        embed_ecosystem_laws(force=True)
    except Exception:
        pass


@app.get("/")
def root():
    """Platform root — kernel status (not a pitch page)."""
    st = platform_status()
    st["cloud_engines"] = engine_catalog().get("engines")
    return st


# ── Cloud engines (server-side, used by hosted web app) ───────────


class EngineRunIn(BaseModel):
    network: str = "monad-testnet"
    params: dict[str, Any] = Field(default_factory=dict)


class CloudPipelineIn(BaseModel):
    network: str = "monad-testnet"
    address: str = ""
    query: str = ""
    estimated_gas: int = 80_000


class SystemRunIn(BaseModel):
    network: str = "monad-testnet"
    objective: str = ""
    query: str = ""
    address: str = ""
    estimated_gas: int = 80_000
    run_company: bool = True
    run_desk: bool = True
    run_cloud: bool = True
    run_vault_route: bool = True


@app.get("/system")
def system_get(network: str = Query("monad-testnet")):
    """Unified product status — all surfaces in one payload."""
    st = system_status(network)
    st["polyglot"] = polyglot_catalog()
    return st


# ── Polyglot intelligence (Julia · Node · Python · WASM relay) ────


class PolyglotRunIn(BaseModel):
    lang: str = "julia"
    cmd: str = "pulse"
    params: dict[str, Any] = Field(default_factory=dict)


class PolyglotMeshIn(BaseModel):
    equity: float = 10000
    vol: float = 0.02
    estimated_gas: int = 80_000
    series: list[float] | None = None
    agents: list[dict[str, Any]] | None = None


@app.get("/use-cases")
def use_cases_list():
    """20 product use cases mapped to Spark / platform asks."""
    return use_cases_payload()


@app.get("/use-cases/{uc_id}")
def use_cases_one(uc_id: int):
    u = use_case_by_id(uc_id)
    if not u:
        raise HTTPException(404, "use case not found")
    return u


@app.get("/nomos")
def nomos_get(network: str = Query("monad-testnet")):
    """NOMOS department: multi-agent propose + arena. REJECT is a feature."""
    return nomos_payload(network)


@app.post("/nomos/run")
def nomos_run(request: BuildRequest | None = None):
    """Propose agents + arbitrate under dual law stack (owner Policy + ecosystem)."""
    req = request or BuildRequest(
        name="NOMOS Arena",
        objective="Coordinate Monad portfolio under dual law stack; reject unlawful paths.",
        categories=["vault", "dex", "lending"],
        network="monad-testnet",
    )
    return run_nomos_arena(req)


class ToolRunIn(BaseModel):
    network: str = "monad-testnet"
    objective: str | None = None
    estimated_gas: int | None = None
    message: str | None = None
    command: str | None = None
    format: str | None = None
    run_cloud: bool = False
    run_company: bool = True
    run_desk: bool = True
    params: dict[str, Any] = Field(default_factory=dict)


@app.get("/lawbook")
def lawbook_get(network: str = Query("monad-testnet")):
    """Dual law stack: on-chain LawBook seed ↔ runtime ecosystem laws."""
    return lawbook_payload(network)


class TerminalExecIn(BaseModel):
    command: str = Field(..., min_length=1, max_length=2000)
    network: str = "monad-testnet"


class ReportFullIn(BaseModel):
    network: str = "monad-testnet"
    format: str = "both"  # pdf | md | both


@app.get("/terminal")
def terminal_get(network: str = Query("monad-testnet")):
    """Sovereign embedded web terminal — THESIS commands only (no OS shell)."""
    return terminal_banner(network)


@app.get("/terminal/history")
def terminal_hist(limit: int = Query(40, ge=1, le=200)):
    return {"history": terminal_history(limit)}


@app.post("/terminal/exec")
def terminal_exec(body: TerminalExecIn):
    """Run one sovereign terminal command (vault, brief, ecosystem, report, …)."""
    return exec_line(body.command, network=body.network)


@app.get("/reports")
def reports_list():
    """List generated full reports (markdown + PDF)."""
    return list_reports()


@app.post("/reports/full")
def reports_full(body: ReportFullIn | None = None):
    """Generate FULL platform report (daily brief, vault, laws, desk, scorecard…)."""
    b = body or ReportFullIn()
    fmt = b.format if b.format in ("pdf", "md", "both", "markdown") else "both"
    if fmt == "markdown":
        fmt = "md"
    return write_full_report(b.network, fmt=fmt)


@app.get("/reports/download/{filename}")
def reports_download(filename: str):
    """Download a generated report file (PDF or markdown)."""
    path = resolve_report_file(filename)
    if not path:
        raise HTTPException(404, "report not found")
    media = "application/pdf" if path.suffix == ".pdf" else "text/markdown"
    return FileResponse(path, filename=path.name, media_type=media)


class AutoLoopIn(BaseModel):
    network: str = "monad-testnet"
    include_arena: bool = True
    include_signals: bool = True
    include_strategy: bool = True
    strategy_id: str = "market-make"
    max_fills: int = 3


@app.get("/signals")
def signals_get(network: str = Query("monad-testnet"), n: int = Query(8, ge=3, le=20)):
    """Winner-class alpha signal board (Gorillionaire/KiSignal pattern + THESIS brakes)."""
    return generate_signals(network, n=n)


@app.post("/signals/{signal_id}/ticket")
def signals_ticket(signal_id: str, network: str = Query("monad-testnet")):
    """Convert a signal into a risk-gated desk ticket."""
    out = signal_to_ticket(signal_id, network)
    if not out.get("ok"):
        raise HTTPException(400, out.get("error") or "ticket failed")
    return out


@app.get("/intelligence/pulse")
def intelligence_pulse_api(network: str = Query("monad-testnet")):
    """Coach + signals + reject intelligence in one pulse."""
    return intelligence_pulse(network)


@app.post("/auto/loop")
def auto_loop_api(body: AutoLoopIn | None = None):
    """Auto paper-execution loop: arena + signals + strategy fills (no chain broadcast)."""
    b = body or AutoLoopIn()
    return auto_loop(
        b.network,
        include_arena=b.include_arena,
        include_signals=b.include_signals,
        include_strategy=b.include_strategy,
        strategy_id=b.strategy_id,
    )


@app.post("/auto/signals")
def auto_signals_api(body: AutoLoopIn | None = None):
    """Auto-fill paper tickets from high-score lawful signals."""
    b = body or AutoLoopIn()
    return auto_paper_from_signals(b.network, max_fills=b.max_fills)


@app.post("/auto/strategy/{strategy_id}")
def auto_strategy_api(strategy_id: str, auto_fill: bool = Query(True)):
    """Run strategy and auto paper-fill accepted tickets."""
    return auto_strategy_run(strategy_id, auto_fill=auto_fill)


class HybridRunIn(BaseModel):
    op: str = "pulse"
    network: str = "monad-testnet"
    params: dict[str, Any] = Field(default_factory=dict)


@app.get("/hybrid")
def hybrid_get():
    """Novel tech: blockchain + Web Worker / Node worker_threads hybrid catalog."""
    return hybrid_catalog()


@app.get("/brand")
def brand_get():
    """Product brand: MonadBuilder HQ (name collisions documented)."""
    return brand_payload()


@app.get("/builder")
def builder_get(network: str = Query("monad-testnet")):
    """MonadBuilder HQ home — easy start, AI brief, utilities."""
    return builder_home(network)


@app.get("/builder/now")
def builder_now(network: str = Query("monad-testnet")):
    """Right-away utility pack — brief + signals + reject peek + one-tap map."""
    return utility_now(network)


@app.get("/builder/brief")
def builder_brief(network: str = Query("monad-testnet")):
    """AI-delivered daily brief — text only (no robot TTS)."""
    return daily_ai_brief(network)


@app.get("/builder/utilities")
def builder_utilities():
    """Winning easy utilities (one tap / one AI phrase)."""
    return utilities_catalog()


class BuilderMorningIn(BaseModel):
    network: str = "monad-testnet"
    auto_reject: bool = True
    auto_signals: bool = True


@app.post("/builder/morning")
def builder_morning(body: BuilderMorningIn | None = None):
    """One-tap AI morning: check-in + gas + REJECT + optional paper signal."""
    b = body or BuilderMorningIn()
    return run_morning(b.network, auto_reject=b.auto_reject, auto_signals=b.auto_signals)


@app.post("/hybrid/run")
def hybrid_run(body: HybridRunIn | None = None):
    """Run Node worker_threads hybrid op (arena/agents/pulse/bench). Browser workers run in HQ."""
    b = body or HybridRunIn()
    return run_hybrid_node(b.op, b.params or {"network": b.network})


class AgentStepIn(BaseModel):
    goal: str = ""
    network: str = "monad-testnet"
    note: str = ""
    stt: str = ""
    execute: bool = True
    max_hops: int = 4


@app.get("/agent")
def agent_get():
    """Long-horizon agent status: skills, delta attention, memory."""
    return agent_status()


@app.post("/agent/step")
def agent_step(body: AgentStepIn | None = None):
    """Long-horizon step: multi-sense → delta attention → fast decode → tools → self-evolve."""
    b = body or AgentStepIn()
    return long_horizon_step(
        b.goal,
        network=b.network,
        note=b.note,
        stt=b.stt,
        execute=b.execute,
        max_hops=b.max_hops,
    )


class XDraftIn(BaseModel):
    action: str = "ops"
    text: str = ""
    network: str = "monad-testnet"
    detail: dict[str, Any] = Field(default_factory=dict)


@app.get("/x")
def x_get():
    """X marketing catalog — AI drafts ecosystem posts from real user actions."""
    return x_catalog()


@app.get("/x/queue")
def x_queue(limit: int = Query(20, ge=1, le=100)):
    return list_queue(limit)


@app.post("/x/draft")
def x_draft(body: XDraftIn | None = None):
    """Draft + queue an X post (owner posts via intent URL)."""
    b = body or XDraftIn()
    return draft_post(b.action, b.detail, custom_text=b.text, network=b.network)


@app.post("/x/from-actions")
def x_from_actions(network: str = Query("monad-testnet")):
    """Auto-draft marketing post from live rejects / streak / morning."""
    return draft_from_recent_actions(network=network)


class XMarkIn(BaseModel):
    draft_id: str


@app.post("/x/mark-posted")
def x_mark(body: XMarkIn):
    out = mark_posted(body.draft_id)
    if not out.get("ok"):
        raise HTTPException(404, out.get("error") or "not found")
    return out


class EdgeRunIn(BaseModel):
    agent: str = "seatbelt"
    action: str = "brief"
    network: str = "monad-testnet"
    goal: str = ""
    note: str = ""
    stt: str = ""
    message: str = ""
    execute: bool = True


@app.get("/edge")
def edge_get():
    """Cloudflare Workers edge AI agents catalog (+ local simulator)."""
    return edge_catalog()


@app.post("/edge/run")
def edge_run(body: EdgeRunIn | None = None):
    """Local edge simulator — same agent routing as CF Workers without deploy."""
    b = body or EdgeRunIn()
    return edge_run_local(
        b.agent,
        b.action,
        network=b.network,
        goal=b.goal or b.message,
        note=b.note,
        stt=b.stt,
        execute=b.execute,
    )


@app.get("/tools")
def tools_list():
    """Focused shippable tools — human UI + any AI (MCP mirror)."""
    return tools_catalog()


@app.get("/tools/mcp")
def tools_mcp_manifest():
    """MCP tools/list payload for external AI clients."""
    return {
        "schema": "thesis.mcp.tools.v1",
        "server": "thesis-platform",
        "entry": "python -m thesis_forge.mcp_server",
        "tools": mcp_tool_list(),
        "http": "POST /tools/{id}/run",
    }


@app.get("/tools/{tool_id}")
def tools_one(tool_id: str):
    t = get_tool(tool_id)
    if not t:
        raise HTTPException(404, f"tool {tool_id} not found")
    return t


@app.post("/tools/{tool_id}/run")
def tools_run(tool_id: str, body: ToolRunIn | None = None):
    """Run one focused tool; returns proof + receipt."""
    b = body or ToolRunIn()
    params = dict(b.params or {})
    params.setdefault("network", b.network)
    if b.objective is not None:
        params["objective"] = b.objective
    if b.estimated_gas is not None:
        params["estimated_gas"] = b.estimated_gas
    if b.message is not None:
        params["message"] = b.message
    if b.command is not None:
        params["command"] = b.command
    if b.format is not None:
        params["format"] = b.format
    params.setdefault("run_cloud", b.run_cloud)
    params.setdefault("run_company", b.run_company)
    params.setdefault("run_desk", b.run_desk)
    out = run_tool(tool_id, params)
    if out.get("error") and out.get("error", "").startswith("unknown"):
        raise HTTPException(404, out["error"])
    return out


@app.get("/polyglot")
def polyglot_get():
    """Catalog of embedded polyglot runtimes."""
    return polyglot_catalog()


@app.post("/polyglot/run")
def polyglot_run_api(body: PolyglotRunIn | None = None):
    b = body or PolyglotRunIn()
    return run_polyglot(b.lang, b.cmd, b.params)


@app.post("/polyglot/mesh")
def polyglot_mesh_api(body: PolyglotMeshIn | None = None):
    """Run Julia + Node + Python intelligence mesh together."""
    b = body or PolyglotMeshIn()
    params: dict[str, Any] = {
        "equity": b.equity,
        "vol": b.vol,
        "estimated_gas": b.estimated_gas,
    }
    if b.series is not None:
        params["series"] = b.series
    if b.agents is not None:
        params["agents"] = b.agents
    return polyglot_mesh(params)


@app.post("/system/run")
def system_run(body: SystemRunIn | None = None):
    """One-click: laws + cloud pipeline + desk + vault sim + company OS."""
    b = body or SystemRunIn()
    return run_system(
        b.network,
        objective=b.objective,
        query=b.query,
        address=b.address,
        estimated_gas=b.estimated_gas,
        run_company=b.run_company,
        run_desk=b.run_desk,
        run_cloud=b.run_cloud,
        run_vault_route=b.run_vault_route,
    )


@app.get("/engines")
def engines_list(network: str = Query("monad-testnet")):
    """Catalog of real cloud engines (API host + Monad RPC)."""
    return engine_catalog(network)


@app.get("/engines/{engine_id}")
def engines_one(engine_id: str):
    eng = get_engine(engine_id)
    if not eng:
        raise HTTPException(404, f"engine {engine_id} not found")
    return eng.meta()


@app.post("/engines/{engine_id}/run")
def engines_run(engine_id: str, body: EngineRunIn | None = None):
    """Run a cloud engine with params (never send private keys)."""
    b = body or EngineRunIn()
    params = dict(b.params or {})
    params.setdefault("network", b.network)
    # hard reject secret fields
    for bad in ("private_key", "seed", "mnemonic", "secret", "privkey"):
        if bad in params:
            raise HTTPException(400, "refusing secret material — public params only")
    out = run_engine(engine_id, params)
    if out.get("error", "").startswith("unknown engine"):
        raise HTTPException(404, out["error"])
    return out


@app.post("/engines/pipeline")
def engines_pipeline(body: CloudPipelineIn | None = None):
    """Multi-engine cloud pipeline: chain + gas + law + index (+ research) + docs."""
    b = body or CloudPipelineIn()
    return run_cloud_pipeline(
        b.network,
        address=b.address,
        query=b.query,
        estimated_gas=b.estimated_gas,
    )


@app.get("/engines/docs/download/{filename}")
def engines_docs_download(filename: str):
    """Download a cloud-generated markdown report."""
    from fastapi.responses import FileResponse

    safe = Path(filename).name
    if not safe.endswith(".md") or ".." in filename:
        raise HTTPException(400, "invalid filename")
    path = _ROOT / "receipts" / "cloud_docs" / safe
    if not path.exists():
        raise HTTPException(404, "doc not found — run docs engine first")
    return FileResponse(path, filename=safe, media_type="text/markdown")


@app.get("/platform")
def platform(network: str = Query("monad-testnet")):
    """Platform kernel: primitives + app registry + pulse."""
    return platform_status(network)


@app.get("/platform/apps")
def platform_apps(forged: bool = Query(True)):
    apps = list_apps(include_forged=forged)
    return {"schema": "thesis.platform.apps.v1", "count": len(apps), "apps": apps}


@app.get("/platform/apps/{app_id}")
def platform_app_one(app_id: str):
    app = get_app(app_id)
    if not app:
        raise HTTPException(404, f"app {app_id} not found")
    return app


class PlatformInvokeIn(BaseModel):
    action: str = "status"
    network: str = "monad-testnet"
    params: dict[str, Any] = Field(default_factory=dict)


@app.post("/platform/apps/{app_id}/invoke")
def platform_app_invoke(app_id: str, body: PlatformInvokeIn | None = None):
    """Invoke a platform app action under the shared lawbook."""
    b = body or PlatformInvokeIn()
    out = invoke_app(app_id, b.action, network=b.network, params=b.params)
    if not out.get("ok") and out.get("error", "").startswith("unknown"):
        raise HTTPException(404, out.get("error"))
    return out


@app.get("/platform/primitives")
def platform_primitives(network: str = Query("monad-testnet")):
    st = platform_status(network)
    return {
        "schema": "thesis.platform.primitives.v1",
        "primitives": st.get("primitives"),
        "kernel": st.get("kernel"),
    }


@app.get("/landing")
def landing(network: str = Query("monad-testnet")):
    """Platform shell feed — market + apps + laws (poll every few seconds)."""
    return landing_feed(network)


@app.get("/laws")
def laws_status():
    """Runtime-embedded ecosystem lawbook status."""
    return runtime_status()


@app.get("/laws/full")
def laws_full():
    return get_ecosystem_laws()


@app.get("/laws/pillar/{pillar}")
def laws_pillar(pillar: str):
    return {"pillar": pillar, "laws": laws_for_pillar(pillar)}


@app.get("/laws/{law_id}")
def laws_one(law_id: str):
    law = get_law(law_id)
    if not law:
        raise HTTPException(404, "law not found")
    return law


@app.post("/laws/reembed")
def laws_reembed():
    book = embed_ecosystem_laws(force=True)
    return {
        "ok": True,
        "law_count": book.get("law_count"),
        "embedded_at": book.get("embedded_at"),
        "domains": list((book.get("domains") or {}).keys()),
    }


@app.get("/company")
def company_hq():
    """Full headquarters payload: brief, inbox, performance, constitution, pitch."""
    return headquarters()


@app.get("/company/brief")
def company_brief():
    return morning_brief()


@app.get("/company/inbox")
def company_inbox():
    return inbox()


@app.get("/company/performance")
def company_performance():
    return performance()


@app.get("/company/constitution")
def company_constitution_get():
    return constitution_get()


@app.post("/company/constitution")
def company_constitution_set(body: ConstitutionIn):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    return constitution_set(data)


@app.post("/company/run")
def company_run(body: CompanyObjectiveIn | None = None):
    """THESIS GM staffs all departments for an objective → mission room."""
    obj = body.objective if body else None
    return run_objective(obj)


@app.get("/company/missions/{mission_id}")
def company_mission(mission_id: str):
    out = get_mission(mission_id)
    if out.get("error"):
        raise HTTPException(404, out["error"])
    return out


@app.post("/company/missions/{mission_id}/act")
def company_mission_act(mission_id: str, body: MissionActIn):
    out = act_on_mission(mission_id, body.decision, body.note)
    if not out.get("ok") and out.get("error"):
        raise HTTPException(400, out["error"])
    return out


@app.get("/home")
def home_daily(network: str = Query("monad-testnet")):
    """Daily habit home — missions, streak, XP, gas coach, ecosystem."""
    return daily_home(network)


@app.post("/home/mission")
def home_mission(body: MissionComplete):
    payload = {
        "acknowledged": body.acknowledged,
        "viewed": body.viewed,
        "passed": body.passed,
        "understood": body.understood,
    }
    if body.n_rejected is not None:
        payload["n_rejected"] = body.n_rejected
    if body.selected_action_index is not None:
        payload["selected_action_index"] = body.selected_action_index
    out = complete_mission(body.mission_id, payload=payload)
    if not out.get("ok") and not out.get("already"):
        raise HTTPException(400, out.get("error", "mission failed"))
    return out


@app.get("/home/me")
def home_me():
    return leaderboard_self()


@app.get("/intelligence/coach")
def intel_coach(network: str = Query("monad-testnet")):
    return coach(network)


@app.post("/intelligence/reject-demo")
def intel_reject():
    return quick_reject_demo()


@app.get("/ecosystem")
def ecosystem(network: str = Query("monad-testnet")):
    return ecosystem_bundle(network)


@app.get("/gas/coach")
def gas_coach_api():
    return gas_coach()


@app.post("/gas/margin")
def gas_margin(body: GasMarginIn):
    rec = apply_gas_limit_margin(body.chain_id, body.estimated_gas)
    warn = False
    if body.gas_limit is not None:
        warn = should_warn_overspend(body.chain_id, body.gas_limit, rec["recommended_gas_limit"])
    return {**rec, "warn_overspend": warn}


# ── Sandbox · Wallets · AI node ───────────────────────────────────


@app.get("/sandbox")
def sandbox_get(sandbox_id: str | None = None):
    return sandbox_snapshot(sandbox_id)


@app.get("/sandbox/list")
def sandbox_list():
    return {"sandboxes": list_sandboxes()}


@app.post("/sandbox/create")
def sandbox_create(body: SandboxCreateIn):
    from .sandbox import SandboxMode

    mode = SandboxMode(body.mode) if body.mode in SandboxMode._value2member_map_ else SandboxMode.AGENT
    sb = create_sandbox(body.name, mode)
    return sandbox_snapshot(sb.sandbox_id)


@app.post("/sandbox/{sandbox_id}/kill")
def sandbox_kill(sandbox_id: str):
    try:
        sb = kill_sandbox(sandbox_id)
    except KeyError:
        raise HTTPException(404, "sandbox not found") from None
    return {"ok": True, "sandbox": sb.model_dump(mode="json")}


@app.get("/wallets")
def wallets_get():
    return registry_snapshot()


@app.get("/wallets/supported")
def wallets_supported():
    return {"wallets": list_supported()}


@app.post("/wallets/link")
def wallets_link(body: WalletLinkIn):
    try:
        w = link_wallet(
            body.kind,  # type: ignore[arg-type]
            body.address,
            chain=body.chain,
            label=body.label,
            balances=body.balances,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return {"wallet": w.model_dump(mode="json"), "registry": registry_snapshot()}


@app.post("/wallets/{link_id}/balances")
def wallets_balances(link_id: str, body: WalletBalancesIn):
    try:
        w = update_balances(link_id, body.balances)
    except KeyError:
        raise HTTPException(404, "wallet not found") from None
    return {"wallet": w.model_dump(mode="json")}


@app.delete("/wallets/{link_id}")
def wallets_unlink(link_id: str):
    unlink(link_id)
    return registry_snapshot()


@app.post("/wallets/sync-twins")
def wallets_sync_twins(sandbox_id: str | None = None, link_id: str | None = None):
    out = sync_twins_from_wallets(sandbox_id, link_id=link_id)
    if not out.get("ok"):
        raise HTTPException(400, out.get("error", "sync failed"))
    return out


@app.get("/ai")
def ai_status():
    return node_status()


@app.post("/ai/chat")
def ai_chat_api(body: AIChatIn):
    return ai_chat(body.message, network=body.network)


@app.post("/ai/promote")
def ai_promote(body: PromoteIn):
    out = promote_request(body.symbol, body.amount)
    if not out.get("ok"):
        raise HTTPException(400, out.get("error", "promote failed"))
    return out


@app.get("/health")
def health():
    dep = _load_deployment()
    return {
        "status": "operational",
        "product": PRODUCT,
        "product_short": PRODUCT_SHORT,
        "engine": "THESIS",
        "tagline": TAGLINE,
        "version": __version__,
        "kind": "platform",
        "ai_delivered": True,
        "network_default": "monad-testnet",
        "pillars": PILLARS,
        "stages": pipeline_stages(),
        "receipt_tip": tip()[:16],
        "deployment": {
            "status": dep.get("status", "unknown"),
            "primary_submission_address": dep.get("primary_submission_address")
            or (dep.get("contracts") or {}).get("SovereignVault", ""),
            "chainId": dep.get("chainId") or dep.get("chain_id"),
        },
        "endpoints": [
            "/builder",
            "/builder/brief",
            "/builder/morning",
            "/brand",
            "/platform",
            "/platform/apps",
            "/platform/apps/{id}/invoke",
            "/platform/primitives",
            "/system",
            "/system/run",
            "/polyglot",
            "/polyglot/run",
            "/polyglot/mesh",
            "/nomos",
            "/nomos/run",
            "/tools",
            "/tools/{id}/run",
            "/tools/mcp",
            "/lawbook",
            "/terminal",
            "/terminal/exec",
            "/reports",
            "/reports/full",
            "/reports/download/{file}",
            "/signals",
            "/intelligence/pulse",
            "/auto/loop",
            "/auto/signals",
            "/hybrid",
            "/hybrid/run",
            "/agent",
            "/agent/step",
            "/x",
            "/x/draft",
            "/x/from-actions",
            "/x/queue",
            "/edge",
            "/edge/run",
            "/engines",
            "/engines/{id}/run",
            "/engines/pipeline",
            "/health",
            "/landing",
            "/pipeline",
            "/forge",
            "/arena",
            "/arena/auto",
            "/company",
            "/company/run",
            "/laws",
            "/home",
            "/ai/*",
            "/sandbox/*",
            "/wallets/*",
            "/desk/*",
            "/academy/*",
            "/workspace/*",
            "/rpc/probe",
            "/judge",
        ],
        "doctrine": (
            f"{PRODUCT}: shared primitives (identity, law, capital, market, intel, forge). "
            "Apps plug in. Agents propose. Laws decide. Owner signs. Receipts remember. "
            "AI delivers the morning brief."
        ),
        "trading": desk_snapshot(),
        "daily": leaderboard_self(),
        "ai_node": node_status().get("node_id") or True,
        "platform_apps": len(list_apps()),
    }


@app.get("/charter")
def charter_summary():
    return {
        "name": "THESIS — Monad AI Workstation",
        "version": __version__,
        "pillars": PILLARS,
        "stages": pipeline_stages(),
        "problem": (
            "AI + crypto is fast but reckless; ecosystem knowledge is scattered; "
            "tutorials skip failure modes that keep capital safe."
        ),
        "solution": (
            "Full pipeline: intent → map → architecture → policy → codegen → validate → "
            "arena → readiness → (operator) deploy/verify → release receipt. "
            "Trading desk runs agent trade tickets under desk risk + NOMOS with paper PnL. "
            "Academy teaches humans and AI by failing safely."
        ),
        "spark": {
            "contract": "SovereignVault",
            "category_hint": "Testnet unless mainnet deployed",
            "repo": "https://github.com/ItsNotAILABS/Monad-Hackaton",
        },
        "charter_path": "CHARTER.md",
        "explainability": "docs/EXPLAINABILITY_CONTRACT.md",
    }


@app.get("/networks")
def networks():
    return {
        "testnet": get_network("monad-testnet"),
        "mainnet": get_network("monad-mainnet"),
    }


@app.get("/rpc/probe")
def rpc_probe(network: str = Query("monad-testnet")):
    result = probe_network(network)
    seal("rpc.probe", {"network": network, "ok": result.get("ok")})
    return result


@app.get("/protocols")
def protocols():
    return [p.model_dump(mode="json") for p in all_protocols()]


@app.get("/protocols/{protocol_id}")
def protocol_one(protocol_id: str):
    p = get_protocol(protocol_id)
    if not p:
        raise HTTPException(404, "protocol not found")
    return p.model_dump(mode="json")


@app.get("/pillars")
def pillars():
    return PILLARS


@app.get("/stages")
def stages():
    return pipeline_stages()


# ── Studio / Pipeline ─────────────────────────────────────────────


@app.post("/pipeline")
def pipeline(body: PipelineRequest):
    """Full 11-stage build with explainability events + package + arena."""
    if not body.categories:
        raise HTTPException(400, "select at least one ecosystem category")
    result = run_pipeline(body, persist=body.persist)
    return result


@app.post("/forge")
def forge(request: BuildRequest):
    """Lightweight forge (manifest + scaffold). Prefer /pipeline for full product path."""
    if not request.categories:
        raise HTTPException(400, "select at least one ecosystem category")
    manifest = compile_manifest(request)
    files = generate_package(manifest)
    scaffold = studio_scaffold_files(manifest)
    receipt = seal(
        "studio.build-manifest",
        {
            "project_id": manifest.project_id,
            "manifest_hash": manifest.manifest_hash,
            "network": manifest.network,
            "chain_id": manifest.chain_id,
            "n_files": len(files),
        },
    )
    saved = save_project(
        manifest.project_id,
        manifest=manifest.model_dump(mode="json"),
        files=files,
    )
    return {
        "manifest": manifest.model_dump(mode="json"),
        "scaffold": scaffold,
        "files": files,
        "file_stats": package_stats(files),
        "receipt": receipt,
        "workspace": saved,
    }


@app.post("/agents/propose")
def agents_propose(body: ProposeRequest):
    plans = propose_plans(body.request, body.policy or body.request.policy)
    return {
        "n": len(plans),
        "actions": [p.model_dump(mode="json") for p in plans],
    }


@app.post("/arena")
def arena(body: ArenaRequest):
    if not body.actions:
        raise HTTPException(400, "actions required")
    report = arena_report(body.actions, body.policy)
    receipt = seal(
        "nomos.arena",
        {
            "n_plans": report["n_plans"],
            "n_accepted": report["n_accepted"],
            "n_rejected": report["n_rejected"],
            "winner_agent": (report.get("winner") or {})
            .get("action", {})
            .get("agent"),
        },
    )
    report["receipt"] = receipt
    return report


@app.post("/arena/auto")
def arena_auto(request: BuildRequest):
    """Propose agent plans from objective, then arbitrate under lawbook."""
    plans = propose_plans(request, request.policy)
    report = arena_report(plans, request.policy)
    receipt = seal(
        "nomos.arena.auto",
        {
            "project": request.name,
            "n_rejected": report["n_rejected"],
            "winner": (report.get("winner") or {}).get("action", {}).get("agent"),
        },
    )
    report["receipt"] = receipt
    report["proposed"] = [p.model_dump(mode="json") for p in plans]
    return report


@app.post("/evaluate")
def evaluate_one(action: Action, policy: Policy | None = None):
    pol = policy or Policy()
    ev = evaluate(action, pol)
    return {"action": action, "evaluation": ev, "policy": pol}


# ── Academy ───────────────────────────────────────────────────────


@app.get("/academy/quests")
def academy_quests():
    return {"quests": list_quests(), "doctrine": "Failure-first education."}


@app.get("/academy/quests/{quest_id}")
def academy_quest(quest_id: str):
    q = get_quest(quest_id)
    if not q:
        raise HTTPException(404, "quest not found")
    return q


@app.post("/academy/grade")
def academy_grade(body: AcademyGradeRequest):
    result = grade_quest(body.quest_id, body.selected_action_index, body.understood)
    if not result.get("ok"):
        raise HTTPException(400, result.get("error", "grade failed"))
    receipt = seal(
        "academy.grade",
        {
            "quest_id": body.quest_id,
            "passed": result["passed"],
            "selected_index": body.selected_action_index,
        },
    )
    result["receipt"] = receipt
    return result


@app.post("/academy/curriculum")
def academy_curriculum():
    """Grade all quests with correct answers (smoke / CI helper)."""
    results = []
    for q in list_quests():
        full = get_quest(q["id"])
        assert full
        idx = full["correct_index"]
        results.append(grade_quest(q["id"], idx, understood=True))
    passed = sum(1 for r in results if r.get("passed"))
    return {"passed": passed, "total": len(results), "results": results}


# ── Workspace ─────────────────────────────────────────────────────


@app.get("/workspace/projects")
def workspace_list():
    return {"projects": list_projects()}


@app.get("/workspace/projects/{project_id}")
def workspace_get(project_id: str):
    proj = load_project(project_id)
    if not proj:
        raise HTTPException(404, "project not found")
    return proj


# ── Receipts / deploy / judge ─────────────────────────────────────


# ── Trading desk (business) ───────────────────────────────────────


class TicketIn(BaseModel):
    agent: str = "desk-trader"
    venue_id: str
    pair: str
    side: str
    order_type: str = "limit"
    qty: float = Field(gt=0)
    limit_price: float = Field(gt=0)
    stop_price: float = 0.0
    slippage_bps: int = 30
    leverage_bps: int = 10000
    rationale: str = ""


class MarkIn(BaseModel):
    pair: str
    price: float = Field(gt=0)


@app.get("/desk")
def desk_get():
    return desk_snapshot()


@app.get("/desk/venues")
def desk_venues():
    return {"venues": list_venues()}


@app.post("/desk/ticket")
def desk_ticket(body: TicketIn):
    desk = load_desk()
    try:
        t = TradeTicket(
            agent=body.agent,
            venue_id=body.venue_id,
            pair=body.pair,
            side=body.side,  # type: ignore[arg-type]
            order_type=body.order_type,  # type: ignore[arg-type]
            qty=body.qty,
            limit_price=body.limit_price,
            stop_price=body.stop_price,
            slippage_bps=body.slippage_bps,
            leverage_bps=body.leverage_bps,
            rationale=body.rationale,
        )
    except Exception as exc:
        raise HTTPException(400, str(exc)) from exc
    out = propose_ticket(desk, t)
    return {
        "ticket": out.model_dump(mode="json"),
        "desk": desk_snapshot(desk),
    }


@app.post("/desk/fill/{ticket_id}")
def desk_fill(ticket_id: str):
    desk = load_desk()
    try:
        t = paper_fill(desk, ticket_id)
    except KeyError:
        raise HTTPException(404, "ticket not found") from None
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return {"ticket": t.model_dump(mode="json"), "desk": desk_snapshot(desk)}


@app.post("/desk/arena")
def desk_arena():
    desk = load_desk()
    return run_desk_arena(desk)


@app.post("/desk/limits")
def desk_limits(body: TradingLimits):
    desk = update_limits(load_desk(), body)
    return desk_snapshot(desk)


@app.post("/desk/policy")
def desk_policy(body: Policy):
    desk = update_policy(load_desk(), body)
    return desk_snapshot(desk)


@app.post("/desk/mark")
def desk_mark(body: MarkIn):
    desk = set_mark(load_desk(), body.pair, body.price)
    return desk_snapshot(desk)


@app.get("/desk/marks")
def desk_marks_live(network: str = Query("monad-testnet")):
    """Live synthetic mark feed (RPC-entropy when available)."""
    return live_marks(network)


@app.post("/desk/marks/refresh")
def desk_marks_refresh(network: str = Query("monad-testnet")):
    desk = load_desk()
    result = apply_marks_to_desk(desk, network=network)
    return {"ok": True, **result, "desk": desk_snapshot(desk)}


@app.get("/desk/strategies")
def desk_strategies():
    return {"strategies": list_strategies()}


@app.post("/desk/strategies/{strategy_id}")
def desk_run_strategy(strategy_id: str, submit: bool = Query(True)):
    out = run_strategy(strategy_id, submit=submit)
    if not out.get("ok"):
        raise HTTPException(404, out.get("error", "strategy failed"))
    out["desk"] = desk_snapshot()
    return out


@app.post("/desk/vault-route/{ticket_id}")
def desk_vault_route(ticket_id: str):
    """Simulate SovereignVault.execute for a desk ticket (no broadcast)."""
    out = simulate_vault_route(ticket_id)
    if out.get("error") and not out.get("ok"):
        raise HTTPException(400, out["error"])
    out["desk"] = desk_snapshot()
    return out


@app.post("/desk/reset")
def desk_reset():
    desk = reset_desk()
    return desk_snapshot(desk)


# ── Broker adapter readiness (paper/sandbox only) ──────────────────


@app.get("/brokers")
def brokers_list():
    return {"brokers": list_brokers(), "status": broker_status()}


@app.get("/brokers/{broker_id}")
def brokers_get(broker_id: str):
    b = get_broker(broker_id)
    if not b:
        raise HTTPException(404, "broker not found")
    return b


@app.post("/brokers/execute")
def brokers_execute_denied():
    raise HTTPException(403, detail=denial("live_broker_execution_disabled"))


# ── Live trading readiness gate (evidence packet, always operator-gated) ──


@app.get("/live-gate")
def live_gate_get():
    return gate_status()


class EvidenceIn(BaseModel):
    key: str
    satisfied: bool = True
    note: str = ""


@app.post("/live-gate/evidence")
def live_gate_submit(body: EvidenceIn):
    try:
        return submit_evidence(body.key, body.satisfied, body.note)
    except KeyError:
        raise HTTPException(400, f"unknown evidence key: {body.key}") from None


@app.post("/live-gate/approval-packet")
def live_gate_packet():
    return approval_packet()


@app.post("/live-gate/execute")
def live_gate_execute_denied():
    raise HTTPException(403, detail=denial())


# ── Agent Vaults — Monad-tailored governed financial envelopes ────


class VaultIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    network: str = "monad-testnet"


class ConnectorIn(BaseModel):
    connector_id: str


class VaultAgentIn(BaseModel):
    agent_id: str
    role: str = "trader"


class LedgerTransferIn(BaseModel):
    from_symbol: str
    to_symbol: str
    amount: float = Field(gt=0)
    note: str = ""


@app.get("/vaults")
def vaults_list():
    return {"vaults": list_vaults()}


@app.post("/vaults")
def vaults_create(body: VaultIn):
    try:
        return create_vault(body.name, body.network)
    except Exception as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/vaults/{vault_id}")
def vaults_get(vault_id: str):
    v = get_vault(vault_id)
    if not v:
        raise HTTPException(404, "vault not found")
    return v


@app.post("/vaults/{vault_id}/connectors")
def vaults_add_connector(vault_id: str, body: ConnectorIn):
    try:
        return add_connector(vault_id, body.connector_id)
    except KeyError:
        raise HTTPException(404, "vault not found") from None
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.post("/vaults/{vault_id}/agents")
def vaults_register_agent(vault_id: str, body: VaultAgentIn):
    try:
        return register_agent(vault_id, body.agent_id, body.role)
    except KeyError:
        raise HTTPException(404, "vault not found") from None


@app.post("/vaults/{vault_id}/ledger/transfer")
def vaults_ledger_transfer(vault_id: str, body: LedgerTransferIn):
    try:
        return ledger_transfer(vault_id, body.from_symbol, body.to_symbol, body.amount, body.note)
    except KeyError:
        raise HTTPException(404, "vault not found") from None


@app.post("/vaults/{vault_id}/live-execute")
def vaults_live_execute_denied(vault_id: str):
    raise HTTPException(403, detail=denial("agent_vault_live_execution_disabled"))


# ── Security & governance intelligence — careers, use cases, approvals ──


@app.get("/security/careers")
def security_careers(team: str | None = None, stage: str | None = None):
    return {"careers": list_careers(team, stage)}


@app.get("/security/careers/search")
def security_careers_search(q: str = ""):
    return {"careers": search_careers(q)}


@app.get("/security/careers/{career_id}")
def security_career_get(career_id: str):
    c = get_career(career_id)
    if not c:
        raise HTTPException(404, "career not found")
    return c


@app.get("/security/use-cases")
def security_use_cases(buyer: str | None = None):
    return {"use_cases": list_use_cases(buyer)}


@app.get("/security/use-cases/{use_case_id}")
def security_use_case_get(use_case_id: str):
    u = get_use_case(use_case_id)
    if not u:
        raise HTTPException(404, "use case not found")
    return u


@app.get("/security/capabilities")
def security_capabilities(q: str = ""):
    return {"capabilities": search_capabilities(q) if q else security_capability_matrix()}


@app.get("/security/briefing")
def security_briefing_get(topic: str = "trading-desk"):
    return security_briefing(topic)


@app.get("/security/approvals")
def security_approvals_list(status: str | None = None):
    return {"approvals": list_approvals(status)}


@app.get("/security/approvals/{approval_id}")
def security_approval_get(approval_id: str):
    a = get_approval(approval_id)
    if not a:
        raise HTTPException(404, "approval not found")
    return a


class ApprovalDecisionIn(BaseModel):
    role: str
    approver_id: str
    approved: bool = True
    comment: str = ""


@app.post("/security/approvals/{approval_id}/decide")
def security_approval_decide(approval_id: str, body: ApprovalDecisionIn):
    try:
        return decide_approval(approval_id, body.role, body.approver_id, body.approved, body.comment)
    except KeyError:
        raise HTTPException(404, "approval not found") from None
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/portfolio")
def portfolio_get(concentration_limit_pct: float = Query(40.0, gt=0, le=100)):
    return portfolio_snapshot(concentration_limit_pct)


@app.get("/receipts/recent")
def receipts_recent(n: int = 25):
    return {"tip": tip(), "receipts": recent(min(n, 100))}


@app.get("/deployment")
def deployment():
    return _load_deployment()


@app.post("/deployment/record")
def deployment_record(record: DeploymentRecord):
    net = get_network(record.network)
    payload = {
        "schema": "thesis.deployment.v1",
        "status": "recorded" if record.sovereign_vault else "not_deployed",
        "network": record.network,
        "chainId": record.chain_id or net["chain_id"],
        "rpc": net["rpc"],
        "explorer": net["explorer"],
        "primary_submission_address": record.sovereign_vault,
        "contracts": {
            "PolicyKernel": record.policy_kernel,
            "ReceiptChain": record.receipt_chain,
            "AgentRegistry": record.agent_registry,
            "ProposalBook": record.proposal_book,
            "ExecutionRouter": record.execution_router,
            "SovereignVault": record.sovereign_vault,
        },
        "explorer_vault": record.explorer_vault
        or (
            f"{net['explorer']}/address/{record.sovereign_vault}"
            if record.sovereign_vault
            else ""
        ),
        "notes": record.notes,
    }
    _DEPLOY_PATH.parent.mkdir(parents=True, exist_ok=True)
    _DEPLOY_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    receipt = seal(
        "deploy.record",
        {"vault": record.sovereign_vault, "chain": payload["chainId"]},
    )
    return {"ok": True, "deployment": payload, "receipt": receipt}


@app.get("/competition")
def competition(network: str = Query("monad-testnet")):
    """Spark competition pack — personal problem, scorecard, demo script."""
    return competition_pack(network)


@app.get("/competition/scorecard")
def competition_scorecard(network: str = Query("monad-testnet")):
    return scorecard_live(network)


@app.post("/demo/win-path")
def demo_win_path(network: str = Query("monad-testnet")):
    """One-click competition proof: desk rejects + laws + scorecard."""
    return run_win_path(network)


@app.get("/judge")
def judge_panel(network: str = Query("monad-testnet")):
    """Spark judge / AI judging agent proof panel (competition-winner grade)."""
    dep = _load_deployment()
    projects = list_projects()[:8]
    pack = competition_pack(network)
    vault = dep.get("primary_submission_address") or (dep.get("contracts") or {}).get(
        "SovereignVault", ""
    )
    return {
        "schema": "thesis.judge.v2",
        "product": pack["product"],
        "version": __version__,
        "repo": pack["repo"],
        "hackathon": pack["hackathon"],
        "doctrine": pack["doctrine"],
        "winning_claim": pack["winning_claim"],
        "personal_problem": pack["personal_problem"],
        "solution": pack["solution"],
        "differentiation": pack["differentiation"],
        "vs_winners": pack.get("vs_winners"),
        "easy_path": pack.get("easy_path"),
        "demo_script_90s": pack["demo_script_90s"],
        "scorecard": pack["scorecard"],
        "live_api": True,
        "vaporware": False,
        "features": {
            "pipeline_stages": len(pipeline_stages()),
            "academy_quests": len(list_quests()),
            "protocols": len(all_protocols()),
            "trading_venues": len(list_venues()),
            "trading_desk": True,
            "company_os": True,
            "ecosystem_laws": True,
            "ai_sandbox_twins": True,
            "wallet_link_public_only": True,
            "live_landing": True,
            "contracts": [
                "PolicyKernel",
                "SovereignVault",
                "ReceiptChain",
                "AgentRegistry",
                "ProposalBook",
                "ExecutionRouter",
                "LawBook",
                "TwinLedger",
                "CompanyRegistry",
                "GasPolicy",
                "ThesisMulticall",
                "ExactAllowance",
                "ThesisFactory",
                "PauseController",
            ],
        },
        "trading": desk_snapshot(),
        "deployment": dep,
        "recent_projects": projects,
        "receipt_tip": tip(),
        "submission": pack["submission"],
        "checklist": {
            "public_github": True,
            "contract_address": bool(vault),
            "vault_address": vault or None,
            "hosted_url": "operator after web host",
            "demo_video": "operator — use POST /demo/win-path for live proof",
            "personal_problem": True,
            "onchain_story": True,
            "real_api_paths": pack["submission"]["api_proof"],
            "scorecard_grade": pack["scorecard"]["grade"],
            "scorecard_pct": pack["scorecard"]["pct"],
        },
        "monad_essentials": pack["monad_essentials"],
    }


@app.get("/demo/pack")
def demo_pack(network: str = Query("monad-testnet")):
    from .models import Category

    policy = Policy()
    req = BuildRequest(
        name="Spark Demo Vault",
        objective="Coordinate Monad portfolio under user-owned laws with agent proposals only.",
        categories=[Category.VAULT, Category.DEX, Category.LENDING],
        policy=policy,
    )
    pipe = run_pipeline(req, persist=True)
    win = run_win_path(network)
    pack = competition_pack(network)
    return {
        "schema": "thesis.demo.pack.v2",
        "script": [f"{b['t']} {b['beat']}: {b['say']}" for b in pack["demo_script_90s"]],
        "demo_script_90s": pack["demo_script_90s"],
        "win_path": win,
        "pipeline_preview": {
            "project_id": pipe.get("project_id"),
            "progress": pipe.get("progress"),
            "n_files": pipe.get("file_stats", {}).get("n_files"),
            "arena_rejected": (pipe.get("arena") or {}).get("n_rejected"),
            "receipt": (pipe.get("receipt") or {}).get("receipt_hash", "")[:24],
        },
        "trading_preview": {
            "n_accepted": win.get("desk_arena", {}).get("n_accepted"),
            "n_rejected": win.get("desk_arena", {}).get("n_rejected"),
            "rejected_samples": win.get("desk_arena", {}).get("rejected_samples"),
        },
        "deployment": _load_deployment(),
        "quests": list_quests(),
        "judge": "/judge",
        "competition": "/competition",
        "winning_claim": win.get("winning_claim"),
    }


@app.get("/events/stream-demo")
def events_stream_demo():
    """NDJSON-ish stream sample for agent view (single shot stream)."""

    def gen():
        for stage in pipeline_stages():
            line = json.dumps({"type": "stage", **stage}) + "\n"
            yield line

    return StreamingResponse(gen(), media_type="application/x-ndjson")
