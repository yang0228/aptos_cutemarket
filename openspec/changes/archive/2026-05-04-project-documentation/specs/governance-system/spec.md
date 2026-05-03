## ADDED Requirements

### Requirement: Admin Management
The system SHALL support multiple admin roles with configurable permissions for market management.

#### Scenario: Add new admin
- **WHEN** owner calls add_admin with new admin address
- **THEN** system grants admin privileges to the specified address

#### Scenario: Remove admin
- **WHEN** owner calls remove_admin with admin address
- **THEN** system revokes admin privileges from the specified address

### Requirement: Fee Configuration
The system SHALL allow configuration of trading fees collected by the protocol.

#### Scenario: Set trading fee
- **WHEN** admin calls set_fee with new fee percentage
- **THEN** system updates fee configuration for all subsequent trades

#### Scenario: Fee collection
- **WHEN** users execute trades
- **THEN** system collects configured fee percentage and transfers to fee collector

### Requirement: Market Pause Functionality
The system SHALL allow admins to pause and unpause the entire platform in emergency situations.

#### Scenario: Toggle platform pause
- **WHEN** admin calls toggle_pause
- **THEN** system toggles the paused state and emits PauseToggledEvent

#### Scenario: Market creation blocked when paused
- **WHEN** platform is paused and user attempts to create market
- **THEN** transaction aborts with E_PAUSED error

### Requirement: Market Registry Management
The system SHALL maintain a centralized registry for tracking all created markets.

#### Scenario: Register new market
- **WHEN** new market is created
- **THEN** system adds market_id to the registry with creation timestamp

#### Scenario: Query registry
- **WHEN** client queries MarketRegistry
- **THEN** system returns list of all registered market_ids
