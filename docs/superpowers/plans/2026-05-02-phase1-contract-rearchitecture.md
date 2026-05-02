# Phase 1: Contract Rearchitecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the CuteMarket prediction market contract from a single monolithic module into a modular architecture with resource-account-per-market storage, AMM trading engine, oracle settlement, and event-driven indexing support.

**Architecture:** Five Move modules under `cutemarket::` namespace: `events` (event definitions), `governance` (admin/parameter management), `market_core` (market creation/querying with resource accounts), `amm` (constant-sum AMM with slippage protection), `oracle` (Pyth + admin settlement with dispute period). Each market gets its own resource account for fund isolation.

**Tech Stack:** Move language, Aptos Framework (`aptos-framework` dependency), Aptos Move test framework (`#[test]`), `aptos move test` CLI.

---

## File Structure

```
move/
├── Move.toml                          # Modify: add named addresses for test
├── sources/
│   ├── cutemarket.move                # Delete (replaced by modules below)
│   ├── events.move                    # Create: event struct definitions
│   ├── governance.move                # Create: MarketRegistry, admin management, platform params
│   ├── market_core.move               # Create: market creation, resource accounts, querying
│   ├── amm.move                       # Create: buy/sell shares, price calculation, LP
│   └── oracle.move                    # Create: Pyth integration, admin settlement, dispute
└── tests/
    ├── test_events.move               # Create: event emission tests
    ├── test_governance.move           # Create: admin/registry tests
    ├── test_market_core.move          # Create: market creation tests
    ├── test_amm.move                  # Create: AMM trading tests
    ├── test_oracle.move               # Create: settlement tests
    └── test_integration.move          # Create: full lifecycle tests
```

---

### Task 1: Events Module

**Files:**
- Create: `move/sources/events.move`
- Test: `move/tests/test_events.move`

- [ ] **Step 1: Create the events module**

```move
// move/sources/events.move
module cutemarket::events {
    use std::string::String;

    #[event]
    struct MarketCreatedEvent has drop, store {
        market_id: u64,
        market_address: address,
        creator: address,
        name: String,
        options: vector<String>,
        end_timestamp: u64,
        category: u8,
    }

    #[event]
    struct SharesPurchasedEvent has drop, store {
        market_id: u64,
        user: address,
        option_index: u64,
        amount: u64,
        shares_received: u64,
        new_price_bps: u64,
        timestamp: u64,
    }

    #[event]
    struct SharesSoldEvent has drop, store {
        market_id: u64,
        user: address,
        option_index: u64,
        shares: u64,
        amount_received: u64,
        new_price_bps: u64,
        timestamp: u64,
    }

    #[event]
    struct MarketSettledEvent has drop, store {
        market_id: u64,
        winning_option: u64,
        total_pool: u64,
        timestamp: u64,
    }

    #[event]
    struct LiquidityAddedEvent has drop, store {
        market_id: u64,
        provider: address,
        amount: u64,
        lp_shares: u64,
        timestamp: u64,
    }

    #[event]
    struct WinningsClaimedEvent has drop, store {
        market_id: u64,
        user: address,
        amount: u64,
        timestamp: u64,
    }

    public fun emit_market_created(
        market_id: u64,
        market_address: address,
        creator: address,
        name: String,
        options: vector<String>,
        end_timestamp: u64,
        category: u8,
    ) {
        0x1::event::emit(MarketCreatedEvent {
            market_id,
            market_address,
            creator,
            name,
            options,
            end_timestamp,
            category,
        });
    }

    public fun emit_shares_purchased(
        market_id: u64,
        user: address,
        option_index: u64,
        amount: u64,
        shares_received: u64,
        new_price_bps: u64,
        timestamp: u64,
    ) {
        0x1::event::emit(SharesPurchasedEvent {
            market_id,
            user,
            option_index,
            amount,
            shares_received,
            new_price_bps,
            timestamp,
        });
    }

    public fun emit_shares_sold(
        market_id: u64,
        user: address,
        option_index: u64,
        shares: u64,
        amount_received: u64,
        new_price_bps: u64,
        timestamp: u64,
    ) {
        0x1::event::emit(SharesSoldEvent {
            market_id,
            user,
            option_index,
            shares,
            amount_received,
            new_price_bps,
            timestamp,
        });
    }

    public fun emit_market_settled(
        market_id: u64,
        winning_option: u64,
        total_pool: u64,
        timestamp: u64,
    ) {
        0x1::event::emit(MarketSettledEvent {
            market_id,
            winning_option,
            total_pool,
            timestamp,
        });
    }

    public fun emit_liquidity_added(
        market_id: u64,
        provider: address,
        amount: u64,
        lp_shares: u64,
        timestamp: u64,
    ) {
        0x1::event::emit(LiquidityAddedEvent {
            market_id,
            provider,
            amount,
            lp_shares,
            timestamp,
        });
    }

    public fun emit_winnings_claimed(
        market_id: u64,
        user: address,
        amount: u64,
        timestamp: u64,
    ) {
        0x1::event::emit(WinningsClaimedEvent {
            market_id,
            user,
            amount,
            timestamp,
        });
    }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/jason/repo/aptos_cutemarket/move && aptos move compile`
Expected: Compilation succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add move/sources/events.move
git commit -m "feat(contract): add events module with all market event definitions"
```

---

### Task 2: Governance Module

**Files:**
- Create: `move/sources/governance.move`
- Test: `move/tests/test_governance.move`

- [ ] **Step 1: Create the governance module**

```move
// move/sources/governance.move
module cutemarket::governance {
    use std::signer;
    use std::vector;
    use aptos_framework::account;
    use aptos_framework::event;

    friend cutemarket::market_core;
    friend cutemarket::oracle;

