# II. Governed Agent Execution

**Policy-mediated tools, owner approval, external signing, and hash-linked receipts**

## Abstract

Agent systems increasingly move from text generation into tool use, local execution, infrastructure control, scientific workflows, and transaction preparation. The central engineering problem is no longer only whether an agent can complete a task. It is whether the system can preserve authority, explain decisions, deny unsafe actions, isolate failure, and reconstruct what occurred. This paper presents a governed execution model built around a code-registered MCP Spine, typed capability schemas, explicit risk tiers, immutable approval requests, external signing, namespace isolation, and hash-linked receipts. The architecture distinguishes proposal from authorization and authorization from execution. It is designed for MonadBuilder+, THESIS Agent Desktop, PARRALAX, NEXUS, MESIE, the Scientific Experiment Lab, and federated adapters, but the model is general enough for other local-first agent systems.

## 1. Motivation

A conventional tool-using agent often follows a simple loop: infer a tool call, invoke a function, return the result. That loop is insufficient when tools can modify files, publish code, control infrastructure, prepare transactions, or operate on protected research. It conflates intelligence with permission and treats logs as an implementation detail.

A production execution system must answer five questions before every material action:

1. Who is requesting the action?
2. In which namespace and on whose behalf?
3. Is the requested capability visible and permitted?
4. Does policy require owner confirmation or permanent denial?
5. What evidence will remain after success, failure, or refusal?

The design presented here turns those questions into protocol states rather than informal conventions.

## 2. Governing law

> Agents propose. Policy evaluates. Owners approve. Wallets sign. Receipts remember.

Each clause denotes a distinct authority transition.

- **Agents propose**: model output is an untrusted recommendation until validated.
- **Policy evaluates**: schemas, identity, namespace, risk, quotas, and operation-specific law are applied.
- **Owners approve**: sensitive actions require an explicit decision bound to exact arguments.
- **Wallets sign**: cryptographic custody remains in an external signer or custody system.
- **Receipts remember**: each material state transition is preserved through a verifiable chain.

## Architecture

### 3.1 Capability registry

Tools are registered by code rather than discovered from arbitrary filesystem content. Each registration includes:

```text
name
version
owner
adapter
input schema
output class
risk tier
allowed namespaces
confirmation policy
quota profile
timeout
receipt policy
```

The registry is authoritative. A model cannot create new authority merely by naming a tool.

### 3.2 Risk classes

The minimal classification is:

| Risk class | Meaning | Default behavior |
|---|---|---|
| `read` | inspect data without material mutation | execute after identity, schema, and namespace checks |
| `proposal` | construct plans, simulations, patches, or unsigned transactions | execute but mark output non-authoritative |
| `sensitive` | mutate durable state, publish, deploy, call protected adapters, or request signing | require owner approval |
| `denied` | operations outside platform law | reject permanently and receipt the denial |

A tool can move to a stricter class through policy. It must never silently downgrade itself.

### 3.3 Approval object

An approval request should contain:

```json
{
  "approvalId": "unique-id",
  "requestDigest": "sha256:...",
  "actor": "agent-or-user-id",
  "namespace": "project-id",
  "tool": "tool.name",
  "normalizedArguments": {},
  "risk": "sensitive",
  "createdAt": "RFC3339",
  "expiresAt": "RFC3339",
  "status": "pending"
}
```

The owner approves or denies the exact digest. Any modification to tool name, arguments, namespace, actor, or policy-relevant context creates a new digest and invalidates the prior approval.

### 3.4 Execution adapters

Adapters translate a governed capability into a bounded operation. They must not expose a generic unrestricted shell when a structured adapter is possible. A GitHub adapter should accept repository, branch, path, and content fields. A scientific adapter should accept an experiment plan and bounded data references. A blockchain adapter should accept a decoded transaction intent rather than an opaque command string.

Adapters execute with:

- explicit working scope;
- time and resource limits;
- output size limits;
- cancellation;
- failure isolation;
- secret redaction;
- receipt emission.

### 3.5 Namespace isolation

Namespace is evaluated at discovery, proposal, approval, execution, storage, and receipt time. It is not enough to add a namespace label to the final log. The namespace determines which tools and artifacts are visible and which policy applies.

Shared lanes require explicit membership and cannot be inferred from similar names. Cross-namespace operations should be separately named capabilities with their own approval rules.

### 3.6 Receipt chain

For receipt `R_n`, define:

