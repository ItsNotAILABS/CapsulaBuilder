# Coordinated Deployment Guide

## Scope

This guide covers local and release-candidate operation for the two public products in this repository: MonadBuilder+ and THESIS Agent Desktop. It does not claim that a public production environment, signed installer, notarized package, or externally audited deployment currently exists.

## Preconditions

- Node.js 22 or later for the MCP Spine.
- Supported Node and package-manager versions for the web workspace.
- Python version required by `engine/`.
- Foundry where contract compilation or tests are required.
- Platform packaging dependencies for Electron.
- Credentials supplied only through local secret stores or CI secret managers.

## Local MCP Spine

```bash
cd artifacts/mcp-bridge
npm install --no-audit --no-fund
npm run typecheck
npm test
npm run proof
node src/index.mjs
```

Default URL: `http://127.0.0.1:8080`

Health:

```bash
curl http://127.0.0.1:8080/health
```

Shutdown: terminate the foreground process or use the THESIS Agent Desktop lifecycle control.

## THESIS Agent Desktop

```bash
cd desktop
npm install --no-audit --no-fund
npm run typecheck
npm run smoke
npm run dev
```

The desktop must display the effective MCP endpoint, process state, approval queue, and receipt status. A packaged build must resolve bundled MCP resources through `process.resourcesPath` rather than a development-only relative path.

## MonadBuilder+

The browser application should be built only after the MCP contract, API routes, and environment schema have been validated. Use the repository's package-manager and workspace commands as defined by the active lockfile and package scripts.

Required release checks:

- application build;
- route smoke tests;
- MCP bridge status rendering;
- degraded/offline state;
- wallet-signing separation;
- approval and receipt UX;
- static asset and security-header review.

## MCP client configuration

Use `artifacts/mcp-bridge/client-config.example.json` as the source template. Local clients should target loopback unless an authenticated federation gateway has been explicitly deployed.

## Federation deployment

Remote federation is not enabled merely by exposing port 8080. A release candidate requires:

1. TLS termination.
2. Peer identity registration.
3. Signed envelopes.
4. Audience binding.
5. Expiration and replay checks.
6. Revocation.
7. Per-identity and per-namespace rate limits.
8. Structured audit receipts.
9. Failure isolation and circuit breaking.
10. Synthetic health monitoring.

Cloudflare may provide the edge transport, but the application-layer identity and authorization checks remain mandatory.

## Release-candidate packaging

```text
release/
  web/
  desktop/
  mcp-spine/
  contracts/
  proofroom/
  research/
  checksums.txt
  release-notes.md
```

Every artifact must be included in a hash manifest. Platform installers must be code-signed or notarized before being described as signed production distributions.

## Rollback

A release is not ready without a rollback target and commands. Rollback must preserve or verify receipt state before and after the transition.

Minimum rollback record:

- failed release identifier;
- prior known-good release;
- reason;
- operator;
- start and completion timestamps;
- receipt-chain verification result;
- data migration reversal or compatibility status;
- unresolved impact.

## Status classification

At the end of deployment, record exactly one status:

- `source_only`
- `locally_validated`
- `release_candidate`
- `externally_deployed`
- `independently_assessed`

Do not infer a higher status from a successful build alone.