    // Error codes
    const E_NOT_ADMIN: u64 = 100;
    const E_ALREADY_INITIALIZED: u64 = 101;
    const E_NOT_INITIALIZED: u64 = 102;
    const E_ALREADY_ADMIN: u64 = 103;
    const E_ADMIN_NOT_FOUND: u64 = 104;
    const E_PAUSED: u64 = 105;
    const E_NOT_PAUSED: u64 = 106;
    const E_INVALID_FEE: u64 = 107;

    // Constants
    const MAX_FEE_BPS: u64 = 1000; // 10% max fee

    // Category constants
    const CATEGORY_SPORTS: u8 = 0;
    const CATEGORY_CRYPTO: u8 = 1;
    const CATEGORY_POLITICS: u8 = 2;
    const CATEGORY_ENTERTAINMENT: u8 = 3;
    const CATEGORY_TECH: u8 = 4;
    const CATEGORY_OTHER: u8 = 5;

    struct MarketRegistry has key {
        market_count: u64,
        platform_fee_bps: u64,
        admins: vector<address>,
        paused: bool,
    }

    #[event]
    struct AdminAddedEvent has drop, store {
        admin: address,
    }

    #[event]
    struct AdminRemovedEvent has drop, store {
        admin: address,
    }

    #[event]
    struct FeeUpdatedEvent has drop, store {
        old_fee_bps: u64,
        new_fee_bps: u64,
    }

    #[event]
    struct PauseToggledEvent has drop, store {
        paused: bool,
    }

    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<MarketRegistry>(admin_addr), E_ALREADY_INITIALIZED);

        move_to(admin, MarketRegistry {
            market_count: 0,
            platform_fee_bps: 200, // 2% default
            admins: vector[admin_addr],
            paused: false,
        });
    }

    public(friend) fun require_not_paused(admin_addr: address) acquires MarketRegistry {
        assert!(exists<MarketRegistry>(admin_addr), E_NOT_INITIALIZED);
        let registry = borrow_global<MarketRegistry>(admin_addr);
        assert!(!registry.paused, E_PAUSED);
    }

    public(friend) fun require_admin(admin_addr: address) acquires MarketRegistry {
        assert!(exists<MarketRegistry>(admin_addr), E_NOT_INITIALIZED);
        let registry = borrow_global<MarketRegistry>(admin_addr);
        assert!(vector::contains(&registry.admins, &admin_addr), E_NOT_ADMIN);
    }

    public(friend) fun is_admin(addr: address): bool acquires MarketRegistry {
        if (!exists<MarketRegistry>(@cutemarket)) return false;
        let registry = borrow_global<MarketRegistry>(@cutemarket);
        vector::contains(&registry.admins, &addr)
    }

    public(friend) fun get_fee_bps(): u64 acquires MarketRegistry {
        let registry = borrow_global<MarketRegistry>(@cutemarket);
        registry.platform_fee_bps
    }

    public(friend) fun increment_market_count(): u64 acquires MarketRegistry {
        let registry = borrow_global_mut<MarketRegistry>(@cutemarket);
        let id = registry.market_count;
        registry.market_count = id + 1;
        id
    }

    public(friend) fun get_market_count(): u64 acquires MarketRegistry {
        borrow_global<MarketRegistry>(@cutemarket).market_count
    }

    public entry fun add_admin(admin: &signer, new_admin: address) acquires MarketRegistry {
        let admin_addr = signer::address_of(admin);
        require_admin(admin_addr);
        let registry = borrow_global_mut<MarketRegistry>(@cutemarket);
        assert!(!vector::contains(&registry.admins, &new_admin), E_ALREADY_ADMIN);
        vector::push_back(&mut registry.admins, new_admin);
        event::emit(AdminAddedEvent { admin: new_admin });
    }

    public entry fun remove_admin(admin: &signer, remove_addr: address) acquires MarketRegistry {
        let admin_addr = signer::address_of(admin);
        require_admin(admin_addr);
        let registry = borrow_global_mut<MarketRegistry>(@cutemarket);
        let (found, idx) = vector::index_of(&registry.admins, &remove_addr);
        assert!(found, E_ADMIN_NOT_FOUND);
        vector::remove(&mut registry.admins, idx);
        event::emit(AdminRemovedEvent { admin: remove_addr });
    }

    public entry fun set_fee(admin: &signer, new_fee_bps: u64) acquires MarketRegistry {
        let admin_addr = signer::address_of(admin);
        require_admin(admin_addr);
        assert!(new_fee_bps <= MAX_FEE_BPS, E_INVALID_FEE);
        let registry = borrow_global_mut<MarketRegistry>(@cutemarket);
        let old_fee = registry.platform_fee_bps;
        registry.platform_fee_bps = new_fee_bps;
        event::emit(FeeUpdatedEvent { old_fee_bps: old_fee, new_fee_bps });
    }

    public entry fun toggle_pause(admin: &signer) acquires MarketRegistry {
        let admin_addr = signer::address_of(admin);
        require_admin(admin_addr);
        let registry = borrow_global_mut<MarketRegistry>(@cutemarket);
        registry.paused = !registry.paused;
        event::emit(PauseToggledEvent { paused: registry.paused });
    }
}
```

- [ ] **Step 2: Create governance tests**

```move
// move/tests/test_governance.move
#[test_only]
module cutemarket::test_governance {
    use std::signer;
    use aptos_framework::account;
    use cutemarket::governance;

    #[test(admin = @cutemarket)]
    fun test_initialize(admin: &signer) {
        governance::initialize(admin);
        assert!(governance::get_market_count() == 0, 0);
        assert!(governance::get_fee_bps() == 200, 1);
    }

    #[test(admin = @cutemarket)]
    #[expected_failure(abort_code = governance::E_ALREADY_INITIALIZED)]
    fun test_double_initialize(admin: &signer) {
        governance::initialize(admin);
        governance::initialize(admin);
    }

