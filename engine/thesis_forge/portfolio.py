"""Portfolio-level risk reporting across the trading desk and all Agent Vaults.

Rolls the desk's paper book and every vault's paper wallets into a single
consolidated exposure view: total notional, per-vault concentration against
a configurable limit, and the risk overhang sitting in pending approvals.
This is reporting only — it never blocks a vault or ticket from existing;
it exists so an operator can see the shape of aggregate risk at a glance.
"""

from __future__ import annotations

from typing import Any, Dict, List

from .agent_vault import list_vaults
from .security_intelligence import list_approvals
from .trading import load_desk

DEFAULT_CONCENTRATION_LIMIT_PCT = 40.0


def _mon_price(desk) -> float:
    return float(desk.marks.get("MON/USDC") or 1.0)


def _vault_usd_value(wallets: Dict[str, float], mon_price: float) -> float:
    total = 0.0
    for symbol, balance in wallets.items():
        if symbol == "MON":
            total += balance * mon_price
        else:
            # USDC and other stable/quote symbols in the vault ledger are
            # treated 1:1; the vault ledger only ever holds symbols it was
            # seeded or transferred with (MON/USDC today).
            total += balance
    return total


def portfolio_snapshot(concentration_limit_pct: float = DEFAULT_CONCENTRATION_LIMIT_PCT) -> Dict[str, Any]:
    desk = load_desk()
    mon_price = _mon_price(desk)
    desk_open_notional = sum(abs(p.notional) for p in desk.positions.values())

    vaults = list_vaults()
    vault_rows: List[Dict[str, Any]] = []
    total_vault_usd = 0.0
    for v in vaults:
        usd_value = _vault_usd_value(v.get("wallets") or {}, mon_price)
        total_vault_usd += usd_value
        vault_rows.append(
            {
                "vault_id": v["vault_id"],
                "name": v["name"],
                "network": v["network"],
                "usd_value": usd_value,
                "connectors": len(v.get("connectors") or []),
                "agents": len(v.get("agents") or []),
            }
        )

    for row in vault_rows:
        row["pct_of_vault_total"] = (row["usd_value"] / total_vault_usd * 100.0) if total_vault_usd > 0 else 0.0

    vault_rows.sort(key=lambda r: r["usd_value"], reverse=True)
    max_concentration_pct = vault_rows[0]["pct_of_vault_total"] if vault_rows else 0.0
    concentration_violations = [
        {"vault_id": r["vault_id"], "name": r["name"], "pct_of_vault_total": r["pct_of_vault_total"]}
        for r in vault_rows
        if r["pct_of_vault_total"] > concentration_limit_pct
    ]

    approvals = list_approvals(status="pending")
    pending_approval_notional = sum(float(a.get("notional") or 0.0) for a in approvals)

    total_portfolio_notional = desk_open_notional + total_vault_usd

    return {
        "schema": "thesis.portfolio.v1",
        "desk": {
            "equity": desk.equity,
            "cash_usdc": desk.cash_usdc,
            "open_notional": desk_open_notional,
            "day_pnl": desk.day_pnl,
            "realized_pnl": desk.realized_pnl,
            "unrealized_pnl": desk.unrealized_pnl,
        },
        "vaults": {
            "count": len(vault_rows),
            "total_usd_value": total_vault_usd,
            "rows": vault_rows,
            "max_concentration_pct": max_concentration_pct,
            "concentration_limit_pct": concentration_limit_pct,
            "concentration_violations": concentration_violations,
        },
        "risk_overhang": {
            "pending_approval_count": len(approvals),
            "pending_approval_notional": pending_approval_notional,
        },
        "total_portfolio_notional": total_portfolio_notional,
        "doctrine": (
            "Reporting only — concentration limits and approval overhang are surfaced for an operator to act on, "
            "never enforced as an automatic block on vault creation or ticket flow."
        ),
    }
