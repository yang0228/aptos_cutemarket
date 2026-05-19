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

    fun setup(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) {
        timestamp::set_time_has_started_for_testing(aptos_framework);

        // Initialize AptosCoin
        let (burn_cap, mint_cap) = aptos_framework::aptos_coin::initialize_for_test(aptos_framework);

        // Create accounts
        account::create_account_for_test(@cutemarket);
        account::create_account_for_test(@0x111);
        account::create_account_for_test(@0x222);

        // Register and fund accounts
        coin::register<AptosCoin>(admin);
        coin::register<AptosCoin>(user1);
        coin::register<AptosCoin>(user2);
        coin::deposit(@cutemarket, coin::mint(20000000000, &mint_cap)); // 200 APT for admin
        coin::deposit(@0x111, coin::mint(10000000000, &mint_cap)); // 100 APT
        coin::deposit(@0x222, coin::mint(10000000000, &mint_cap)); // 100 APT

        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);

        // Initialize modules
        governance::initialize(admin);
        market_core::initialize_market_list(admin);
    }

    #[test(aptos_framework = @0x1, admin = @cutemarket, user1 = @0x111, user2 = @0x222)]
    fun test_full_lifecycle(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) {
        setup(aptos_framework, admin, user1, user2);

        // Create market with 200 APT initial liquidity (ensures slippage stays under 5%)
        market_core::create_market(
            admin,
            string::utf8(b"BTC above 100K"),
            string::utf8(b"Will BTC be above $100K by end of 2026?"),
            vector[string::utf8(b"Yes"), string::utf8(b"No")],
            timestamp::now_seconds() + 86400,
            1, // CATEGORY_CRYPTO
            0, // RESOLUTION_ADMIN
            vector::empty(),
            0,
            false,
            20000000000, // 200 APT
        );

        // Verify market created
        assert!(market_core::get_market_count() == 1, 0);

        // Get market address via test helper
        let market_addr = market_core::get_market_address_for_test(0);

        // User1 buys Yes shares (5 APT) — ~2.5% slippage on 200 APT pool
        amm::buy_shares(user1, 0, 0, 500000000);

        // User2 buys No shares (3 APT) — ~1.5% slippage on 205 APT pool
        amm::buy_shares(user2, 0, 1, 300000000);

        let (_, _, _, _, _, betting_pool, lp_reserve, _, _, _) = market_core::get_market_state(market_addr);
        assert!(betting_pool == 800000000, 1);
        assert!(lp_reserve == 20000000000, 2);

        // Fast forward past end time
        timestamp::fast_forward_seconds(86401);

        // Admin proposes settlement (Yes wins)
        oracle::propose_admin_settlement(admin, 0, 0);

        // Fast forward past dispute period (24h = 86400s)
        timestamp::fast_forward_seconds(86401);

        // Execute settlement
        oracle::execute_admin_settlement(0);

        // Verify settled
        let (_, _, _, _, _, _, _, _, is_settled, _) = market_core::get_market_state(market_addr);
        assert!(is_settled, 3);

        // User1 claims winnings
        oracle::claim_winnings(user1, 0);

        // Verify user1 received payout (started 100 APT, bet 5 APT, won big)
        let user1_balance = coin::balance<AptosCoin>(@0x111);
        assert!(user1_balance > 9500000000, 4);
    }

    #[test(aptos_framework = @0x1, admin = @cutemarket, user1 = @0x111, user2 = @0x222)]
    fun test_sell_shares(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) {
        setup(aptos_framework, admin, user1, user2);

        market_core::create_market(
            admin,
            string::utf8(b"Test Market"),
            string::utf8(b"Test"),
            vector[string::utf8(b"A"), string::utf8(b"B")],
            timestamp::now_seconds() + 86400,
            5, // CATEGORY_OTHER
            0,
            vector::empty(),
            0,
            false,
            20000000000, // 200 APT
        );

        let market_addr = market_core::get_market_address_for_test(0);

        // User1 buys shares (0.8 APT, ~0.4% slippage on 200 APT pool)
        amm::buy_shares(user1, 0, 0, 80000000);

        // Get user shares
        let shares = market_core::get_user_shares(market_addr, @0x111, 0);
        assert!(shares > 0, 0);

        let balance_before = coin::balance<AptosCoin>(@0x111);

        // User1 sells a fraction (1/1000 of shares)
        amm::sell_shares(user1, 0, 0, shares / 1000);

        // Verify user received APT from selling
        let balance_after = coin::balance<AptosCoin>(@0x111);
        assert!(balance_after > balance_before, 1);

        // Verify pool decreased
        let (_, _, _, _, _, betting_pool_after, _, _, _, _) = market_core::get_market_state(market_addr);
        assert!(betting_pool_after < 80000000, 2);
    }

    #[test(aptos_framework = @0x1, admin = @cutemarket, user1 = @0x111, user2 = @0x222)]
    #[expected_failure(abort_code = amm::E_SLIPPAGE_TOO_HIGH)]
    fun test_slippage_protection(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) {
        setup(aptos_framework, admin, user1, user2);

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

        // Try to buy 10% of pool — should fail (>5% threshold)
        amm::buy_shares(user1, 0, 0, 10000000);
    }

    #[test(aptos_framework = @0x1, admin = @cutemarket, user1 = @0x111, user2 = @0x222)]
    fun test_price_calculation(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) {
        setup(aptos_framework, admin, user1, user2);

        market_core::create_market(
            admin,
            string::utf8(b"Price Test"),
            string::utf8(b"Test"),
            vector[string::utf8(b"A"), string::utf8(b"B")],
            timestamp::now_seconds() + 86400,
            5,
            0,
            vector::empty(),
            0,
            false,
            1000000000, // 10 APT
        );

        let market_addr = market_core::get_market_address_for_test(0);

        let price_a = amm::get_option_price(market_addr, 0);
        let price_b = amm::get_option_price(market_addr, 1);
        assert!(price_a == 0, 0);
        assert!(price_b == 0, 1);

        // User buys option A (0.4 APT, ~4% slippage on 10 APT pool)
        amm::buy_shares(user1, 0, 0, 40000000);

        // Now A should have a price
        let price_a_after = amm::get_option_price(market_addr, 0);
        assert!(price_a_after > 0, 2);
    }

    #[test(aptos_framework = @0x1, admin = @cutemarket, user1 = @0x111, user2 = @0x222)]
    fun test_add_liquidity_does_not_distort_odds(
        aptos_framework: &signer,
        admin: &signer,
        user1: &signer,
        user2: &signer,
    ) {
        setup(aptos_framework, admin, user1, user2);

        market_core::create_market(
            admin,
            string::utf8(b"LP Test"),
            string::utf8(b"Test"),
            vector[string::utf8(b"Yes"), string::utf8(b"No")],
            timestamp::now_seconds() + 86400,
            5,
            0,
            vector::empty(),
            0,
            false,
            1000000000,
        );

        let market_addr = market_core::get_market_address_for_test(0);

        amm::buy_shares(user1, 0, 0, 40000000);
        amm::buy_shares(user2, 0, 1, 30000000);

        let price_yes_before = amm::get_option_price(market_addr, 0);
        let price_no_before = amm::get_option_price(market_addr, 1);

        amm::add_liquidity(admin, 0, 5000000000);

        let price_yes_after = amm::get_option_price(market_addr, 0);
        let price_no_after = amm::get_option_price(market_addr, 1);

        assert!(price_yes_before == price_yes_after, 0);
        assert!(price_no_before == price_no_after, 1);

        let (_, _, _, _, _, betting_pool, lp_reserve, _, _, _) =
            market_core::get_market_state(market_addr);
        assert!(betting_pool == 70000000, 2);
        assert!(lp_reserve == 6000000000, 3);
    }
}