    #[test(admin = @cutemarket)]
    fun test_add_and_remove_admin(admin: &signer) {
        governance::initialize(admin);
        let new_admin = account::create_account_for_test(@0x123);
        governance::add_admin(admin, @0x123);
        assert!(governance::is_admin(@0x123), 0);
        governance::remove_admin(admin, @0x123);
        assert!(!governance::is_admin(@0x123), 1);
    }

    #[test(admin = @cutemarket)]
    #[expected_failure(abort_code = governance::E_NOT_ADMIN)]
    fun test_non_admin_cannot_add(admin: &signer) {
        governance::initialize(admin);
        let non_admin = account::create_account_for_test(@0x999);
        governance::add_admin(&non_admin, @0x123);
    }

    #[test(admin = @cutemarket)]
    fun test_set_fee(admin: &signer) {
        governance::initialize(admin);
        governance::set_fee(admin, 300);
        assert!(governance::get_fee_bps() == 300, 0);
    }

    #[test(admin = @cutemarket)]
    #[expected_failure(abort_code = governance::E_INVALID_FEE)]
    fun test_set_fee_too_high(admin: &signer) {
        governance::initialize(admin);
        governance::set_fee(admin, 1001);
    }

    #[test(admin = @cutemarket)]
    fun test_toggle_pause(admin: &signer) {
        governance::initialize(admin);
        governance::toggle_pause(admin);
        // Verify pause state through market_core (integration test)
        governance::toggle_pause(admin);
    }
}
```

- [ ] **Step 3: Run tests**

Run: `cd /Users/jason/repo/aptos_cutemarket/move && aptos move test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add move/sources/governance.move move/tests/test_governance.move
git commit -m "feat(contract): add governance module with admin management and platform params"
```

---

### Task 3: Market Core Module — Data Structures

**Files:**
- Create: `move/sources/market_core.move`

- [ ] **Step 1: Create market_core module with data structures and market creation**

```move
// move/sources/market_core.move
module cutemarket::market_core {
    use std::signer;
    use std::string::String;
    use std::vector;
    use aptos_framework::account;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::table::{Self, Table};
    use cutemarket::governance;
    use cutemarket::events;

    friend cutemarket::amm;
    friend cutemarket::oracle;

    // Error codes
    const E_NOT_INITIALIZED: u64 = 200;
    const E_MARKET_NOT_FOUND: u64 = 201;
    const E_INVALID_NAME: u64 = 202;
    const E_INVALID_OPTIONS: u64 = 203;
    const E_INVALID_END_TIME: u64 = 204;
    const E_INVALID_CATEGORY: u64 = 205;
    const E_INSUFFICIENT_LIQUIDITY: u64 = 206;
    const E_INVALID_OPTION_INDEX: u64 = 207;
    const E_MARKET_EXPIRED: u64 = 208;
    const E_MARKET_NOT_EXPIRED: u64 = 209;
    const E_ALREADY_SETTLED: u64 = 210;
    const E_NOT_SETTLED: u64 = 211;
    const E_PAUSED: u64 = 212;

    // Constants
    const MIN_BET_AMOUNT: u64 = 1000000; // 0.01 APT
    const MIN_LIQUIDITY: u64 = 100000000; // 1 APT
    const MAX_OPTIONS: u64 = 10;
    const MIN_OPTIONS: u64 = 2;

    // Category constants
    const CATEGORY_SPORTS: u8 = 0;
    const CATEGORY_CRYPTO: u8 = 1;
    const CATEGORY_POLITICS: u8 = 2;
    const CATEGORY_ENTERTAINMENT: u8 = 3;
    const CATEGORY_TECH: u8 = 4;
    const CATEGORY_OTHER: u8 = 5;

    // Resolution type constants
    const RESOLUTION_ADMIN: u8 = 0;
    const RESOLUTION_PYTH: u8 = 1;

    struct MarketMeta has store, copy, drop {
        market_id: u64,
        market_address: address,
        creator: address,
        category: u8,
        created_at: u64,
    }

    struct MarketState has key {
        market_id: u64,
        name: String,
        description: String,
        options: vector<String>,
        option_pools: vector<u64>,
        total_pool: u64,
        end_timestamp: u64,
        resolution_type: u8,
        pyth_price_id: vector<u8>,
        pyth_threshold: u64,
        pyth_above_wins: bool,
        is_settled: bool,
        winning_option: u64,
        lp_supply: u64,
        lp_balances: Table<address, u64>,
        user_bets: Table<address, vector<UserBet>>,
    }

    struct UserBet has store, copy, drop {
        option_index: u64,
        shares: u64,
        cost: u64,
    }

    struct MarketList has key {
        markets: vector<MarketMeta>,
    }

    struct ResourceCap has key {
        cap: account::SignerCapability,
    }

