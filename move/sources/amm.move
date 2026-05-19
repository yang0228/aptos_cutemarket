module cutemarket::amm {
    use std::signer;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use cutemarket::market_core;
    use cutemarket::governance;
    use cutemarket::events;

    friend cutemarket::oracle;

    const E_INVALID_OPTION: u64 = 300;
    const E_INSUFFICIENT_AMOUNT: u64 = 301;
    const E_MARKET_EXPIRED: u64 = 302;
    const E_ALREADY_SETTLED: u64 = 303;
    const E_INSUFFICIENT_SHARES: u64 = 304;
    const E_ZERO_SHARES: u64 = 305;
    const E_SLIPPAGE_TOO_HIGH: u64 = 306;
    const E_ZERO_POOL: u64 = 307;
    const E_ZERO_LP_SHARES: u64 = 308;
    const E_INSUFFICIENT_LP: u64 = 309;

    const SLIPPAGE_THRESHOLD_HIGH_BPS: u64 = 500;
    const BPS_BASE: u64 = 10000;

    // Slippage depth = betting pool + LP reserve (LP backs trade size, not option odds)
    fun get_trade_depth(market_addr: address): u64 {
        market_core::get_betting_pool_total(market_addr)
            + market_core::get_lp_reserve(market_addr)
    }

    fun get_price_bps(market_addr: address, option_index: u64): u64 {
        let betting_total = market_core::get_betting_pool_total(market_addr);
        if (betting_total == 0) {
            return BPS_BASE / market_core::get_options_length(market_addr)
        };
        let option_pool = market_core::get_option_pool(market_addr, option_index);
        let price_bps = (option_pool * BPS_BASE) / betting_total;
        if (price_bps == 0) 1 else price_bps
    }

    public entry fun buy_shares(
        user: &signer,
        market_id: u64,
        option_index: u64,
        amount: u64,
    ) {
        let market_addr = market_core::get_market_address(market_id);
        let user_addr = signer::address_of(user);
        let now = timestamp::now_seconds();

        assert!(!market_core::is_settled(market_addr), E_ALREADY_SETTLED);
        assert!(now < market_core::get_end_timestamp(market_addr), E_MARKET_EXPIRED);
        assert!(option_index < market_core::get_options_length(market_addr), E_INVALID_OPTION);
        assert!(amount >= 1000000, E_INSUFFICIENT_AMOUNT);

        let depth = get_trade_depth(market_addr);
        assert!(depth > 0, E_ZERO_POOL);

        let price_bps = get_price_bps(market_addr, option_index);
        let amount_bps = (amount * BPS_BASE) / depth;
        assert!(amount_bps <= SLIPPAGE_THRESHOLD_HIGH_BPS, E_SLIPPAGE_TOO_HIGH);

        let shares = (amount * BPS_BASE) / price_bps;

        coin::transfer<AptosCoin>(user, market_addr, amount);
        market_core::add_to_pool(market_addr, option_index, amount);

        let bet = market_core::create_user_bet(option_index, shares, amount);
        market_core::add_user_bet(market_addr, user_addr, bet);

        events::emit_shares_purchased(
            market_id,
            user_addr,
            option_index,
            amount,
            shares,
            get_price_bps(market_addr, option_index),
            now,
        );
    }

    public entry fun sell_shares(
        user: &signer,
        market_id: u64,
        option_index: u64,
        shares: u64,
    ) {
        let market_addr = market_core::get_market_address(market_id);
        let user_addr = signer::address_of(user);
        let now = timestamp::now_seconds();

        let user_shares = market_core::get_user_shares(market_addr, user_addr, option_index);
        assert!(user_shares >= shares, E_INSUFFICIENT_SHARES);
        assert!(shares > 0, E_ZERO_SHARES);

        assert!(!market_core::is_settled(market_addr), E_ALREADY_SETTLED);
        assert!(now < market_core::get_end_timestamp(market_addr), E_MARKET_EXPIRED);
        assert!(option_index < market_core::get_options_length(market_addr), E_INVALID_OPTION);

        assert!(market_core::get_betting_pool_total(market_addr) > 0, E_ZERO_POOL);

        let price_bps = get_price_bps(market_addr, option_index);
        let amount = (shares * price_bps) / BPS_BASE;

        let fee_bps = governance::get_fee_bps();
        let fee = (amount * fee_bps) / BPS_BASE;
        let payout = amount - fee;

        market_core::remove_from_pool(market_addr, option_index, amount);
        if (fee > 0) {
            market_core::add_lp_reserve(market_addr, fee);
        };

        let resource_signer = market_core::get_resource_signer(market_addr);
        coin::transfer<AptosCoin>(&resource_signer, user_addr, payout);

        let new_price_bps = if (market_core::get_betting_pool_total(market_addr) > 0) {
            get_price_bps(market_addr, option_index)
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
        assert!(amount >= 100000000, E_INSUFFICIENT_AMOUNT);

        let lp_supply = market_core::get_lp_supply(market_addr);
        let lp_reserve = market_core::get_lp_reserve(market_addr);
        let lp_shares = if (lp_supply == 0) {
            amount
        } else {
            (amount * lp_supply) / lp_reserve
        };

        coin::transfer<AptosCoin>(provider, market_addr, amount);
        market_core::update_lp_balance(market_addr, provider_addr, lp_shares, true);
        market_core::add_lp_reserve(market_addr, amount);

        events::emit_liquidity_added(market_id, provider_addr, amount, lp_shares, now);
    }

    public entry fun remove_liquidity(
        provider: &signer,
        market_id: u64,
        lp_shares: u64,
    ) {
        let market_addr = market_core::get_market_address(market_id);
        let provider_addr = signer::address_of(provider);
        let now = timestamp::now_seconds();

        assert!(!market_core::is_settled(market_addr), E_ALREADY_SETTLED);
        assert!(now < market_core::get_end_timestamp(market_addr), E_MARKET_EXPIRED);
        assert!(lp_shares > 0, E_ZERO_LP_SHARES);

        let lp_balance = market_core::get_lp_balance(market_addr, provider_addr);
        assert!(lp_shares <= lp_balance, E_INSUFFICIENT_LP);

        let lp_supply = market_core::get_lp_supply(market_addr);
        let lp_reserve = market_core::get_lp_reserve(market_addr);
        let amount = (lp_shares * lp_reserve) / lp_supply;

        market_core::update_lp_balance(market_addr, provider_addr, lp_shares, false);
        market_core::remove_lp_reserve(market_addr, amount);

        let resource_signer = market_core::get_resource_signer(market_addr);
        coin::transfer<AptosCoin>(&resource_signer, provider_addr, amount);

        events::emit_liquidity_removed(market_id, provider_addr, amount, lp_shares, now);
    }

    #[view]
    public fun get_option_price(market_addr: address, option_index: u64): u64 {
        let betting_total = market_core::get_betting_pool_total(market_addr);
        if (betting_total == 0) return 0;
        let option_pool = market_core::get_option_pool(market_addr, option_index);
        (option_pool * BPS_BASE) / betting_total
    }
}
