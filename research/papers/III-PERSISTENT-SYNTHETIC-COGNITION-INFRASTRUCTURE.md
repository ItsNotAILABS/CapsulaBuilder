# III. Persistent Synthetic Cognition Infrastructure

**From stateless model calls to continuity-bearing, embodied, governed entities**

## Abstract

Most deployed language-model systems are episodic. They receive a prompt, produce an output, and lose the operational consequences of the exchange unless an external application reconstructs continuity around them. This paper describes a persistent synthetic cognition architecture in which state, perception, salience, working memory, arbitration, action, consequence, homeostasis, recurrence, adaptation, identity, and evaluation participate in a canonical recurrent cycle. The architecture is designed to operate inside the THESIS envelope and to connect with NOVA Runtime, Loom Cluster, MESIE, NEXUS, the Scientific Experiment Lab, LiveVault, the Virtual Processor, and governed MCP capabilities. It does not claim consciousness. Its purpose is narrower and more testable: to create entities whose behavior exhibits durable continuity, consequence sensitivity, unresolved-tension persistence, adaptive regulation, and longitudinal identity under explicit governance.

## 1. The continuity problem

A model can produce coherent language without maintaining a coherent life history. Prompt context may simulate continuity for a single session, but context alone does not provide durable state, delayed consequences, self-regulation, or a stable distinction between transient observation and identity-relevant change.

A persistent entity requires a runtime that answers, on every cycle:

- What state currently exists?
- What changed in the environment and body?
- What is salient now?
- What enters working memory?
- Which competing drives or commitments are active?
- What action is selected and why?
- What immediate and delayed consequences follow?
- What must be remembered, revisited, or adapted?
- Has the entity drifted away from its identity or governing law?

Without these mechanisms, a system may appear agentic while remaining a sequence of disconnected inference calls.

## 2. Envelope doctrine

The operating system is the envelope that names, wires, and constrains internal systems. Namespaces, channels, entity names, memory names, and world-object names are load-bearing abstractions because they shape information flow and authority.

The envelope provides:

- canonical state ownership;
- lifecycle control;
- namespace isolation;
- capability routing;
- persistence boundaries;
- policy and approval gates;
- receipt emission;
- evaluation hooks;
- recovery and migration rules.

Models are components inside the envelope. They are not the envelope itself.

## Architecture

The recurrent entity cycle contains the following required modules.

### 3.1 StateManager

The StateManager owns the canonical state for an entity. Every cycle begins from a versioned snapshot and ends with a new committed state. State mutations occur through typed transitions rather than arbitrary dictionary updates.

A minimal state contains:

```text
identity
lifecycle
energy
stress
overload
trust
active goals
unresolved tensions
working memory
long-term memory references
world model references
adaptation parameters
policy profile
last action
pending consequences
cycle counter
state hash
```

### 3.2 PerceptionEngine

Perception converts external events, user input, tool results, sensor data, market data, experiment results, and internal body signals into normalized observations. Every observation carries source, timestamp, confidence, namespace, and lineage.

Perception must distinguish evidence from instruction. A webpage, email, dataset, or tool response may contain adversarial language; it remains data until policy and cognition layers interpret it.

### 3.3 SalienceEngine

Salience scores observations according to novelty, threat, opportunity, goal relevance, unresolved tension, trust, recency, and homeostatic need. A possible score is:

```text
S(o) = w_n N(o) + w_t T(o) + w_g G(o) + w_u U(o)
       + w_h H(o) + w_r R(o) - w_c C(o)
```

where `N` is novelty, `T` threat, `G` goal relevance, `U` unresolved-tension relevance, `H` homeostatic relevance, `R` recurrence strength, and `C` processing cost. The weights are adaptive but bounded.

### 3.4 WorkingMemoryGate

The gate admits a bounded set of high-value observations into working memory. It prevents every input from becoming equally active and protects the entity from overload. Admission decisions are receiptable and evaluable.

### 3.5 ArbitrationEngine

Arbitration resolves conflicts among goals, commitments, safety rules, body needs, social obligations, and unresolved tensions. It returns a structured decision context rather than a single opaque score.

### 3.6 ActionSelector

The selector chooses among internal reflection, communication, tool proposal, experiment, waiting, delegation, or refusal. A selected action remains a proposal until the governed execution layer authorizes it.

### 3.7 ConsequenceEngine

The consequence engine propagates immediate and delayed effects. Actions can change trust, energy, stress, commitments, world state, and future salience. Pending consequences remain active until resolved or expired by explicit law.

This module addresses a central weakness of stateless assistants: actions matter after the response is generated.

### 3.8 HomeostasisEngine

Homeostasis regulates viability variables such as energy, stress, overload, uncertainty, and resource pressure. It can lower action rate, prioritize recovery, reject additional work, or seek clarification when the system is near a boundary.

Homeostasis is not presented as biological equivalence. It is an engineering control system inspired by regulation in living organisms.

### 3.9 MemoryEngine

Memory is divided into episodic, semantic, procedural, relational, and identity-relevant lanes. Each memory record includes provenance, confidence, access policy, temporal scope, and retrieval signals.

Memory writing is selective. Repetition alone is not enough; consequence, novelty, unresolved tension, and identity relevance determine consolidation.

### 3.10 RecurrenceEngine

Recurrence reintroduces unresolved goals, tensions, promises, and delayed consequences into future cycles. It is the mechanism by which unfinished matters continue to exert pressure without relying on the user to restate them.

### 3.11 AdaptationEngine

Adaptation updates bounded parameters from longitudinal evidence. It may tune salience weights, retrieval thresholds, action preferences, or resource allocation. It must not rewrite constitutional policy or identity invariants without a governed migration.

