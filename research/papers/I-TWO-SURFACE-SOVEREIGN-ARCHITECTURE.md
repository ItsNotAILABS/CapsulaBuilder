# I. Two-Surface Sovereign Architecture

**MonadBuilder+ and THESIS Agent Desktop as a unified browser-local intelligence system**

## Abstract

Modern AI products often fragment creation, execution, custody, governance, and proof across unrelated applications. This produces an authority problem: the surface that generates an action is frequently too close to the system that executes it, while the systems that record consequences are added afterward as logs rather than designed as first-class architecture. This paper presents a two-surface architecture in which MonadBuilder+ provides the public browser-facing creation and ecosystem surface, while THESIS Agent Desktop provides the local sovereign control and execution surface. The surfaces are joined by an authenticated federation contract and a governed MCP Spine. The design preserves one product story while separating untrusted interaction from privileged local capability. It also treats receipts, namespaces, policy, owner approval, and external signing as load-bearing system primitives. The paper describes the architecture, threat boundaries, control flow, evaluation model, and limitations of the current source implementation.

## 1. Problem statement

AI application development increasingly combines natural-language generation, visual editing, local files, cloud APIs, blockchain actions, market analysis, scientific tools, and deployment automation. A single web application can make these capabilities accessible, but giving that web surface unrestricted access to local execution, credentials, wallets, or infrastructure creates unacceptable concentration of authority.

The opposite pattern is also weak: a local desktop agent that has tools but lacks a coherent public creation surface becomes an operator console disconnected from the user-facing product. The result is duplication, fragmented identity, incompatible receipts, and multiple competing product narratives.

The design objective is therefore not merely to connect a website to a desktop application. It is to construct one system with two authority-distinct surfaces:

- a browser surface optimized for creation, collaboration, discovery, and publication;
- a local surface optimized for governed capability, approval, execution, receipts, and recovery.

## 2. Design principles

The architecture follows six principles.

### 2.1 One system, two public surfaces

MonadBuilder+ and THESIS Agent Desktop are the only public products. Internal runtimes, models, adapters, MCP servers, mobile experiments, and canisters remain shared technology unless an explicit architecture decision changes their status.

### 2.2 Authority is not inferred from intelligence

A model may be capable of proposing a sophisticated action, but competence does not imply authority. Proposal, policy evaluation, owner approval, signing, broadcast, and confirmation are separate state transitions.

### 2.3 Namespaces are security boundaries

A namespace is not a visual label. It determines storage keys, tool visibility, receipt ownership, policy inheritance, and whether cross-user or cross-project access is legal.

### 2.4 Receipts are part of execution

A receipt is not an optional audit log written after the fact. Material execution is incomplete until its decision, actor, arguments, policy result, approval state, output digest, and chain linkage are recorded.

### 2.5 Failure must remain local

A failed adapter, model provider, remote peer, or experiment must not collapse the control plane. Adapters are capability-scoped and failure-isolated.

### 2.6 External authority remains external

Wallets, hardware signers, multisigs, institutional custody systems, and deployment credentials retain their own authority. The platform can prepare and evaluate actions without silently absorbing custody.

## Architecture

The canonical structure is:

```text
MONADBUILDER+ WEB
Creation / applications / crypto / markets / research / publishing
                         |
                authenticated federation
                         |
THESIS AGENT DESKTOP
Local intelligence / MCP / approvals / tools / receipts / execution
```

### 3.1 MonadBuilder+

The browser surface contains application generation, visual editing, templates, learning systems, wallet identity, contract analysis, market research, scientific workflows, publishing, GitHub integration, deployment planning, and proof exploration. It is intentionally broad in interaction but narrow in authority.

Browser requests that require privileged capability are transformed into structured proposals. The proposal includes the requesting identity, namespace, operation, schema version, arguments, risk classification, and expected result class. The browser does not convert a proposal into local authority by itself.

### 3.2 THESIS Agent Desktop

The desktop is the local control plane. It manages MCP Spine lifecycle, local configuration, tool discovery, approval queues, receipts, namespace state, adapter health, offline operation, and release controls. Its renderer remains sandboxed and reaches privileged functionality only through a narrow preload contract.

The desktop allows an owner to see the exact action being requested. Sensitive operations must display the actor, namespace, target, normalized arguments, consequences, and request digest. Approval binds to that digest so that later mutation invalidates the approval.

### 3.3 MCP Spine

The MCP Spine is the governed capability plane. Its responsibilities include:

1. initialize the protocol surface;
2. register code-owned tools;
3. expose only identity- and namespace-permitted capabilities;
4. validate inputs against strict schemas;
5. classify risk;
6. queue sensitive actions;
7. deny unsafe actions;
8. isolate adapter failures;
9. apply quotas and rate limits;
10. emit hash-linked receipts.

