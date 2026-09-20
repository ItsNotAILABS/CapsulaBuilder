"""JEV desk cycle — NOVA holds the goal; policy decides; owner signs; receipt remembers."""

from __future__ import annotations

from typing import Any, Dict

from .models import Action, Category, Policy
from .policy import evaluate
from .receipts import seal

SCHEMA = "thesis.jev.desk.v1"
UI = ["propose_swap", "reject_fat", "escalate", "sign"]


def _action(goal: str, *, reckless: bool) -> Action:
    g = (goal or "").lower()
    fat = reckless or "perp" in g or "5000" in g or "yolo" in g or "leverage" in g
    if fat:
        return Action(
            agent="nova",
            category=Category.PERPS,
            protocol="perpl",
            action="open",
            value=5000,
            slippage_bps=900,
            resulting_protocol_exposure_bps=9000,
            resulting_liquid_reserve_bps=100,
            resulting_leverage_bps=50000,
            expected_gain_bps=800,
            risk_bps=900,
            rationale=goal or "reckless demo",
        )
    return Action(
        agent="nova",
        category=Category.DEX,
        protocol="kuru",
        action="swap",
        value=100,
        slippage_bps=10,
        resulting_protocol_exposure_bps=1000,
        resulting_liquid_reserve_bps=4000,
        resulting_leverage_bps=10000,
        expected_gain_bps=40,
        risk_bps=20,
        rationale=goal or "safe swap",
    )


def run_cycle(goal: str, *, reckless: bool = False, network: str = "monad-testnet") -> Dict[str, Any]:
    """snapshot → decide → policy → REJECT or NEEDS_OWNER_SIGN."""
    action = _action(goal, reckless=reckless)
    token = "reject_fat" if reckless or action.value > 1000 else "propose_swap"
    ev = evaluate(action, Policy())
    if not ev.accepted:
        rec = seal(
            "jev.reject",
            {
                "goal": goal,
                "token": token,
                "violations": ev.violations,
                "summary": ev.human_summary,
                "network": network,
            },
        )
        return {
            "ok": True,
            "schema": SCHEMA,
            "status": "REJECT",
            "nova": {"goal": goal, "held": True},
            "jev": {"token": token, "ui": UI},
            "evaluation": ev.model_dump(),
            "receipt": rec,
            "next": "stop",
            "doctrine": "Agents propose. Laws decide. Owner signs. Receipts remember.",
        }
    rec = seal(
        "jev.propose",
        {
            "goal": goal,
            "token": token,
            "action": action.model_dump(mode="json"),
            "network": network,
        },
    )
    return {
        "ok": True,
        "schema": SCHEMA,
        "status": "NEEDS_OWNER_SIGN",
        "nova": {"goal": goal, "held": True},
        "jev": {"token": token, "ui": UI},
        "evaluation": ev.model_dump(),
        "receipt": rec,
        "next": "POST /jev/sign",
        "doctrine": "Agents propose. Laws decide. Owner signs. Receipts remember.",
    }


def owner_sign(propose_hash: str, *, network: str = "monad-testnet") -> Dict[str, Any]:
    rec = seal(
        "jev.owner_sign",
        {"proposed": propose_hash, "signed": True, "network": network},
    )
    return {
        "ok": True,
        "schema": SCHEMA,
        "status": "SIGNED",
        "receipt": rec,
        "note": "Paper receipt on THESIS chain. Onchain ReceiptChain is the next ship.",
    }
