"""Agent Vaults — governed financial envelopes for Monad agent swarms.

Tailored from the PARALLAX doctrine (vault boundary -> wallet execution ->
policy gate -> connector proposal -> receipt evidence) to THESIS's Monad-native
stack: vaults hold paper wallet balances denominated in MON/USDC, connectors
reference existing THESIS trading venues and broker-readiness adapters, and
every ledger transfer is gated by the same NOMOS policy kernel used by the
trading desk.

    Vault boundary -> wallet -> policy gate -> connector -> receipt evidence

No custody, no private keys, no live money movement. Paper/testnet only —
the same operator-gated posture as `trading.py` and `vault_route.py`.
"""

from __future__ import annotations

import json
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from .broker_readiness import get_broker
from .models import Action, Category, Policy
from .network import NetworkId, get_network
from .policy import evaluate
from .receipts import seal
from .trading import VENUES

_ROOT = Path(__file__).resolve().parents[2]
_VAULTS_PATH = _ROOT / "receipts" / "agent_vaults.json"

_STARTING_BALANCES = {"MON": 100.0, "USDC": 1_000.0}


class LedgerEntry(BaseModel):
    entry_id: str = ""
    from_symbol: str
    to_symbol: str
    amount: float
    note: str = ""
    accepted: bool = False
    violations: list[str] = Field(default_factory=list)
    reasons: list[str] = Field(default_factory=list)
    receipt_hash: str = ""
    created_at: float = 0.0


class RegisteredAgent(BaseModel):
    agent_id: str
    role: str = "trader"
    registered_at: float = 0.0


class AgentVault(BaseModel):
    vault_id: str = ""
    name: str
    network: str = "monad-testnet"
    chain_id: int = 10143
    wallets: dict[str, float] = Field(default_factory=lambda: dict(_STARTING_BALANCES))
    connectors: list[str] = Field(default_factory=list)
    agents: list[RegisteredAgent] = Field(default_factory=list)
    ledger: list[LedgerEntry] = Field(default_factory=list)
    policy: Policy = Field(default_factory=Policy)
    no_custody: bool = True
    live_execution: bool = False
    created_at: float = 0.0
    updated_at: float = 0.0


def _load_all() -> Dict[str, AgentVault]:
    if _VAULTS_PATH.exists():
        try:
            raw = json.loads(_VAULTS_PATH.read_text(encoding="utf-8"))
            return {k: AgentVault(**v) for k, v in raw.items()}
        except Exception:
            pass
    return {}


def _save_all(vaults: Dict[str, AgentVault]) -> None:
    _VAULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {k: v.model_dump(mode="json") for k, v in vaults.items()}
    _VAULTS_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _connector_catalog() -> Dict[str, Dict[str, Any]]:
    catalog: Dict[str, Dict[str, Any]] = {}
    for v in VENUES:
        catalog[v["id"]] = {"kind": "venue", "name": v["name"], "asset_class": v.get("asset_class")}
    return catalog


def list_vaults() -> List[Dict[str, Any]]:
    return [vault_snapshot(v) for v in _load_all().values()]


def get_vault(vault_id: str) -> Optional[Dict[str, Any]]:
    vaults = _load_all()
    v = vaults.get(vault_id)
    return vault_snapshot(v) if v else None


def create_vault(name: str, network: NetworkId | str = "monad-testnet") -> Dict[str, Any]:
    net = get_network(network)  # raises/handles unknown network upstream
    now = time.time()
    vault = AgentVault(
        vault_id=f"vault-{uuid.uuid4().hex[:10]}",
        name=name,
        network=net["id"],
        chain_id=net["chain_id"],
        created_at=now,
        updated_at=now,
    )
    vaults = _load_all()
    vaults[vault.vault_id] = vault
    _save_all(vaults)
    seal(
        "agent_vault.create",
        {"vault_id": vault.vault_id, "name": name, "network": vault.network, "chain_id": vault.chain_id},
    )
    return vault_snapshot(vault)


def add_connector(vault_id: str, connector_id: str) -> Dict[str, Any]:
    vaults = _load_all()
    vault = vaults.get(vault_id)
    if not vault:
        raise KeyError(vault_id)
    catalog = _connector_catalog()
    broker = get_broker(connector_id)
    if connector_id not in catalog and not broker:
        raise ValueError(f"unknown connector: {connector_id}")
    if connector_id not in vault.connectors:
        vault.connectors.append(connector_id)
        vault.updated_at = time.time()
        _save_all(vaults)
        seal("agent_vault.connector", {"vault_id": vault_id, "connector_id": connector_id})
    return vault_snapshot(vault)


