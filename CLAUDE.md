# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CuteMarket is a decentralized prediction market on Aptos (similar to Polymarket). No backend or database — all data lives on-chain. Built during a 3-hour hackathon, deployed on Aptos Testnet.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173, also listens on 0.0.0.0 for LAN)
npm run build        # Type-check (tsc) + production build (outputs to dist/)
npm run preview      # Preview production build locally
./test-vercel-build.sh  # Full clean build test (rm dist, npm ci, build, preview)
```

No test framework or linter is configured. `npm run build` runs `tsc` first, so type errors will block the build.

## Architecture

### Frontend (React SPA)

- **Entry**: `src/main.tsx` → `src/App.tsx` (Router + WalletProvider wrapper)
- **Routes**: `/` (Home) → `/project/:id` (ProjectDetail)
- **Wallet**: `@aptos-labs/wallet-adapter-react` with PetraWallet, configured in `src/context/WalletProvider.tsx` (Testnet)
- **Chain SDK**: `@aptos-labs/ts-sdk` configured in `src/config/aptos.ts`
- **Styling**: Tailwind CSS — all styling is inline utility classes, no CSS modules

**Data flow**: Custom hooks (`useProjectData`, `useUserBets`, `useAllUserBets`) call Aptos view functions directly via `aptos.view()`. Data polls every 10 seconds. All values on-chain are in Octas; conversion happens at the hook boundary using `octasToApt()`/`aptToOctas()` from `src/config/aptos.ts`.

**Key hooks**:
- `useProjectData(projectId)` — fetches project pool data from chain, returns `ProjectData`
- `useUserBets(address, projectId)` — fetches user's bet amounts for one project
- `useAllUserBets(address)` — aggregates user bets across all projects (for Home portfolio view)

**Odds calculation**: `src/utils/oddsCalculator.ts` — pure functions, no chain calls. Formula: `odds = (totalPool * 0.98) / optionPool` (2% platform fee).

### Smart Contract (Move)

- **Module**: `cutemarket::prediction_market` in `move/sources/cutemarket.move`
- **Contract address**: `0x8ebb5f208e99f14584dc352204b107f8c9570a8481cf23e830fee296bd1515cb`
- **Network**: Aptos Testnet
- **Dependencies**: AptosFramework (mainnet rev)

**Entry functions**: `initialize` (one-time, creates 5 built-in projects), `place_bet` (user bets), `settle_project` (admin-only, distributes prizes)

**View functions**: `get_project_info(project_id)`, `get_user_bets(project_id, user_addr)`

**Key constants**: `MIN_BET_AMOUNT = 1_000_000` (0.01 APT), `platform_fee_rate = 2` (percent)

### Static Data

5 prediction markets are hardcoded in both the Move contract (`initialize`) and `src/data/projects.ts`. These must stay in sync — same IDs, same option counts. The frontend `Project.id` maps directly to the on-chain project index.

## Unit Conversion

1 APT = 100,000,000 Octas. All chain interactions use Octas. The frontend displays APT. Use `octasToApt()` / `aptToOctas()` from `src/config/aptos.ts`.

## Deployment

- **Frontend**: Vercel (SPA routing via `vercel.json` rewrites). Build output: `dist/`. Environment variable `VITE_MODULE_ADDRESS` overrides the contract address.
- **Contract**: Deployed on Testnet. Use `aptos move view` CLI to query directly.