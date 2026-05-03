## ADDED Requirements

### Requirement: Wallet Integration
The system SHALL integrate with Aptos wallet adapters for user authentication and transaction signing.

#### Scenario: Connect Petra wallet
- **WHEN** user clicks "Connect Wallet" button
- **THEN** system prompts Petra wallet connection and retrieves user address

#### Scenario: Wallet disconnection
- **WHEN** user disconnects wallet
- **THEN** system clears user session and returns to disconnected state

### Requirement: Market Data Display
The system SHALL fetch and display market data from on-chain view functions.

#### Scenario: Load market list
- **WHEN** user visits home page
- **THEN** system fetches all markets from contract events and displays with current state

#### Scenario: View market details
- **WHEN** user clicks on a market
- **THEN** system fetches detailed market state including options, prices, and trading volume

### Requirement: Transaction Building
The system SHALL construct and submit Aptos transactions for market interactions.

#### Scenario: Buy shares transaction
- **WHEN** user submits buy order
- **THEN** system builds buy_shares transaction, prompts wallet signature, and submits to network

#### Scenario: Transaction confirmation
- **WHEN** transaction is submitted
- **THEN** system monitors transaction status and displays confirmation to user

### Requirement: Odds Calculation
The system SHALL calculate and display market odds based on AMM pricing.

#### Scenario: Display current odds
- **WHEN** market data is loaded
- **THEN** system calculates odds from option weights and displays as percentages

#### Scenario: Odds update after trade
- **WHEN** new trade is executed
- **THEN** system recalculates and updates displayed odds

### Requirement: Portfolio Tracking
The system SHALL track user positions across all markets and display portfolio value.

#### Scenario: View portfolio
- **WHEN** user navigates to portfolio page
- **THEN** system fetches all user positions and calculates total value and P&L

#### Scenario: Position details
- **WHEN** user views specific position
- **THEN** system shows shares owned, current value, and unrealized P&L

### Requirement: Unit Conversion
The system SHALL convert between Octas (on-chain) and APT (display) at the hook boundary.

#### Scenario: Convert Octas to APT
- **WHEN** frontend receives on-chain values in Octas
- **THEN** system converts to APT using octasToApt() (1 APT = 100,000,000 Octas)

#### Scenario: Convert APT to Octas
- **WHEN** user inputs amount in APT for transaction
- **THEN** system converts to Octas using aptToOctas() before submitting to chain
