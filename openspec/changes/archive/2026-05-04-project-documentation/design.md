## Context

CuteMarket is a decentralized prediction market built on Aptos blockchain. The system consists of:
- **Smart Contracts**: 5 modular Move modules deployed on Aptos Testnet
- **Frontend**: React SPA with Vite, using Aptos wallet adapter
- **No Backend**: All data lives on-chain, frontend reads directly via Aptos SDK

The project currently lacks OpenSpec documentation, making it difficult for new developers to understand the architecture, API contracts, and design decisions.

## Goals / Non-Goals

**Goals:**
- Document the complete prediction market architecture
- Specify smart contract module responsibilities and interactions
- Document frontend data flow and API integration patterns
- Create testable specifications for each major capability

**Non-Goals:**
- Changing any existing functionality
- Adding new features or modifying behavior
- Redesigning the architecture
- Creating user-facing documentation

## Decisions

### Decision 1: Modular Documentation Structure
**Choice**: Create separate specs for each major capability (market-core, amm-engine, governance, oracle, frontend)
**Rationale**: Aligns with the existing modular contract architecture and makes specs independently maintainable
**Alternatives considered**: Single monolithic spec - rejected due to complexity and poor maintainability

### Decision 2: Spec Granularity Level
**Choice**: Focus on functional requirements and scenarios rather than implementation details
**Rationale**: Specs should define WHAT the system does, not HOW it's implemented. Implementation details belong in design.md
**Alternatives considered**: Implementation-level specs - rejected as they duplicate code and become stale

### Decision 3: Documentation Scope
**Choice**: Document all 5 contract modules and frontend integration patterns
**Rationale**: Comprehensive coverage ensures no critical functionality is missed
**Alternatives considered**: Partial documentation - rejected as it leaves gaps in understanding

## Risks / Trade-offs

- **Risk**: Specs may become outdated as code evolves
  - **Mitigation**: Include spec verification in CI/CD pipeline and update specs with each change

- **Risk**: Over-specification may slow down development
  - **Mitigation**: Keep specs focused on critical behaviors and use scenarios for testability

- **Risk**: Missing edge cases in scenario coverage
  - **Mitigation**: Review specs against existing test cases and add missing scenarios iteratively

- **Risk**: Pyth oracle integration is currently placeholder logic
  - **Mitigation**: Implement proper Pyth price feed integration before mainnet deployment

- **Risk**: No automated test suite exists
  - **Mitigation**: Add unit tests for critical contract functions and frontend utilities
