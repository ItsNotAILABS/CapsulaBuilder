"""Broker adapter readiness registry — paper/sandbox posture only.

THESIS does not hold live brokerage credentials and does not submit live
orders here. This registry models adapter *readiness* for real-world asset
classes (equities, options, forex, crypto-CEX) the same way `trading.py`
models Monad DEX venues: paper/sandbox/testnet first, live execution always
operator-gated behind `live_gate.py`.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

BROKERS: List[Dict[str, Any]] = [
    {
        "id": "alpaca_sandbox",
        "name": "Alpaca (paper)",
        "asset_class": "equities",
        "posture": "sandbox",
        "pairs": ["AAPL", "TSLA", "SPY", "NVDA", "QQQ"],
        "notes": "US equities paper trading sandbox.",
    },
    {
        "id": "interactive_brokers_paper",
        "name": "Interactive Brokers (paper)",
        "asset_class": "equities",
        "posture": "paper",
        "pairs": ["AAPL", "MSFT", "SPY"],
        "notes": "Global multi-asset paper account.",
    },
    {
        "id": "tradier_sandbox",
        "name": "Tradier (sandbox)",
        "asset_class": "equities",
        "posture": "sandbox",
        "pairs": ["SPY", "QQQ", "AAPL"],
        "notes": "Equities + options sandbox.",
    },
    {
        "id": "schwab_developer_sandbox",
        "name": "Schwab (developer sandbox)",
        "asset_class": "equities",
        "posture": "sandbox",
        "pairs": ["AAPL", "SPY"],
        "notes": "Schwab developer sandbox environment.",
    },
    {
        "id": "tastytrade_sandbox",
        "name": "Tastytrade (sandbox)",
        "asset_class": "options",
        "posture": "sandbox",
        "pairs": ["SPY", "QQQ"],
        "notes": "Options-first sandbox.",
    },
    {
        "id": "coinbase_sandbox",
        "name": "Coinbase (sandbox)",
        "asset_class": "crypto_cex",
        "posture": "sandbox",
        "pairs": ["BTC/USD", "ETH/USD"],
        "notes": "Centralized crypto exchange sandbox.",
    },
    {
        "id": "kraken_sandbox",
        "name": "Kraken (sandbox)",
        "asset_class": "crypto_cex",
        "posture": "sandbox",
        "pairs": ["BTC/USD", "ETH/USD"],
        "notes": "Centralized crypto exchange sandbox.",
    },
    {
        "id": "binance_testnet",
        "name": "Binance (testnet)",
        "asset_class": "crypto_cex",
        "posture": "testnet",
        "pairs": ["BTC/USDT", "ETH/USDT"],
        "notes": "Binance testnet spot + futures.",
    },
    {
        "id": "oanda_practice",
        "name": "OANDA (practice)",
        "asset_class": "forex",
        "posture": "practice",
        "pairs": ["EUR/USD", "GBP/USD", "USD/JPY"],
        "notes": "Forex practice account.",
    },
    {
        "id": "dxtrade_demo",
        "name": "DXtrade (demo)",
        "asset_class": "forex",
        "posture": "demo",
        "pairs": ["EUR/USD", "USD/JPY"],
        "notes": "Multi-asset demo trading.",
    },
    {
        "id": "mt5_demo_bridge",
        "name": "MetaTrader 5 (demo bridge)",
        "asset_class": "forex",
        "posture": "demo",
        "pairs": ["EUR/USD", "XAU/USD"],
        "notes": "MT5 demo account bridge.",
    },
]


def list_brokers() -> List[Dict[str, Any]]:
    return [dict(b) for b in BROKERS]


def get_broker(broker_id: str) -> Optional[Dict[str, Any]]:
    return next((dict(b) for b in BROKERS if b["id"] == broker_id), None)


def broker_status() -> Dict[str, Any]:
    by_class: Dict[str, int] = {}
    for b in BROKERS:
        by_class[b["asset_class"]] = by_class.get(b["asset_class"], 0) + 1
    return {
        "schema": "thesis.brokers.status.v1",
        "count": len(BROKERS),
        "by_asset_class": by_class,
        "posture": "paper_sandbox_first",
        "doctrine": "Broker adapters model readiness only. No live orders are submitted from THESIS.",
        "live_execution": False,
    }