    // Initialize the market list (called once by deployer)
    public entry fun initialize_market_list(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<MarketList>(admin_addr), E_NOT_INITIALIZED);
        move_to(admin, MarketList {
            markets: vector::empty<MarketMeta>(),
        });
    }

    // Create a new market
    public entry fun create_market(
        creator: &signer,
        name: String,
        description: String,
        options: vector<String>,
        end_timestamp: u64,
        category: u8,
        resolution_type: u8,
        pyth_price_id: vector<u8>,
        pyth_threshold: u64,
        pyth_above_wins: bool,
        initial_liquidity: u64,
    ) acquires MarketList {
        let creator_addr = signer::address_of(creator);

        // Validate inputs
        assert!(std::string::length(&name) > 0 && std::string::length(&name) <= 100, E_INVALID_NAME);
        let opt_len = vector::length(&options);
        assert!(opt_len >= MIN_OPTIONS && opt_len <= MAX_OPTIONS, E_INVALID_OPTIONS);
        assert!(end_timestamp > timestamp::now_seconds() + 3600, E_INVALID_END_TIME);
        assert!(category <= CATEGORY_OTHER, E_INVALID_CATEGORY);
        assert!(initial_liquidity >= MIN_LIQUIDITY, E_INSUFFICIENT_LIQUIDITY);

        // Check not paused
        governance::require_not_paused(@cutemarket);

        // Get market ID
        let market_id = governance::increment_market_count();

        // Create resource account for this market
        let seed = std::bcs::to_bytes(&market_id);
        let (resource_signer, resource_cap) = account::create_resource_account(creator, seed);
        let market_address = signer::address_of(&resource_signer);

        // Store SignerCapability for later use (settle, claim)
        move_to(&resource_signer, ResourceCap { cap: resource_cap });

        // Initialize option pools
        let option_pools = vector::empty<u64>();
        let i = 0;
        while (i < opt_len) {
            vector::push_back(&mut option_pools, 0u64);
            i = i + 1;
        };

        // Transfer initial liquidity to resource account
        coin::transfer<AptosCoin>(creator, market_address, initial_liquidity);

        // Create market state
        let market_state = MarketState {
            market_id,
            name,
            description,
            options,
            option_pools,
            total_pool: initial_liquidity,
            end_timestamp,
            resolution_type,
            pyth_price_id,
            pyth_threshold,
            pyth_above_wins,
            is_settled: false,
            winning_option: 0,
            lp_supply: initial_liquidity,
            lp_balances: table::new(),
            user_bets: table::new(),
        };

        // Give LP to creator
        table::add(&mut market_state.lp_balances, creator_addr, initial_liquidity);

        move_to(&resource_signer, market_state);

        // Register in market list
        let market_list = borrow_global_mut<MarketList>(@cutemarket);
        vector::push_back(&mut market_list.markets, MarketMeta {
            market_id,
            market_address,
            creator: creator_addr,
            category,
            created_at: timestamp::now_seconds(),
        });

        // Emit event
        events::emit_market_created(
            market_id,
            market_address,
            creator_addr,
            name,
            options,
            end_timestamp,
            category,
        );
    }

    // View: get market count
    #[view]
    public fun get_market_count(): u64 acquires MarketList {
        if (!exists<MarketList>(@cutemarket)) return 0;
        vector::length(&borrow_global<MarketList>(@cutemarket).markets)
    }

    // View: get market meta by ID
    #[view]
    public fun get_market_meta(market_id: u64): MarketMeta acquires MarketList {
        let market_list = borrow_global<MarketList>(@cutemarket);
        assert!(market_id < vector::length(&market_list.markets), E_MARKET_NOT_FOUND);
        *vector::borrow(&market_list.markets, market_id)
    }

    // View: get market state
    #[view]
    public fun get_market_state(market_addr: address): (
        u64, String, String, vector<String>, vector<u64>, u64, u64, bool, u64
    ) acquires MarketState {
        assert!(exists<MarketState>(market_addr), E_MARKET_NOT_FOUND);
        let state = borrow_global<MarketState>(market_addr);
        (
            state.market_id,
            state.name,
            state.description,
            state.options,
            state.option_pools,
            state.total_pool,
            state.end_timestamp,
            state.is_settled,
            state.winning_option
        )
    }

    // View: get user bets for a market
    #[view]
    public fun get_user_bets(market_addr: address, user: address): vector<UserBet> acquires MarketState {
        assert!(exists<MarketState>(market_addr), E_MARKET_NOT_FOUND);
        let state = borrow_global<MarketState>(market_addr);
        if (table::contains(&state.user_bets, user)) {
            *table::borrow(&state.user_bets, user)
        } else {
            vector::empty<UserBet>()
        }
    }

    // View: get user shares for a specific option
    #[view]
    public fun get_user_shares(market_addr: address, user: address, option_index: u64): u64 acquires MarketState {
        assert!(exists<MarketState>(market_addr), E_MARKET_NOT_FOUND);
        let state = borrow_global<MarketState>(market_addr);
        if (!table::contains(&state.user_bets, user)) return 0;
        let bets = table::borrow(&state.user_bets, user);
        let total = 0u64;
        let i = 0;
        while (i < vector::length(bets)) {
            let bet = vector::borrow(bets, i);
            if (bet.option_index == option_index) {
                total = total + bet.shares;
            };
            i = i + 1;
        };
        total
    }

    // View: get market expiry and status (for oracle)
    #[view]
    public fun get_market_expiry_and_status(market_addr: address): (u64, bool, u64) acquires MarketState {
        assert!(exists<MarketState>(market_addr), E_MARKET_NOT_FOUND);
        let state = borrow_global<MarketState>(market_addr);
        (state.end_timestamp, state.is_settled, vector::length(&state.options))
    }

    // View: get claim info for a user (for oracle claim_winnings)
    // Returns: (is_settled, winning_option, total_pool, winning_pool, user_total_cost_for_winning_option)
    #[view]
    public fun get_claim_info(market_addr: address, user: address): (bool, u64, u64, u64, u64) acquires MarketState {
        assert!(exists<MarketState>(market_addr), E_MARKET_NOT_FOUND);
        let state = borrow_global<MarketState>(market_addr);

        let winning_pool = if (state.is_settled) {
            *vector::borrow(&state.option_pools, state.winning_option)
        } else {
            0
        };

        let user_total_cost = 0u64;
        if (table::contains(&state.user_bets, user)) {
            let bets = table::borrow(&state.user_bets, user);
            let i = 0;
            while (i < vector::length(bets)) {
                let bet = vector::borrow(bets, i);
                if (bet.option_index == state.winning_option) {
                    user_total_cost = user_total_cost + bet.cost;
                };
                i = i + 1;
            };
        };

        (state.is_settled, state.winning_option, state.total_pool, winning_pool, user_total_cost)
    }

    // Internal: get mutable market state (for amm/oracle)
    public(friend) fun borrow_market_state_mut(market_addr: address): &mut MarketState acquires MarketState {
        borrow_global_mut<MarketState>(market_addr)
    }

    // Internal: get market address by ID
    public(friend) fun get_market_address(market_id: u64): address acquires MarketList {
        let market_list = borrow_global<MarketList>(@cutemarket);
        assert!(market_id < vector::length(&market_list.markets), E_MARKET_NOT_FOUND);
        vector::borrow(&market_list.markets, market_id).market_address
    }

    // Internal: get resource account signer for transfers
    public(friend) fun get_resource_signer(market_addr: address): signer acquires ResourceCap {
        let cap = borrow_global<ResourceCap>(market_addr);
        account::create_signer_with_capability(&cap.cap)
    }

    // Internal: create a UserBet (for amm module)
    public(friend) fun create_user_bet(option_index: u64, shares: u64, cost: u64): UserBet {
        UserBet { option_index, shares, cost }
    }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/jason/repo/aptos_cutemarket/move && aptos move compile`
Expected: Compilation succeeds. Note: `amm.move` and `oracle.move` don't exist yet, so `friend` declarations may cause warnings — this is expected until all modules are created.

- [ ] **Step 3: Commit**

```bash
git add move/sources/market_core.move
git commit -m "feat(contract): add market_core module with resource account storage and market creation"
```

---

### Task 4: AMM Engine Module

**Files:**
- Create: `move/sources/amm.move`
- Test: `move/tests/test_amm.move`

- [ ] **Step 1: Create the AMM module**

```move
// move/sources/amm.move
module cutemarket::amm {
    use std::signer;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::table;
    use cutemarket::market_core;
    use cutemarket::governance;
    use cutemarket::events;

