# Two projects — do not merge

## 1. Metropolis (this repo) — public Monad entry

**Repo:** `C:\Users\Medin\Documents\GitHub\Monad-Hackaton`  
**Tracks:** 01 Finance + 04 AI-trust spine  
https://monad.xyz/developers/hackathons/metropolis

**Build:** one **web** product — JEV trading desk on Monad.

- **NOVA** holds the goal (one shot).
- **JEV** decides on a closed UI set (snapshot → decide → act → verify). No chatbot-per-click.
- **Python models** (THESIS `policy.py` + PARALLAX-inspired `parallax_sdk` / MESIE) score the plan. REJECT is a feature.
- **Owner signs.** Receipt on Monad (`ReceiptChain` already in `contracts/`).
- **Web:** ship `#/finance` + `#/app` until they feel like a product. Do not add more tabs.

PARALLAX is inspiration only (intelligence as settlement, no silent spend). Not ICP. Not Pocket.

## 2. self.tools — separate, not the hackathon

**Repo:** https://github.com/FreddyCreates/self.tools  
**Live:** https://taskmanager.self.tools/ (still “Ready to customize”)  
**Checkout:** `C:\Users\Medin\.pocket\workspaces\self.tools`

Keep the subdomain platform. Make **taskmanager** a real board. Pocket agents edit that clone. Zero Monad, zero PARALLAX organism.

Shipped this round:
- `POST /jev/run` + `POST /jev/sign` + web tab **JEV**
- Reckless goal → REJECT receipt; safe swap → owner sign receipt

## Rule

Pocket = operator OS.  
Monad-Hackaton = Metropolis demo.  
self.tools = subdomain product.  
Three repos. Three URLs. No mixing.
