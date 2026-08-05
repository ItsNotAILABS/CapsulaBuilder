"""Security & governance intelligence for THESIS — career taxonomy, use-case
workflows, capability matrix, and a role-based approval engine.

Ported and tailored from the CyberSecurity-AI career/use-case/capability
model to THESIS's own objects: trade tickets, Agent Vault connectors, and
live-gate evidence. The general security-operations roles are kept so the
platform can also govern *itself* (SOC, IR, GRC, IAM, cloud, threat intel),
but the finance-desk roles are what tie approvals to real trading/vault
actions.

This module never blocks the underlying trading/vault flows — it is an
additive governance overlay. `trading.py` and `agent_vault.py` best-effort
open an approval record when a threshold is crossed; the ticket or ledger
transfer itself always completes on its own merits.
"""

from __future__ import annotations

import json
import time
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from .receipts import seal

_ROOT = Path(__file__).resolve().parents[2]
_APPROVALS_PATH = _ROOT / "receipts" / "approvals.json"


# ── Career taxonomy ─────────────────────────────────────────────────


@dataclass(frozen=True)
class CareerProfile:
    id: str
    title: str
    team: str
    stage: str
    summary: str
    skills: tuple[str, ...]
    approval_scope: tuple[str, ...]  # what this role is allowed to approve

    def to_dict(self) -> dict:
        out = asdict(self)
        out["skills"] = list(self.skills)
        out["approval_scope"] = list(self.approval_scope)
        return out


CAREERS: tuple[CareerProfile, ...] = (
    CareerProfile(
        id="desk-trader",
        title="Desk Trader",
        team="Trading Desk",
        stage="entry",
        summary="Proposes trade tickets under desk risk limits and NOMOS policy.",
        skills=("order entry", "venue routing", "risk-limit awareness"),
        approval_scope=(),
    ),
    CareerProfile(
        id="risk-officer",
        title="Risk Officer",
        team="Trading Desk",
        stage="senior",
        summary="Approves tickets and ledger transfers that exceed desk-level risk thresholds.",
        skills=("position limits", "leverage review", "daily-loss oversight"),
        approval_scope=("ticket", "ledger_transfer"),
    ),
    CareerProfile(
        id="compliance-officer",
        title="Compliance Officer",
        team="Governance Risk Compliance",
        stage="senior",
        summary="Approves broker/venue onboarding, live-gate evidence, and regulated-live readiness.",
        skills=("control mapping", "evidence review", "regulatory posture"),
        approval_scope=("connector", "live_gate_evidence", "ledger_transfer"),
    ),
    CareerProfile(
        id="vault-operator",
        title="Agent Vault Operator",
        team="Agent Vaults",
        stage="mid",
        summary="Manages vault connectors and registered agents inside the governed vault boundary.",
        skills=("connector onboarding", "agent registration", "vault hygiene"),
        approval_scope=("connector",),
    ),
    CareerProfile(
        id="soc-analyst-l1",
        title="SOC Analyst I",
        team="Security Operations",
        stage="entry",
        summary="Triage alerts, document evidence, escalate verified incidents.",
        skills=("SIEM", "alert triage", "escalation hygiene"),
        approval_scope=(),
    ),
    CareerProfile(
        id="incident-response-lead",
        title="Incident Response Lead",
        team="Incident Response",
        stage="senior",
        summary="Coordinates containment, evidence handling, and recovery for security incidents.",
        skills=("containment", "forensics coordination", "recovery planning"),
        approval_scope=("incident",),
    ),
    CareerProfile(
        id="grc-analyst",
        title="GRC Analyst",
        team="Governance Risk Compliance",
        stage="mid",
        summary="Maps controls, evidence, and risk posture across security frameworks.",
        skills=("risk register", "control mapping", "audit prep"),
        approval_scope=(),
    ),
    CareerProfile(
        id="iam-engineer",
        title="IAM Engineer",
        team="Identity and Access",
        stage="mid",
        summary="Designs least-privilege access and identity governance for agents and operators.",
        skills=("RBAC", "access reviews", "zero-trust mapping"),
        approval_scope=(),
    ),
    CareerProfile(
        id="threat-intel-analyst",
        title="Threat Intelligence Analyst",
        team="Threat Intelligence",
        stage="mid",
        summary="Turns market/threat signals into defensive priorities for the desk and vaults.",
        skills=("intel requirements", "risk narratives", "detection priorities"),
        approval_scope=(),
    ),
)


