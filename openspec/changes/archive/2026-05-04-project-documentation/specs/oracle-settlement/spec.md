## ADDED Requirements

### Requirement: Pyth Oracle Settlement
The system SHALL support market settlement using Pyth Network oracle for real-world event resolution.

#### Scenario: Settle with Pyth price feed
- **WHEN** admin calls settle_with_pyth with market_id and Pyth price feed ID
- **THEN** system fetches price from Pyth oracle and resolves market based on price threshold

#### Scenario: Oracle price unavailable
- **WHEN** Pyth oracle returns stale or unavailable price
- **THEN** transaction aborts with oracle error

### Requirement: Admin Settlement Proposal
The system SHALL allow admins to propose market settlement outcomes for events not covered by oracles, with a 24-hour dispute period.

#### Scenario: Propose settlement
- **WHEN** admin calls propose_admin_settlement with market_id and winning_option
- **THEN** system creates PendingSettlement with proposed winner and timestamp

#### Scenario: Execute settlement after dispute period
- **WHEN** 24 hours have passed since proposal
- **THEN** anyone can call execute_admin_settlement to finalize the market

#### Scenario: Re-propose settlement
- **WHEN** admin proposes new settlement before execution
- **THEN** system updates PendingSettlement with new winner and resets timestamp

### Requirement: Winnings Claim
The system SHALL allow users to claim their winnings after market resolution.

#### Scenario: Claim winnings
- **WHEN** user calls claim_winnings with market_id
- **THEN** system calculates winnings based on winning option shares and transfers APT to user

#### Scenario: Claim with no winning shares
- **WHEN** user attempts to claim but has no shares in winning option
- **THEN** transaction aborts with no winnings error

#### Scenario: Double claim prevention
- **WHEN** user attempts to claim winnings twice
- **THEN** system prevents duplicate claim and aborts transaction

### Requirement: Market Resolution
The system SHALL mark markets as resolved and record the winning outcome.

#### Scenario: Resolve market
- **WHEN** settlement is executed (either oracle or admin)
- **THEN** system updates market status to resolved and records winning option

#### Scenario: Resolution finality
- **WHEN** market is resolved
- **THEN** no further trading or settlement operations are allowed
