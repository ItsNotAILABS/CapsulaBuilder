# Session Handoff — 2026-08-06

Stopping point for the trading/vault/governance work. Read this first next session.

**Repo state:** `main` @ `5a93a26`, local == remote, 35/35 engine tests passing, `web/` builds clean.

---

## 1. What actually runs vs. what is simulated

This distinction matters more than the feature list. Everything below is *tested working code* —
but "working" means different things on either side of this line.

### Real logic (would survive a technical diligence review)

| Component | File | What it genuinely does |
|---|---|---|
| Policy kernel | `engine/thesis_forge/policy.py` | Evaluates a proposed action against constraints (slippage, leverage, exposure, reserve, value caps). Returns accept/reject + violation codes + human-readable reasons. This is the differentiated asset. |
| Receipt chain | `engine/thesis_forge/receipts.py` | Hash-linked append-only record. Each receipt carries the previous hash. Tamper-evident. |
| Approval engine | `engine/thesis_forge/security_intelligence.py` | Role-scoped human-in-the-loop state machine. Threshold-triggered, wrong-role decisions rejected, every decision sealed to the receipt chain. |
| Live-gate evidence | `engine/thesis_forge/live_gate.py` | 13-item readiness checklist with persistence + approval-packet generation. Never flips to "live" on its own. |
| Portfolio math | `engine/thesis_forge/portfolio.py` | Cross-vault aggregation, concentration percentages, approval overhang. Math is correct; inputs are paper. |
| Vault state machine | `engine/thesis_forge/agent_vault.py` | Vault → wallet → policy gate → connector → receipt. Real state transitions, paper balances. |

### Simulated (do NOT represent these as working integrations)

| Thing | Reality |
|---|---|
| All prices/marks | `trading.py::_DEFAULT_MARKS` — hardcoded constants (`MON/USDC: 1.0`, `AAPL: 195.0`, …). `marks.py` derives pseudo-prices from RPC entropy. **No real price feed anywhere.** |
| Broker "integrations" | `broker_readiness.py` is a static list of 11 broker names + metadata strings. **Zero API calls to any broker.** It is a registry, not an integration. |
| Fills | `paper_fill()` fills at reference price ± half the slippage budget. No venue, no orderbook. |
| Vault balances | JSON file on disk. Not chain state, not custody. |
| Vault route calldata | `vault_route.py` — the file says so itself: "Demo calldata is not production ABI." |
| Live execution | Every live path returns HTTP 403 by design. Correct posture, but nothing is wired behind it. |

**Bottom line:** we built a governance/decision layer that is real, wrapped around a trading
simulator that is not. The governance layer is the product. The simulator is the demo harness.

---

## 2. Deployment status

| Surface | State |
|---|---|
| MonadBuilder+ frontend | ✅ Live on Cloudflare Pages, auto-deploys on push to `main` via native CF Git integration. No secrets needed from us. |
| THESIS engine (Python) | ⚠️ **Unverified.** Deployed to Render by the owner on 2026-08-06 at `https://monad-engine.onrender.com`, but this session's egress policy blocks `onrender.com` (403 on CONNECT, both shell and WebFetch). **Nobody has confirmed `/health` returns 200.** First action next session: have the owner paste the `/health` response. |
| THESIS web frontend | 🔴 Blocked. `deploy-thesis-web.yml` fails at the credential-check step. Needs 4 values in GitHub → Settings → Secrets and variables → Actions: `CLOUDFLARE_ACCOUNT_ID` (secret), `CLOUDFLARE_API_TOKEN` (secret), `THESIS_API_URL` (secret, = the Render URL), `THESIS_PAGES_PROJECT` (variable). |
| Workers Builds: monadbuilder | 🔴 Failing since before this session. A Cloudflare dashboard integration, not a repo problem. Either disconnect it in the CF dashboard or point it at a real worker. |

Also outstanding: GitHub reports **26 Dependabot vulnerabilities** (14 high) on the default branch.
Untouched this session.

---

## 3. Session inventory