def list_careers(team: Optional[str] = None, stage: Optional[str] = None) -> List[Dict[str, Any]]:
    rows: Iterable[CareerProfile] = CAREERS
    if team:
        needle = team.lower()
        rows = [c for c in rows if needle in c.team.lower()]
    if stage:
        needle = stage.lower()
        rows = [c for c in rows if needle in c.stage.lower()]
    return [c.to_dict() for c in rows]


def get_career(career_id: str) -> Optional[Dict[str, Any]]:
    for c in CAREERS:
        if c.id == career_id:
            return c.to_dict()
    return None


def search_careers(query: str) -> List[Dict[str, Any]]:
    q = query.lower().strip()
    if not q:
        return list_careers()
    hits = []
    for c in CAREERS:
        blob = " ".join([c.id, c.title, c.team, c.stage, c.summary, " ".join(c.skills)]).lower()
        if q in blob:
            hits.append(c.to_dict())
    return hits


def roles_for_scope(scope: str) -> List[str]:
    return [c.id for c in CAREERS if scope in c.approval_scope]


# ── Use-case workflows ──────────────────────────────────────────────


@dataclass(frozen=True)
class UseCase:
    id: str
    title: str
    buyer: str
    problem: str
    workflow: tuple[str, ...]
    outputs: tuple[str, ...]
    roles: tuple[str, ...]
    safety_boundary: str

    def to_dict(self) -> dict:
        out = asdict(self)
        out["workflow"] = list(self.workflow)
        out["outputs"] = list(self.outputs)
        out["roles"] = list(self.roles)
        return out


USE_CASES: tuple[UseCase, ...] = (
    UseCase(
        id="trade-ticket-approval",
        title="Trade Ticket Approval",
        buyer="Trading desks, asset managers",
        problem="Agent-proposed tickets above desk risk thresholds need a human risk sign-off before paper fill.",
        workflow=("ticket risk-accepted by NOMOS", "notional checked against approval threshold", "risk officer reviews", "approval recorded with receipt"),
        outputs=("approval chain", "evidence checklist", "receipt-linked decision"),
        roles=("risk-officer",),
        safety_boundary="Paper/testnet desk only — approval never authorizes live money movement.",
    ),
    UseCase(
        id="vault-connector-onboarding",
        title="Agent Vault Connector Onboarding",
        buyer="Vault operators, compliance teams",
        problem="Attaching a new venue or broker connector to a governed vault needs an ownership and compliance check.",
        workflow=("operator proposes connector", "compliance reviews broker posture", "connector attached", "receipt sealed"),
        outputs=("connector approval record", "broker posture summary"),
        roles=("vault-operator", "compliance-officer"),
        safety_boundary="Sandbox/paper broker adapters only — no live brokerage credentials are ever handled.",
    ),
    UseCase(
        id="ledger-transfer-review",
        title="Ledger Transfer Review",
        buyer="Risk and compliance teams",
        problem="Large internal ledger transfers inside a vault should get a second look even though they never touch real funds.",
        workflow=("transfer proposed", "NOMOS policy gate evaluated", "risk officer reviews above-threshold transfers", "receipt sealed"),
        outputs=("approval record", "policy evaluation summary"),
        roles=("risk-officer", "compliance-officer"),
        safety_boundary="Internal paper accounting only — no custody, no real money movement.",
    ),
    UseCase(
        id="live-gate-evidence-review",
        title="Live-Gate Evidence Review",
        buyer="Compliance officers, risk committees",
        problem="Evidence toward eventual live trading readiness needs an owner and a review trail, not just a checkbox.",
        workflow=("evidence submitted", "compliance officer reviews", "approval packet generated", "posture remains denied until manual cutover"),
        outputs=("evidence review record", "approval packet"),
        roles=("compliance-officer",),
        safety_boundary="Evidence completeness is informational only; live execution stays disabled regardless of review outcome.",
    ),
    UseCase(
        id="soc-onboarding-copilot",
        title="SOC Onboarding Copilot",
        buyer="MSSPs, enterprise SOC teams",
        problem="New analysts need role clarity, tool context, and escalation hygiene without exposure to offensive instructions.",
        workflow=("select SOC role", "map skills and tools", "generate first-week plan", "produce escalation checklist"),
        outputs=("role packet", "onboarding plan", "skill gap map"),
        roles=("soc-analyst-l1",),
        safety_boundary="Defensive workflow only; no exploit reproduction or malware instructions.",
    ),
    UseCase(
        id="incident-tabletop-builder",
        title="Incident Tabletop Builder",
        buyer="Security leaders, IR consultants",
        problem="Teams need repeatable tabletop scenarios aligned to roles, communications, and recovery responsibilities.",
        workflow=("choose IR role", "select business context", "generate tabletop agenda", "map decisions to owners"),
        outputs=("tabletop plan", "RACI map", "recovery brief"),
        roles=("incident-response-lead",),
        safety_boundary="Scenario and response planning only; no adversary playbooks.",
    ),
    UseCase(
        id="grc-control-owner-map",
        title="GRC Control Owner Map",
        buyer="GRC teams, startups preparing audits",
        problem="Organizations struggle to connect security controls to human owners and evidence sources.",
        workflow=("search GRC roles", "map evidence responsibilities", "generate control-owner packet"),
        outputs=("control owner matrix", "audit prep checklist"),
        roles=("grc-analyst",),
        safety_boundary="Education and planning only.",
    ),
)


