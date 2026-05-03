## ADDED Requirements

### Requirement: Market Creation
The system SHALL allow authorized users to create prediction markets with configurable parameters including question, options, resolution time, and initial liquidity.

#### Scenario: Successful market creation
- **WHEN** admin calls create_market with valid parameters (question, options, resolution_time, initial_liquidity)
- **THEN** system creates a new MarketState resource with unique market_id and emits MarketCreated event

#### Scenario: Market creation with invalid parameters
- **WHEN** admin calls create_market with empty options or past resolution_time
- **THEN** transaction aborts with appropriate error code

### Requirement: Market State Management
The system SHALL maintain market state including active/resolved status, option weights, total shares, and resolution outcome.

#### Scenario: Query market state
- **WHEN** client calls get_market_state view function with market_id
- **THEN** system returns current MarketState including status, options, weights, and resolution

#### Scenario: Query market metadata
- **WHEN** client calls get_market_meta view function with market_id
- **THEN** system returns market metadata including question, creator, and timestamps

### Requirement: Market Registry
The system SHALL maintain a registry of all markets with ability to list and filter markets.

#### Scenario: List all markets
- **WHEN** client queries market registry
- **THEN** system returns list of all market_ids with basic metadata

#### Scenario: Market initialization
- **WHEN** admin calls initialize_market_list
- **THEN** system creates MarketList resource for tracking all markets

### Requirement: Option Management
The system SHALL support binary and multi-option markets with configurable option weights.

#### Scenario: Binary market creation
- **WHEN** admin creates market with two options (Yes/No)
- **THEN** system creates market with two equal-weight options

#### Scenario: Multi-option market creation
- **WHEN** admin creates market with multiple options (A, B, C, D)
- **THEN** system creates market with specified option weights

#### Scenario: Option validation
- **WHEN** admin creates market with less than 2 or more than 10 options
- **THEN** transaction aborts with E_INVALID_OPTIONS error

### Requirement: User Position Tracking
The system SHALL track user positions (bets) across all markets.

#### Scenario: Query user bets
- **WHEN** client calls get_user_bets with market_addr and user address
- **THEN** system returns vector of UserBet structs with option_index, shares, and cost

#### Scenario: Query user shares for specific option
- **WHEN** client calls get_user_shares with market_addr, user address, and option_index
- **THEN** system returns total shares owned by user for that option

#### Scenario: Query claim info
- **WHEN** client calls get_claim_info with market_addr and user address
- **THEN** system returns settlement status, winning option, pools, and user's cost in winning option
