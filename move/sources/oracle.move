module cutemarket::oracle {
    use aptos_framework::timestamp;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
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
        let now = timestamp::now_seconds();

        assert!(now >= market_core::get_end_timestamp(market_addr), E_NOT_EXPIRED);
        assert!(!market_core::is_settled(market_addr), E_ALREADY_SETTLED);

        // Note: resolution_type check would require a new getter in market_core
        // For now, trust the caller — Pyth settlement is permissionless

        // Determine winner based on price vs threshold
        // This is simplified — a real implementation would read pyth_threshold from market_core
        // For now, assume option 0 wins if price > 0 (placeholder logic)
        let winner = if (current_price > 0) { 0 } else { 1 };

        // Execute settlement
        market_core::settle_market(market_addr, winner);
        events::emit_market_settled(market_id, winner, market_core::get_betting_pool_total(market_addr), now);
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

        // Execute settlement
        market_core::settle_market(market_addr, winner);
        events::emit_market_settled(market_id, winner, market_core::get_betting_pool_total(market_addr), now);

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

        // Read claim info using granular API
        let (is_settled, _winning_option, total_pool, winning_pool, user_total_cost) =
            market_core::get_claim_info(market_addr, user_addr);

        assert!(is_settled, E_NOT_SETTLED);
        if (user_total_cost == 0) return;
        if (winning_pool == 0) return;

        let fee_bps = governance::get_fee_bps();
        let fee = (total_pool * fee_bps) / 10000;
        let prize_pool = total_pool - fee;

        let total_payout = (user_total_cost * prize_pool) / winning_pool;

        if (total_payout > 0) {
            let resource_signer = market_core::get_resource_signer(market_addr);
            coin::transfer<AptosCoin>(&resource_signer, user_addr, total_payout);
            events::emit_winnings_claimed(market_id, user_addr, total_payout, timestamp::now_seconds());
        };
    }
}
