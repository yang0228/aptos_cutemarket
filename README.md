# CuteMarket

Decentralized prediction market on Aptos. Similar to Polymarket — no backend, no database, all data on-chain.

Built during a 3-hour hackathon. Deployed on Aptos Testnet.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Contract:** Move (Aptos Framework)
- **Wallet:** @aptos-labs/wallet-adapter-react (Petra)
- **Network:** Aptos Testnet

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Documentation

**For users:**
- [User Guide](docs/user-guide.md) — How to connect wallet, place bets, understand odds

**For developers:**
- [Quickstart](docs/quickstart.md) — Get the project running locally
- [Architecture](docs/architecture.md) — System design, data flow, key decisions
- [Contract API](docs/contract-api.md) — Move function signatures, parameters, CLI examples
- [Deployment](docs/deployment.md) — Deploy contract and frontend

## License

MIT
