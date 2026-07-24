# Production Maturity Contract

## Purpose

This document defines what `MonadBuilder+` and `THESIS Agent Desktop` must prove before a release may be described as production-ready. It separates implemented source, locally validated behavior, release-candidate evidence, externally deployed infrastructure, and externally audited claims.

The platform has exactly two public products:

- **MonadBuilder+** - browser creation, application, crypto, market-intelligence, research, publishing, and proof surface.
- **THESIS Agent Desktop** - local control plane for MCP lifecycle, permissions, approvals, governed execution, receipts, adapters, namespaces, federation, and releases.

`NOVA Runtime`, `MCP Spine`, `Triple-MCP`, `NEXUS`, `Loom Cluster`, `MESIE`, `Virtual Processor`, `PARRALAX`, `LiveVault`, `Scientific Experiment Lab`, and `Medina Protocol` are shared internal systems. They are not additional public products.

## Maturity levels

| Level | Meaning | Required evidence |
|---|---|---|
| **L0 - Concept** | Named architecture or proposed capability | design note and explicit proposal label |
| **L1 - Source** | Implemented code exists | source path, schema, owner, and limitation statement |
| **L2 - Locally validated** | Deterministic checks pass in a controlled environment | test receipt, environment metadata, commit SHA, and hash manifest |
| **L3 - Release candidate** | Packaging, upgrade, rollback, and operator instructions are complete | CI run, artifact manifest, threat model, recovery drill, and release notes |
| **L4 - Externally deployed** | A named external environment is live and monitored | deployment identifier, health evidence, DNS/TLS evidence, synthetic monitor, and rollback target |
| **L5 - Independently assessed** | A qualified external party has reviewed a defined scope | assessor, scope, date, report or attestation, and unresolved findings |

No document, badge, release note, API response, or dashboard may imply a higher level than the available evidence supports.

## Production invariants

### Product boundary

1. There are exactly two public products.
2. A companion, adapter, canister, MCP server, model, agent, or runtime is not promoted into a third product without an explicit architecture decision.
3. Browser and desktop surfaces share identity, policy, receipts, and release semantics.

### Authority boundary

> Agents propose. Policy evaluates. Owners approve. Wallets sign. Receipts remember.

1. Agent output is a proposal, not authority.
2. Sensitive tools require an explicit owner-controlled approval state.
3. Wallet signing remains external to model reasoning and is never inferred from possession of a public address.
4. Denied actions emit receipts with the rule, identity, request hash, and denial reason.
5. PARRALAX may analyze markets, simulate portfolios, score risk, and prepare execution plans; it must not silently gain unrestricted trading authority.

### Local execution boundary

1. The MCP Spine binds to loopback by default.
2. Remote exposure requires authenticated federation, explicit configuration, and operator-visible state.
3. Shell-like execution is deny-by-default and must pass command classification, namespace policy, quotas, and confirmation gates.
4. Desktop renderer code remains sandboxed, context-isolated, and without Node integration.
5. Private keys, seed phrases, mnemonics, recovery phrases, and raw custody secrets are rejected from normal application storage and model context.

### Receipt boundary

Every material execution receipt must include:

- receipt schema version;
- unique receipt ID;
- timestamp;
- actor and namespace;
- tool or operation identity;
- request digest;
- policy outcome;
- approval reference when applicable;
- result digest or denial reason;
- previous receipt hash;
- current receipt hash;
- source commit or release identifier when available.

The receipt chain proves recorded sequence and integrity. It does not by itself prove that an external claim, financial result, or third-party system state is true.

## Release gates

A coordinated release may proceed only when all applicable gates pass:

1. **Repository gate** - required files, schemas, manifests, and prohibited-claim scan.
2. **MCP gate** - initialization, tool listing, calls, approvals, denials, replay protection, rate limits, namespaces, and receipt-chain integrity.
3. **Desktop gate** - sandboxing, preload boundary, lifecycle control, confirmation queue, packaged resource discovery, and smoke test.
4. **Web gate** - build, route health, MCP bridge status, permission UX, receipt explorer, and failure-state rendering.
5. **Contract gate** - compilation, tests, chain configuration, deployment simulation, and signer separation.
6. **Federation gate** - authenticated envelope verification, expiration, replay protection, revocation, and remote failure isolation.
7. **Artifact gate** - hash manifest, software bill of materials where applicable, release notes, provenance, and checksums.
8. **Recovery gate** - rollback command, backup/restore evidence, receipt verification after recovery, and operator drill record.

## Required proofroom artifacts

Each release candidate should publish or retain, according to its public/private classification:

```text
proofroom/
  release-manifest.json
  hash-manifest.json
  system-test-receipt.json
  benchmark-receipt.json
  security-boundary-receipt.json
  recovery-drill-receipt.json
  dependency-inventory.json
  release-notes.md
```

Secrets, private infrastructure identifiers, customer data, private model weights, internal threat intelligence, and unrestricted operational credentials must remain in private lanes.

## Reliability objectives

Initial release-candidate objectives are engineering targets, not current production claims:

| Surface | Objective |
|---|---|
| Local MCP health | deterministic health response and bounded startup failure |
| Approval workflow | no sensitive execution before resolved approval |
| Receipt write | append-only behavior with hash-chain verification |
| Desktop recovery | restart local bridge without losing durable receipts |
| Federation | reject expired, replayed, unsigned, revoked, or malformed envelopes |
| Browser UX | explicit degraded state when desktop or federation is unavailable |

External SLOs require a named deployed environment and measured telemetry before publication.

## Release classification language

Use these phrases precisely:

- **Implemented in source** - code exists, but may not have passed all gates.
- **Locally validated** - deterministic checks passed in a stated environment.
- **Release candidate** - packaging and operational gates passed for a specific commit.
- **Externally deployed** - a named environment is live with evidence.
- **Externally audited** - a named assessor reviewed a defined scope.

Do not replace evidence with adjectives such as "military-grade," "unbreakable," "fully autonomous," "production-grade," or "institutional" unless the exact supporting scope is published.

## Current boundary

The repository contains substantial implementation across the browser application, THESIS engine, contracts, desktop application, MCP Spine, edge source, receipts, and release automation. Production DNS, authenticated external federation, synthetic monitoring, signed Windows distribution, notarized macOS distribution, unrestricted live trading, and external certification remain separate evidence-gated milestones.