    // Error codes
    const E_INVALID_OPTION: u64 = 300;
    const E_INSUFFICIENT_AMOUNT: u64 = 301;
    const E_MARKET_EXPIRED: u64 = 302;
    const E_ALREADY_SETTLED: u64 = 303;
    const E_INSUFFICIENT_SHARES: u64 = 304;
    const E_ZERO_SHARES: u64 = 305;
    const E_SLIPPAGE_TOO_HIGH: u64 = 306;
    const E_ZERO_POOL: u64 = 307;

    // Slippage thresholds (basis points of total pool)
    const SLIPPAGE_THRESHOLD_LOW_BPS: u64 = 100;   // 1%
    const SLIPPAGE_THRESHOLD_HIGH_BPS: u64 = 500;   // 5%
    const SLIPPAGE_PER_BPS: u64 = 50;               // 0.5% per 1% of pool
    const BPS_BASE: u64 = 10000;

    // Buy shares in a market option
    public entry fun buy_shares(
        user: &signer,
        market_id: u64,
        option_index: u64,
        amount: u64,
    ) {
        let market_addr = market_core::get_market_address(market_id);
        let state = market_core::borrow_market_state_mut(market_addr);
        let user_addr = signer::address_of(user);
        let now = timestamp::now_seconds();

        // Validations
        assert!(!state.is_settled, E_ALREADY_SETTLED);
        assert!(now < state.end_timestamp, E_MARKET_EXPIRED);
        assert!(option_index < std::vector::length(&state.options), E_INVALID_OPTION);
        assert!(amount >= 1000000, E_INSUFFICIENT_AMOUNT); // 0.01 APT min

        // Calculate price and shares
        let option_pool = *std::vector::borrow(&state.option_pools, option_index);
        let total_pool = state.total_pool;
        assert!(total_pool > 0, E_ZERO_POOL);

        // Price = option_pool / total_pool (in BPS)
        let price_bps = (option_pool * BPS_BASE) / total_pool;
        if (price_bps == 0) price_bps = 1; // minimum price

        // Check slippage
        let amount_bps = (amount * BPS_BASE) / total_pool;
        if (amount_bps > SLIPPAGE_THRESHOLD_HIGH_BPS) {
            abort E_SLIPPAGE_TOO_HIGH
        };

        // Calculate shares = amount / price
        let shares = (amount * BPS_BASE) / price_bps;

        // Transfer APT to market account
        coin::transfer<AptosCoin>(user, market_addr, amount);

        // Update pools
        let option_pool_mut = std::vector::borrow_mut(&mut state.option_pools, option_index);
        *option_pool_mut = *option_pool_mut + amount;
        state.total_pool = state.total_pool + amount;

        // Record bet
        if (!table::contains(&state.user_bets, user_addr)) {
            table::add(&mut state.user_bets, user_addr, std::vector::empty());
        };
        let bets = table::borrow_mut(&mut state.user_bets, user_addr);
        std::vector::push_back(bets, market_core::create_user_bet(option_index, shares, amount));

        // Calculate new price
        let new_option_pool = *std::vector::borrow(&state.option_pools, option_index);
        let new_price_bps = (new_option_pool * BPS_BASE) / state.total_pool;

        events::emit_shares_purchased(
            market_id,
            user_addr,
            option_index,
            amount,
            shares,
            new_price_bps,
            now,
        );
    }

