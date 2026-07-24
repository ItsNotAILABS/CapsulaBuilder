# Security and Authority Model

## Security objective

The platform is designed to let models, agents, applications, and operators collaborate without collapsing analysis, proposal, approval, custody, signing, and execution into one undifferentiated privilege.

The governing law is:

> Agents propose. Policy evaluates. Owners approve. Wallets sign. Receipts remember.

This document defines the trust zones, threat model, controls, and residual risks for MonadBuilder+, THESIS Agent Desktop, the MCP Spine, federation, blockchain adapters, PARRALAX, the Scientific Experiment Lab, and shared internal systems.

## Trust zones

| Zone | Examples | Default trust |
|---|---|---|
| Browser surface | MonadBuilder+, project editor, proof explorer | untrusted input and presentation layer |
| Desktop renderer | THESIS UI | untrusted presentation process with narrow preload API |
| Desktop main process | lifecycle, local configuration, IPC handlers | privileged local coordinator |
| MCP Spine | tool registry, policy, approvals, receipts | governed execution boundary |
| Adapter lane | Scientific Lab, GitHub, Cloudflare, blockchain, model adapters | capability-scoped and failure-isolated |
| Local durable state | receipts, namespace configuration, approval records | integrity-sensitive |
| Federation edge | authenticated remote envelopes | hostile network boundary |
| External signer/custodian | wallet, hardware device, multisig, institutional custody | independent authority domain |
| Public chain or remote service | Monad/EVM RPC, GitHub, Cloudflare, APIs | externally controlled dependency |

## Protected assets

- owner approval authority;
- wallet and custody authority;
- receipt-chain integrity;
- namespace isolation;
- tool registration and risk classification;
- federation signing and revocation material;
- release artifacts and checksums;
- private research, source, credentials, and operator data;
- model-routing configuration and protected model assets;
- experiment inputs and outputs;
- PARRALAX risk limits and execution plans.

## Principal threat classes

### Prompt and tool injection

Untrusted content may attempt to induce a model or agent to invoke a sensitive tool, bypass policy, disclose secrets, or reinterpret data as instructions.

Controls:

- content is never treated as authority;
- tools have explicit schemas and risk classes;
- sensitive calls enter a confirmation queue;
- adapters receive only capability-scoped inputs;
- secret material is rejected from ordinary tool arguments;
- policy decisions and denials are receipted.

Residual risk: a legitimate owner may approve a harmful proposal. The interface must therefore show exact parameters, identity, target, and consequences before approval.

### Confused deputy and privilege escalation

A low-privilege actor may try to make a higher-privilege component act on its behalf.

Controls:

- actor, namespace, capability, and policy profile are evaluated together;
- approvals bind to the exact request digest;
- approval reuse for modified requests is prohibited;
- adapter identities cannot inherit owner authority;
- signer authority remains outside the model and MCP reasoning lane.

### Replay and stale authorization

An attacker may replay a previously valid federation envelope, approval, or signed command.

Controls:

- nonce and request ID;
- issued-at and expiration times;
- replay cache;
- revocation state;
- approval binding to request digest;
- receipt history and duplicate detection.

### Command injection and unsafe local execution

An attacker may encode destructive or exfiltrating shell commands in arguments.

Controls:

- no unrestricted shell tool in the public registry;
- deny patterns for destructive, encoded, piped-download, credential, and persistence commands;
- allowlisted executors and working directories;
- resource quotas and timeouts;
- sandboxed runspaces;
- output size limits;
- denial receipts.

Pattern matching is not sufficient alone. Production execution requires structured command construction and capability-specific adapters rather than passing arbitrary strings to a shell.

### Namespace crossover

One user, team, project, or agent may attempt to read or mutate another namespace.

Controls:

- namespace is a first-class authorization field;
- storage keys are namespace-prefixed;
- cross-namespace operations require an explicit shared lane;
- receipts include namespace identity;
- tests cover isolation and denied crossover.

### Receipt tampering

A local actor may modify or delete prior receipts.

Controls:

- hash-linked receipts;
- canonical serialization;
- periodic manifests and external anchors where configured;
- verification command that recomputes the chain;
- release receipts include source commit and artifact hashes.

