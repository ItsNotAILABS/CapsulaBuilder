import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Landing } from "./Landing.jsx";
import { LocalAI } from "./local-ai/LocalAI.jsx";
import { CloudEngines } from "./CloudEngines.jsx";
import { PolyglotHub } from "./PolyglotHub.jsx";
import { UseCases } from "./UseCases.jsx";
import { Nomos } from "./Nomos.jsx";
import { Tools } from "./Tools.jsx";
import { Terminal } from "./Terminal.jsx";
import { HybridHub } from "./HybridHub.jsx";
import { BuilderHome } from "./BuilderHome.jsx";
import { AgentPanel } from "./AgentPanel.jsx";
import { MicButton } from "./MicButton.jsx";
import { api, API_BASE } from "./api.js";
import "./style.css";

const CATEGORIES = ["dex", "lending", "vault", "staking", "perps", "analytics", "agent"];

const DEFAULT_POLICY = {
  max_slippage_bps: 50,
  max_protocol_exposure_bps: 2000,
  min_liquid_reserve_bps: 2500,
  max_leverage_bps: 12500,
  max_action_value: 1000,
  require_simulation: true,
  allowed_categories: CATEGORIES.filter((c) => c !== "perps"),
};

function Pill({ ok, children, warn }) {
  const cls = warn ? "warn" : ok ? "ok" : "bad";
  return <span className={`pill ${cls}`}>{children}</span>;
}

function StatusDot({ status }) {
  return <i className={`dot ${status || "pending"}`} title={status} />;
}