def list_use_cases(buyer: Optional[str] = None) -> List[Dict[str, Any]]:
    rows: Iterable[UseCase] = USE_CASES
    if buyer:
        needle = buyer.lower()
        rows = [u for u in rows if needle in u.buyer.lower()]
    return [u.to_dict() for u in rows]


def get_use_case(use_case_id: str) -> Optional[Dict[str, Any]]:
    for u in USE_CASES:
        if u.id == use_case_id:
            return u.to_dict()
    return None


def search_use_cases(query: str) -> List[Dict[str, Any]]:
    q = query.lower().strip()
    if not q:
        return list_use_cases()
    hits = []
    for u in USE_CASES:
        blob = " ".join([u.id, u.title, u.buyer, u.problem, " ".join(u.workflow), " ".join(u.outputs)]).lower()
        if q in blob:
            hits.append(u.to_dict())
    return hits


# ── Capability matrix ────────────────────────────────────────────────

CAPABILITY_MATRIX: tuple[Dict[str, Any], ...] = (
    {
        "domain": "Trading Risk & Governance",
        "capabilities": ["desk risk limits", "NOMOS policy gating", "ticket approval routing", "daily-loss controls"],
        "outputs": ["desk risk report", "approval chain", "policy evaluation summary"],
        "maturity": ["starter", "team", "program"],
    },
    {
        "domain": "Agent Vault Governance",
        "capabilities": ["vault boundary enforcement", "connector onboarding", "agent registration", "ledger review"],
        "outputs": ["vault snapshot", "connector approval record", "ledger review trail"],
        "maturity": ["starter", "team", "program"],
    },
    {
        "domain": "Broker & Venue Readiness",
        "capabilities": ["broker adapter posture", "asset-class coverage", "sandbox-first onboarding"],
        "outputs": ["broker readiness report", "asset-class coverage map"],
        "maturity": ["starter", "team"],
    },
    {
        "domain": "Live-Trading Compliance",
        "capabilities": ["evidence tracking", "approval packet generation", "operator cutover gating"],
        "outputs": ["evidence checklist", "approval packet", "compliance posture summary"],
        "maturity": ["starter", "team", "program"],
    },
    {
        "domain": "Identity & Approval Workflows",
        "capabilities": ["role taxonomy", "approval routing", "receipt-linked decisions"],
        "outputs": ["career packet", "approval record", "RACI map"],
        "maturity": ["starter", "team", "program"],
    },
    {
        "domain": "Security Operations",
        "capabilities": ["alert triage", "escalation mapping", "SOC onboarding"],
        "outputs": ["analyst packet", "triage checklist"],
        "maturity": ["starter", "team", "program"],
    },
    {
        "domain": "Threat Intelligence",
        "capabilities": ["intel requirements", "risk narratives", "detection priorities"],
        "outputs": ["intel brief", "executive threat summary"],
        "maturity": ["starter", "team", "program"],
    },
)


