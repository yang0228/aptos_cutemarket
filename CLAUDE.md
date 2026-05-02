# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CuteMarket is a decentralized prediction market on Aptos (similar to Polymarket). No backend or database — all data lives on-chain. Deployed on Aptos Testnet.

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

- **Entry**: `src/main.tsx` → `src/App.tsx` (Router + WalletProvider + ErrorBoundary)
- **Routes**: `/` (Home), `/project/:id` (ProjectDetail), `/portfolio` (Portfolio), `/create` (CreateMarket)
- **Wallet**: `@aptos-labs/wallet-adapter-react` with PetraWallet, configured in `src/context/WalletProvider.tsx` (Testnet)
- **Chain SDK**: `@aptos-labs/ts-sdk` configured in `src/config/aptos.ts`
- **Styling**: Tailwind CSS — all styling is inline utility classes, no CSS modules

**Data flow**: Custom hooks (`useMarkets`, `useProjectData`, `useUserPositions`) call Aptos view functions directly via `aptos.view()`. Market list comes from scanning contract transactions (`getAccountTransactions`). All values on-chain are in Octas; conversion happens at the hook boundary using `octasToApt()`/`aptToOctas()` from `src/config/aptos.ts`.

**Key hooks**:
- `useMarkets()` — fetches all markets from contract events, enriches with on-chain state
- `useProjectData(marketId, marketAddress)` — fetches market state from `market_core::get_market_state`
- `useUserPositions(address)` — fetches user positions across all markets with P&L

**Odds calculation**: `src/utils/oddsCalculator.ts` — pure functions, no chain calls. Uses Constant Sum AMM pricing.

### Smart Contract (Move) — Modular Architecture

- **Contract address**: `0xf28e42120ec3007579f530ac426b2d553f501681431a433f3584bf6d37c94f16`
- **Network**: Aptos Testnet
- **Dependencies**: AptosFramework (mainnet rev)

5 modules in `move/sources/`:

| Module | Purpose |
|--------|---------|
| `governance` | MarketRegistry, admin management, fee config, pause |
| `market_core` | MarketState, create_market, view functions |
| `amm` | buy_shares, sell_shares, add_liquidity, get_option_price |
| `oracle` | settle_with_pyth, propose/execute_admin_settlement, claim_winnings |
| `events` | Event structs and emit helpers |

**Key entry functions**: `governance::initialize`, `market_core::initialize_market_list`, `market_core::create_market`, `amm::buy_shares`, `amm::sell_shares`, `oracle::propose_admin_settlement`, `oracle::claim_winnings`

**Key view functions**: `market_core::get_market_meta`, `market_core::get_market_state`, `amm::get_option_price`

## Test Account

- **Deployer/Admin**: `0xf28e42120ec3007579f530ac426b2d553f501681431a433f3584bf6d37c94f16`
- **Explorer**: https://explorer.aptoslabs.com/account/0xf28e42120ec3007579f530ac426b2d553f501681431a433f3584bf6d37c94f16/transactions?network=testnet
- **Seed script**: `npx tsx scripts/seed-markets.ts <private-key>` creates 6 test markets

## Unit Conversion

1 APT = 100,000,000 Octas. All chain interactions use Octas. The frontend displays APT. Use `octasToApt()` / `aptToOctas()` from `src/config/aptos.ts`.

## Deployment

- **Frontend**: Vercel (SPA routing via `vercel.json` rewrites). Build output: `dist/`. Environment variable `VITE_MODULE_ADDRESS` overrides the contract address.
- **Contract**: Deployed on Testnet. Use `aptos move view` CLI to query directly.
