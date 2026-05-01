# CuteMarket Documentation Overhaul

## Problem

The project has 10 markdown files at root level with:
- Significant redundancy (QUICKSTART, SETUP, README all cover install+run)
- Outdated/mismatched info (different contract addresses, min bet listed as 1 APT in some places, 0.01 APT in others)
- Mixed concerns (README is 350+ lines combining project overview with Vercel deployment)
- One-time artifact (DEPLOYMENT_SUMMARY.md) left in repo
- Missing developer docs (architecture, contract API reference)

## Goal

Full overhaul into a clean, organized documentation set serving two audiences:
- **End users**: How to use CuteMarket to place bets
- **Developers**: How to understand, run, extend, and deploy the project

Language: README.md in English (GitHub), all docs/ in Chinese.

## Target Structure

```
README.md                       # English, GitHub landing page (~80 lines)
CLAUDE.md                       # Existing, unchanged
docs/
├── user-guide.md               # Chinese, end-user betting guide
├── quickstart.md               # Chinese, developer onboarding
├── architecture.md             # Chinese, system design & data flow
├── contract-api.md             # Chinese, Move contract reference
└── deployment.md               # Chinese, deploy contract + frontend
```

## Document Specifications

### 1. README.md (English, root)

GitHub landing page. First thing visitors see.

**Contents**:
- One-line description: "Decentralized prediction market on Aptos"
- Tech stack: React 18, TypeScript, Vite, Tailwind CSS, Move, Aptos Testnet
- Quick start (3 commands: `npm install`, `npm run dev`, open localhost)
- Links to docs/ for both audiences
- License placeholder

**Size**: ~80 lines. No deployment details, no wallet setup — just pointers to docs/.

**Replaces**: Current README.md (350+ lines of mixed content).

---

### 2. docs/user-guide.md (Chinese)

Everything an end user needs. Single source of truth for users.

**Sections**:
1. What is CuteMarket (2 sentences)
2. Prerequisites — install Petra wallet, get testnet APT from faucet
3. Connect wallet — click button, select Petra, authorize
4. Browse markets — home page, project cards, status indicators
5. Place a bet — select option, enter amount, confirm in wallet, wait for confirmation
6. Understand odds — simple explanation of how odds change with betting pool (no formulas)
7. View results — settled markets show winner with trophy, prizes auto-distribute
8. FAQ — min bet (0.01 APT), gas fees, can't cancel, data refreshes every 10s
9. Troubleshooting — wallet not connecting, transaction failed, insufficient balance

**Replaces**: USER_GUIDE.md, WALLET_SETUP.md

---

### 3. docs/quickstart.md (Chinese)

Developer onboarding. Get the project running locally.

**Sections**:
1. Prerequisites — Node.js 18+, Aptos CLI
2. Clone and install — `git clone`, `npm install`
3. Start dev server — `npm run dev`, open localhost:5173
4. Project structure — tree diagram of src/ and move/
5. Key files — one-line description of each important file
6. Contract setup (optional) — compile, deploy, initialize via Aptos CLI
7. Build for production — `npm run build`, `npm run preview`

**Replaces**: QUICKSTART.md, SETUP.md

---

### 4. docs/architecture.md (Chinese)

How the system works. For developers who want to understand or extend.

**Sections**:
1. System overview — frontend SPA ↔ wallet adapter ↔ Aptos chain, no backend
2. Frontend architecture
   - Entry: main.tsx → App.tsx (Router + WalletProvider)
   - Routes: / (Home), /project/:id (ProjectDetail)
   - Data hooks: useProjectData, useUserBets, useAllUserBets
   - Polling: 10-second interval for chain data refresh
3. Smart contract architecture
   - Module: prediction_market
   - Entry functions: initialize, place_bet, settle_project
   - View functions: get_project_info, get_user_bets
   - Data structures: Project, UserBet
4. Data flow diagram — user action → wallet → contract → view function → UI
5. Odds calculation — formula with worked example
6. Unit conversion — 1 APT = 100,000,000 Octas, boundary conversion in hooks
7. Design decisions — no backend, polling vs events, hardcoded 5 markets

**New content**. Partially absorbs FEATURES.md.

---

### 5. docs/contract-api.md (Chinese)

Reference for the Move contract.

**Sections**:
1. Module info — address, network (Testnet), module name
2. Constants — MIN_BET_AMOUNT (1,000,000 Octas), platform_fee_rate (2%)
3. Data structures
   - Project { id, name, options_count, end_timestamp, is_settled, winning_option, option_pools, bets }
   - UserBet { user, option_index, amount }
4. Entry functions
   - `initialize()` — creates 5 built-in projects, one-time call
   - `place_bet(project_id: u64, option_index: u64, amount: u64)` — validations, transfer, state update
   - `settle_project(project_id: u64, winning_option: u64)` — admin-only, prize distribution logic
5. View functions
   - `get_project_info(project_id: u64)` — returns (id, end_timestamp, is_settled, winning_option, option_pools)
   - `get_user_bets(project_id: u64, user_addr: address)` — returns vector of UserBet
6. CLI examples — one example per function with expected output

**New content**.

---

### 6. docs/deployment.md (Chinese)

How to deploy contract and frontend.

**Sections**:
1. Contract deployment (Testnet)
   - Install Aptos CLI
   - Init wallet, fund with faucet
   - Compile: `aptos move compile`
   - Publish: `aptos move publish`
   - Initialize markets: call `initialize()`
2. Frontend deployment (Vercel)
   - Push to GitHub
   - Import on Vercel Dashboard
   - vercel.json config explanation
   - Environment variable: VITE_MODULE_ADDRESS
3. Verify deployment
   - Query project info via CLI
   - Test bet via CLI
   - Check frontend loads and connects wallet
4. Switching to mainnet
   - Move.toml dependency change
   - Network config change
   - Re-deploy contract
5. Deployment checklist — build passes, routes work, wallet connects, contract address correct

**Replaces**: DEPLOY.md, VERCEL_DEPLOY.md, DEPLOYMENT_SUMMARY.md

---

## Files to Delete

After the new docs are written and verified:

| File | Reason |
|------|--------|
| DEPLOY.md | Merged into docs/deployment.md |
| DEPLOYMENT_SUMMARY.md | One-time artifact, no ongoing value |
| FEATURES.md | Merged into docs/architecture.md |
| QUICKSTART.md | Replaced by docs/quickstart.md |
| SETUP.md | Replaced by docs/quickstart.md |
| USER_GUIDE.md | Replaced by docs/user-guide.md |
| WALLET_SETUP.md | Merged into docs/user-guide.md |
| VERCEL_DEPLOY.md | Merged into docs/deployment.md |

## Content Fixes During Overhaul

- Standardize contract address to `0x8ebb5f208e99f14584dc352204b107f8c9570a8481cf23e830fee296bd1515cb`
- Standardize min bet to 0.01 APT (1,000,000 Octas)
- Standardize platform fee to 2%
- Remove all emoji from document headers (use plain markdown)
- Remove outdated contract addresses (0xe726...) from all docs

## Verification

After implementation:
1. `npm run build` passes (no broken imports if any doc is referenced in code)
2. All internal links between docs resolve correctly
3. No stale contract addresses remain in any file
4. Each deleted file's content is covered by a new doc
