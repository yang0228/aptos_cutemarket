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
        lp_reserve: u64,
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

        // Create market state (initial liquidity sits in lp_reserve, not option pools)
        let market_state = MarketState {
            market_id,
            name,
            description,
            options,
            option_pools,
            lp_reserve: initial_liquidity,
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
        u64, String, String, vector<String>, vector<u64>, u64, u64, u64, bool, u64
    ) acquires MarketState {
        assert!(exists<MarketState>(market_addr), E_MARKET_NOT_FOUND);
        let state = borrow_global<MarketState>(market_addr);
        (
            state.market_id,
            state.name,
            state.description,
            state.options,
            state.option_pools,
            get_betting_pool_total_internal(state),
            state.lp_reserve,
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

        (
            state.is_settled,
            state.winning_option,
            get_betting_pool_total_internal(state),
            winning_pool,
            user_total_cost
        )
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

    // Friend: settle a market (for oracle module)
    public(friend) fun settle_market(market_addr: address, winning_option: u64) acquires MarketState {
        let state = borrow_global_mut<MarketState>(market_addr);
        assert!(!state.is_settled, E_ALREADY_SETTLED);
        state.is_settled = true;
        state.winning_option = winning_option;
    }

    // Friend: add amount to an option pool (betting liquidity only)
    public(friend) fun add_to_pool(market_addr: address, option_index: u64, amount: u64) acquires MarketState {
        let state = borrow_global_mut<MarketState>(market_addr);
        let pool = vector::borrow_mut(&mut state.option_pools, option_index);
        *pool = *pool + amount;
    }

    // Friend: remove amount from an option pool (betting liquidity only)
    public(friend) fun remove_from_pool(market_addr: address, option_index: u64, amount: u64) acquires MarketState {
        let state = borrow_global_mut<MarketState>(market_addr);
        let pool = vector::borrow_mut(&mut state.option_pools, option_index);
        *pool = *pool - amount;
    }

    // Friend: add LP reserve (does not affect option pricing)
    public(friend) fun add_lp_reserve(market_addr: address, amount: u64) acquires MarketState {
        let state = borrow_global_mut<MarketState>(market_addr);
        state.lp_reserve = state.lp_reserve + amount;
    }

    // Friend: remove LP reserve
    public(friend) fun remove_lp_reserve(market_addr: address, amount: u64) acquires MarketState {
        let state = borrow_global_mut<MarketState>(market_addr);
        assert!(state.lp_reserve >= amount, E_INSUFFICIENT_LIQUIDITY);
        state.lp_reserve = state.lp_reserve - amount;
    }

    // Friend: record a user bet (for amm module)
    public(friend) fun add_user_bet(market_addr: address, user: address, bet: UserBet) acquires MarketState {
        let state = borrow_global_mut<MarketState>(market_addr);
        if (!table::contains(&state.user_bets, user)) {
            table::add(&mut state.user_bets, user, vector::empty<UserBet>());
        };
        let bets = table::borrow_mut(&mut state.user_bets, user);
        vector::push_back(bets, bet);
    }

    // Friend: update LP balance (for amm module)
    public(friend) fun update_lp_balance(market_addr: address, provider: address, amount: u64, is_add: bool) acquires MarketState {
        let state = borrow_global_mut<MarketState>(market_addr);
        if (is_add) {
            state.lp_supply = state.lp_supply + amount;
            if (!table::contains(&state.lp_balances, provider)) {
                table::add(&mut state.lp_balances, provider, 0u64);
            };
            let balance = table::borrow_mut(&mut state.lp_balances, provider);
            *balance = *balance + amount;
        } else {
            state.lp_supply = state.lp_supply - amount;
            let balance = table::borrow_mut(&mut state.lp_balances, provider);
            *balance = *balance - amount;
        };
    }

    // Friend: read option pool value (for amm module)
    public(friend) fun get_option_pool(market_addr: address, option_index: u64): u64 acquires MarketState {
        let state = borrow_global<MarketState>(market_addr);
        *vector::borrow(&state.option_pools, option_index)
    }

    // Friend: sum of option pools (betting pool used for pricing)
    public(friend) fun get_betting_pool_total(market_addr: address): u64 acquires MarketState {
        let state = borrow_global<MarketState>(market_addr);
        get_betting_pool_total_internal(state)
    }

    // Friend: LP reserve (not used for option pricing)
    public(friend) fun get_lp_reserve(market_addr: address): u64 acquires MarketState {
        let state = borrow_global<MarketState>(market_addr);
        state.lp_reserve
    }

    fun get_betting_pool_total_internal(state: &MarketState): u64 {
        let total = 0u64;
        let i = 0;
        let len = vector::length(&state.option_pools);
        while (i < len) {
            total = total + *vector::borrow(&state.option_pools, i);
            i = i + 1;
        };
        total
    }

    // Friend: read lp_supply (for amm module)
    public(friend) fun get_lp_supply(market_addr: address): u64 acquires MarketState {
        let state = borrow_global<MarketState>(market_addr);
        state.lp_supply
    }

    // Friend: read user LP balance (for amm module)
    public(friend) fun get_lp_balance(market_addr: address, provider: address): u64 acquires MarketState {
        let state = borrow_global<MarketState>(market_addr);
        if (!table::contains(&state.lp_balances, provider)) return 0;
        *table::borrow(&state.lp_balances, provider)
    }

    // View: LP reserve, total LP supply, and provider balance (all in Octas / share units)
    #[view]
    public fun get_lp_info(market_addr: address, provider: address): (u64, u64, u64) acquires MarketState {
        assert!(exists<MarketState>(market_addr), E_MARKET_NOT_FOUND);
        let state = borrow_global<MarketState>(market_addr);
        let balance = if (table::contains(&state.lp_balances, provider)) {
            *table::borrow(&state.lp_balances, provider)
        } else {
            0
        };
        (state.lp_reserve, state.lp_supply, balance)
    }

    // Friend: check if market is settled (for oracle module)
    public(friend) fun is_settled(market_addr: address): bool acquires MarketState {
        let state = borrow_global<MarketState>(market_addr);
        state.is_settled
    }

    // Friend: get end_timestamp (for oracle module)
    public(friend) fun get_end_timestamp(market_addr: address): u64 acquires MarketState {
        let state = borrow_global<MarketState>(market_addr);
        state.end_timestamp
    }

    // Friend: get options length (for amm/oracle)
    public(friend) fun get_options_length(market_addr: address): u64 acquires MarketState {
        let state = borrow_global<MarketState>(market_addr);
        vector::length(&state.options)
    }

    // Test-only: expose market address for tests
    #[test_only]
    public fun get_market_address_for_test(market_id: u64): address acquires MarketList {
        get_market_address(market_id)
    }
}
