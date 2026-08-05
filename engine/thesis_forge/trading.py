"""Trading business desk — risk-gated paper book integrated with NOMOS.

THESIS does not custody live exchange keys here. It runs a **trading desk
operating layer**: tickets, risk, agent proposals, paper fills, PnL, and
venue routing hints into Monad atlas venues (Kuru, Perpl, etc.).

Live execution remains operator-gated (same doctrine as vault deploy).
"""

from __future__ import annotations

import json
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from .atlas import all_protocols
from .models import Action, Category, Policy
from .policy import evaluate
from .receipts import seal

_ROOT = Path(__file__).resolve().parents[2]
_BOOK_PATH = _ROOT / "receipts" / "trading_book.json"

Side = Literal["buy", "sell"]
OrderType = Literal["market", "limit", "stop", "stop_limit"]
TicketStatus = Literal[
    "proposed",
    "risk_rejected",
    "risk_accepted",
    "paper_filled",
    "cancelled",
    "routed_sim",
]


# ── Venue map (trading business ↔ Monad ecosystem) ─────────────────

VENUES: List[Dict[str, Any]] = [
    {
        "id": "kuru",
        "name": "Kuru",
        "kind": "spot_orderbook",
        "category": "dex",
        "asset_class": "crypto_dex",
        "atlas_id": "kuru",
        "pairs": ["MON/USDC", "WETH/USDC", "WBTC/USDC"],
        "adapter_status": "simulated",
        "use": "Primary spot venue for rebalances and inventory.",
    },
    {
        "id": "uniswap",
        "name": "Uniswap-style AMM",
        "kind": "spot_amm",
        "category": "dex",
        "asset_class": "crypto_dex",
        "atlas_id": "uniswap",
        "pairs": ["MON/USDC", "WETH/USDC"],
        "adapter_status": "simulated",
        "use": "AMM fallback when orderbook liquidity is thin.",
    },
    {
        "id": "perpl",
        "name": "Perpl",
        "kind": "perps",
        "category": "perps",
        "asset_class": "crypto_perps",
        "atlas_id": "perpl",
        "pairs": ["MON-PERP", "ETH-PERP", "BTC-PERP"],
        "adapter_status": "planned",
        "use": "Perps only if lawbook allows perps category.",
    },
    {
        "id": "leverup",
        "name": "LeverUp",
        "kind": "perps",
        "category": "perps",
        "asset_class": "crypto_perps",
        "atlas_id": "leverup",
        "pairs": ["MON-PERP", "ETH-PERP"],
        "adapter_status": "planned",
        "use": "Leveraged perps — hard-gated by max_leverage_bps.",
    },
    {
        "id": "birdeye",
        "name": "Birdeye",
        "kind": "analytics",
        "category": "analytics",
        "asset_class": "analytics",
        "atlas_id": "birdeye",
        "pairs": [],
        "adapter_status": "simulated",
        "use": "Marks, screens, not execution.",
    },
    {
        "id": "thesis-vault",
        "name": "THESIS SovereignVault",
        "kind": "custody_gate",
        "category": "vault",
        "asset_class": "vault",
        "atlas_id": "thesis-vault",
        "pairs": [],
        "adapter_status": "live",
        "use": "Onchain spend gate for any capital leaving the desk vault.",
    },
    {
        "id": "alpaca-equities",
        "name": "Alpaca Equities (paper)",
        "kind": "equities_paper",
        "category": "dex",
        "asset_class": "equities",
        "broker_id": "alpaca_sandbox",
        "atlas_id": None,
        "pairs": ["AAPL", "TSLA", "SPY", "NVDA", "QQQ"],
        "adapter_status": "sandbox",
        "use": "Paper US equities via the Alpaca sandbox adapter.",
    },
    {
        "id": "oanda-forex",
        "name": "OANDA Forex (practice)",
        "kind": "forex_practice",
        "category": "dex",
        "asset_class": "forex",
        "broker_id": "oanda_practice",
        "atlas_id": None,
        "pairs": ["EUR/USD", "GBP/USD", "USD/JPY"],
        "adapter_status": "practice",
        "use": "Practice forex via the OANDA practice adapter.",
    },
    {
        "id": "coinbase-cex",
        "name": "Coinbase (sandbox)",
        "kind": "crypto_cex_sandbox",
        "category": "dex",
        "asset_class": "crypto_cex",
        "broker_id": "coinbase_sandbox",
        "atlas_id": None,
        "pairs": ["BTC/USD", "ETH/USD"],
        "adapter_status": "sandbox",
        "use": "Sandbox centralized crypto exchange venue.",
    },
]