The Spine is local-first and binds to loopback by default. Remote reachability is a federation feature, not a port-exposure shortcut.

### 3.4 Authenticated federation

Federation envelopes bind issuer, audience, namespace, operation, payload digest, issued time, expiration, nonce, and signature. The receiver validates all envelope properties before tool dispatch. Replay, revocation, malformed signatures, expired messages, and wrong-audience traffic are rejected.

### 3.5 Shared internal systems

NOVA Runtime supports internal persistence and paired-device capability. NEXUS packages artifacts and proofs. Loom Cluster coordinates memory and intelligence lanes. MESIE provides spectral and scientific intelligence. PARRALAX supports market analysis, simulation, and governed execution planning. LiveVault manages protected artifact lanes. The Scientific Experiment Lab provides bounded experimental workflows. Medina Protocol defines shared identity, receipts, and federation semantics.

These systems are compositional internals, not competing public applications.

## 4. Execution sequence

A sensitive request follows this sequence:

1. The user or agent creates a proposal in MonadBuilder+ or THESIS.
2. The request is normalized into a typed capability call.
3. Identity, namespace, tool visibility, quotas, and schema are validated.
4. Policy determines whether the call is read-only, proposal-only, sensitive, or permanently denied.
5. Sensitive calls create an approval record bound to the request digest.
6. The owner approves or denies in THESIS Agent Desktop.
7. Approval is revalidated against the unchanged digest and current policy.
8. The adapter executes inside its allowed boundary.
9. External signing is requested separately when needed.
10. The outcome, denial, or failure is written to the receipt chain.
11. The browser receives a verified result or explicit degraded state.

## 5. State and identity

The architecture distinguishes:

- human identity;
- organization identity;
- device identity;
- agent identity;
- wallet identity;
- namespace identity;
- adapter identity;
- federation peer identity.

No identity automatically inherits the authority of another. A public wallet address is an identifier, not proof that an agent may sign. A desktop device is a trusted local coordinator only after its operator configuration and peer state are valid. An agent card can describe capabilities but cannot override policy.

## Evaluation

The architecture should be evaluated through deterministic assertions and operational evidence rather than presentation alone.

### 6.1 Structural evaluation

- exactly two public products are declared;
- internal systems are not presented as third products;
- the MCP server binds to loopback by default;
- desktop isolation settings remain enabled;
- tool schemas are explicit;
- sensitive tools cannot execute without approval;
- receipts include chain linkage;
- wallet secrets are rejected.

### 6.2 Adversarial evaluation

- prompt injection through browser content;
- namespace crossover attempts;
- modified request after approval;
- replayed federation envelope;
- revoked peer;
- destructive shell-like input;
- adapter timeout;
- invalid wallet chain or target;
- stale market data;
- receipt tampering.

### 6.3 Recovery evaluation

- local MCP restart;
- durable receipt verification after restart;
- rollback to known-good release;
- adapter disablement without full-system failure;
- revocation of a compromised peer;
- degraded browser operation when desktop is unavailable.

## 7. Research contribution

The contribution is not the mere coexistence of web and desktop applications. It is the use of a two-surface product boundary as an authority architecture. The browser remains expressive and distributable; the desktop remains sovereign and locally governed. The MCP Spine becomes the protocol seam through which capabilities are discovered, constrained, approved, executed, and remembered.

This arrangement also provides a practical path for local models and external models to coexist. Models can be routed based on task, privacy, latency, and cost without changing the underlying authority model. Intelligence remains replaceable; policy and receipts remain stable.

## Limitations

The current architecture does not itself prove externally deployed federation, production DNS, synthetic monitoring, signed Windows packages, notarized macOS packages, external audit, unrestricted blockchain adapter coverage, or live trading performance. Those are separate maturity levels requiring deployment evidence.

Hash-linked receipts protect sequence integrity but do not prevent deletion of an entire local store by a privileged actor. External anchoring and replicated proof lanes reduce this risk but require deployment.

Human approval is not a guarantee of safety. A user may approve a malicious or misunderstood action. The approval interface must therefore prioritize exact parameters and consequences rather than generic confirmation text.

Federation signatures do not eliminate endpoint compromise. Device hardening, credential rotation, revocation, monitoring, and incident practice remain necessary.

## Conclusion

A sovereign AI product requires more than local inference or private storage. It requires a clear separation between creation and authority, a governed capability plane, explicit owner approval, external custody boundaries, namespace isolation, and durable proof. MonadBuilder+ and THESIS Agent Desktop implement this separation as two coordinated surfaces of one architecture. The system is strongest when its intelligence can evolve rapidly while its authority model remains stable, inspectable, and evidence-bearing.