def register_agent(vault_id: str, agent_id: str, role: str = "trader") -> Dict[str, Any]:
    vaults = _load_all()
    vault = vaults.get(vault_id)
    if not vault:
        raise KeyError(vault_id)
    if not any(a.agent_id == agent_id for a in vault.agents):
        vault.agents.append(RegisteredAgent(agent_id=agent_id, role=role, registered_at=time.time()))
        vault.updated_at = time.time()
        _save_all(vaults)
        seal("agent_vault.agent", {"vault_id": vault_id, "agent_id": agent_id, "role": role})
    return vault_snapshot(vault)


def ledger_transfer(vault_id: str, from_symbol: str, to_symbol: str, amount: float, note: str = "") -> Dict[str, Any]:
    """Move paper balance between two symbols in the same vault, gated by NOMOS.

    This never touches real funds — it is an internal accounting move within
    the vault's paper wallet, evaluated against the vault's policy exactly
    like a desk trading ticket.
    """
    vaults = _load_all()
    vault = vaults.get(vault_id)
    if not vault:
        raise KeyError(vault_id)

    entry = LedgerEntry(
        entry_id=f"ldg-{uuid.uuid4().hex[:10]}",
        from_symbol=from_symbol,
        to_symbol=to_symbol,
        amount=amount,
        note=note,
        created_at=time.time(),
    )

    violations: list[str] = []
    if amount <= 0:
        violations.append("amount-must-be-positive")
    balance = vault.wallets.get(from_symbol, 0.0)
    if amount > balance:
        violations.append("insufficient-vault-balance")

    action = Action(
        agent=f"vault:{vault_id}",
        category=Category.VAULT,
        protocol="agent-vault-ledger",
        action=f"transfer:{from_symbol}->{to_symbol}",
        value=amount,
        slippage_bps=0,
        resulting_protocol_exposure_bps=1000,
        resulting_liquid_reserve_bps=max(0, 10_000 - int((amount / max(balance, 1e-9)) * 10_000)),
        resulting_leverage_bps=10_000,
        rationale=note or f"ledger transfer {from_symbol}->{to_symbol}",
    )
    nomos = evaluate(action, vault.policy)
    if not nomos.accepted:
        violations.extend(nomos.violations)

    entry.violations = violations
    entry.reasons = list(nomos.reasons)
    entry.accepted = len(violations) == 0

    if entry.accepted:
        vault.wallets[from_symbol] = balance - amount
        vault.wallets[to_symbol] = vault.wallets.get(to_symbol, 0.0) + amount

    rc = seal(
        "agent_vault.ledger_transfer",
        {
            "vault_id": vault_id,
            "entry_id": entry.entry_id,
            "from": from_symbol,
            "to": to_symbol,
            "amount": amount,
            "accepted": entry.accepted,
        },
    )
    entry.receipt_hash = rc["receipt_hash"]

    vault.ledger.insert(0, entry)
    vault.ledger = vault.ledger[:200]
    vault.updated_at = time.time()
    _save_all(vaults)
    return vault_snapshot(vault)


def vault_snapshot(vault: AgentVault) -> Dict[str, Any]:
    catalog = _connector_catalog()
    connectors = []
    for cid in vault.connectors:
        info = catalog.get(cid)
        broker = None if info else get_broker(cid)
        connectors.append(
            {
                "id": cid,
                "kind": "venue" if info else "broker",
                "name": (info or broker or {}).get("name", cid),
                "asset_class": (info or broker or {}).get("asset_class"),
            }
        )
    return {
        "schema": "thesis.agent_vault.v1",
        "vault_id": vault.vault_id,
        "name": vault.name,
        "network": vault.network,
        "chain_id": vault.chain_id,
        "wallets": vault.wallets,
        "connectors": connectors,
        "agents": [a.model_dump(mode="json") for a in vault.agents],
        "ledger_recent": [e.model_dump(mode="json") for e in vault.ledger[:25]],
        "policy": vault.policy.model_dump(mode="json"),
        "boundary": {
            "no_custody": vault.no_custody,
            "live_execution": vault.live_execution,
            "doctrine": "Vault boundary -> wallet -> policy gate -> connector -> receipt evidence. Paper/testnet only.",
        },
        "created_at": vault.created_at,
        "updated_at": vault.updated_at,
    }