Shipped and merged:
- `b5b60a9` — multi-asset trading desk (order types incl. stop/stop-limit with real trigger logic,
  equities/forex/crypto-CEX venues), broker readiness registry, live-gate evidence engine,
  Monad-tailored Agent Vaults.
- `8e10f4d` — security intelligence: career taxonomy, use-case workflows, capability matrix,
  role-scoped approval engine wired into ticket/connector/ledger flows.
- `5a93a26` — portfolio-level cross-vault risk reporting with concentration limits.
- Earlier: demo video (`demo/monadbuilder-demo.mp4`), Cloudflare build fixes, strategy docs.

Frontend gained four tabs: **DESK** (extended), **VAULTS**, **SECURITY**, **PORTFOLIO**, plus an
app-wide visual pass in `style.css`.

**Caveat on the strategy docs** (`GO_TO_MARKET.md`, `SALES_STRATEGY.md`, `STRATEGY_SUMMARY.md`):
the market sizes and ARR figures in those files are illustrative framing, not researched market
data. They need real sizing work before going in front of anyone writing a check.

---

## 4. Fundable slices

Ranked by how little work stands between the code and something someone would pay for.

### A. Policy kernel as a standalone API — *strongest*
**"The spend firewall for agent wallets."** An agent proposes an action; the kernel returns
allow/deny + reasons + a sealed receipt. Needs no custody, touches no funds → no money-transmitter
exposure. API-shaped, so usage-based pricing and clean metrics.

- Already real: `policy.py`, `models.py` (`Action`, `Policy`, `Evaluation`).
- Gap to sellable: the `Category` enum is DeFi-specific (`dex/lending/vault/perps/…`). Needs a
  generic action schema, API keys, multi-tenancy, rate limits.
- Estimate: ~2–3 weeks to a paid pilot.

### B. Receipt chain as compliance evidence — *bundles with A*
Tamper-evident record of every agent decision. This is the artifact a compliance team asks for
when they're deciding whether to let an agent near money.

- Already real: `receipts.py`.
- Gap: local JSON → durable storage; add a verification endpoint, export formats, and optionally
  anchor hashes on-chain for third-party-verifiable tamper evidence.

### C. Human-in-the-loop approval routing — *bundles with A*
Threshold-triggered, role-scoped sign-off. Solves "the agent wants to move $50k — who approves?"

- Already real: `security_intelligence.py`.
- Gap: notifications (Slack/email), real identity/auth, SLA + escalation.

**A + B + C is one product, not three:** the control plane between an autonomous agent and an
irreversible action. That's the fundable thesis. Everything else in this repo is supporting cast.

### Not fundable as-is — say so plainly
- **The trading desk.** Hardcoded marks, simulated fills. Competing with real trading infra is a
  losing fight and it's the weakest claim in the repo. Keep it as a demo harness for A/B/C.
- **Broker readiness.** Eleven strings in a list. Describing this as "broker integrations" would
  not survive the first follow-up question.
- **The dApp builder.** Crowded category, and it's the less differentiated of the two products.

---

## 5. Next session: agentic wallet + API

Target — make the control plane real end-to-end against an actual chain:

1. **Decouple the kernel.** Lift `evaluate()` out of the THESIS DeFi domain into a generic
   `{actor, action_type, amount, target, context}` schema. Keep the DeFi policy as one profile.
2. **Wrap it in a real API.** Keys, tenancy, rate limits, OpenAPI spec. This is the sellable unit.
3. **Give an agent actual spend authority.** Monad testnet: session key or allowance-contract model
   with an on-chain spend cap. Start narrow — one agent, one wallet, one cap.
4. **Build the demo that closes:** a funded testnet agent tries to exceed its cap → kernel denies →
   receipt proves the denial → approval flow lets a human override → the override is also sealed.
   Every step real: real chain, real wallet, real enforcement, real evidence.

That demo is fundable because nothing in it is simulated. Worth looking at how this lines up with
the emerging agent-payment rails (x402, AP2, Coinbase agent commerce) — the control plane is
complementary to all of them, which is a good position to be in.

**First thing next session:** confirm `https://monad-engine.onrender.com/health` actually returns
200. Everything downstream of that is blocked until it does.
