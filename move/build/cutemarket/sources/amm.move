module cutemarket::amm {
    use std::signer;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use cutemarket::market_core;
    use cutemarket::governance;
    use cutemarket::events;

    friend cutemarket::oracle;

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
    const SLIPPAGE_THRESHOLD_HIGH_BPS: u64 = 500;   // 5%
    const BPS_BASE: u64 = 10000;

    // Buy shares in a market option
    public entry fun buy_shares(
        user: &signer,
        market_id: u64,
        option_index: u64,
        amount: u64,
    ) {
        let market_addr = market_core::get_market_address(market_id);
        let user_addr = signer::address_of(user);
        let now = timestamp::now_seconds();

        // Validations using granular reads
        assert!(!market_core::is_settled(market_addr), E_ALREADY_SETTLED);
        assert!(now < market_core::get_end_timestamp(market_addr), E_MARKET_EXPIRED);
        assert!(option_index < market_core::get_options_length(market_addr), E_INVALID_OPTION);
        assert!(amount >= 1000000, E_INSUFFICIENT_AMOUNT); // 0.01 APT min

        // Calculate price and shares
        let option_pool = market_core::get_option_pool(market_addr, option_index);
        let total_pool = market_core::get_total_pool(market_addr);
        assert!(total_pool > 0, E_ZERO_POOL);

        // Price = option_pool / total_pool (in BPS)
        let price_bps = (option_pool * BPS_BASE) / total_pool;
        if (price_bps == 0) price_bps = 1; // minimum price

        // Check slippage
        let amount_bps = (amount * BPS_BASE) / total_pool;
        assert!(amount_bps <= SLIPPAGE_THRESHOLD_HIGH_BPS, E_SLIPPAGE_TOO_HIGH);

        // Calculate shares = amount / price
        let shares = (amount * BPS_BASE) / price_bps;

        // Transfer APT to market account
        coin::transfer<AptosCoin>(user, market_addr, amount);

        // Update pools using granular mutation
        market_core::add_to_pool(market_addr, option_index, amount);

        // Record bet
        let bet = market_core::create_user_bet(option_index, shares, amount);
        market_core::add_user_bet(market_addr, user_addr, bet);

        // Calculate new price
        let new_option_pool = market_core::get_option_pool(market_addr, option_index);
        let new_total_pool = market_core::get_total_pool(market_addr);
        let new_price_bps = (new_option_pool * BPS_BASE) / new_total_pool;

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

        // Read user shares before mutations (avoid borrow checker conflict)
        let user_shares = market_core::get_user_shares(market_addr, user_addr, option_index);
        assert!(user_shares >= shares, E_INSUFFICIENT_SHARES);
        assert!(shares > 0, E_ZERO_SHARES);

        // Validations
        assert!(!market_core::is_settled(market_addr), E_ALREADY_SETTLED);
        assert!(now < market_core::get_end_timestamp(market_addr), E_MARKET_EXPIRED);
        assert!(option_index < market_core::get_options_length(market_addr), E_INVALID_OPTION);

        // Calculate payout
        let option_pool = market_core::get_option_pool(market_addr, option_index);
        let total_pool = market_core::get_total_pool(market_addr);
        assert!(total_pool > 0, E_ZERO_POOL);

        let price_bps = (option_pool * BPS_BASE) / total_pool;
        let amount = (shares * price_bps) / BPS_BASE;

        // Deduct platform fee
        let fee_bps = governance::get_fee_bps();
        let fee = (amount * fee_bps) / BPS_BASE;
        let payout = amount - fee;

        // Update pools using granular mutation
        market_core::remove_from_pool(market_addr, option_index, amount);

        // Transfer APT to user
        let resource_signer = market_core::get_resource_signer(market_addr);
        coin::transfer<AptosCoin>(&resource_signer, user_addr, payout);

        // Calculate new price
        let new_option_pool = market_core::get_option_pool(market_addr, option_index);
        let new_total_pool = market_core::get_total_pool(market_addr);
        let new_price_bps = if (new_total_pool > 0) {
            (new_option_pool * BPS_BASE) / new_total_pool
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
        let provider_addr = signer::address_of(provider);
        let now = timestamp::now_seconds();

        assert!(!market_core::is_settled(market_addr), E_ALREADY_SETTLED);
        assert!(now < market_core::get_end_timestamp(market_addr), E_MARKET_EXPIRED);
        assert!(amount >= 100000000, E_INSUFFICIENT_AMOUNT); // 1 APT min

        // Calculate LP shares
        let lp_supply = market_core::get_lp_supply(market_addr);
        let total_pool = market_core::get_total_pool(market_addr);
        let lp_shares = if (lp_supply == 0) {
            amount
        } else {
            (amount * lp_supply) / total_pool
        };

        // Transfer APT to market
        coin::transfer<AptosCoin>(provider, market_addr, amount);

        // Update LP balances and pool
        market_core::update_lp_balance(market_addr, provider_addr, lp_shares, true);
        market_core::add_to_pool(market_addr, 0, amount); // Add to first option pool for simplicity

        events::emit_liquidity_added(market_id, provider_addr, amount, lp_shares, now);
    }

    // View: calculate price for an option (in BPS)
    #[view]
    public fun get_option_price(market_addr: address, option_index: u64): u64 {
        let total_pool = market_core::get_total_pool(market_addr);
        if (total_pool == 0) return 0;
        let option_pool = market_core::get_option_pool(market_addr, option_index);
        (option_pool * BPS_BASE) / total_pool
    }
}
