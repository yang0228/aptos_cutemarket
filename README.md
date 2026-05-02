# CuteMarket

Decentralized prediction market on Aptos. Similar to Polymarket — no backend, no database, all data on-chain.

Deployed on Aptos Testnet.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, recharts
- **Contract:** Move (Aptos Framework) — 5 modules (governance, market_core, amm, oracle, events)
- **Wallet:** @aptos-labs/wallet-adapter-react (Petra)
- **Network:** Aptos Testnet

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

### Seed Test Data

```bash
# Generate a new account
npx tsx scripts/seed-markets.ts --generate

# Fund at https://aptos.dev/network/faucet, then create 6 test markets
npx tsx scripts/seed-markets.ts <private-key>
```

## Contract Info

- **Address:** `0xf28e42120ec3007579f530ac426b2d553f501681431a433f3584bf6d37c94f16`
- **Explorer:** [View on Testnet](https://explorer.aptoslabs.com/account/0xf28e42120ec3007579f530ac426b2d553f501681431a433f3584bf6d37c94f16/transactions?network=testnet)

## Features

- Browse prediction markets with search, category filter, and sorting
- Buy/sell shares with real-time AMM pricing
- Price chart and trade history per market
- Portfolio page with P&L tracking
- Create new markets (any connected wallet)
- Claim winnings for settled markets
- Responsive design with loading skeletons

## Documentation

**For users:**
- [User Guide](docs/user-guide.md) — How to connect wallet, trade, understand odds

**For developers:**
- [Quickstart](docs/quickstart.md) — Get the project running locally
- [Architecture](docs/architecture.md) — System design, data flow, key decisions
- [Contract API](docs/contract-api.md) — Move function signatures, parameters, CLI examples
- [Deployment](docs/deployment.md) — Deploy contract and frontend

## License

MIT