```text
H_n = SHA256(Canonical(R_n without currentHash) || H_(n-1))
```

The receipt records:

- schema version;
- event type;
- actor and namespace;
- tool and adapter;
- normalized request digest;
- policy decision;
- approval reference;
- result digest or denial reason;
- timestamps;
- previous hash;
- current hash;
- source commit or release identifier when available.

Canonical serialization must be deterministic. Verification recomputes every link from the genesis receipt.

## 4. Policy evaluation

Policy is a deterministic function over structured state:

```text
Decision = P(identity, namespace, capability, arguments, risk,
             quotas, environment, revocation, approval_state)
```

Possible decisions include:

- allow;
- allow as proposal only;
- require confirmation;
- deny by policy;
- deny permanently;
- throttle;
- defer because a dependency is unavailable.

Policy should return machine-readable rule identifiers and human-readable explanations. A refusal without a rule is difficult to audit; a rule without an explanation is difficult to operate.

## 5. Wallet and transaction boundary

A public address, balance, or wallet connection is not signing authority. Transaction work is split into:

1. intent construction;
2. chain and target validation;
3. calldata decoding;
4. simulation;
5. policy evaluation;
6. owner approval;
7. external signer request;
8. broadcast;
9. confirmation tracking;
10. receipt linkage.

PARRALAX may generate signals, portfolio analyses, routing options, treasury simulations, and risk-scored plans. Its output remains proposal-class until policy and owner decisions advance it. No performance claim should be made without a reproducible dataset, benchmark method, fees, latency assumptions, and out-of-sample evaluation.

## 6. Federation

Remote capability calls use signed envelopes containing issuer, audience, namespace, operation, payload digest, issue time, expiration, nonce, and signature. The receiver checks:

- known peer;
- valid signature;
- correct audience;
- acceptable clock skew;
- unexpired request;
- unseen nonce;
- non-revoked identity;
- namespace permission;
- operation permission.

Federation transports a proposal. It does not transport implicit owner authority.

## Evaluation

### 7.1 Functional assertions

A validation suite should include at least:

- strict schema rejection;
- unknown tool rejection;
- hidden capability rejection;
- sensitive call queued before execution;
- approval digest mismatch rejection;
- expired approval rejection;
- denied tool receipt;
- namespace crossover rejection;
- rate-limit behavior;
- timeout behavior;
- adapter failure isolation;
- receipt-chain verification;
- replayed envelope rejection;
- revoked peer rejection;
- external signer separation.

### 7.2 Adversarial scenarios

The system should test prompt injection, encoded command payloads, path traversal, shell metacharacters, download-and-execute patterns, secret exfiltration requests, oversized outputs, stale market data, malicious contract targets, approval race conditions, and receipt modification.

### 7.3 Operational evidence

A production claim requires more than passing unit tests. The proof package should include environment metadata, commit SHA, dependency inventory, test receipt, benchmark receipt, failure-injection results, recovery evidence, and artifact checksums.

## 8. Why receipts matter

Logs typically answer what a process printed. Receipts answer what authority transition occurred. A useful receipt chain can distinguish:

- proposed but never approved;
- denied by policy;
- approved but not executed;
- executed locally;
- requested external signature;
- broadcast externally;
- confirmed by an external system;
- failed and recovered.

This distinction is especially important for financial, infrastructure, scientific, and publishing workflows, where an output may be mistaken for an action.

## Limitations

Hash chains provide tamper evidence, not guaranteed availability. A privileged actor can delete a local receipt store unless it is replicated or externally anchored.

Policy correctness depends on policy design and implementation. A complete formal verification of all adapters is outside the current scope.

Human confirmation can still authorize harmful actions. Approval interfaces must expose exact, decoded consequences and should avoid vague prompts.

Signature verification does not protect a compromised endpoint after authentication. Device security, rotation, revocation, monitoring, and incident response remain necessary.

The architecture does not establish legal compliance automatically. Jurisdiction-specific obligations require professional review and deployment-specific controls.

## Conclusion

Governed execution begins by refusing to equate agent intelligence with authority. Typed tools, deterministic policy, exact-digest approvals, external signing, namespace isolation, bounded adapters, and hash-linked receipts create a system in which powerful agents can operate without becoming unaccountable principals. The result is not an agent that can do everything. It is an execution architecture that can explain what was allowed, what was denied, who approved it, what actually ran, and what evidence remains.