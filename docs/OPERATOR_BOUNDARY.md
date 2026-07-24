# Operator Boundary and Runbook

## Operator role

The operator controls local lifecycle, configuration, peer trust, approvals, release state, and incident response. The operator does not become an automatic signer, custodian, auditor, or legal authority merely by running the software.

## Before start

Verify:

- the intended repository commit;
- local configuration and namespaces;
- the MCP endpoint binds to loopback unless federation is intentionally configured;
- no private keys, seed phrases, or recovery phrases exist in application configuration;
- receipt storage is writable and backup policy is known;
- trusted federation peers and revocation state are current;
- the release artifact checksum matches its manifest.

## Start sequence

1. Run the platform maturity validator.
2. Run MCP type checks and production gate.
3. Start the MCP Spine.
4. Verify `/health`.
5. Start THESIS Agent Desktop.
6. Confirm the displayed endpoint and process identifier.
7. Inspect pending approvals and prior receipt-chain status.
8. Start or connect MonadBuilder+.
9. Confirm degraded-state behavior by temporarily disabling the local bridge in a test environment.

## Approval discipline

Before approving a sensitive action, inspect:

- requesting identity;
- namespace;
- tool and adapter;
- normalized arguments;
- target system;
- chain ID and decoded intent for blockchain requests;
- expected mutation;
- simulation or dry-run result;
- risk classification;
- request digest;
- expiration;
- rollback or recovery path.

Never approve a generic prompt such as "allow the agent" without exact operation details.

## Stop sequence

1. Stop accepting new sensitive requests.
2. Resolve or expire pending approvals.
3. Wait for in-flight bounded operations or cancel them.
4. Verify receipt writes.
5. Stop federation listeners.
6. Stop the local MCP Spine.
7. Verify the desktop reports a stopped state.
8. Persist the final receipt-chain verification result.

## Incident response

For suspected unauthorized execution, signer compromise, namespace crossover, or receipt corruption:

1. Disable federation and sensitive adapters.
2. Preserve logs, receipts, release identifiers, and affected configuration.
3. Revoke compromised identities or peers.
4. Rotate credentials outside the affected application.
5. Verify the receipt chain from the latest trusted anchor.
6. Identify the first inconsistent or unauthorized transition.
7. Restore from a known-good release and backup if required.
8. Run the full validation suite.
9. Document scope, impact, unresolved risk, and corrective action.

## Operator non-claims

A green local dashboard does not prove external availability. A passing test does not prove absence of vulnerabilities. A simulated transaction is not a broadcast transaction. A generated installer is not signed until code-signing evidence exists. A research hypothesis is not an experimental result until its method and data are published.