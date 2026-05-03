## ADDED Requirements

### Requirement: Share Purchase
The system SHALL allow users to buy shares of market options using APT, with prices determined by the AMM algorithm.

#### Scenario: Buy Yes shares
- **WHEN** user calls buy_shares with market_id, option="Yes", and APT amount
- **THEN** system calculates shares based on AMM price, transfers APT from user, and mints shares to user

#### Scenario: Buy with insufficient balance
- **WHEN** user calls buy_shares with amount exceeding their APT balance
- **THEN** transaction aborts with insufficient funds error

### Requirement: Share Sale
The system SHALL allow users to sell their market shares back to the AMM for APT.

#### Scenario: Sell Yes shares
- **WHEN** user calls sell_shares with market_id, option="Yes", and share amount
- **THEN** system calculates APT based on AMM price, burns shares, and transfers APT to user

#### Scenario: Sell more than owned
- **WHEN** user attempts to sell more shares than they own
- **THEN** transaction aborts with insufficient shares error

### Requirement: AMM Pricing
The system SHALL use Constant Sum AMM for pricing market options based on option weights.

#### Scenario: Get option price
- **WHEN** client calls get_option_price view function with market_addr and option_index
- **THEN** system returns current price in basis points (BPS) based on option_pool / total_pool

#### Scenario: Price impact on large trades
- **WHEN** user executes large buy order
- **THEN** price adjusts based on constant sum formula to maintain market balance

#### Scenario: Slippage protection
- **WHEN** user attempts trade exceeding 5% of total pool
- **THEN** transaction aborts with E_SLIPPAGE_TOO_HIGH error

#### Scenario: Minimum trade amount
- **WHEN** user attempts to buy shares with less than 0.01 APT
- **THEN** transaction aborts with E_INSUFFICIENT_AMOUNT error

### Requirement: Liquidity Management
The system SHALL allow adding liquidity to markets to improve trading depth.

#### Scenario: Add liquidity
- **WHEN** provider calls add_liquidity with market_id and APT amount
- **THEN** system increases market liquidity pool and mints LP tokens to provider

#### Scenario: Liquidity provider rewards
- **WHEN** market generates trading fees
- **THEN** fees are distributed proportionally to liquidity providers