    // Sell shares
    public entry fun sell_shares(
        user: &signer,
        market_id: u64,
        option_index: u64,
        shares: u64,
    ) {
        let market_addr = market_core::get_market_address(market_id);
        let user_addr = signer::address_of(user);
        let now = timestamp::now_seconds();

        // Read user shares before mutable borrow (avoid borrow checker conflict)
        let user_shares = market_core::get_user_shares(market_addr, user_addr, option_index);
        assert!(user_shares >= shares, E_INSUFFICIENT_SHARES);
        assert!(shares > 0, E_ZERO_SHARES);

        // Now get mutable state
        let state = market_core::borrow_market_state_mut(market_addr);

        // Validations
        assert!(!state.is_settled, E_ALREADY_SETTLED);
        assert!(now < state.end_timestamp, E_MARKET_EXPIRED);
        assert!(option_index < std::vector::length(&state.options), E_INVALID_OPTION);

        // Calculate payout
        let option_pool = *std::vector::borrow(&state.option_pools, option_index);
        let total_pool = state.total_pool;
        assert!(total_pool > 0, E_ZERO_POOL);

        let price_bps = (option_pool * BPS_BASE) / total_pool;
        let amount = (shares * price_bps) / BPS_BASE;

        // Deduct platform fee
        let fee_bps = governance::get_fee_bps();
        let fee = (amount * fee_bps) / BPS_BASE;
        let payout = amount - fee;

        // Update pools
        let option_pool_mut = std::vector::borrow_mut(&mut state.option_pools, option_index);
        *option_pool_mut = *option_pool_mut - amount;
        state.total_pool = state.total_pool - amount;

        // Transfer APT to user
        coin::transfer<AptosCoin>(&market_core::get_resource_signer(market_addr), user_addr, payout);

        // Calculate new price
        let new_option_pool = *std::vector::borrow(&state.option_pools, option_index);
        let new_price_bps = if (state.total_pool > 0) {
            (new_option_pool * BPS_BASE) / state.total_pool
        } else {
            0
        };

        events::emit_shares_sold(
            market_id,
            user_addr,
            option_index,
            shares,
            payout,
            new_price_bps,
            now,
        );
    }

    // Add liquidity
    public entry fun add_liquidity(
        provider: &signer,
        market_id: u64,
        amount: u64,
    ) {
        let market_addr = market_core::get_market_address(market_id);
        let state = market_core::borrow_market_state_mut(market_addr);
        let provider_addr = signer::address_of(provider);
        let now = timestamp::now_seconds();

        assert!(!state.is_settled, E_ALREADY_SETTLED);
        assert!(now < state.end_timestamp, E_MARKET_EXPIRED);
        assert!(amount >= 100000000, E_INSUFFICIENT_AMOUNT); // 1 APT min

        // Calculate LP shares
        let lp_shares = if (state.lp_supply == 0) {
            amount
        } else {
            (amount * state.lp_supply) / state.total_pool
        };

        // Transfer APT to market
        coin::transfer<AptosCoin>(provider, market_addr, amount);

        // Update LP balances
        if (table::contains(&state.lp_balances, provider_addr)) {
            let balance = table::borrow_mut(&mut state.lp_balances, provider_addr);
            *balance = *balance + lp_shares;
        } else {
            table::add(&mut state.lp_balances, provider_addr, lp_shares);
        };

        state.lp_supply = state.lp_supply + lp_shares;
        state.total_pool = state.total_pool + amount;

        events::emit_liquidity_added(market_id, provider_addr, amount, lp_shares, now);
    }

    // View: calculate price for an option (in BPS)
    #[view]
    public fun get_option_price(market_addr: address, option_index: u64): u64 {
        let state = market_core::get_market_state(market_addr);
        let (_, _, _, _, option_pools, total_pool, _, _, _) = state;
        if (total_pool == 0) return 0;
        assert!(option_index < std::vector::length(&option_pools), E_INVALID_OPTION);
        let option_pool = *std::vector::borrow(&option_pools, option_index);
        (option_pool * BPS_BASE) / total_pool
    }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/jason/repo/aptos_cutemarket/move && aptos move compile`
Expected: Compilation succeeds (may need adjustments for `resource_signer` access pattern).

- [ ] **Step 3: Commit**

```bash
git add move/sources/amm.move
git commit -m "feat(contract): add AMM module with buy/sell shares, slippage protection, and LP"
```

---

### Task 5: Oracle Module

**Files:**
- Create: `move/sources/oracle.move`
- Test: `move/tests/test_oracle.move`

- [ ] **Step 1: Create the oracle module**

```move
// move/sources/oracle.move
module cutemarket::oracle {
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::table;
    use cutemarket::market_core;
    use cutemarket::governance;
    use cutemarket::events;

    // Error codes
    const E_INVALID_MARKET: u64 = 400;
    const E_NOT_EXPIRED: u64 = 401;
    const E_ALREADY_SETTLED: u64 = 402;
    const E_INVALID_OPTION: u64 = 403;
    const E_NOT_ADMIN: u64 = 404;
    const E_DISPUTE_PERIOD: u64 = 405;
    const E_NOT_PYTH_MARKET: u64 = 406;
    const E_NOT_SETTLED: u64 = 407;

    // Resolution type constants
    const RESOLUTION_ADMIN: u8 = 0;
    const RESOLUTION_PYTH: u8 = 1;

    // Dispute period: 24 hours
    const DISPUTE_PERIOD: u64 = 86400;

    // Admin settlement with dispute period
    struct PendingSettlement has key {
        market_id: u64,
        proposed_winner: u64,
        proposed_at: u64,
    }

    // Settle a market with Pyth oracle (price-based)
    public entry fun settle_with_pyth(
        market_id: u64,
        current_price: u64,
    ) {
        let market_addr = market_core::get_market_address(market_id);
        let state = market_core::borrow_market_state_mut(market_addr);
        let now = timestamp::now_seconds();

        assert!(now >= state.end_timestamp, E_NOT_EXPIRED);
        assert!(!state.is_settled, E_ALREADY_SETTLED);
        assert!(state.resolution_type == RESOLUTION_PYTH, E_NOT_PYTH_MARKET);

        // Determine winner based on price vs threshold
        let winner = if (current_price > state.pyth_threshold) {
            if (state.pyth_above_wins) 0 else 1
        } else {
            if (state.pyth_above_wins) 1 else 0
        };

        // Execute settlement inline
        state.is_settled = true;
        state.winning_option = winner;
        events::emit_market_settled(market_id, winner, state.total_pool, now);
    }

