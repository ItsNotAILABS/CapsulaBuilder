"""Live trading readiness gate — evidence-based approval packet engine.

Mirrors a paper/testnet-first doctrine: live execution is always
operator-gated behind a complete evidence packet. THESIS never auto-flips
this gate — evidence only records what an operator attests to outside this
system. `ready_for_live` is informational, never an execution switch.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any, Dict, List

from .receipts import seal

_ROOT = Path(__file__).resolve().parents[2]
_GATE_PATH = _ROOT / "receipts" / "live_gate.json"

EVIDENCE_ITEMS: List[Dict[str, str]] = [
    {"key": "legal_entity_verified", "label": "Legal entity verified"},
    {"key": "kyc_aml_program", "label": "KYC/AML program in place"},
    {"key": "broker_terms_review", "label": "Broker terms of service reviewed"},
    {"key": "licensed_operator_attestation", "label": "Licensed operator attestation on file"},
    {"key": "compliance_officer_attestation", "label": "Compliance officer attestation on file"},
    {"key": "production_secret_provider_bound", "label": "Production secret provider bound (no raw keys in repo)"},
    {"key": "risk_limits_approved", "label": "Risk limits approved by risk committee"},
    {"key": "human_approval_workflow", "label": "Human approval workflow wired for live trades"},
    {"key": "kill_switch_enabled", "label": "Kill switch enabled"},
    {"key": "audit_log_enabled", "label": "Audit log enabled"},
    {"key": "receipt_chain_enabled", "label": "Receipt chain enabled"},
    {"key": "daily_reconciliation_job", "label": "Daily reconciliation job scheduled"},
    {"key": "incident_response_runbook", "label": "Incident response runbook published"},
]

_DEFAULT_STATE = {item["key"]: {"satisfied": False, "note": "", "updated_at": 0.0} for item in EVIDENCE_ITEMS}


def load_gate() -> Dict[str, Any]:
    if _GATE_PATH.exists():
        try:
            raw = json.loads(_GATE_PATH.read_text(encoding="utf-8"))
            state = dict(_DEFAULT_STATE)
            state.update({k: v for k, v in raw.items() if k in state})
            return state
        except Exception:
            pass
    return {k: dict(v) for k, v in _DEFAULT_STATE.items()}


def save_gate(state: Dict[str, Any]) -> None:
    _GATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    _GATE_PATH.write_text(json.dumps(state, indent=2), encoding="utf-8")


def gate_status() -> Dict[str, Any]:
    state = load_gate()
    evidence = [
        {
            "key": item["key"],
            "label": item["label"],
            "satisfied": bool(state.get(item["key"], {}).get("satisfied")),
            "note": state.get(item["key"], {}).get("note", ""),
            "updated_at": state.get(item["key"], {}).get("updated_at", 0.0),
        }
        for item in EVIDENCE_ITEMS
    ]
    satisfied = sum(1 for e in evidence if e["satisfied"])
    return {
        "schema": "thesis.live_gate.status.v1",
        "evidence": evidence,
        "satisfied_count": satisfied,
        "total": len(evidence),
        "ready_for_live": satisfied == len(evidence),
        "live_execution_enabled": False,
        "doctrine": "Evidence completeness is informational. Live execution stays disabled until a manual operator cutover outside this system.",
    }


def submit_evidence(key: str, satisfied: bool, note: str = "") -> Dict[str, Any]:
    valid_keys = {item["key"] for item in EVIDENCE_ITEMS}
    if key not in valid_keys:
        raise KeyError(key)
    state = load_gate()
    state[key] = {"satisfied": bool(satisfied), "note": note, "updated_at": time.time()}
    save_gate(state)
    status = gate_status()
    seal(
        "live_gate.evidence",
        {
            "key": key,
            "satisfied": bool(satisfied),
            "satisfied_count": status["satisfied_count"],
            "total": status["total"],
        },
    )
    return status


def approval_packet() -> Dict[str, Any]:
    status = gate_status()
    missing = [e["key"] for e in status["evidence"] if not e["satisfied"]]
    packet = {
        "schema": "thesis.live_gate.approval_packet.v1",
        "generated_at": time.time(),
        "ready_for_live": status["ready_for_live"],
        "missing_evidence": missing,
        "live_execution_enabled": False,
        "posture": "regulated_live_disabled_until_approved"
        if missing
        else "evidence_complete_awaiting_manual_cutover",
    }
    seal(
        "live_gate.approval_packet",
        {"ready_for_live": packet["ready_for_live"], "missing": len(missing)},
    )
    return packet


def denial(reason: str = "regulated_live_gate_required") -> Dict[str, Any]:
    return {
        "error": reason,
        "posture": "regulated_live_disabled_until_approved",
        "live_execution_enabled": False,
    }
