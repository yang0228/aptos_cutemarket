## Why

CuteMarket is a decentralized prediction market on Aptos that lacks comprehensive OpenSpec documentation. Proper documentation is essential for onboarding new developers, maintaining architectural clarity, and enabling future feature development. Without documented specifications, understanding the system's capabilities, API contracts, and design decisions requires deep code exploration.

## What Changes

- Create comprehensive OpenSpec documentation covering the prediction market's core capabilities
- Document the smart contract architecture including the modular Move contract design
- Specify the frontend API integration patterns and data flow
- Document the AMM pricing model and odds calculation logic
- Create specifications for wallet integration and transaction handling

## Capabilities

### New Capabilities
- `market-core`: Core prediction market functionality including market creation, state management, and lifecycle
- `amm-engine`: Automated Market Maker for share trading with constant sum pricing
- `governance-system`: Market registry, admin management, fee configuration, and pause functionality
- `oracle-settlement`: Market settlement via Pyth oracle or admin proposal, including winnings claims
- `frontend-integration`: React frontend with wallet adapter, view functions, and transaction building

### Modified Capabilities
<!-- No existing specs to modify as this is initial documentation -->

## Impact

- **Code**: No code changes - documentation only
- **APIs**: Documents existing Aptos view functions and entry functions
- **Dependencies**: None - uses existing OpenSpec infrastructure
- **Systems**: Affects developer onboarding and maintenance workflows
