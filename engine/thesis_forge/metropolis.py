"""Metropolis — Monad Foundation global hackathon pack (1 Sep–13 Oct 2026).

Separate from Pocket. MonadBuilder+ / THESIS on Monad:
agents propose, laws decide, owner signs. Track: Onchain Finance & Trading.
"""

from __future__ import annotations

from typing import Any, Dict

from . import __version__

HACKATHON = {
    "name": "Metropolis",
    "org": "Monad Foundation",
    "url": "https://www.monad.xyz/developers/hackathons/metropolis",
    "window": "2026-09-01 to 2026-10-13",
    "submit": "2026-10-13",
    "prizes_usd": 250000,
    "track": "Onchain Finance & Trading",
    "network": "Monad",
    "chain_id_mainnet": 143,
    "chain_id_testnet": 10143,
}

CLAIM = (
    "Everyone teaches you to click go. MonadBuilder+ teaches you and your AI "
    "when go is illegal — then ships what passed under laws you can audit."
)


def pack() -> Dict[str, Any]:
    from .competition import PERSONAL_PROBLEM, SOLUTION
    from .ecosystem_laws import runtime_status
    from .gas_intel import gas_coach

    laws = {}
    gas = {}
    try:
        laws = runtime_status()
    except Exception as e:
        laws = {"ok": False, "error": str(e)[:160]}
    try:
        gas = gas_coach()
    except Exception as e:
        gas = {"ok": False, "error": str(e)[:160]}
    return {
        "ok": True,
        "hackathon": HACKATHON,
        "product": "MonadBuilder+",
        "engine": "THESIS OS",
        "version": __version__,
        "claim": CLAIM,
        "personal_problem": PERSONAL_PROBLEM,
        "solution": SOLUTION.get("one_liner") if isinstance(SOLUTION, dict) else SOLUTION,
        "track_fit": {
            "finance_trading": True,
            "reject_is_a_feature": True,
            "gas_limit_billed": True,
            "owner_signs": True,
            "no_silent_broadcast": True,
        },
        "laws": laws,
        "gas": gas,
        "demo": [
            "GET /builder/brief",
            "POST /builder/morning",
            "POST /desk/arena",
            "GET /metropolis",
        ],
    }
