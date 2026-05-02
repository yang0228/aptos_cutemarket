#[test_only]
module cutemarket::test_governance {
    use aptos_framework::account;
    use cutemarket::governance;

    #[test(admin = @cutemarket)]
    fun test_initialize(admin: &signer) {
        governance::initialize(admin);
        assert!(governance::test_get_market_count() == 0, 0);
        assert!(governance::test_get_fee_bps() == 200, 1);
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
        assert!(governance::test_is_admin(@0x123), 0);
        governance::remove_admin(admin, @0x123);
        assert!(!governance::test_is_admin(@0x123), 1);
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
        assert!(governance::test_get_fee_bps() == 300, 0);
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
        governance::toggle_pause(admin);
    }
}