    // Propose admin settlement (enters dispute period)
    public entry fun propose_admin_settlement(
        admin: &signer,
        market_id: u64,
        winning_option: u64,
    ) acquires PendingSettlement {
        let admin_addr = std::signer::address_of(admin);
        governance::require_admin(admin_addr);

        let market_addr = market_core::get_market_address(market_id);
        let (end_timestamp, is_settled, options_len) = market_core::get_market_expiry_and_status(market_addr);

        assert!(timestamp::now_seconds() >= end_timestamp, E_NOT_EXPIRED);
        assert!(!is_settled, E_ALREADY_SETTLED);
        assert!(winning_option < options_len, E_INVALID_OPTION);

        // Store pending settlement
        let resource_signer = market_core::get_resource_signer(market_addr);
        if (exists<PendingSettlement>(market_addr)) {
            let pending = borrow_global_mut<PendingSettlement>(market_addr);
            pending.proposed_winner = winning_option;
            pending.proposed_at = timestamp::now_seconds();
        } else {
            move_to(&resource_signer, PendingSettlement {
                market_id,
                proposed_winner: winning_option,
                proposed_at: timestamp::now_seconds(),
            });
        };
    }

    // Execute admin settlement after dispute period
    public entry fun execute_admin_settlement(
        market_id: u64,
    ) acquires PendingSettlement {
        let market_addr = market_core::get_market_address(market_id);
        assert!(exists<PendingSettlement>(market_addr), E_INVALID_MARKET);

        let pending = borrow_global<PendingSettlement>(market_addr);
        let now = timestamp::now_seconds();
        assert!(now >= pending.proposed_at + DISPUTE_PERIOD, E_DISPUTE_PERIOD);

        let winner = pending.proposed_winner;

        // Execute settlement inline (avoid borrow checker conflicts)
        let state = market_core::borrow_market_state_mut(market_addr);
        state.is_settled = true;
        state.winning_option = winner;
        events::emit_market_settled(market_id, winner, state.total_pool, now);

        // Clean up pending settlement
        let PendingSettlement { market_id: _, proposed_winner: _, proposed_at: _ } = move_from<PendingSettlement>(market_addr);
    }

    // Claim winnings after settlement
    public entry fun claim_winnings(
        user: &signer,
        market_id: u64,
    ) {
        let market_addr = market_core::get_market_address(market_id);
        let user_addr = std::signer::address_of(user);

        // Read settlement status and calculate payout
        let (is_settled, winning_option, total_pool, winning_pool, user_total_cost) =
            market_core::get_claim_info(market_addr, user_addr);

        assert!(is_settled, E_NOT_SETTLED);
        if (user_total_cost == 0) return;
        if (winning_pool == 0) return;

        let fee_bps = governance::get_fee_bps();
        let fee = (total_pool * fee_bps) / 10000;
        let prize_pool = total_pool - fee;

        let total_payout = (user_total_cost * prize_pool) / winning_pool;

        if (total_payout > 0) {
            coin::transfer<AptosCoin>(&market_core::get_resource_signer(market_addr), user_addr, total_payout);
            events::emit_winnings_claimed(market_id, user_addr, total_payout, timestamp::now_seconds());
        };
    }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/jason/repo/aptos_cutemarket/move && aptos move compile`
Expected: Compilation succeeds.

- [ ] **Step 3: Commit**

```bash
git add move/sources/oracle.move
git commit -m "feat(contract): add oracle module with Pyth integration, admin settlement, and dispute period"
```

---

### Task 6: Integration Tests

**Files:**
- Create: `move/tests/test_integration.move`

- [ ] **Step 1: Create integration tests**

```move
// move/tests/test_integration.move
#[test_only]
module cutemarket::test_integration {
    use std::string;
    use std::vector;
    use aptos_framework::account;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use cutemarket::governance;
    use cutemarket::market_core;
    use cutemarket::amm;
    use cutemarket::oracle;

    fun setup(admin: &signer, user1: &signer, user2: &signer) {
        // Initialize framework
        timestamp::set_time_has_started_for_testing();

        // Initialize AptosCoin and get capabilities
        let (burn_cap, mint_cap) = aptos_framework::aptos_coin::initialize_for_test(admin);

        // Create accounts
        account::create_account_for_test(@cutemarket);
        account::create_account_for_test(@0x111);
        account::create_account_for_test(@0x222);

        // Register coins
        coin::register<AptosCoin>(admin);
        coin::register<AptosCoin>(user1);
        coin::register<AptosCoin>(user2);

        // Mint coins for testing
        coin::deposit(@0x111, coin::mint(10000000000, &mint_cap)); // 100 APT
        coin::deposit(@0x222, coin::mint(10000000000, &mint_cap)); // 100 APT

        // Clean up capabilities
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);

        // Initialize modules
        governance::initialize(admin);
        market_core::initialize_market_list(admin);
    }

    #[test(admin = @cutemarket, user1 = @0x111, user2 = @0x222)]
    fun test_full_lifecycle(admin: &signer, user1: &signer, user2: &signer) {
        setup(admin, user1, user2);

        // Create market
        market_core::create_market(
            admin,
            string::utf8(b"BTC above 100K"),
            string::utf8(b"Will BTC be above $100K by end of 2026?"),
            vector[string::utf8(b"Yes"), string::utf8(b"No")],
            timestamp::now_seconds() + 86400, // 1 day from now
            1, // CATEGORY_CRYPTO
            0, // RESOLUTION_ADMIN
            vector::empty(), // pyth_price_id (not used for admin)
            0, // pyth_threshold
            false, // pyth_above_wins
            1000000000, // 10 APT initial liquidity
        );

        // Verify market created
        assert!(market_core::get_market_count() == 1, 0);

        // User1 buys Yes shares
        amm::buy_shares(user1, 0, 0, 500000000); // 5 APT on Yes

        // User2 buys No shares
        amm::buy_shares(user2, 0, 1, 300000000); // 3 APT on No

        // Fast forward past end time
        timestamp::fast_forward_seconds(86401);

        // Admin proposes settlement (Yes wins)
        oracle::propose_admin_settlement(admin, 0, 0);

        // Fast forward past dispute period
        timestamp::fast_forward_seconds(86401);

        // Execute settlement
        oracle::execute_admin_settlement(0);

        // User1 claims winnings
        oracle::claim_winnings(user1, 0);

        // Verify user1 received more than they bet
        let user1_balance = coin::balance<AptosCoin>(@0x111);
        assert!(user1_balance > 9500000000, 1); // Started with 100 APT, bet 5, should get back more than 5
    }