class TradingLimits(BaseModel):
    """Desk-level risk on top of NOMOS Policy."""

    max_notional_per_ticket: float = Field(default=500.0, gt=0)
    max_open_notional: float = Field(default=5000.0, gt=0)
    max_position_notional: float = Field(default=2000.0, gt=0)
    max_daily_loss: float = Field(default=250.0, gt=0)
    allow_perps: bool = False
    allow_short: bool = True
    paper_mode: bool = True
    default_slippage_bps: int = Field(default=30, ge=0, le=5000)


class TradeTicket(BaseModel):
    ticket_id: str = ""
    agent: str = "desk-trader"
    venue_id: str
    pair: str
    side: Side
    order_type: OrderType = "limit"
    qty: float = Field(gt=0)
    limit_price: float = Field(gt=0)
    stop_price: float = Field(default=0.0, ge=0)
    slippage_bps: int = Field(default=30, ge=0)
    leverage_bps: int = Field(default=10000, ge=10000)  # 10000 = 1x
    rationale: str = ""
    status: TicketStatus = "proposed"
    notional: float = 0.0
    violations: list[str] = Field(default_factory=list)
    reasons: list[str] = Field(default_factory=list)
    fill_price: float = 0.0
    pnl_delta: float = 0.0
    created_at: float = 0.0
    updated_at: float = 0.0
    receipt_hash: str = ""


class Position(BaseModel):
    pair: str
    venue_id: str
    qty: float = 0.0  # signed: +long -short
    avg_price: float = 0.0
    realized_pnl: float = 0.0
    mark_price: float = 0.0
    unrealized_pnl: float = 0.0
    notional: float = 0.0


class DeskState(BaseModel):
    schema_version: str = "thesis.trading.desk.v1"
    cash_usdc: float = 10_000.0
    equity: float = 10_000.0
    realized_pnl: float = 0.0
    unrealized_pnl: float = 0.0
    day_pnl: float = 0.0
    limits: TradingLimits = Field(default_factory=TradingLimits)
    policy: Policy = Field(default_factory=Policy)
    positions: dict[str, Position] = Field(default_factory=dict)
    tickets: list[TradeTicket] = Field(default_factory=list)
    marks: dict[str, float] = Field(default_factory=dict)
    updated_at: float = 0.0


# Default marks for paper trading (illustrative — not live oracle)
_DEFAULT_MARKS = {
    "MON/USDC": 1.0,
    "WETH/USDC": 3200.0,
    "WBTC/USDC": 64000.0,
    "MON-PERP": 1.0,
    "ETH-PERP": 3200.0,
    "BTC-PERP": 64000.0,
    "AAPL": 195.0,
    "TSLA": 250.0,
    "SPY": 560.0,
    "NVDA": 130.0,
    "QQQ": 480.0,
    "EUR/USD": 1.08,
    "GBP/USD": 1.27,
    "USD/JPY": 155.0,
    "BTC/USD": 64000.0,
    "ETH/USD": 3200.0,
}


def _pos_key(venue_id: str, pair: str) -> str:
    return f"{venue_id}:{pair}"


def load_desk() -> DeskState:
    if _BOOK_PATH.exists():
        try:
            raw = json.loads(_BOOK_PATH.read_text(encoding="utf-8"))
            # rebuild positions dict
            pos = raw.get("positions") or {}
            if pos and isinstance(next(iter(pos.values()), None), dict):
                raw["positions"] = {k: Position(**v) for k, v in pos.items()}
            if raw.get("limits"):
                raw["limits"] = TradingLimits(**raw["limits"])
            if raw.get("policy"):
                raw["policy"] = Policy(**raw["policy"])
            tickets = []
            for t in raw.get("tickets") or []:
                tickets.append(TradeTicket(**t))
            raw["tickets"] = tickets
            return DeskState(**raw)
        except Exception:
            pass
    desk = DeskState(marks=dict(_DEFAULT_MARKS), updated_at=time.time())
    # default trading policy: no perps unless enabled
    desk.policy.allowed_categories = [
        Category.DEX,
        Category.VAULT,
        Category.LENDING,
        Category.STAKING,
        Category.ANALYTICS,
        Category.AGENT,
    ]
    return desk