Residual risk: a privileged local actor can delete an entire local store. External anchoring, backups, and replicated proof lanes reduce this risk but are separate deployment features.

### Supply-chain compromise

Dependencies, build actions, release artifacts, or downloaded tools may be compromised.

Controls:

- pinned lockfiles;
- minimal GitHub Actions permissions;
- dependency inventory and vulnerability review;
- artifact checksums;
- reproducible or deterministic build steps where practical;
- provenance and signer separation;
- no execution of downloaded scripts through shell pipes.

### Federation impersonation

A remote peer may claim to be a trusted THESIS or NOVA instance.

Controls:

- signed envelopes;
- peer identity and key registration;
- expiration and replay checks;
- revocation;
- audience binding;
- TLS at the transport layer;
- failure isolation and circuit breaking.

### Wallet and transaction abuse

An agent may construct a misleading transaction, approve an unsafe allowance, route through a malicious contract, or misrepresent a simulation as execution.

Controls:

- public identity and observable balances do not grant signing authority;
- transaction intent is decoded before approval;
- chain ID, target, value, method, calldata summary, slippage, allowance, and simulation result are displayed;
- policy limits apply before the signer is invoked;
- hardware, multisig, embedded, and institutional providers retain their own approval boundaries;
- receipts distinguish proposal, policy approval, owner approval, signature request, broadcast, and confirmed result.

### Market-model risk

PARRALAX analysis may be wrong, stale, overfit, manipulated, or unsuitable for live capital.

Controls:

- simulation and live execution are distinct modes;
- data source and timestamp are recorded;
- risk limits and kill switches are external to strategy output;
- no claim of financial performance without reproducible evidence;
- owner and custody approval remain independent.

## Capability lifecycle

1. **Register** - code registers a named tool with schema, owner, risk tier, and adapter.
2. **Discover** - clients receive only capabilities allowed for their identity and namespace.
3. **Propose** - the caller submits structured arguments.
4. **Validate** - schema, identity, namespace, quotas, and policy are evaluated.
5. **Queue** - sensitive operations create an immutable approval request.
6. **Resolve** - an owner approves or denies the exact digest.
7. **Execute** - the scoped adapter runs within its boundary.
8. **Receipt** - outcome, denial, or failure is hash-linked.
9. **Revoke** - credentials, peers, tools, or policies can be disabled.
10. **Recover** - durable state is verified and restored through documented procedures.

## Desktop security requirements

- `contextIsolation: true`;
- `sandbox: true`;
- `nodeIntegration: false`;
- narrow preload API with explicit methods;
- IPC handlers validate every argument;
- no renderer access to raw filesystem, process, shell, or credential APIs;
- external URLs use an allowlist and open outside the privileged renderer;
- Content Security Policy for packaged renderer assets;
- update packages require integrity verification;
- logs redact tokens, secrets, and private payloads.

## Federation requirements

A federation envelope should minimally contain:

```json
{
  "version": "1",
  "issuer": "peer-id",
  "audience": "target-peer-id",
  "issuedAt": "RFC3339",
  "expiresAt": "RFC3339",
  "nonce": "unique-value",
  "namespace": "project-or-team",
  "operation": "named-operation",
  "payloadDigest": "sha256:...",
  "signature": "detached-signature"
}
```

The receiver must reject missing, malformed, expired, future-dated, replayed, revoked, wrong-audience, or invalidly signed envelopes before adapter dispatch.

## Incident classes

| Severity | Example | Required response |
|---|---|---|
| SEV-1 | signer compromise, unauthorized external execution, receipt integrity loss | stop federation and sensitive tools, preserve evidence, rotate credentials, notify owners, initiate recovery |
| SEV-2 | namespace crossover, approval bypass, remote impersonation attempt | isolate affected components, revoke identity, verify receipts, patch and retest |
| SEV-3 | adapter outage, degraded monitoring, non-sensitive data corruption | fail closed where necessary, restore service, document impact |
| SEV-4 | documentation mismatch or non-security UI defect | normal issue and release workflow |

## Non-claims

This architecture does not claim perfect security, autonomous legal compliance, guaranteed financial outcomes, immunity from operator error, or external audit status. Security posture advances only through implementation, deterministic tests, deployment evidence, incident practice, and independent assessment.