    #[test(admin = @cutemarket, user1 = @0x111, user2 = @0x222)]
    fun test_sell_shares(admin: &signer, user1: &signer, user2: &signer) {
        setup(admin, user1, user2);

        // Create market
        market_core::create_market(
            admin,
            string::utf8(b"Test Market"),
            string::utf8(b"Test"),
            vector[string::utf8(b"A"), string::utf8(b"B")],
            timestamp::now_seconds() + 86400,
            5, // CATEGORY_OTHER
            0, // RESOLUTION_ADMIN
            vector::empty(),
            0,
            false,
            1000000000,
        );

        // User1 buys shares
        amm::buy_shares(user1, 0, 0, 1000000000); // 10 APT

        // User1 sells half shares
        let shares = market_core::get_user_shares(
            market_core::get_market_address(0),
            @0x111,
            0
        );
        amm::sell_shares(user1, 0, 0, shares / 2);

        // Verify user1 still has shares
        let remaining = market_core::get_user_shares(
            market_core::get_market_address(0),
            @0x111,
            0
        );
        assert!(remaining > 0, 0);
    }

    #[test(admin = @cutemarket, user1 = @0x111)]
    #[expected_failure(abort_code = amm::E_SLIPPAGE_TOO_HIGH)]
    fun test_slippage_protection(admin: &signer, user1: &signer) {
        setup(admin, user1, user1);

        market_core::create_market(
            admin,
            string::utf8(b"Small Pool"),
            string::utf8(b"Test"),
            vector[string::utf8(b"A"), string::utf8(b"B")],
            timestamp::now_seconds() + 86400,
            5,
            0,
            vector::empty(),
            0,
            false,
            100000000, // 1 APT pool
        );

        // Try to buy more than 5% of pool — should fail
        amm::buy_shares(user1, 0, 0, 10000000); // 0.1 APT = 10% of 1 APT pool
    }
}
```

- [ ] **Step 2: Run all tests**

Run: `cd /Users/jason/repo/aptos_cutemarket/move && aptos move test`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add move/tests/test_integration.move
git commit -m "test(contract): add integration tests for full lifecycle, sell, and slippage"
```

---

### Task 7: Remove Old Contract and Final Cleanup

**Files:**
- Delete: `move/sources/cutemarket.move`
- Modify: `move/Move.toml`

- [ ] **Step 1: Delete the old monolithic contract**

```bash
rm move/sources/cutemarket.move
```

- [ ] **Step 2: Run full test suite**

Run: `cd /Users/jason/repo/aptos_cutemarket/move && aptos move test`
Expected: All tests pass. If there are compilation errors due to missing `resource_signer` access, fix them.

- [ ] **Step 3: Commit**

```bash
git add -A move/
git commit -m "refactor(contract): remove old monolithic contract, replaced by modular architecture"
```

---

### Task 8: Compilation Fixes and Final Verification

**Files:**
- Modify: any files with compilation errors

- [ ] **Step 1: Run compile and fix any issues**

Run: `cd /Users/jason/repo/aptos_cutemarket/move && aptos move compile`

The AMM module references `market_core::resource_signer()` which needs to be added as a `friend` function in `market_core`. Add:

```move
// In market_core.move, add:
public(friend) fun resource_signer(market_addr: address): signer {
    // This requires storing the resource account Capability
    // For now, use a simpler approach: store funds in the deployer account
    // and track per-market balances internally
    // ...
}
```

**Important design note:** The `resource_signer` pattern in Move requires storing `account::SignerCapability` during resource account creation. Update `market_core.move` to store this capability and provide a `friend` function to retrieve it:

```move
// Add to MarketState or a separate ResourceCaps store:
struct ResourceCap has key {
    cap: account::SignerCapability,
}

// During create_market:
let (resource_signer, resource_cap) = account::create_resource_account(creator, seed);
move_to(&resource_signer, ResourceCap { cap: resource_cap });

// Friend function:
public(friend) fun get_resource_signer(market_addr: address): signer acquires ResourceCap {
    let cap = borrow_global<ResourceCap>(market_addr);
    account::create_signer_with_capability(&cap.cap)
}
```

- [ ] **Step 2: Run full test suite again**

Run: `cd /Users/jason/repo/aptos_cutemarket/move && aptos move test`
Expected: All tests pass.

- [ ] **Step 3: Run frontend type check**

Run: `cd /Users/jason/repo/aptos_cutemarket && npm run build`
Expected: Build succeeds (frontend hooks reference old contract, but type check should still pass since we're not changing frontend yet).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix(contract): resolve resource_signer access pattern and compilation issues"
```

---

## Verification Checklist

After all tasks are complete:

- [ ] `aptos move compile` succeeds
- [ ] `aptos move test` — all tests pass
- [ ] `npm run build` — frontend type check passes
- [ ] Old `cutemarket.move` is removed
- [ ] 5 new modules exist: `events.move`, `governance.move`, `market_core.move`, `amm.move`, `oracle.move`
- [ ] Test files exist for all modules
- [ ] All commits are clean and descriptive