def save_desk(desk: DeskState) -> None:
    desk.updated_at = time.time()
    _BOOK_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = desk.model_dump(mode="json")
    _BOOK_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def list_venues() -> List[Dict[str, Any]]:
    # enrich with atlas status when available
    atlas = {p.id: p for p in all_protocols()}
    out = []
    for v in VENUES:
        a = atlas.get(v.get("atlas_id") or v["id"])
        item = dict(v)
        if a:
            item["atlas_status"] = a.adapter_status
            item["atlas_notes"] = a.notes
        out.append(item)
    return out


def _ticket_to_action(t: TradeTicket) -> Action:
    venue = next((v for v in VENUES if v["id"] == t.venue_id), None)
    cat = Category.DEX
    if venue:
        try:
            cat = Category(venue["category"])
        except Exception:
            cat = Category.DEX
    notional = t.qty * t.limit_price
    # map desk risk into NOMOS dimensions
    exposure_bps = min(10_000, int((notional / 10_000.0) * 10_000))  # vs 10k equity baseline
    reserve_bps = max(0, 10_000 - exposure_bps)
    return Action(
        agent=t.agent,
        category=cat,
        protocol=t.venue_id,
        action=f"{t.side}:{t.pair}",
        value=notional,
        slippage_bps=t.slippage_bps,
        resulting_protocol_exposure_bps=min(9000, exposure_bps + 500),
        resulting_liquid_reserve_bps=max(500, reserve_bps - 500),
        resulting_leverage_bps=t.leverage_bps,
        expected_gain_bps=20,
        risk_bps=min(500, t.slippage_bps + (t.leverage_bps - 10_000) // 50),
        rationale=t.rationale or f"{t.side} {t.qty} {t.pair} @ {t.limit_price}",
    )


def _desk_risk_check(desk: DeskState, t: TradeTicket) -> List[str]:
    viol: List[str] = []
    notional = t.qty * t.limit_price
    t.notional = notional
    lim = desk.limits
    venue = next((v for v in VENUES if v["id"] == t.venue_id), None)

    if not venue:
        viol.append("unknown-venue")
    else:
        if venue["kind"] == "perps" and not lim.allow_perps:
            viol.append("perps-disabled-on-desk")
        if venue.get("pairs") and t.pair not in venue["pairs"]:
            viol.append("pair-not-listed-on-venue")
        if venue["kind"] == "analytics":
            viol.append("analytics-not-executable")
        if venue["kind"] == "custody_gate":
            viol.append("vault-is-gate-not-venue")

    if notional > lim.max_notional_per_ticket:
        viol.append("ticket-notional-limit")
    if t.side == "sell" and not lim.allow_short:
        # allow sell only to reduce long
        key = _pos_key(t.venue_id, t.pair)
        pos = desk.positions.get(key)
        if not pos or pos.qty <= 0:
            viol.append("short-disabled")
        elif t.qty > pos.qty + 1e-12:
            viol.append("sell-exceeds-long")

    open_n = sum(abs(p.notional) for p in desk.positions.values())
    if open_n + notional > lim.max_open_notional:
        viol.append("max-open-notional")

    key = _pos_key(t.venue_id, t.pair)
    pos = desk.positions.get(key)
    projected = (pos.qty if pos else 0.0) + (t.qty if t.side == "buy" else -t.qty)
    proj_notional = abs(projected * t.limit_price)
    if proj_notional > lim.max_position_notional:
        viol.append("max-position-notional")

    if desk.day_pnl < -lim.max_daily_loss:
        viol.append("daily-loss-limit")

    if t.leverage_bps > desk.policy.max_leverage_bps:
        viol.append("leverage-over-policy")

    if t.slippage_bps > desk.policy.max_slippage_bps:
        viol.append("slippage-over-policy")

    if notional > desk.policy.max_action_value:
        viol.append("action-value-over-policy")

    return viol


def _mark_pair(desk: DeskState, pair: str) -> float:
    return float(desk.marks.get(pair) or _DEFAULT_MARKS.get(pair) or 1.0)


def _revalue(desk: DeskState) -> None:
    unreal = 0.0
    for key, pos in desk.positions.items():
        mark = _mark_pair(desk, pos.pair)
        pos.mark_price = mark
        pos.notional = abs(pos.qty * mark)
        pos.unrealized_pnl = (mark - pos.avg_price) * pos.qty
        unreal += pos.unrealized_pnl
    desk.unrealized_pnl = unreal
    desk.equity = desk.cash_usdc + unreal


def propose_ticket(desk: DeskState, ticket: TradeTicket) -> TradeTicket:
    now = time.time()
    ticket.ticket_id = ticket.ticket_id or f"t-{uuid.uuid4().hex[:10]}"
    ticket.created_at = now
    ticket.updated_at = now
    ticket.notional = ticket.qty * ticket.limit_price
    ticket.status = "proposed"

    desk_viol = _desk_risk_check(desk, ticket)
    action = _ticket_to_action(ticket)
    nomos = evaluate(action, desk.policy)

    all_viol = list(desk_viol) + list(nomos.violations)
    reasons = []
    for v in desk_viol:
        reasons.append(_desk_reason(v))
    reasons.extend(nomos.reasons)

    ticket.violations = all_viol
    ticket.reasons = reasons

    if all_viol:
        ticket.status = "risk_rejected"
    else:
        ticket.status = "risk_accepted"

    rc = seal(
        "trading.ticket",
        {
            "ticket_id": ticket.ticket_id,
            "status": ticket.status,
            "pair": ticket.pair,
            "side": ticket.side,
            "notional": ticket.notional,
            "violations": ticket.violations,
        },
    )
    ticket.receipt_hash = rc["receipt_hash"]
    desk.tickets.insert(0, ticket)
    desk.tickets = desk.tickets[:200]
    save_desk(desk)

    if ticket.status == "risk_accepted":
        try:
            from .security_intelligence import approval_required, create_approval

            if approval_required("ticket", ticket.notional):
                create_approval(
                    "ticket",
                    ticket.ticket_id,
                    notional=ticket.notional,
                    requester=ticket.agent,
                    context={"pair": ticket.pair, "side": ticket.side, "venue_id": ticket.venue_id},
                )
        except Exception:
            pass

    return ticket


def _desk_reason(code: str) -> str:
    return {
        "unknown-venue": "Venue is not on the trading business roster.",
        "perps-disabled-on-desk": "Desk has allow_perps=false — enable only with explicit risk sign-off.",
        "pair-not-listed-on-venue": "Pair is not listed on this venue.",
        "analytics-not-executable": "Analytics venues cannot execute trades.",
        "vault-is-gate-not-venue": "SovereignVault gates capital; pick a trading venue to route.",
        "ticket-notional-limit": "Ticket notional exceeds max_notional_per_ticket.",
        "short-disabled": "Shorting disabled on this desk.",
        "sell-exceeds-long": "Sell qty exceeds long inventory.",
        "max-open-notional": "Open notional cap breached.",
        "max-position-notional": "Per-position notional cap breached.",
        "daily-loss-limit": "Daily loss limit hit — desk paused for new risk.",
        "leverage-over-policy": "Leverage exceeds NOMOS max_leverage_bps.",
        "slippage-over-policy": "Slippage exceeds NOMOS max_slippage_bps.",
        "action-value-over-policy": "Notional exceeds NOMOS max_action_value.",
    }.get(code, code)


def _stop_triggered(desk: DeskState, t: TradeTicket) -> bool:
    """Stop / stop-limit orders only fill once the mark crosses stop_price."""
    if t.order_type not in ("stop", "stop_limit"):
        return True
    if t.stop_price <= 0:
        return False
    mark = _mark_pair(desk, t.pair)
    if t.side == "buy":
        return mark >= t.stop_price
    return mark <= t.stop_price


def paper_fill(desk: DeskState, ticket_id: str) -> TradeTicket:
    ticket = next((t for t in desk.tickets if t.ticket_id == ticket_id), None)
    if not ticket:
        raise KeyError(ticket_id)
    if ticket.status != "risk_accepted":
        raise ValueError(f"ticket status {ticket.status} cannot fill")
    if not desk.limits.paper_mode:
        raise ValueError("paper_mode disabled — live route not implemented in workstation")
    if not _stop_triggered(desk, ticket):
        raise ValueError("stop-not-triggered: mark has not crossed stop_price yet")

    # market orders reference the live mark; limit/stop orders reference the ticket price
    ref_price = _mark_pair(desk, ticket.pair) if ticket.order_type == "market" else ticket.limit_price
    # fill at reference price with small adverse slip half of slippage budget
    slip = ticket.slippage_bps / 10_000.0
    px = ref_price * (1 + slip if ticket.side == "buy" else 1 - slip)
    ticket.fill_price = px
    notional = ticket.qty * px
    key = _pos_key(ticket.venue_id, ticket.pair)
    pos = desk.positions.get(key) or Position(
        pair=ticket.pair, venue_id=ticket.venue_id, mark_price=px
    )

    signed_qty = ticket.qty if ticket.side == "buy" else -ticket.qty
    if ticket.side == "buy":
        desk.cash_usdc -= notional
        # weighted avg for long add
        if pos.qty >= 0:
            new_qty = pos.qty + ticket.qty
            pos.avg_price = (
                (pos.avg_price * pos.qty + px * ticket.qty) / new_qty if new_qty else px
            )
            pos.qty = new_qty
        else:
            # cover short
            cover = min(ticket.qty, abs(pos.qty))
            ticket.pnl_delta = (pos.avg_price - px) * cover
            desk.realized_pnl += ticket.pnl_delta
            desk.day_pnl += ticket.pnl_delta
            pos.qty += ticket.qty
            if pos.qty > 0:
                pos.avg_price = px
    else:
        desk.cash_usdc += notional
        if pos.qty > 0:
            sell_qty = min(ticket.qty, pos.qty)
            ticket.pnl_delta = (px - pos.avg_price) * sell_qty
            desk.realized_pnl += ticket.pnl_delta
            desk.day_pnl += ticket.pnl_delta
            pos.qty -= ticket.qty
            if pos.qty < 0:
                pos.avg_price = px
        else:
            # open/add short
            new_qty = pos.qty - ticket.qty
            if pos.qty == 0:
                pos.avg_price = px
            else:
                pos.avg_price = (
                    (pos.avg_price * abs(pos.qty) + px * ticket.qty) / abs(new_qty)
                    if new_qty
                    else px
                )
            pos.qty = new_qty

    if abs(pos.qty) < 1e-12:
        pos.qty = 0.0
        desk.positions.pop(key, None)
    else:
        desk.positions[key] = pos

    ticket.status = "paper_filled"
    ticket.updated_at = time.time()
    _revalue(desk)
    rc = seal(
        "trading.paper_fill",
        {
            "ticket_id": ticket.ticket_id,
            "fill_price": ticket.fill_price,
            "pnl_delta": ticket.pnl_delta,
            "cash": desk.cash_usdc,
            "equity": desk.equity,
        },
    )
    ticket.receipt_hash = rc["receipt_hash"]
    save_desk(desk)
    return ticket


def agent_trade_ideas(desk: DeskState) -> List[TradeTicket]:
    """Generate competing trade ideas for the desk (lawful + unlawful)."""
    mon = _mark_pair(desk, "MON/USDC")
    ideas = [
        TradeTicket(
            agent="mm-bot",
            venue_id="kuru",
            pair="MON/USDC",
            side="buy",
            qty=50,
            limit_price=mon,
            slippage_bps=20,
            leverage_bps=10000,
            rationale="Inventory buy MON on Kuru within seatbelt",
        ),
        TradeTicket(
            agent="degen-bot",
            venue_id="perpl",
            pair="MON-PERP",
            side="buy",
            qty=5000,
            limit_price=mon,
            slippage_bps=800,
            leverage_bps=50000,
            rationale="Max long perps — should REJECT if perps/leverage banned",
        ),
        TradeTicket(
            agent="arb-bot",
            venue_id="uniswap",
            pair="WETH/USDC",
            side="sell",
            qty=0.1,
            limit_price=_mark_pair(desk, "WETH/USDC"),
            slippage_bps=25,
            leverage_bps=10000,
            rationale="Trim WETH inventory via AMM",
        ),
        TradeTicket(
            agent="whale-bot",
            venue_id="kuru",
            pair="MON/USDC",
            side="buy",
            qty=100_000,
            limit_price=mon,
            slippage_bps=15,
            leverage_bps=10000,
            rationale="Oversized ticket — should hit notional caps",
        ),
        TradeTicket(
            agent="quant-bot",
            venue_id="alpaca-equities",
            pair="AAPL",
            side="buy",
            order_type="market",
            qty=10,
            limit_price=_mark_pair(desk, "AAPL"),
            slippage_bps=15,
            leverage_bps=10000,
            rationale="Diversify desk into paper equities via Alpaca sandbox",
        ),
    ]
    return ideas


def run_desk_arena(desk: DeskState) -> Dict[str, Any]:
    results = []
    for idea in agent_trade_ideas(desk):
        # don't persist all ideas into history as separate — use ephemeral check
        t = idea.model_copy()
        t.ticket_id = f"sim-{uuid.uuid4().hex[:8]}"
        t.notional = t.qty * t.limit_price
        desk_viol = _desk_risk_check(desk, t)
        action = _ticket_to_action(t)
        nomos = evaluate(action, desk.policy)
        viol = desk_viol + list(nomos.violations)
        reasons = [_desk_reason(v) for v in desk_viol] + list(nomos.reasons)
        accepted = len(viol) == 0
        results.append(
            {
                "ticket": t.model_dump(mode="json"),
                "accepted": accepted,
                "violations": viol,
                "reasons": reasons,
                "nomos_summary": nomos.human_summary,
            }
        )
    accepted_rows = [r for r in results if r["accepted"]]
    winner = None
    if accepted_rows:
        # prefer smaller notional careful tickets
        winner = min(accepted_rows, key=lambda r: r["ticket"]["notional"])
    report = {
        "schema": "thesis.trading.arena.v1",
        "n": len(results),
        "n_accepted": len(accepted_rows),
        "n_rejected": len(results) - len(accepted_rows),
        "results": results,
        "winner": winner,
        "doctrine": "Trading agents propose. Desk limits + NOMOS decide. Paper fill is not mainnet.",
    }
    seal(
        "trading.arena",
        {
            "n_accepted": report["n_accepted"],
            "n_rejected": report["n_rejected"],
            "winner": (winner or {}).get("ticket", {}).get("agent"),
        },
    )
    return report


def desk_snapshot(desk: DeskState | None = None) -> Dict[str, Any]:
    d = desk or load_desk()
    _revalue(d)
    try:
        from .strategies import list_strategies

        strategies = list_strategies()
    except Exception:
        strategies = []
    try:
        from .broker_readiness import broker_status

        markets = broker_status()
    except Exception:
        markets = None
    try:
        from .live_gate import gate_status

        gate = gate_status()
        live_gate_summary = {
            "satisfied_count": gate["satisfied_count"],
            "total": gate["total"],
            "ready_for_live": gate["ready_for_live"],
        }
    except Exception:
        live_gate_summary = None
    return {
        "schema": "thesis.trading.snapshot.v1",
        "cash_usdc": d.cash_usdc,
        "equity": d.equity,
        "realized_pnl": d.realized_pnl,
        "unrealized_pnl": d.unrealized_pnl,
        "day_pnl": d.day_pnl,
        "limits": d.limits.model_dump(mode="json"),
        "policy": d.policy.model_dump(mode="json"),
        "positions": [p.model_dump(mode="json") for p in d.positions.values()],
        "open_notional": sum(abs(p.notional) for p in d.positions.values()),
        "tickets_recent": [t.model_dump(mode="json") for t in d.tickets[:25]],
        "venues": list_venues(),
        "marks": d.marks,
        "strategies": strategies,
        "markets": markets,
        "live_gate": live_gate_summary,
        "paper_mode": d.limits.paper_mode,
        "updated_at": d.updated_at,
        "business": {
            "name": "THESIS Trading Desk",
            "model": "Agent-assisted trading under desk risk + onchain vault gate",
            "live_execution": False,
            "strategies": ["market-make", "inventory", "take-profit"],
            "vault_route": "POST /desk/vault-route/{ticket_id}",
            "marks_feed": "POST /desk/marks/refresh",
            "note": "Integrate exchange/venue keys only in operator runtime — never in browser.",
        },
    }


def update_limits(desk: DeskState, limits: TradingLimits) -> DeskState:
    desk.limits = limits
    save_desk(desk)
    return desk


def update_policy(desk: DeskState, policy: Policy) -> DeskState:
    desk.policy = policy
    save_desk(desk)
    return desk


def set_mark(desk: DeskState, pair: str, price: float) -> DeskState:
    desk.marks[pair] = price
    _revalue(desk)
    save_desk(desk)
    return desk


def reset_desk() -> DeskState:
    desk = DeskState(marks=dict(_DEFAULT_MARKS), updated_at=time.time())
    desk.policy.allowed_categories = [
        Category.DEX,
        Category.VAULT,
        Category.LENDING,
        Category.STAKING,
        Category.ANALYTICS,
        Category.AGENT,
    ]
    save_desk(desk)
    return desk