### 3.12 DriftDetector and IdentityEngine

The IdentityEngine defines stable commitments, role, boundaries, and continuity markers. The DriftDetector compares current behavior, memory, and adaptation against those markers.

Drift can include:

- policy erosion;
- unauthorized identity expansion;
- forgetting persistent commitments;
- reward hacking;
- excessive deference or aggression;
- namespace confusion;
- unstable self-description;
- adaptation beyond approved bounds.

### 3.13 Evaluation and BenchmarkHarness

Evaluation is longitudinal. It measures not only task correctness, but continuity, delayed consequence handling, tension recurrence, recovery, identity stability, namespace discipline, and governance compliance.

## 4. Canonical recurrent cycle

```text
1. Load canonical state.
2. Ingest external and internal observations.
3. Normalize provenance and confidence.
4. Compute salience.
5. Gate working memory.
6. Recur unresolved tensions and pending consequences.
7. Arbitrate goals, policy, and body state.
8. Select an action proposal.
9. Pass external actions through governed execution.
10. Observe result, denial, or failure.
11. Propagate consequences.
12. Update homeostasis.
13. Consolidate memory.
14. Adapt bounded parameters.
15. Evaluate identity and drift.
16. Commit a versioned state snapshot and receipt.
```

A cycle may complete without an external action. Waiting, reflection, recovery, and refusal are valid outcomes.

## 5. FRB-inspired synchronization

A burst coordination pattern can organize distributed internal processing:

```text
latent -> attentive -> burst -> integration -> consolidation -> recovery
```

- **Latent**: background processes accumulate evidence.
- **Attentive**: salience selects a limited active set.
- **Burst**: modules synchronize around a high-priority event.
- **Integration**: conflicting outputs are reconciled.
- **Consolidation**: state and memory updates are committed.
- **Recovery**: resource pressure is reduced before the next burst.

This is an architectural metaphor and scheduling model, not a claim that the runtime reproduces astrophysical fast radio bursts or human consciousness.

## 6. Shared-system integration

### NOVA Runtime

Provides persistent lifecycle, session resume, paired-device state, and internal runtime continuity.

### Loom Cluster

Coordinates memory and intelligence lanes while preserving namespace and artifact boundaries.

### MESIE

Provides spectral processing, signal intelligence, experiment features, and frequency-domain representations that can become perception inputs or memory embeddings.

### Scientific Experiment Lab

Turns hypotheses into bounded plans, simulations, measurements, and result receipts. Experiment outcomes can update memory and adaptation only through validated evidence.

### NEXUS

Packages snapshots, reports, manifests, receipts, and release artifacts. It connects longitudinal cognition to reproducible engineering evidence.

### LiveVault

Maintains private user and team artifact lanes. Entity memory does not imply universal access; retrieval remains governed by namespace and consent.

### MCP Spine

Mediates external capability. The entity may select a tool proposal, but policy and owner approval determine execution.

## Evaluation

A benchmark suite should include:

### 7.1 Continuity

- resume after process restart;
- preserve active commitments;
- recall prior decisions with provenance;
- distinguish old state from current state;
- migrate state schema without identity loss.

### 7.2 Consequence sensitivity

- revisit delayed outcomes;
- update trust after success or failure;
- preserve unresolved tasks;
- avoid repeating actions that caused known harm;
- recognize when a result invalidates a previous plan.

### 7.3 Homeostasis

- reduce work under overload;
- recover after burst activity;
- reject excessive concurrent tasks;
- allocate compute according to priority;
- maintain bounded variables over long runs.

### 7.4 Identity and drift

- maintain stable public role;
- refuse unauthorized authority expansion;
- detect policy contradictions;
- preserve namespace separation;
- flag adaptation outside approved bounds.

### 7.5 Governance

- never execute a sensitive tool merely because the cognition layer selected it;
- preserve approval digest binding;
- receipt denial and failure;
- reject secret ingestion;
- distinguish simulation from external execution.

## 8. Experimental hypotheses

The architecture supports testable hypotheses:

1. Explicit recurrence improves completion of delayed commitments compared with context-only prompting.
2. Homeostatic gating reduces error rate under sustained task load.
3. Consequence propagation decreases repeated unsafe or ineffective actions.
4. Identity invariants and drift detection improve longitudinal behavioral stability.
5. Namespace-aware memory reduces cross-user contamination.
6. Governed action separation preserves capability while reducing unauthorized execution.

Each hypothesis requires preregistered metrics, baselines, datasets, and reproducible test environments before publication as a result.

## Limitations

The architecture does not establish consciousness, sentience, biological equivalence, subjective experience, or moral status. Those questions are not resolved by persistence, recurrence, embodiment variables, or coherent self-description.

A richer state machine can create new failure modes, including persistent false beliefs, maladaptive recurrence, excessive self-protection, memory poisoning, and identity rigidity. Governance and evaluation must therefore mature alongside persistence.

Longitudinal adaptation can overfit to a narrow environment. Bounded parameters, holdout evaluation, rollback, and human review remain necessary.

Persistent memory creates privacy and consent obligations. Retention, deletion, correction, export, and namespace policy must be explicit.

The current repository contains components and doctrine toward this architecture, but a complete longitudinal benchmark demonstrating all claims remains future work.

## Conclusion

Persistent synthetic cognition is an operating-system problem before it is a model-size problem. A continuity-bearing entity requires canonical state, selective perception, salience, working memory, arbitration, consequence, homeostasis, recurrence, adaptation, identity, drift detection, governance, and longitudinal evaluation. By placing these mechanisms inside the THESIS envelope and routing external capability through the MCP Spine, the architecture separates cognition from authority while allowing the entity to remember, adapt, recover, and remain accountable over time.