function App() {
  const [tab, setTab] = useState("builder");
  const [health, setHealth] = useState(null);
  const [judge, setJudge] = useState(null);
  const [home, setHome] = useState(null);
  const [coach, setCoach] = useState(null);
  const [ecosystem, setEcosystem] = useState(null);
  const [toast, setToast] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiNode, setAiNode] = useState(null);
  const [aiChatLog, setAiChatLog] = useState([]);
  const [aiInput, setAiInput] = useState("sync twins and show balances");
  const [wallets, setWallets] = useState(null);
  const [sandbox, setSandbox] = useState(null);
  const [hq, setHq] = useState(null);
  const [missionRoom, setMissionRoom] = useState(null);
  const [winPath, setWinPath] = useState(null);
  const [systemRun, setSystemRun] = useState(null);
  const [companyObjective, setCompanyObjective] = useState(
    "Grow my Monad position, keep 30% liquid, avoid leverage, and teach me what is happening."
  );

  const [name, setName] = useState("THESIS Sovereign Ops");
  const [objective, setObjective] = useState(
    "Coordinate my Monad portfolio across swaps, lending, and vaults while agents only propose actions that pass my onchain lawbook and leave receipts."
  );
  const [selected, setSelected] = useState(["dex", "lending", "vault", "staking", "analytics"]);
  const [network, setNetwork] = useState("monad-testnet");
  const [policy, setPolicy] = useState(DEFAULT_POLICY);

  const [pipeline, setPipeline] = useState(null);
  const [filePath, setFilePath] = useState("");
  const [arena, setArena] = useState(null);
  const [projects, setProjects] = useState([]);

  const [quests, setQuests] = useState([]);
  const [questId, setQuestId] = useState("");
  const [quest, setQuest] = useState(null);
  const [pick, setPick] = useState(0);
  const [understood, setUnderstood] = useState(false);
  const [grade, setGrade] = useState(null);

  const [protocols, setProtocols] = useState([]);
  const [deployment, setDeployment] = useState(null);
  const [rpc, setRpc] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [desk, setDesk] = useState(null);
  const [deskArena, setDeskArena] = useState(null);
  const [markFeed, setMarkFeed] = useState(null);
  const [strategyRun, setStrategyRun] = useState(null);
  const [vaultRoute, setVaultRoute] = useState(null);
  const [brokers, setBrokers] = useState(null);
  const [liveGate, setLiveGate] = useState(null);
  const [approvalPacket, setApprovalPacket] = useState(null);
  const [vaults, setVaults] = useState([]);
  const [activeVault, setActiveVault] = useState(null);
  const [vaultName, setVaultName] = useState("Alpha Desk Vault");
  const [vaultConnectorId, setVaultConnectorId] = useState("kuru");
  const [vaultAgentId, setVaultAgentId] = useState("mm-bot");
  const [vaultAgentRole, setVaultAgentRole] = useState("market-maker");
  const [ledgerForm, setLedgerForm] = useState({
    from_symbol: "MON",
    to_symbol: "USDC",
    amount: 10,
    note: "rebalance",
  });
  const [ticketForm, setTicketForm] = useState({
    venue_id: "kuru",
    pair: "MON/USDC",
    side: "buy",
    order_type: "limit",
    qty: 25,
    limit_price: 1,
    stop_price: 0,
    slippage_bps: 20,
    leverage_bps: 10000,
    agent: "desk-trader",
    rationale: "Manual desk ticket",
  });

  const files = pipeline?.files || {};
  const fileList = useMemo(() => Object.keys(files).sort(), [files]);
  const activeFile = filePath && files[filePath] != null ? filePath : fileList[0] || "";
  const fileContent = activeFile ? files[activeFile] : "";

  const status = useMemo(() => {
    if (busy) return "WORKING";
    if (err) return "ERROR";
    if (health?.status === "operational") return "ONLINE";
    return "BOOT";
  }, [busy, err, health]);

  const buildBody = useCallback(
    () => ({
      name,
      objective,
      categories: selected,
      network,
      policy: { ...policy, allowed_categories: selected },
      persist: true,
    }),
    [name, objective, selected, network, policy]
  );

  const refresh = useCallback(async () => {
    try {
      const [h, j, p, d, q, wp, rc, dk, hm, co, eco, ai, wl, sb, company, brk, gate, vlts] = await Promise.all([
        api("/health"),
        api("/judge"),
        api("/protocols"),
        api("/deployment"),
        api("/academy/quests"),
        api("/workspace/projects"),
        api("/receipts/recent?n=12"),
        api("/desk"),
        api(`/home?network=${network}`),
        api(`/intelligence/coach?network=${network}`),
        api(`/ecosystem?network=${network === "monad-mainnet" ? "monad-mainnet" : "monad-testnet"}`),
        api("/ai"),
        api("/wallets"),
        api("/sandbox"),
        api("/company"),
        api("/brokers"),
        api("/live-gate"),
        api("/vaults"),
      ]);
      setHealth(h);
      setJudge(j);
      setProtocols(p);
      setDeployment(d);
      setQuests(q.quests || []);
      if (!questId && q.quests?.length) setQuestId(q.quests[0].id);
      setProjects(wp.projects || []);
      setReceipts(rc.receipts || []);
      setDesk(dk);
      setHome(hm);
      setCoach(co);
      setEcosystem(eco);
      setAiNode(ai);
      setWallets(wl);
      setSandbox(sb);
      setHq(company);
      setBrokers(brk);
      setLiveGate(gate);
      setVaults(vlts.vaults || []);
      if (dk?.marks?.["MON/USDC"]) {
        setTicketForm((f) => ({ ...f, limit_price: dk.marks["MON/USDC"] }));
      }
      setErr("");
    } catch (e) {
      setErr(String(e.message || e));
      setHealth(null);
    }
  }, [questId, network]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!activeVault && vaults.length) setActiveVault(vaults[0].vault_id);
  }, [vaults, activeVault]);

  const selectedVault = useMemo(
    () => vaults.find((v) => v.vault_id === activeVault) || null,
    [vaults, activeVault]
  );

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  }

  async function doMission(missionId, extra = {}) {
    setBusy(true);
    setErr("");
    try {
      const body = { mission_id: missionId, ...extra };
      if (missionId === "desk-arena") {
        const ar = await api("/desk/arena", { method: "POST", body: "{}" });
        setDeskArena(ar);
        body.n_rejected = ar.n_rejected;
      }
      if (missionId === "academy-lab") {
        // deep-link user to academy — auto-complete only if they already graded
        if (grade?.passed) {
          body.passed = true;
        } else {
          setTab("academy");
          if (home?.missions) {
            const m = home.missions.find((x) => x.id === "academy-lab");
            if (m?.quest_id) setQuestId(m.quest_id);
          }
          flash("Pass the lab with ✓ I understand, then tap mission again");
          setBusy(false);
          return;
        }
      }
      const data = await api("/home/mission", { method: "POST", body: JSON.stringify(body) });
      if (data.home) setHome(data.home);
      if (data.xp_gain) flash(`+${data.xp_gain} XP${data.new_badges?.length ? " · badge!" : ""}`);
      if (data.new_badges?.length) flash(`Badge: ${data.new_badges.join(", ")}`);
      setCoach(await api(`/intelligence/coach?network=${network}`));
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!questId) return;
    let c = false;
    (async () => {
      try {
        const q = await api(`/academy/quests/${questId}`);
        if (!c) {
          setQuest(q);
          setPick(0);
          setGrade(null);
          setUnderstood(false);
        }
      } catch (e) {
        if (!c) setErr(String(e.message || e));
      }
    })();
    return () => {
      c = true;
    };
  }, [questId]);

  async function runPipeline() {
    setBusy(true);
    setErr("");
    try {
      const data = await api("/pipeline", { method: "POST", body: JSON.stringify(buildBody()) });
      setPipeline(data);
      setArena(data.arena || null);
      const paths = Object.keys(data.files || {});
      setFilePath(paths.includes("docs/AGENT.md") ? "docs/AGENT.md" : paths[0] || "");
      setTab("studio");
      await refresh();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function runArenaAuto() {
    setBusy(true);
    setErr("");
    try {
      const data = await api("/arena/auto", { method: "POST", body: JSON.stringify(buildBody()) });
      setArena(data);
      setTab("nomos");
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function runGrade() {
    setBusy(true);
    setErr("");
    try {
      const data = await api("/academy/grade", {
        method: "POST",
        body: JSON.stringify({ quest_id: questId, selected_action_index: pick, understood }),
      });
      setGrade(data);
      if (data.passed) {
        try {
          const m = await api("/home/mission", {
            method: "POST",
            body: JSON.stringify({ mission_id: "academy-lab", passed: true }),
          });
          if (m.home) setHome(m.home);
          if (m.xp_gain) flash(`Lab passed · +${m.xp_gain} XP`);
        } catch {
          /* mission may already be done */
        }
      }
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function probeRpc() {
    setBusy(true);
    try {
      setRpc(await api(`/rpc/probe?network=${network}`));
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function runDeskArena() {
    setBusy(true);
    setErr("");
    try {
      const data = await api("/desk/arena", { method: "POST", body: "{}" });
      setDeskArena(data);
      setDesk(await api("/desk"));
      setTab("desk");
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function submitTicket() {
    setBusy(true);
    setErr("");
    try {
      const data = await api("/desk/ticket", {
        method: "POST",
        body: JSON.stringify(ticketForm),
      });
      setDesk(data.desk);
      if (data.ticket?.status === "risk_accepted") {
        // optional: leave for user to fill
      }
      setDeskArena(null);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function fillTicket(id) {
    setBusy(true);
    setErr("");
    try {
      const data = await api(`/desk/fill/${id}`, { method: "POST", body: "{}" });
      setDesk(data.desk);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function resetDeskBook() {
    setBusy(true);
    try {
      setDesk(await api("/desk/reset", { method: "POST", body: "{}" }));
      setDeskArena(null);
      setStrategyRun(null);
      setVaultRoute(null);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function refreshMarks() {
    setBusy(true);
    setErr("");
    try {
      const data = await api(`/desk/marks/refresh?network=${network}`, {
        method: "POST",
        body: "{}",
      });
      setMarkFeed(data.feed);
      setDesk(data.desk);
      if (data.desk?.marks?.[ticketForm.pair]) {
        setTicketForm((f) => ({ ...f, limit_price: data.desk.marks[f.pair] }));
      }
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function runStrategy(id) {
    setBusy(true);
    setErr("");
    try {
      const data = await api(`/desk/strategies/${id}?submit=true`, {
        method: "POST",
        body: "{}",
      });
      setStrategyRun(data);
      setDesk(data.desk);
      setTab("desk");
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function routeVault(ticketId) {
    setBusy(true);
    setErr("");
    try {
      const data = await api(`/desk/vault-route/${ticketId}`, {
        method: "POST",
        body: "{}",
      });
      setVaultRoute(data);
      if (data.desk) setDesk(data.desk);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleEvidence(key, satisfied) {
    setBusy(true);
    setErr("");
    try {
      const data = await api("/live-gate/evidence", {
        method: "POST",
        body: JSON.stringify({ key, satisfied, note: "" }),
      });
      setLiveGate(data);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function generateApprovalPacket() {
    setBusy(true);
    setErr("");
    try {
      const data = await api("/live-gate/approval-packet", { method: "POST", body: "{}" });
      setApprovalPacket(data);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function createVault() {
    setBusy(true);
    setErr("");
    try {
      const v = await api("/vaults", {
        method: "POST",
        body: JSON.stringify({ name: vaultName, network }),
      });
      setVaults((await api("/vaults")).vaults || []);
      setActiveVault(v.vault_id);
      flash(`Vault created · ${v.name}`);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function addVaultConnector() {
    if (!activeVault) return;
    setBusy(true);
    setErr("");
    try {
      await api(`/vaults/${activeVault}/connectors`, {
        method: "POST",
        body: JSON.stringify({ connector_id: vaultConnectorId }),
      });
      setVaults((await api("/vaults")).vaults || []);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function registerVaultAgent() {
    if (!activeVault) return;
    setBusy(true);
    setErr("");
    try {
      await api(`/vaults/${activeVault}/agents`, {
        method: "POST",
        body: JSON.stringify({ agent_id: vaultAgentId, role: vaultAgentRole }),
      });
      setVaults((await api("/vaults")).vaults || []);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function submitLedgerTransfer() {
    if (!activeVault) return;
    setBusy(true);
    setErr("");
    try {
      await api(`/vaults/${activeVault}/ledger/transfer`, {
        method: "POST",
        body: JSON.stringify(ledgerForm),
      });
      setVaults((await api("/vaults")).vaults || []);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function connectBrowserWallet(kind) {
    setBusy(true);
    setErr("");
    try {
      let address = "";
      let chain = network === "monad-mainnet" ? "eip155:143" : "eip155:10143";
      let balances = {};
      if (kind === "phantom") {
        const provider = window.phantom?.solana || window.solana;
        if (!provider?.connect) {
          throw new Error("Phantom not found — install extension or use manual link");
        }
        const res = await provider.connect();
        address = res.publicKey?.toString?.() || res.publicKey?.toBase58?.() || String(res.publicKey || "");
        chain = "solana";
        // attested demo balances if RPC unavailable
        balances = { SOL: 1.0, USDC: 25 };
      } else {
        const eth = window.ethereum;
        if (!eth?.request) {
          throw new Error("No injected EVM wallet — install MetaMask/Rabby or use manual");
        }
        const accounts = await eth.request({ method: "eth_requestAccounts" });
        address = accounts[0];
        try {
          const hex = await eth.request({
            method: "eth_getBalance",
            params: [address, "latest"],
          });
          balances = { MON: Number(BigInt(hex)) / 1e18 };
        } catch {
          balances = { MON: 0 };
        }
      }
      const linked = await api("/wallets/link", {
        method: "POST",
        body: JSON.stringify({ kind, address, chain, balances, label: `${kind} browser` }),
      });
      setWallets(linked.registry);
      const syn = await api("/wallets/sync-twins", { method: "POST", body: "{}" });
      setSandbox(await api("/sandbox"));
      flash(`Linked ${kind} · synced ${syn.synced?.length || 0} twins into AI sandbox`);
      setAiNode(await api("/ai"));
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function manualLinkWallet() {
    const address = window.prompt("Public address only (never paste a private key / seed):");
    if (!address) return;
    if (/private|seed|mnemonic|secret/i.test(address)) {
      setErr("Refusing secret material — public address only");
      return;
    }
    setBusy(true);
    try {
      const bal = window.prompt("Attested MON or SOL balance number?", "1") || "1";
      const isSol = !address.startsWith("0x");
      const linked = await api("/wallets/link", {
        method: "POST",
        body: JSON.stringify({
          kind: isSol ? "phantom" : "manual",
          address,
          chain: isSol ? "solana" : network === "monad-mainnet" ? "eip155:143" : "eip155:10143",
          balances: isSol ? { SOL: Number(bal) } : { MON: Number(bal) },
          label: "manual",
        }),
      });
      setWallets(linked.registry);
      await api("/wallets/sync-twins", { method: "POST", body: "{}" });
      setSandbox(await api("/sandbox"));
      flash("Watch-only wallet linked · twins synced");
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function sendAiChat() {
    if (!aiInput.trim()) return;
    setBusy(true);
    setErr("");
    const msg = aiInput.trim();
    setAiChatLog((L) => [...L, { role: "user", text: msg }]);
    try {
      const data = await api("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: msg, network }),
      });
      setAiChatLog((L) => [...L, { role: "assistant", text: data.answer, actions: data.actions }]);
      setAiNode(await api("/ai"));
      setSandbox(await api("/sandbox"));
      setAiInput("");
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function killSandbox() {
    const id = sandbox?.sandbox?.sandbox_id;
    if (!id) return;
    setBusy(true);
    try {
      await api(`/sandbox/${id}/kill`, { method: "POST", body: "{}" });
      setSandbox(await api("/sandbox"));
      flash("Sandbox frozen — AI twin mutations blocked");
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function runCompany() {
    setBusy(true);
    setErr("");
    try {
      const data = await api("/company/run", {
        method: "POST",
        body: JSON.stringify({ objective: companyObjective }),
      });
      setMissionRoom({ ...data.mission, law_stack: data.law_stack });
      setHq(await api("/company"));
      setTab("hq");
      flash(
        data.sla_all_met
          ? `Mission staffed · ${data.law_stack?.ecosystem_law_count || 0} eco-laws · SLAs ok`
          : "Mission staffed (check SLAs)"
      );
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function runWinPath() {
    setBusy(true);
    setErr("");
    try {
      const data = await api(`/demo/win-path?network=${network}`, {
        method: "POST",
        body: "{}",
      });
      setWinPath(data);
      setDesk(await api("/desk"));
      setJudge(await api(`/judge?network=${network}`));
      setTab("live");
      flash(
        data.proof?.reject_is_feature
          ? `WIN PATH · ${data.desk_arena?.n_rejected} rejects · scorecard ${data.proof?.scorecard_grade}`
          : "WIN PATH complete"
      );
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  /** Full product path — laws + cloud + desk + vault + company */
  async function runSystem() {
    setBusy(true);
    setErr("");
    try {
      const data = await api("/system/run", {
        method: "POST",
        body: JSON.stringify({
          network,
          objective: companyObjective,
          query: "Monad gas limits, vault policy gate, desk rejects, owner signs",
          estimated_gas: 80000,
        }),
      });
      setSystemRun(data);
      // refresh linked surfaces so tabs stay in sync
      const [dk, company, wl, ai, hm] = await Promise.all([
        api("/desk"),
        api("/company"),
        api("/wallets"),
        api("/ai"),
        api(`/home?network=${network}`),
      ]);
      setDesk(dk);
      setHq(company);
      setWallets(wl);
      setAiNode(ai);
      setHome(hm);
      if (data.company?.mission_id) {
        try {
          const m = await api(`/company/missions/${data.company.mission_id}`);
          setMissionRoom(m.mission || m);
        } catch {
          /* optional */
        }
      }
      setTab("live");
      flash(
        data.ok
          ? `SYSTEM · desk reject ${(data.desk_arena || {}).n_rejected ?? "—"} · company ${data.company?.status || "—"}`
          : "SYSTEM finished with issues — open steps"
      );
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function openMission(id) {
    setBusy(true);
    try {
      const data = await api(`/company/missions/${id}`);
      setMissionRoom(data.mission);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function decideMission(decision) {
    if (!missionRoom?.mission_id) return;
    setBusy(true);
    try {
      const data = await api(`/company/missions/${missionRoom.mission_id}/act`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      setMissionRoom(data.mission || data);
      setHq(await api("/company"));
      flash(`Mission ${decision}`);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function openProject(id) {
    setBusy(true);
    try {
      const proj = await api(`/workspace/projects/${id}`);
      setPipeline({
        project_id: proj.project_id,
        manifest: proj.manifest,
        files: proj.files || {},
        events: proj.events || [],
        arena: proj.arena,
        progress: { complete: (proj.events || []).filter((e) => e.status === "complete").length, total: (proj.events || []).length, pct: 0 },
        file_stats: { n_files: Object.keys(proj.files || {}).length },
        workspace: proj.project,
      });
      setArena(proj.arena || null);
      const paths = Object.keys(proj.files || {});
      setFilePath(paths[0] || "");
      setTab("ide");
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  const vault =
    deployment?.primary_submission_address ||
    deployment?.contracts?.SovereignVault ||
    health?.deployment?.primary_submission_address ||
    "";

  const progress = pipeline?.progress;

  return (
    <div className="shell">
      <header className="top">
        <div>
          <span className="eyebrow">
            {health?.product_short || "MONADBUILDER"} HQ v{health?.version || "3"} ·{" "}
            {health?.platform_apps ?? "…"} APPS · {network}
          </span>
          <h1>
            MonadBuilder <i>HQ</i>
          </h1>
          <p className="tagline">
            {health?.tagline ||
              "AI delivers your Monad day — briefs, brakes, and wins you actually feel."}
          </p>
        </div>
        <div className="top-right stats-chip">
          <div className="stat">
            <em>LVL</em>
            <b>{home?.level ?? "—"}</b>
          </div>
          <div className="stat">
            <em>XP</em>
            <b>{home?.xp ?? "—"}</b>
          </div>
          <div className="stat">
            <em>🔥</em>
            <b>{home?.streak ?? 0}</b>
          </div>
          <div className="stat">
            <em>DESK</em>
            <b>{desk?.equity != null ? Number(desk.equity).toFixed(0) : "—"}</b>
          </div>
          <select
            className="ghost"
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            aria-label="Network"
            style={{ maxWidth: 150 }}
          >
            <option value="monad-testnet">monad-testnet</option>
            <option value="monad-mainnet">monad-mainnet</option>
          </select>
          <div className={`status s-${status.toLowerCase()}`}>{status}</div>
          <button type="button" className="ghost" onClick={refresh}>
            Sync
          </button>
        </div>
      </header>

      {toast ? <div className="banner ok">{toast}</div> : null}
      {err ? (
        <div className="banner err">
          {err}
          <span className="muted"> · start API: uvicorn thesis_forge.api:app --port 8043</span>
        </div>
      ) : null}

      {/* Always-on utility bar — polished, sticky */}
      <div className="use-bar">
        <button
          type="button"
          className="forge use-run"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const m = await api("/builder/morning", {
                method: "POST",
                body: JSON.stringify({ network }),
              });
              setToast(m.celebration || m.headline || "Morning done");
              setTab("builder");
              await refresh();
            } catch (e) {
              setErr(String(e.message || e));
            } finally {
              setBusy(false);
            }
          }}
        >
          ▶ AI MORNING
        </button>
        <button
          type="button"
          className="ghost"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const a = await api("/auto/loop", {
                method: "POST",
                body: JSON.stringify({ network }),
              });
              setToast(a.headline || "Auto loop done");
              setTab("builder");
            } catch (e) {
              setErr(String(e.message || e));
            } finally {
              setBusy(false);
            }
          }}
        >
          Auto
        </button>
        <button
          type="button"
          className="ghost"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await api("/tools/reject_demo/run", { method: "POST", body: "{}" });
              setToast(r?.result?.proof || "Reject proven");
              setTab("builder");
            } catch (e) {
              setErr(String(e.message || e));
            } finally {
              setBusy(false);
            }
          }}
        >
          Reject
        </button>
        <button type="button" className="ghost" disabled={busy} onClick={() => setTab("builder")}>
          HQ
        </button>
        <button type="button" className="ghost" disabled={busy} onClick={() => setTab("agent")}>
          Agent
        </button>
        <button type="button" className="ghost" disabled={busy} onClick={() => setTab("hybrid")}>
          Edge
        </button>
        <button type="button" className="ghost" disabled={busy} onClick={runSystem}>
          System
        </button>
        <button type="button" className="ghost" disabled={busy} onClick={() => setTab("judge")}>
          Proof
        </button>
        <button type="button" className="ghost" disabled={busy} onClick={() => setTab("cloud")}>
          Cloud
        </button>
        <button type="button" className="ghost" disabled={busy} onClick={() => setTab("poly")}>
          Polyglot
        </button>
        <button type="button" className="ghost" disabled={busy} onClick={() => setTab("usecases")}>
          Use cases
        </button>
        <button type="button" className="ghost" disabled={busy} onClick={() => setTab("tools")}>
          Tools
        </button>
        <button type="button" className="ghost" disabled={busy} onClick={() => setTab("term")}>
          Term
        </button>
        <button type="button" className="ghost" disabled={busy} onClick={() => setTab("local")}>
          Local AI
        </button>
        <button type="button" className="ghost" disabled={busy} onClick={() => setTab("desk")}>
          Desk
        </button>
        <button type="button" className="ghost" disabled={busy} onClick={() => setTab("hq")}>
          HQ
        </button>
        <button type="button" className="ghost" disabled={busy} onClick={runDeskArena}>
          Arena
        </button>
        <button type="button" className="ghost" disabled={busy} onClick={runCompany}>
          Staff company
        </button>
        <button
          type="button"
          className="ghost"
          disabled={busy}
          onClick={() => connectBrowserWallet("metamask")}
        >
          Link wallet
        </button>
        <span className="use-bar-meta muted sm">
          API <code>{API_BASE || "/"}</code>
          {systemRun?.ok ? " · system OK" : systemRun ? " · system ran" : ""}
          {desk ? ` · desk ${Number(desk.equity || 0).toFixed(0)}` : ""}
        </span>
      </div>

      <nav className="tabs">
        {[
          ["builder", "BUILDER"],
          ["agent", "AGENT"],
          ["live", "PLATFORM"],
          ["usecases", "USE CASES"],
          ["tools", "TOOLS"],
          ["term", "TERM"],
          ["hybrid", "HYBRID"],
          ["cloud", "CLOUD"],
          ["poly", "POLYGLOT"],
          ["local", "LOCAL AI"],
          ["hq", "HQ"],
          ["home", "DAILY"],
          ["ai", "AI"],
          ["desk", "DESK"],
          ["vaults", "VAULTS"],
          ["academy", "ACADEMY"],
          ["studio", "STUDIO"],
          ["ide", "IDE"],
          ["nomos", "NOMOS"],
          ["codex", "CODEX"],
          ["judge", "PROOF"],
        ].map(([id, label]) => (
          <button key={id} type="button" className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      {tab === "builder" && (
        <BuilderHome
          api={api}
          network={network}
          busy={busy}
          onNavigate={setTab}
          onRunSystem={runSystem}
          onRefreshHome={refresh}
        />
      )}

      {tab === "agent" && (
        <AgentPanel api={api} network={network} busy={busy} onNavigate={setTab} />
      )}

      {tab === "live" && !systemRun && (
        <div className="start-here">
          <div>
            <span className="eyebrow">MONADBUILDER · START HERE · AI DELIVERS</span>
            <ol className="pillars start-steps">
              <li>
                <b>BUILDER</b> — AI brief + one-tap morning (streak + XP)
              </li>
              <li>
                <b>AI MORNING</b> — sticky bar runs check-in · gas · reject · signal
              </li>
              <li>
                <b>TERM / TOOLS</b> — auto loop · signals · PDF · hybrid workers
              </li>
              <li>
                <b>PROOF</b> — win path for Spark judges
              </li>
            </ol>
          </div>
          <div className="chips tight">
            <button type="button" className="forge" disabled={busy} onClick={() => setTab("builder")}>
              OPEN BUILDER
            </button>
            <button type="button" className="ghost" disabled={busy} onClick={runSystem}>
              ▶ RUN SYSTEM
            </button>
            <button type="button" className="ghost" disabled={busy} onClick={() => setTab("judge")}>
              PROOF
            </button>
          </div>
        </div>
      )}

      {tab === "tools" && (
        <Tools
          api={api}
          network={network}
          busy={busy}
          onNavigate={setTab}
          onRunSystem={runSystem}
        />
      )}

      {tab === "term" && (
        <Terminal api={api} network={network} busy={busy} onNavigate={setTab} />
      )}

      {tab === "hybrid" && (
        <HybridHub
          api={api}
          network={network}
          busy={busy}
          onNavigate={setTab}
          onRunSystem={runSystem}
        />
      )}

      {tab === "usecases" && (
        <UseCases
          api={api}
          busy={busy}
          onNavigate={setTab}
          onRunSystem={runSystem}
          onAction={async (action, payload = {}) => {
            if (action === "desk_arena") return runDeskArena();
            if (action === "run_company") return runCompany();
            if (action === "connect_wallet")
              return connectBrowserWallet(payload.kind || "metamask");
            if (action === "run_system") return runSystem();
          }}
        />
      )}

      {tab === "cloud" && (
        <CloudEngines
          api={api}
          network={network}
          busy={busy}
          onNavigate={setTab}
          onRunSystem={runSystem}
        />
      )}

      {tab === "poly" && (
        <PolyglotHub
          api={api}
          network={network}
          busy={busy}
          onNavigate={setTab}
          onRunSystem={runSystem}
        />
      )}

      {tab === "local" && (
        <LocalAI
          api={api}
          network={network}
          busy={busy}
          onNavigate={setTab}
          onRunSystem={runSystem}
        />
      )}

      {tab === "live" && (
        <Landing
          api={api}
          network={network}
          busy={busy}
          winPath={winPath}
          systemRun={systemRun}
          onNavigate={setTab}
          onAction={async (action, payload = {}) => {
            try {
              if (action === "run_system" || action === "system_run") return runSystem();
              if (action === "win_path") return runWinPath();
              if (action === "platform_invoke") {
                if (payload.appId === "app.company" && payload.action === "run") return runCompany();
                if (payload.appId === "app.desk" && payload.action === "arena") return runDeskArena();
                if (payload.appId === "app.cloud") return runSystem();
                if (payload.appId === "app.shell" && (payload.action === "run" || payload.action === "system"))
                  return runSystem();
                return;
              }
              if (action === "run_company") return runCompany();
              if (action === "connect_wallet")
                return connectBrowserWallet(payload.kind || "metamask");
              if (action === "manual_wallet") return manualLinkWallet();
              if (action === "sync_twins") {
                setBusy(true);
                setErr("");
                try {
                  const syn = await api("/wallets/sync-twins", { method: "POST", body: "{}" });
                  setSandbox(await api("/sandbox"));
                  setWallets(await api("/wallets"));
                  setAiNode(await api("/ai"));
                  flash(`Synced ${syn.synced?.length || 0} twins`);
                } finally {
                  setBusy(false);
                }
                return;
              }
              if (action === "desk_arena") return runDeskArena();
              if (action === "refresh_marks") return refreshMarks();
              if (action === "run_strategy") return runStrategy(payload.id || "market-make");
              if (action === "forge") {
                setTab("studio");
                return runPipeline();
              }
              if (action === "open_project") {
                if (payload.projectId) return openProject(payload.projectId);
                setTab("ide");
                return;
              }
              if (action === "vault_route") {
                let tid = payload.ticketId;
                if (!tid) {
                  const d = desk || (await api("/desk"));
                  const t = (d.tickets_recent || []).find((x) =>
                    ["risk_accepted", "paper_filled", "routed_sim"].includes(x.status)
                  );
                  tid = t?.ticket_id;
                }
                if (!tid) {
                  await runDeskArena();
                  const d2 = await api("/desk");
                  const t2 = (d2.tickets_recent || []).find((x) =>
                    ["risk_accepted", "paper_filled", "routed_sim"].includes(x.status)
                  );
                  if (t2?.ticket_id) return routeVault(t2.ticket_id);
                  flash("No routable ticket yet — accept one on DESK");
                  setTab("desk");
                  return;
                }
                setTab("desk");
                return routeVault(tid);
              }
              if (action === "ai_chat") {
                setTab("ai");
                return;
              }
              if (action === "daily" || action === "gas") {
                setTab("home");
                return;
              }
              if (action === "academy") {
                setTab("academy");
                return;
              }
              if (payload.href) setTab(payload.href);
            } catch (e) {
              setErr(String(e.message || e));
              setBusy(false);
            }
          }}
        />
      )}

      {tab === "hq" && (
        <section className="panel home">
          <div className="hero-card">
            <div>
              <span className="eyebrow">COMMAND CENTER</span>
              <h2>{hq?.pitch?.one_liner || "Your miniature DeFi company for Monad."}</h2>
              <p className="muted">
                Python departments are the workforce. Contracts are the laws. This app is headquarters. You remain
                sovereign.
              </p>
              <label>OWNER OBJECTIVE</label>
              <textarea
                rows={3}
                value={companyObjective}
                onChange={(e) => setCompanyObjective(e.target.value)}
              />
              <button type="button" className="forge" disabled={busy} onClick={runCompany}>
                ASSIGN THESIS (GM) → STAFF ALL DEPARTMENTS
              </button>
            </div>
            <div className="hero-side">
              <div className="orb small">
                <b>{hq?.performance?.kpis?.missions_completed ?? 0}</b>
                <span>DONE</span>
              </div>
              <div className="kv">
                <span>Time saved</span>
                <b>{Number(hq?.performance?.kpis?.time_saved_minutes || 0).toFixed(0)}m</b>
              </div>
              <div className="kv">
                <span>Policy blocks</span>
                <b>{hq?.performance?.kpis?.policy_violations_blocked ?? 0}</b>
              </div>
              <div className="kv">
                <span>Lessons</span>
                <b>{hq?.performance?.kpis?.lessons_completed ?? 0}</b>
              </div>
            </div>
          </div>

          <div className="grid3">
            <article className="result">
              <label>MORNING BRIEF</label>
              <p>{hq?.brief?.narrative}</p>
              <ul className="pillars">
                {(hq?.brief?.bullets || []).map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <button
                type="button"
                className="ghost block"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const b = await api("/company/brief");
                    setHq((h) => ({ ...(h || {}), brief: b }));
                  } catch (e) {
                    setErr(String(e.message || e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Refresh brief
              </button>
            </article>

            <article>
              <label>MANAGER INBOX</label>
              <div className="mission-list">
                {(hq?.inbox?.items || []).length === 0 ? (
                  <p className="muted sm">{hq?.inbox?.empty_hint || "No items — run THESIS."}</p>
                ) : (
                  (hq.inbox.items || []).map((it, i) => (
                    <div
                      key={it.mission_id + it.title + i}
                      className={`mission ${it.priority === "rejected" ? "done" : ""}`}
                    >
                      <header>
                        <b>{it.title}</b>
                        <Pill
                          ok={it.priority === "recommended" || it.priority === "optional"}
                          warn={it.priority === "learning"}
                        >
                          {it.priority}
                        </Pill>
                      </header>
                      <p className="muted sm">{it.objective}</p>
                      {it.mission_id && it.status !== "learning" && it.priority !== "rejected" && (
                        <button type="button" className="ghost" disabled={busy} onClick={() => openMission(it.mission_id)}>
                          Open mission room
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="result">
              <label>COMPANY PERFORMANCE</label>
              <p className="muted sm">{hq?.performance?.narrative}</p>
              {Object.entries(hq?.performance?.kpis || {}).map(([k, v]) => (
                <div className="kv" key={k}>
                  <span>{k.replace(/_/g, " ")}</span>
                  <b>{v == null ? "—" : typeof v === "number" ? Number(v).toFixed?.(2) ?? v : String(v)}</b>
                </div>
              ))}
              <label>Owner constitution</label>
              <p className="muted sm">
                Liquid ≥{(hq?.constitution?.constitution?.min_liquid_reserve_bps || 0) / 100}% · Max protocol{" "}
                {(hq?.constitution?.constitution?.max_protocol_exposure_bps || 0) / 100}% · Leverage{" "}
                {hq?.constitution?.constitution?.allow_leverage ? "ON" : "OFF"}
              </p>
              <label>Ecosystem laws (runtime embed)</label>
              <div className="kv">
                <span>Embedded</span>
                <Pill ok={!!hq?.ecosystem_laws?.embedded}>{String(!!hq?.ecosystem_laws?.embedded)}</Pill>
              </div>
              <div className="kv">
                <span>Law count</span>
                <b>{hq?.ecosystem_laws?.law_count ?? "—"}</b>
              </div>
              <div className="kv">
                <span>Domains</span>
                <b className="muted sm">{(hq?.ecosystem_laws?.domains || []).join(", ")}</b>
              </div>
              <p className="muted sm">
                {hq?.ecosystem_laws?.doctrine ||
                  "Owner constitution AND Monad/protocol/safety laws load at runtime for every mission."}
              </p>
              <p className="muted sm">
                Scale: {hq?.performance?.scaling?.now} → {(hq?.performance?.scaling?.next || []).join(" · ")}
              </p>
            </article>
          </div>

          {missionRoom && (
            <article className="result mission-room">
              <label>MISSION ROOM</label>
              <h3>{missionRoom.title}</h3>
              <p className="muted">{missionRoom.objective}</p>
              <div className="kv">
                <span>Status</span>
                <Pill ok={missionRoom.status === "awaiting_approval" || missionRoom.status === "completed"}>
                  {missionRoom.status}
                </Pill>
              </div>
              <div className="kv">
                <span>Winner</span>
                <b>{missionRoom.winner?.agent || "—"}</b>
              </div>
              {missionRoom.law_stack && (
                <div className="ai">
                  <b>Dual law stack</b>
                  <p className="muted sm">
                    Owner constitution: {String(missionRoom.law_stack.owner_constitution)} · Ecosystem laws:{" "}
                    {missionRoom.law_stack.ecosystem_law_count} (
                    {(missionRoom.law_stack.ecosystem_domains || []).join(", ")})
                  </p>
                </div>
              )}
              <label>Departments</label>
              <div className="plans">
                {(missionRoom.reports || []).map((r, i) => (
                  <div key={i} className={`plan ${r.status === "ok" ? "yes" : "no"}`}>
                    <header>
                      <b>{r.department}</b>
                      <Pill ok={r.sla_met} warn={!r.sla_met}>
                        {r.sla_met ? "SLA" : "SLA!"} {Number(r.latency_ms || 0).toFixed(0)}ms
                      </Pill>
                    </header>
                    <p>{r.summary}</p>
                  </div>
                ))}
              </div>
              <label>Competing plans</label>
              {(missionRoom.proposals || []).map((p, i) => (
                <div key={i} className={`plan ${p.lawful ? "yes" : "no"}`}>
                  <header>
                    <b>
                      {p.agent}: {p.title}
                    </b>
                    <Pill ok={p.lawful}>{p.lawful ? "LAWFUL" : "BLOCKED"}</Pill>
                  </header>
                  <p className="muted sm">{p.thesis}</p>
                  {!p.lawful && (
                    <ul>
                      {(p.violations || []).map((v) => (
                        <li key={v}>{v}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              <label>Transactions (PRAXIS)</label>
              <ol className="pillars">
                {(missionRoom.transactions || []).map((t) => (
                  <li key={t.seq}>
                    {t.seq}. {t.step}{" "}
                    {t.requires_user_signature ? <em>(signature)</em> : null}
                  </li>
                ))}
              </ol>
              <label>ACADEMY</label>
              <p className="ai">{missionRoom.academy_lesson || missionRoom.explanation}</p>
              <div className="chips">
                <button type="button" className="forge" disabled={busy} onClick={() => decideMission("approve")}>
                  Approve
                </button>
                <button type="button" className="ghost" disabled={busy} onClick={() => decideMission("reject")}>
                  Reject
                </button>
                <button type="button" className="ghost" disabled={busy} onClick={() => decideMission("simulate_again")}>
                  Simulate again
                </button>
              </div>
            </article>
          )}
        </section>
      )}

      {tab === "home" && (
        <section className="panel home">
          <div className="hero-card">
            <div>
              <span className="eyebrow">EVERYDAY PROBLEM</span>
              <h2>{home?.pitch?.problem || "DeFi confuses. Bots scare. Tabs multiply."}</h2>
              <p className="muted">{home?.pitch?.solution}</p>
              <div className="progress fat">
                <div className="bar" style={{ width: `${home?.progress?.pct || 0}%` }} />
              </div>
              <p className="muted sm">
                Today {home?.progress?.completed || 0}/{home?.progress?.total || 5} ·{" "}
                {home?.intelligence?.headline}
              </p>
              {home?.next_best_action && home.next_best_action.mission_id !== "done" && (
                <button
                  type="button"
                  className="forge"
                  disabled={busy}
                  onClick={() => {
                    const id = home.next_best_action.mission_id;
                    if (id === "checkin") doMission("checkin");
                    else if (id === "gas-tip") doMission("gas-tip", { acknowledged: true });
                    else if (id === "desk-arena") doMission("desk-arena");
                    else if (id === "academy-lab") doMission("academy-lab");
                    else if (id === "ecosystem-glance") doMission("ecosystem-glance", { viewed: true });
                  }}
                >
                  {home.next_best_action.cta || "Continue"} →
                </button>
              )}
              {home?.progress?.all_clear && (
                <p className="cert">Daily clear. See you tomorrow — streak protected.</p>
              )}
            </div>
            <div className="hero-side">
              <div className="orb small">
                <b>{home?.level ?? 1}</b>
                <span>LEVEL</span>
              </div>
              <div className="kv">
                <span>Best streak</span>
                <b>{home?.best_streak ?? 0}d</b>
              </div>
              <div className="kv">
                <span>Desk equity</span>
                <b>{Number(home?.desk_pulse?.equity || 0).toFixed(0)}</b>
              </div>
            </div>
          </div>

          <div className="grid3">
            <article>
              <label>TODAY&apos;S MISSIONS</label>
              <div className="mission-list">
                {(home?.missions || []).map((m) => (
                  <div key={m.id} className={`mission ${m.done ? "done" : ""}`}>
                    <header>
                      <b>{m.title}</b>
                      <Pill ok={m.done}>{m.done ? "DONE" : `+${m.xp} XP`}</Pill>
                    </header>
                    <p className="muted sm">{m.problem}</p>
                    <p className="muted sm">
                      <b>Do:</b> {m.do}
                    </p>
                    {!m.done && (
                      <button
                        type="button"
                        className="ghost"
                        disabled={busy}
                        onClick={() => {
                          if (m.id === "checkin") doMission("checkin");
                          else if (m.id === "gas-tip") doMission("gas-tip", { acknowledged: true });
                          else if (m.id === "desk-arena") doMission("desk-arena");
                          else if (m.id === "academy-lab") doMission("academy-lab");
                          else if (m.id === "ecosystem-glance")
                            doMission("ecosystem-glance", { viewed: true });
                        }}
                      >
                        {m.cta}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </article>

            <article className="result">
              <label>COACH · GAS · INTEL</label>
              {(coach?.tips || []).slice(0, 4).map((t, i) => (
                <div key={i} className="proto">
                  <b>
                    {t.kind}: {t.title}
                  </b>
                  <p className="muted sm">{t.body}</p>
                </div>
              ))}
              {home?.gas_coach?.tip && (
                <div className="ai">
                  <b>{home.gas_coach.tip.title}</b>
                  <p>{home.gas_coach.tip.body}</p>
                  <p className="muted sm">{home.gas_coach.tip.roommate}</p>
                  {home.gas_coach.demo_margin && (
                    <p className="muted sm">
                      Example: estimate {home.gas_coach.demo_margin.estimated_gas} → limit{" "}
                      {home.gas_coach.demo_margin.recommended_gas_limit} (Monad ~7.5% buffer)
                    </p>
                  )}
                </div>
              )}
              <button
                type="button"
                className="ghost block"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const r = await api("/intelligence/reject-demo", { method: "POST", body: "{}" });
                    flash(r.lesson || "Reject demo done");
                    setDeskArena({
                      n_accepted: 0,
                      n_rejected: r.n_rejected,
                      results: r.sample ? [r.sample] : [],
                    });
                  } catch (e) {
                    setErr(String(e.message || e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                One-tap: show a reject
              </button>
            </article>

            <article className="result">
              <label>ECOSYSTEM · REWARDS</label>
              {home?.featured_asset && (
                <div className="proto featured">
                  <span className="eyebrow">FEATURED ASSET</span>
                  <b>
                    {home.featured_asset.symbol} · {home.featured_asset.name}
                  </b>
                  {home.featured_asset.address && home.featured_asset.address.startsWith("0x") && (
                    <code className="sm">{home.featured_asset.address}</code>
                  )}
                  <p className="muted sm">Verify on explorer — never invent addresses (MONSKILLS).</p>
                </div>
              )}
              <label>Badges</label>
              <div className="badge-row">
                {(home?.badges || []).map((b) => (
                  <span key={b.id} className={`badge ${b.earned ? "on" : ""}`} title={b.desc}>
                    {b.name}
                  </span>
                ))}
              </div>
              <label>Why come back daily</label>
              <ul className="pillars">
                <li>Streak XP bonus compounds healthy risk habits</li>
                <li>Rotating academy labs = new DeFi lesson every day</li>
                <li>Desk arena always finds a reject to celebrate</li>
                <li>Gas tip rotates — Monad bills the limit</li>
              </ul>
              {(ecosystem?.problems || []).slice(0, 2).map((p) => (
                <div key={p.id} className="proto">
                  <b>{p.problem}</b>
                  <p className="muted sm">{p.roommate}</p>
                </div>
              ))}
            </article>
          </div>
        </section>
      )}

      {tab === "studio" && (
        <section className="panel">
          <div className="grid3">
            <article>
              <label>PROJECT</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
              <label>OBJECTIVE</label>
              <textarea value={objective} onChange={(e) => setObjective(e.target.value)} rows={5} />
              <label>NETWORK</label>
              <div className="chips">
                {[
                  ["monad-testnet", "Testnet 10143"],
                  ["monad-mainnet", "Mainnet 143"],
                ].map(([id, lab]) => (
                  <button key={id} type="button" className={network === id ? "on" : ""} onClick={() => setNetwork(id)}>
                    {lab}
                  </button>
                ))}
              </div>
              <label>PLANES</label>
              <div className="chips">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={selected.includes(c) ? "on" : ""}
                    onClick={() => setSelected((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]))}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <label>LAWBOOK QUICK</label>
              {[
                ["max_slippage_bps", "Slippage"],
                ["max_action_value", "Max value"],
              ].map(([k, lab]) => (
                <div className="field" key={k}>
                  <span>{lab}</span>
                  <input
                    type="number"
                    value={policy[k]}
                    onChange={(e) => setPolicy((p) => ({ ...p, [k]: Number(e.target.value) }))}
                  />
                </div>
              ))}
              <button type="button" className="forge" disabled={busy} onClick={runPipeline}>
                RUN FULL PIPELINE →
              </button>
              <button type="button" className="ghost block" disabled={busy} onClick={runArenaAuto}>
                Arena only
              </button>
            </article>

            <article className="result">
              <label>PIPELINE EVENTS</label>
              {!pipeline ? (
                <p className="muted">Run pipeline to emit 11 explainability stages (builder + agent + judge surfaces).</p>
              ) : (
                <>
                  <div className="progress">
                    <div className="bar" style={{ width: `${progress?.pct || 0}%` }} />
                  </div>
                  <div className="kv">
                    <span>Progress</span>
                    <b>
                      {progress?.complete}/{progress?.total} complete · {progress?.blocked || 0} blocked
                    </b>
                  </div>
                  <div className="kv">
                    <span>Package</span>
                    <b>{pipeline.file_stats?.n_files || 0} files</b>
                  </div>
                  <div className="kv">
                    <span>Project</span>
                    <code>{pipeline.project_id}</code>
                  </div>
                  <div className="events">
                    {(pipeline.events || []).map((ev) => (
                      <div key={ev.event_uid || ev.id} className={`ev ${ev.status}`}>
                        <header>
                          <StatusDot status={ev.status} />
                          <b>{ev.name}</b>
                          <span className="actor">{ev.actor}</span>
                        </header>
                        <p>{ev.plain_language}</p>
                        {ev.resolution ? <p className="res">{ev.resolution}</p> : null}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </article>

            <article className="result">
              <label>WORKSPACE</label>
              <p className="muted sm">Persisted under projects/ — reload anytime in IDE.</p>
              <div className="proj-list">
                {projects.length === 0 ? (
                  <p className="muted">No saved projects yet.</p>
                ) : (
                  projects.map((p) => (
                    <button key={p.project_id} type="button" className="option" onClick={() => openProject(p.project_id)}>
                      <b>{p.project_id}</b>
                      <span>
                        {p.n_files || "?"} files · chain {p.chain_id || "?"}
                      </span>
                    </button>
                  ))
                )}
              </div>
              {pipeline?.receipt && (
                <div className="kv">
                  <span>Release receipt</span>
                  <code>{String(pipeline.receipt.receipt_hash || pipeline.receipt).slice(0, 20)}…</code>
                </div>
              )}
            </article>
          </div>
        </section>
      )}

      {tab === "ide" && (
        <section className="panel ide">
          <aside className="tree">
            <label>PACKAGE</label>
            {fileList.length === 0 ? (
              <p className="muted sm">Run STUDIO pipeline first.</p>
            ) : (
              fileList.map((p) => (
                <button key={p} type="button" className={activeFile === p ? "on" : ""} onClick={() => setFilePath(p)}>
                  {p}
                </button>
              ))
            )}
          </aside>
          <article className="editor">
            <label>{activeFile || "NO FILE"}</label>
            <pre className="code">{fileContent || "// empty"}</pre>
          </article>
          <aside className="ide-side">
            <label>MANIFEST</label>
            {pipeline?.manifest ? (
              <>
                <div className="kv">
                  <span>Hash</span>
                  <code>{pipeline.manifest.manifest_hash?.slice(0, 16)}…</code>
                </div>
                <div className="kv">
                  <span>Chain</span>
                  <b>{pipeline.manifest.chain_id}</b>
                </div>
                <div className="kv">
                  <span>Contracts</span>
                  <b>{(pipeline.manifest.contracts || []).length}</b>
                </div>
                <label>DEPLOY</label>
                <pre className="code sm">
                  {pipeline.manifest.deploy_plan?.commands?.deploy_script}
                  {"\n"}
                  {pipeline.manifest.deploy_plan?.commands?.forge_script}
                </pre>
              </>
            ) : (
              <p className="muted">No manifest loaded.</p>
            )}
          </aside>
        </section>
      )}

      {tab === "nomos" && (
        <Nomos
          api={api}
          policy={policy}
          setPolicy={setPolicy}
          buildBody={buildBody}
          arena={arena}
          setArena={setArena}
          busy={busy}
          onNavigate={setTab}
          onRunSystem={runSystem}
          onDeskArena={runDeskArena}
          onCompanyRun={runCompany}
        />
      )}

      {tab === "ai" && (
        <section className="panel">
          <div className="grid3">
            <article>
              <label>AI ECOSYSTEM NODE</label>
              <p className="muted sm">
                Sandbox-bound DeFi intelligence. Holds <b>digital twins</b> of your coins — never Phantom/MetaMask private
                keys. Mutations stay inside sandbox technology until you promote with a real signature.
              </p>
              <div className="kv">
                <span>Node</span>
                <code>{aiNode?.node?.node_id?.slice(0, 14) || "…"}…</code>
              </div>
              <div className="kv">
                <span>AI wallet</span>
                <code>{aiNode?.node?.ai_wallet?.wallet_id?.slice(0, 12) || "…"}…</code>
              </div>
              <div className="kv">
                <span>Real key access</span>
                <Pill ok={false}>{String(aiNode?.capabilities?.real_key_access)}</Pill>
              </div>
              <div className="kv">
                <span>Sandbox only</span>
                <Pill ok={aiNode?.capabilities?.sandbox_only_mutations}>true</Pill>
              </div>
              <label>CONNECT WALLETS (PUBLIC ONLY)</label>
              <button type="button" className="forge" disabled={busy} onClick={() => connectBrowserWallet("phantom")}>
                Connect Phantom
              </button>
              <button
                type="button"
                className="ghost block"
                disabled={busy}
                onClick={() => connectBrowserWallet("metamask")}
              >
                Connect MetaMask / injected EVM
              </button>
              <button type="button" className="ghost block" disabled={busy} onClick={manualLinkWallet}>
                Watch-only address
              </button>
              <button
                type="button"
                className="ghost block"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const syn = await api("/wallets/sync-twins", { method: "POST", body: "{}" });
                    setSandbox(await api("/sandbox"));
                    flash(`Synced ${syn.synced?.length || 0} digital twins`);
                  } catch (e) {
                    setErr(String(e.message || e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Sync twins → AI wallet
              </button>
              <label>LINKED</label>
              {(wallets?.links || []).length === 0 ? (
                <p className="muted sm">No wallets linked yet.</p>
              ) : (
                (wallets.links || []).map((w) => (
                  <div key={w.link_id} className="proto">
                    <b>
                      {w.kind} · {w.label}
                    </b>
                    <code className="sm">{w.address}</code>
                    <p className="muted sm">{w.chain}</p>
                  </div>
                ))
              )}
            </article>

            <article className="result ai-chat">
              <label>NODE CHAT · TEXT OUT · STT IN</label>
              <div className="chat-log">
                {aiChatLog.length === 0 && (
                  <p className="muted sm">
                    Type or dictate: “daily brief”, “run my morning”, “sync twins”, “show a reject”.
                    Replies are text only — no robot voice.
                  </p>
                )}
                {aiChatLog.map((m, i) => (
                  <div key={i} className={`chat-bubble ${m.role}`}>
                    <em>{m.role}</em>
                    <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
                  </div>
                ))}
              </div>
              <textarea
                rows={3}
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendAiChat();
                  }
                }}
                placeholder="Type or use mic (speech-to-text)…"
              />
              <div className="chips tight" style={{ marginTop: 8 }}>
                <MicButton
                  label="Dictate"
                  disabled={busy}
                  onPartial={(t) => setAiInput(t)}
                  onText={(t) => setAiInput(t)}
                />
                <button type="button" className="forge" disabled={busy} onClick={sendAiChat}>
                  Send to AI node →
                </button>
              </div>
            </article>

            <article className="result">
              <label>SANDBOX · TWIN LEDGER</label>
              <div className="kv">
                <span>Sandbox</span>
                <code>{sandbox?.sandbox?.sandbox_id?.slice(0, 14) || "—"}…</code>
              </div>
              <div className="kv">
                <span>Mode</span>
                <b>{sandbox?.sandbox?.mode}</b>
              </div>
              <div className="kv">
                <span>Killed</span>
                <Pill ok={!sandbox?.sandbox?.killed}>{String(!!sandbox?.sandbox?.killed)}</Pill>
              </div>
              <label>Digital twins</label>
              {Object.keys(sandbox?.sandbox?.twins || {}).length === 0 ? (
                <p className="muted sm">Empty — connect wallet + sync.</p>
              ) : (
                Object.values(sandbox.sandbox.twins).map((t) => (
                  <div key={t.symbol} className="proto">
                    <b>
                      {t.symbol}: {t.amount}
                    </b>
                    <p className="muted sm">
                      twin of {t.twin_of} · {t.synced ? "synced" : "dirty (AI mutated)"}
                    </p>
                  </div>
                ))
              )}
              <label>Doctrine</label>
              <ul className="pillars">
                {(sandbox?.doctrine || []).map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
              <button type="button" className="ghost block" disabled={busy} onClick={killSandbox}>
                Kill switch (freeze sandbox)
              </button>
              {(sandbox?.sandbox?.events || []).slice(0, 6).map((ev) => (
                <div key={ev.event_id} className="proto">
                  <b>{ev.kind}</b>
                  <p className="muted sm">{ev.detail}</p>
                </div>
              ))}
            </article>
          </div>
        </section>
      )}

      {tab === "desk" && (
        <section className="panel">
          <div className="grid3 desk-grid">
            <article>
              <label>TRADING BUSINESS DESK</label>
              <p className="muted sm">
                Agent tickets pass <b>desk risk + NOMOS</b>. Paper fills update the book. Live venue keys never enter the
                browser — SovereignVault remains the onchain capital gate.
              </p>
              {desk && (
                <>
                  <div className="kv">
                    <span>Cash USDC</span>
                    <b>{Number(desk.cash_usdc).toFixed(2)}</b>
                  </div>
                  <div className="kv">
                    <span>Equity</span>
                    <b>{Number(desk.equity).toFixed(2)}</b>
                  </div>
                  <div className="kv">
                    <span>Day PnL</span>
                    <b className={desk.day_pnl >= 0 ? "up" : "down"}>{Number(desk.day_pnl).toFixed(2)}</b>
                  </div>
                  <div className="kv">
                    <span>Realized / Unrealized</span>
                    <b>
                      {Number(desk.realized_pnl).toFixed(2)} / {Number(desk.unrealized_pnl).toFixed(2)}
                    </b>
                  </div>
                  <div className="kv">
                    <span>Mode</span>
                    <Pill ok={desk.paper_mode}>{desk.paper_mode ? "PAPER" : "LIVE*"}</Pill>
                  </div>
                </>
              )}
              <button type="button" className="forge" disabled={busy} onClick={runDeskArena}>
                RUN DESK ARENA (agents) →
              </button>
              <button type="button" className="ghost block" disabled={busy} onClick={refreshMarks}>
                Refresh live marks
              </button>
              {markFeed && (
                <p className="muted sm">
                  Marks · {markFeed.meta?.entropy || "feed"} · MON{" "}
                  {markFeed.marks?.["MON/USDC"]?.toFixed?.(4) ?? markFeed.marks?.["MON/USDC"]}
                </p>
              )}
              <label>STRATEGIES</label>
              <div className="chips col">
                {(desk?.strategies || [
                  { id: "market-make", name: "Market make" },
                  { id: "inventory", name: "Inventory" },
                  { id: "take-profit", name: "Take profit" },
                ]).map((s) => (
                  <button key={s.id} type="button" className="on" disabled={busy} onClick={() => runStrategy(s.id)}>
                    {s.name || s.id}
                    {s.tagline ? ` — ${s.tagline}` : ""}
                  </button>
                ))}
              </div>
              {strategyRun && (
                <p className="muted sm">
                  Strategy {strategyRun.strategy?.id}: {strategyRun.n_accepted} accept / {strategyRun.n_rejected}{" "}
                  reject
                </p>
              )}
              <button type="button" className="ghost block" disabled={busy} onClick={resetDeskBook}>
                Reset paper book
              </button>
              <label>NEW TICKET</label>
              <div className="field">
                <span>Venue</span>
                <select
                  value={ticketForm.venue_id}
                  onChange={(e) => {
                    const venue_id = e.target.value;
                    const v = (desk?.venues || []).find((x) => x.id === venue_id);
                    const pair = v?.pairs?.[0] || ticketForm.pair;
                    setTicketForm((f) => ({
                      ...f,
                      venue_id,
                      pair,
                      limit_price: desk?.marks?.[pair] || f.limit_price,
                    }));
                  }}
                >
                  {(desk?.venues || [])
                    .filter((v) => v.kind !== "analytics" && v.kind !== "custody_gate")
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="field">
                <span>Pair</span>
                <select
                  value={ticketForm.pair}
                  onChange={(e) =>
                    setTicketForm((f) => ({
                      ...f,
                      pair: e.target.value,
                      limit_price: desk?.marks?.[e.target.value] || f.limit_price,
                    }))
                  }
                >
                  {(
                    (desk?.venues || []).find((v) => v.id === ticketForm.venue_id)?.pairs || [
                      ticketForm.pair,
                    ]
                  ).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <span>Side</span>
                <select
                  value={ticketForm.side}
                  onChange={(e) => setTicketForm((f) => ({ ...f, side: e.target.value }))}
                >
                  <option value="buy">buy</option>
                  <option value="sell">sell</option>
                </select>
              </div>
              <div className="field">
                <span>Order type</span>
                <select
                  value={ticketForm.order_type}
                  onChange={(e) => setTicketForm((f) => ({ ...f, order_type: e.target.value }))}
                >
                  <option value="market">market</option>
                  <option value="limit">limit</option>
                  <option value="stop">stop</option>
                  <option value="stop_limit">stop_limit</option>
                </select>
              </div>
              {[
                ["qty", "Qty"],
                ["limit_price", "Limit"],
                ["slippage_bps", "Slip bps"],
              ].map(([k, lab]) => (
                <div className="field" key={k}>
                  <span>{lab}</span>
                  <input
                    type="number"
                    value={ticketForm[k]}
                    onChange={(e) => setTicketForm((f) => ({ ...f, [k]: Number(e.target.value) }))}
                  />
                </div>
              ))}
              {(ticketForm.order_type === "stop" || ticketForm.order_type === "stop_limit") && (
                <div className="field">
                  <span>Stop price</span>
                  <input
                    type="number"
                    value={ticketForm.stop_price}
                    onChange={(e) => setTicketForm((f) => ({ ...f, stop_price: Number(e.target.value) }))}
                  />
                </div>
              )}
              <input
                value={ticketForm.rationale}
                onChange={(e) => setTicketForm((f) => ({ ...f, rationale: e.target.value }))}
                placeholder="Rationale"
              />
              <button type="button" className="forge" disabled={busy} onClick={submitTicket}>
                SUBMIT TICKET → RISK GATE
              </button>
            </article>

            <article className="result">
              <label>DESK ARENA / RISK</label>
              {!deskArena ? (
                <p className="muted">Run desk arena to score mm / degen / arb / whale agents against trading limits.</p>
              ) : (
                <>
                  <div className="kv">
                    <span>Accepted / Rejected</span>
                    <b>
                      {deskArena.n_accepted} / {deskArena.n_rejected}
                    </b>
                  </div>
                  {deskArena.winner && (
                    <div className="winner">
                      <Pill ok>WINNER · {deskArena.winner.ticket?.agent}</Pill>
                      <p>{deskArena.winner.ticket?.rationale}</p>
                    </div>
                  )}
                  <div className="plans">
                    {(deskArena.results || []).map((r, i) => (
                      <div key={i} className={`plan ${r.accepted ? "yes" : "no"}`}>
                        <header>
                          <b>
                            {r.ticket.agent} · {r.ticket.venue_id} · {r.ticket.pair}
                          </b>
                          <Pill ok={r.accepted}>{r.accepted ? "ACCEPT" : "REJECT"}</Pill>
                        </header>
                        <p>
                          {r.ticket.side} {r.ticket.qty} @ {r.ticket.limit_price} · notional{" "}
                          {Number(r.ticket.notional || r.ticket.qty * r.ticket.limit_price).toFixed(0)}
                        </p>
                        {!r.accepted && (
                          <ul>
                            {(r.reasons || r.violations || []).map((x) => (
                              <li key={x}>{x}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </article>

            <article className="result">
              <label>BOOK · POSITIONS · TICKETS</label>
              <label>Positions</label>
              {(desk?.positions || []).length === 0 ? (
                <p className="muted sm">Flat.</p>
              ) : (
                (desk.positions || []).map((p) => (
                  <div key={p.venue_id + p.pair} className="proto">
                    <b>
                      {p.pair} · {p.venue_id}
                    </b>
                    <div className="muted sm">
                      qty {p.qty.toFixed?.(4) ?? p.qty} · avg {Number(p.avg_price).toFixed(4)} · uPnL{" "}
                      {Number(p.unrealized_pnl).toFixed(2)}
                    </div>
                  </div>
                ))
              )}
              <label>Recent tickets</label>
              <div className="plans">
                {(desk?.tickets_recent || []).slice(0, 12).map((t) => (
                  <div
                    key={t.ticket_id}
                    className={`plan ${
                      t.status === "paper_filled" || t.status === "risk_accepted" ? "yes" : "no"
                    }`}
                  >
                    <header>
                      <b>
                        {t.side} {t.pair}
                      </b>
                      <Pill ok={t.status !== "risk_rejected"}>{t.status}</Pill>
                    </header>
                    <p>
                      {t.agent} · {t.venue_id} · {t.qty} @ {t.limit_price}
                    </p>
                    {t.status === "risk_accepted" && (
                      <button type="button" className="ghost" disabled={busy} onClick={() => fillTicket(t.ticket_id)}>
                        Paper fill
                      </button>
                    )}
                    {(t.status === "risk_accepted" ||
                      t.status === "paper_filled" ||
                      t.status === "routed_sim") && (
                      <button
                        type="button"
                        className="ghost"
                        disabled={busy}
                        onClick={() => routeVault(t.ticket_id)}
                      >
                        Vault route sim
                      </button>
                    )}
                    {t.reasons?.length > 0 && t.status === "risk_rejected" && (
                      <ul>
                        {t.reasons.slice(0, 3).map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
              {vaultRoute && (
                <>
                  <label>VAULT ROUTE</label>
                  <Pill ok={vaultRoute.would_execute}>
                    {vaultRoute.would_execute ? "WOULD EXECUTE" : "BLOCKED"}
                  </Pill>
                  <p className="muted sm">{vaultRoute.narrative}</p>
                  {vaultRoute.cast_command && <pre className="code sm">{vaultRoute.cast_command}</pre>}
                  {vaultRoute.next && <p className="muted sm">{vaultRoute.next}</p>}
                </>
              )}
              <label>Venues</label>
              <div className="proto-list" style={{ maxHeight: 160 }}>
                {(desk?.venues || []).map((v) => (
                  <div key={v.id} className="proto">
                    <b>{v.name}</b>
                    <span className="muted">
                      {" "}
                      · {v.asset_class || v.kind} · {v.adapter_status || v.atlas_status}
                    </span>
                    <p className="muted sm">{v.use}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="result">
              <label>MARKETS · BROKER READINESS</label>
              <p className="muted sm">
                Real-world asset classes modeled as paper/sandbox adapter readiness — equities, forex, and
                centralized crypto exchanges alongside Monad-native DEX/perps venues. No live brokerage keys ever
                enter this platform.
              </p>
              {brokers?.status && (
                <div className="kv">
                  <span>Broker adapters</span>
                  <b>{brokers.status.count}</b>
                </div>
              )}
              {brokers?.status?.by_asset_class && (
                <div className="chips col">
                  {Object.entries(brokers.status.by_asset_class).map(([cls, n]) => (
                    <span key={cls} className="pill ok">
                      {cls} · {n}
                    </span>
                  ))}
                </div>
              )}
              <div className="proto-list" style={{ maxHeight: 160 }}>
                {(brokers?.brokers || []).map((b) => (
                  <div key={b.id} className="proto">
                    <b>{b.name}</b>
                    <span className="muted">
                      {" "}
                      · {b.asset_class} · {b.posture}
                    </span>
                    <p className="muted sm">{b.notes}</p>
                  </div>
                ))}
              </div>

              <label>LIVE TRADING READINESS GATE</label>
              <p className="muted sm">
                Evidence-based approval packet. Completeness is informational only — live execution stays disabled
                until a manual operator cutover outside this platform.
              </p>
              {liveGate && (
                <div className="kv">
                  <span>Evidence complete</span>
                  <b>
                    {liveGate.satisfied_count} / {liveGate.total}
                  </b>
                </div>
              )}
              {liveGate && (
                <div className="chips col" style={{ maxHeight: 220, overflowY: "auto" }}>
                  {liveGate.evidence.map((e) => (
                    <button
                      key={e.key}
                      type="button"
                      className={e.satisfied ? "on" : ""}
                      disabled={busy}
                      onClick={() => toggleEvidence(e.key, !e.satisfied)}
                      title={e.label}
                    >
                      {e.satisfied ? "✓" : "○"} {e.label}
                    </button>
                  ))}
                </div>
              )}
              <button type="button" className="forge" disabled={busy} onClick={generateApprovalPacket}>
                GENERATE APPROVAL PACKET →
              </button>
              {approvalPacket && (
                <>
                  <Pill ok={approvalPacket.ready_for_live}>
                    {approvalPacket.ready_for_live ? "EVIDENCE COMPLETE" : "LIVE EXECUTION DISABLED"}
                  </Pill>
                  <p className="muted sm">{approvalPacket.posture}</p>
                  {approvalPacket.missing_evidence?.length > 0 && (
                    <ul>
                      {approvalPacket.missing_evidence.slice(0, 5).map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </article>
          </div>
        </section>
      )}

      {tab === "vaults" && (
        <section className="panel">
          <div className="grid3 vault-grid">
            <article>
              <label>AGENT VAULTS · MONAD</label>
              <p className="muted sm">
                Vault boundary → wallet → policy gate → connector → receipt evidence. Every vault is a governed
                paper envelope for an agent swarm — no custody, no live keys, no live money movement.
              </p>
              <input value={vaultName} onChange={(e) => setVaultName(e.target.value)} placeholder="Vault name" />
              <button type="button" className="forge" disabled={busy || !vaultName} onClick={createVault}>
                CREATE VAULT →
              </button>

              <label>VAULTS</label>
              <div className="chips col">
                {vaults.length === 0 && <p className="muted sm">No vaults yet — create one above.</p>}
                {vaults.map((v) => (
                  <button
                    key={v.vault_id}
                    type="button"
                    className={activeVault === v.vault_id ? "on" : ""}
                    onClick={() => setActiveVault(v.vault_id)}
                  >
                    {v.name} · {Number(v.wallets?.MON || 0).toFixed(1)} MON
                  </button>
                ))}
              </div>

              {selectedVault && (
                <>
                  <label>ADD CONNECTOR</label>
                  <div className="field">
                    <span>Venue / broker id</span>
                    <input
                      value={vaultConnectorId}
                      onChange={(e) => setVaultConnectorId(e.target.value)}
                      placeholder="kuru, alpaca_sandbox, oanda_practice…"
                    />
                  </div>
                  <button type="button" className="ghost block" disabled={busy} onClick={addVaultConnector}>
                    Attach connector
                  </button>

                  <label>REGISTER AGENT</label>
                  <div className="field">
                    <span>Agent id</span>
                    <input value={vaultAgentId} onChange={(e) => setVaultAgentId(e.target.value)} />
                  </div>
                  <div className="field">
                    <span>Role</span>
                    <input value={vaultAgentRole} onChange={(e) => setVaultAgentRole(e.target.value)} />
                  </div>
                  <button type="button" className="ghost block" disabled={busy} onClick={registerVaultAgent}>
                    Register agent
                  </button>
                </>
              )}
            </article>

            <article className="result">
              <label>{selectedVault ? `${selectedVault.name.toUpperCase()} · WALLETS` : "SELECT A VAULT"}</label>
              {selectedVault && (
                <>
                  <div className="kv">
                    <span>Network</span>
                    <b>
                      {selectedVault.network} · chain {selectedVault.chain_id}
                    </b>
                  </div>
                  {Object.entries(selectedVault.wallets || {}).map(([sym, bal]) => (
                    <div className="kv" key={sym}>
                      <span>{sym}</span>
                      <b>{Number(bal).toFixed(4)}</b>
                    </div>
                  ))}
                  <div className="kv">
                    <span>No custody</span>
                    <Pill ok={selectedVault.boundary?.no_custody}>
                      {selectedVault.boundary?.no_custody ? "ENFORCED" : "—"}
                    </Pill>
                  </div>
                  <div className="kv">
                    <span>Live execution</span>
                    <Pill ok={false}>{selectedVault.boundary?.live_execution ? "ENABLED" : "DISABLED"}</Pill>
                  </div>

                  <label>CONNECTORS</label>
                  {(selectedVault.connectors || []).length === 0 ? (
                    <p className="muted sm">No connectors attached.</p>
                  ) : (
                    <div className="chips col">
                      {selectedVault.connectors.map((c) => (
                        <span key={c.id} className="pill ok">
                          {c.name} · {c.asset_class || c.kind}
                        </span>
                      ))}
                    </div>
                  )}

                  <label>AGENTS</label>
                  {(selectedVault.agents || []).length === 0 ? (
                    <p className="muted sm">No agents registered.</p>
                  ) : (
                    <div className="chips col">
                      {selectedVault.agents.map((a) => (
                        <span key={a.agent_id} className="pill ok">
                          {a.agent_id} · {a.role}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </article>

            <article className="result">
              <label>LEDGER TRANSFER</label>
              <p className="muted sm">
                Internal paper accounting move within the vault, gated by the same NOMOS policy kernel as desk
                tickets. Never touches real funds.
              </p>
              {selectedVault && (
                <>
                  <div className="field">
                    <span>From</span>
                    <select
                      value={ledgerForm.from_symbol}
                      onChange={(e) => setLedgerForm((f) => ({ ...f, from_symbol: e.target.value }))}
                    >
                      {Object.keys(selectedVault.wallets || { MON: 0, USDC: 0 }).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <span>To</span>
                    <select
                      value={ledgerForm.to_symbol}
                      onChange={(e) => setLedgerForm((f) => ({ ...f, to_symbol: e.target.value }))}
                    >
                      {Object.keys(selectedVault.wallets || { MON: 0, USDC: 0 }).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <span>Amount</span>
                    <input
                      type="number"
                      value={ledgerForm.amount}
                      onChange={(e) => setLedgerForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                    />
                  </div>
                  <input
                    value={ledgerForm.note}
                    onChange={(e) => setLedgerForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="Note"
                  />
                  <button type="button" className="forge" disabled={busy} onClick={submitLedgerTransfer}>
                    SUBMIT TRANSFER → NOMOS GATE
                  </button>

                  <label>RECENT LEDGER ENTRIES</label>
                  <div className="plans">
                    {(selectedVault.ledger_recent || []).slice(0, 10).map((e) => (
                      <div key={e.entry_id} className={`plan ${e.accepted ? "yes" : "no"}`}>
                        <header>
                          <b>
                            {e.from_symbol} → {e.to_symbol}
                          </b>
                          <Pill ok={e.accepted}>{e.accepted ? "ACCEPT" : "REJECT"}</Pill>
                        </header>
                        <p>
                          {Number(e.amount).toFixed(4)} · {e.note}
                        </p>
                        {!e.accepted && (
                          <ul>
                            {(e.reasons?.length ? e.reasons : e.violations || []).slice(0, 3).map((r) => (
                              <li key={r}>{r}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </article>
          </div>
        </section>
      )}

      {tab === "academy" && (
        <section className="panel grid2">
          <article>
            <label>FAILURE-FIRST QUESTS</label>
            <div className="chips col">
              {quests.map((q) => (
                <button key={q.id} type="button" className={questId === q.id ? "on" : ""} onClick={() => setQuestId(q.id)}>
                  {q.title}
                </button>
              ))}
            </div>
            {quest && (
              <>
                <h3>{quest.title}</h3>
                <p>{quest.lesson}</p>
                <p className="ai">
                  <b>AI constraint:</b> {quest.ai_constraint}
                </p>
                <p className="muted">{quest.why_it_matters}</p>
                {(quest.options || []).map((opt, i) => (
                  <button key={i} type="button" className={`option ${pick === i ? "on" : ""}`} onClick={() => setPick(i)}>
                    <b>
                      {opt.agent} · {opt.protocol}
                    </b>
                    <span>
                      slip {opt.slippage_bps} · lev {opt.resulting_leverage_bps} · {opt.rationale}
                    </span>
                  </button>
                ))}
                <label className="check">
                  <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />I
                  understand why the lawful plan is safer
                </label>
                <button type="button" className="forge" disabled={busy} onClick={runGrade}>
                  GRADE LAB →
                </button>
              </>
            )}
          </article>
          <article className="result">
            <label>CERTIFICATE</label>
            {!grade ? (
              <p className="muted">Pass a lab to seal an academy receipt.</p>
            ) : (
              <>
                <Pill ok={grade.passed}>{grade.passed ? "PASSED" : "NOT YET"}</Pill>
                <p className="cert">{grade.certificate_line}</p>
                <p>{grade.chosen_summary}</p>
                {(grade.graded_options || []).map((g, i) => (
                  <div key={i} className={`plan ${g.evaluation.accepted ? "yes" : "no"}`}>
                    <header>
                      <b>{g.action.agent}</b>
                      <Pill ok={g.evaluation.accepted}>{g.evaluation.accepted ? "ACCEPT" : "REJECT"}</Pill>
                    </header>
                  </div>
                ))}
              </>
            )}
          </article>
        </section>
      )}

      {tab === "codex" && (
        <section className="panel grid2">
          <article>
            <label>ECOSYSTEM ATLAS · PROTOCOLS</label>
            <div className="proto-list">
              {protocols.map((p) => (
                <div key={p.id} className="proto">
                  <div>
                    <b>{p.name}</b>
                    <span className="muted">
                      {" "}
                      · {p.category} · {p.adapter_status}
                    </span>
                  </div>
                  <div className="caps">{(p.capabilities || []).join(" · ")}</div>
                  {p.notes ? <p className="muted sm">{p.notes}</p> : null}
                </div>
              ))}
            </div>
            <label>MAINNET TOKENS (MONSKILLS)</label>
            <div className="proto-list" style={{ maxHeight: 200 }}>
              {(ecosystem?.tokens || []).map((t) => (
                <div key={t.symbol + (t.address || "")} className="proto">
                  <b>
                    {t.symbol} · {t.name}
                  </b>
                  {t.address && t.address.startsWith("0x") ? (
                    <code className="sm">{t.address}</code>
                  ) : (
                    <p className="muted sm">{t.note || t.kind}</p>
                  )}
                </div>
              ))}
            </div>
            <label>INFRA</label>
            {(ecosystem?.infra || []).map((i) => (
              <div key={i.id} className="kv">
                <span>{i.name}</span>
                <a className="link" href={network === "monad-mainnet" ? i.mainnet || i.testnet : i.testnet || i.mainnet} target="_blank" rel="noreferrer">
                  open
                </a>
              </div>
            ))}
          </article>
          <article className="result">
            <label>NETWORK + DEPLOY</label>
            <button type="button" className="ghost block" disabled={busy} onClick={probeRpc}>
              Probe RPC live
            </button>
            {rpc && (
              <div className="kv">
                <span>RPC</span>
                <Pill ok={rpc.ok} warn={!rpc.ok}>
                  {rpc.ok ? `chain ${rpc.observed_chain_id}` : rpc.error || "fail"}
                </Pill>
              </div>
            )}
            <div className="kv">
              <span>Spark contract</span>
              <b>SovereignVault</b>
            </div>
            <div className="kv">
              <span>Address</span>
              <code>{vault || "not deployed"}</code>
            </div>
            {vault ? (
              <a
                className="link"
                href={deployment?.explorer_vault || `https://testnet.monadvision.com/address/${vault}`}
                target="_blank"
                rel="noreferrer"
              >
                Explorer →
              </a>
            ) : (
              <pre className="code sm">./scripts/deploy.sh testnet</pre>
            )}
            <label>RECEIPTS</label>
            <div className="receipts">
              {receipts
                .slice()
                .reverse()
                .map((r) => (
                  <div key={r.receipt_hash} className="rcp">
                    <b>{r.kind}</b>
                    <code>{r.receipt_hash?.slice(0, 14)}…</code>
                  </div>
                ))}
            </div>
          </article>
        </section>
      )}

      {tab === "judge" && (
        <section className="panel judge-panel">
          <div className="win-strip">
            <div className="win-copy">
              <span className="eyebrow">
                {(judge?.hackathon?.name || "SPARK").toUpperCase()} · JUDGE / AI AGENT PACK
              </span>
              <h2>{judge?.winning_claim || "Agents propose. Laws decide. Receipts remember."}</h2>
              <p className="muted">{judge?.personal_problem?.roommate_test}</p>
            </div>
            <div className="win-actions">
              <button type="button" className="forge win-btn" disabled={busy} onClick={runWinPath}>
                ▶ WIN PATH
              </button>
              <button type="button" className="ghost" onClick={() => setTab("live")}>
                LIVE board
              </button>
              <a className="link" href={judge?.repo} target="_blank" rel="noreferrer">
                GitHub
              </a>
            </div>
          </div>

          <div className="grid3">
            <article className="result judge">
              <label>PERSONAL PROBLEM (SPARK PROMPT)</label>
              <p className="cert" style={{ fontSize: "1rem" }}>
                {judge?.personal_problem?.title}
              </p>
              <p className="muted sm">{judge?.personal_problem?.i_have}</p>
              <ul className="pillars">
                {(judge?.personal_problem?.it_hurts || []).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <label>SOLUTION</label>
              <p className="muted sm">{judge?.solution?.what_it_is || judge?.solution?.one_liner}</p>
              <div className="kv">
                <span>Vaporware</span>
                <Pill ok={!judge?.vaporware}>{String(judge?.vaporware)}</Pill>
              </div>
              <div className="kv">
                <span>Live API</span>
                <Pill ok={judge?.live_api}>{String(judge?.live_api)}</Pill>
              </div>
              <div className="kv">
                <span>Version</span>
                <b>{judge?.version || health?.version}</b>
              </div>
              <div className="kv">
                <span>Vault recorded</span>
                <Pill ok={judge?.checklist?.contract_address}>
                  {judge?.checklist?.vault_address
                    ? `${String(judge.checklist.vault_address).slice(0, 12)}…`
                    : "pending deploy"}
                </Pill>
              </div>
            </article>

            <article className="result">
              <label>
                SCORECARD · {judge?.scorecard?.grade || "—"} · {judge?.scorecard?.pct ?? "—"}%
              </label>
              {(judge?.scorecard?.criteria || []).map((c) => (
                <div key={c.id} className={`proto ${c.pass ? "yes" : "no"}`}>
                  <header style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <b>{c.label}</b>
                    <Pill ok={c.pass}>{c.pass ? "PASS" : "FAIL"}</Pill>
                  </header>
                  <p className="muted sm">{c.proof}</p>
                </div>
              ))}
            </article>

            <article className="result">
              <label>90s DEMO SCRIPT</label>
              {(judge?.demo_script_90s || []).map((b) => (
                <div key={b.t} className="proto">
                  <b>
                    {b.t} · {b.beat}
                  </b>
                  <p className="muted sm">{b.say}</p>
                  <p className="muted sm">
                    <em>Show:</em> {b.show}
                  </p>
                </div>
              ))}
              <label>WHY WE WIN VS CROWD</label>
              {(judge?.differentiation || []).map((d) => (
                <div key={d.crowd} className="proto">
                  <b>{d.crowd}</b>
                  <p className="muted sm">→ {d.thesis}</p>
                </div>
              ))}
              <button type="button" className="ghost" style={{ marginTop: 8 }} onClick={() => setTab("tools")}>
                Open TOOLS (easy path)
              </button>
            </article>
          </div>

          {(judge?.vs_winners || judge?.easy_path) && (
            <div className="grid2 tight" style={{ margin: "12px" }}>
              <article className="result">
                <label>VS POLISHED WINNERS (HONEST)</label>
                <p className="muted sm">{judge?.vs_winners?.one_liner}</p>
                <p className="muted sm">{judge?.vs_winners?.overall}</p>
                <label>They do well</label>
                <ul className="pillars">
                  {(judge?.vs_winners?.what_winners_do_well || []).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <label>They often lack</label>
                <ul className="pillars">
                  {(judge?.vs_winners?.what_they_often_lack || []).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </article>
              <article className="result">
                <label>EASY PATH · STAY SHIPABLE</label>
                <ol className="pillars">
                  {(judge?.easy_path || judge?.vs_winners?.how_we_stay_easy || []).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ol>
                <label>COMPARISON</label>
                {(judge?.vs_winners?.comparison_table || []).map((row) => (
                  <div key={row.dimension} className="proto">
                    <b>{row.dimension}</b>
                    <p className="muted sm">
                      Typical: {row.typical_winner}
                      <br />
                      THESIS: {row.thesis}
                    </p>
                  </div>
                ))}
              </article>
            </div>
          )}

          <div className="grid2 tight" style={{ margin: "12px" }}>
            <article className="result">
              <label>FEATURES (LIVE, NOT MOCK)</label>
              <div className="kv">
                <span>Pipeline stages</span>
                <b>{judge?.features?.pipeline_stages}</b>
              </div>
              <div className="kv">
                <span>Academy quests</span>
                <b>{judge?.features?.academy_quests}</b>
              </div>
              <div className="kv">
                <span>Protocols / venues</span>
                <b>
                  {judge?.features?.protocols} / {judge?.features?.trading_venues}
                </b>
              </div>
              <div className="kv">
                <span>Company OS / laws / AI twins</span>
                <b>
                  {[
                    judge?.features?.company_os && "OS",
                    judge?.features?.ecosystem_laws && "laws",
                    judge?.features?.ai_sandbox_twins && "twins",
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </b>
              </div>
              <div className="kv">
                <span>Contracts</span>
                <b className="muted sm">{(judge?.features?.contracts || []).join(", ")}</b>
              </div>
              <label>REAL API PATHS</label>
              <ul className="pillars">
                {(judge?.checklist?.real_api_paths || []).map((p) => (
                  <li key={p}>
                    <code>{p}</code>
                  </li>
                ))}
              </ul>
            </article>
            <article className="result">
              <label>MONAD ESSENTIALS</label>
              <p className="muted sm">
                {(judge?.monad_essentials?.gas_tip || {}).title}:{" "}
                {(judge?.monad_essentials?.gas_tip || {}).body}
              </p>
              <div className="kv">
                <span>Law count</span>
                <b>{judge?.monad_essentials?.laws_runtime?.law_count}</b>
              </div>
              <a
                className="link"
                href={judge?.monad_essentials?.best_practices}
                target="_blank"
                rel="noreferrer"
              >
                docs.monad.xyz best practices →
              </a>
              <label>HOW TO DEMO</label>
              <ol className="pillars">
                {(judge?.submission?.how_to_demo || []).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              {winPath && (
                <>
                  <label>LAST WIN PATH PROOF</label>
                  <p className="muted sm">{winPath.headline}</p>
                  <div className="kv">
                    <span>Rejects</span>
                    <b className="up">{winPath.desk_arena?.n_rejected}</b>
                  </div>
                  <div className="kv">
                    <span>Grade</span>
                    <b>{winPath.proof?.scorecard_grade}</b>
                  </div>
                </>
              )}
            </article>
          </div>
        </section>
      )}

      <footer className="footer-platform">
        <span>
          PRIMITIVES <b>identity</b> · <b>law</b> · <b>capital</b> · <b>market</b> · <b>intel</b> ·{" "}
          <b>forge</b> · <b>company</b> · <b>learn</b> · <b>local_ai</b>
        </span>
        <span>
          FORGE <b>intent→arena→receipt</b> · LOCAL <b>infer·store·scan·export</b> · OWNER{" "}
          <b>signs</b>
        </span>
        <span className="muted">v{health?.version || "2.3"} · no keys in browser</span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