def capability_matrix() -> List[Dict[str, Any]]:
    return [dict(row) for row in CAPABILITY_MATRIX]


def search_capabilities(query: str) -> List[Dict[str, Any]]:
    q = query.lower().strip()
    if not q:
        return capability_matrix()
    hits = []
    for row in CAPABILITY_MATRIX:
        blob = " ".join([row["domain"], " ".join(row["capabilities"]), " ".join(row["outputs"])]).lower()
        if q in blob:
            hits.append(dict(row))
    return hits


# ── Approval engine ──────────────────────────────────────────────────

# notional thresholds above which a scope requires human approval
_APPROVAL_THRESHOLDS = {
    "ticket": 300.0,
    "ledger_transfer": 200.0,
    "connector": 0.0,  # connectors always require sign-off, notional is ignored
    "live_gate_evidence": 0.0,
}


def approval_required(kind: str, notional: float = 0.0) -> bool:
    threshold = _APPROVAL_THRESHOLDS.get(kind)
    if threshold is None:
        return False
    return notional >= threshold


def _load_approvals() -> Dict[str, Any]:
    if _APPROVALS_PATH.exists():
        try:
            return json.loads(_APPROVALS_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def _save_approvals(state: Dict[str, Any]) -> None:
    _APPROVALS_PATH.parent.mkdir(parents=True, exist_ok=True)
    _APPROVALS_PATH.write_text(json.dumps(state, indent=2), encoding="utf-8")


def create_approval(
    kind: str,
    ref_id: str,
    notional: float = 0.0,
    requester: str = "desk-trader",
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    roles = roles_for_scope(kind) or ["risk-officer"]
    record = {
        "approval_id": f"appr-{uuid.uuid4().hex[:10]}",
        "kind": kind,
        "ref_id": ref_id,
        "notional": notional,
        "requester": requester,
        "context": context or {},
        "roles_required": roles,
        "decisions": {},  # role -> {approved, approver_id, comment, ts}
        "status": "pending",
        "created_at": time.time(),
        "updated_at": time.time(),
    }
    state = _load_approvals()
    state[record["approval_id"]] = record
    _save_approvals(state)
    seal("security.approval_created", {"approval_id": record["approval_id"], "kind": kind, "ref_id": ref_id})
    return record


def list_approvals(status: Optional[str] = None) -> List[Dict[str, Any]]:
    state = _load_approvals()
    rows = list(state.values())
    if status:
        rows = [r for r in rows if r["status"] == status]
    rows.sort(key=lambda r: r["created_at"], reverse=True)
    return rows


def get_approval(approval_id: str) -> Optional[Dict[str, Any]]:
    return _load_approvals().get(approval_id)


def decide_approval(approval_id: str, role: str, approver_id: str, approved: bool = True, comment: str = "") -> Dict[str, Any]:
    state = _load_approvals()
    record = state.get(approval_id)
    if not record:
        raise KeyError(approval_id)
    if role not in record["roles_required"]:
        raise ValueError(f"role {role} is not in the required approval chain for this record")

    record["decisions"][role] = {
        "approved": approved,
        "approver_id": approver_id,
        "comment": comment,
        "ts": time.time(),
    }
    if not approved:
        record["status"] = "rejected"
    elif all(record["decisions"].get(r, {}).get("approved") for r in record["roles_required"]):
        record["status"] = "approved"
    else:
        record["status"] = "pending"
    record["updated_at"] = time.time()

    state[approval_id] = record
    _save_approvals(state)
    seal(
        "security.approval_decision",
        {"approval_id": approval_id, "role": role, "approved": approved, "status": record["status"]},
    )
    return record


# ── Stakeholder briefing (market-packet style) ──────────────────────


def security_briefing(topic: str = "trading-desk") -> Dict[str, Any]:
    careers = search_careers(topic)
    use_cases = search_use_cases(topic)
    caps = search_capabilities(topic)
    approvals = list_approvals()
    return {
        "schema": "thesis.security.briefing.v1",
        "topic": topic,
        "careers": careers or list_careers(),
        "use_cases": use_cases or list_use_cases(),
        "capabilities": caps or capability_matrix(),
        "pending_approvals": len([a for a in approvals if a["status"] == "pending"]),
        "doctrine": "Agents propose. Roles approve. Receipts remember. No live execution regardless of approval state.",
    }
