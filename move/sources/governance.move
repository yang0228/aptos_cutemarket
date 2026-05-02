module cutemarket::governance {
    use std::signer;
    use std::vector;
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

    public(friend) fun require_not_paused(_admin_addr: address) acquires MarketRegistry {
        assert!(exists<MarketRegistry>(@cutemarket), E_NOT_INITIALIZED);
        let registry = borrow_global<MarketRegistry>(@cutemarket);
        assert!(!registry.paused, E_PAUSED);
    }

    public(friend) fun require_admin(admin_addr: address) acquires MarketRegistry {
        assert!(exists<MarketRegistry>(@cutemarket), E_NOT_INITIALIZED);
        let registry = borrow_global<MarketRegistry>(@cutemarket);
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

    // Test-only wrappers for friend functions
    #[test_only]
    public fun test_is_admin(addr: address): bool acquires MarketRegistry {
        is_admin(addr)
    }

    #[test_only]
    public fun test_get_fee_bps(): u64 acquires MarketRegistry {
        get_fee_bps()
    }

    #[test_only]
    public fun test_get_market_count(): u64 acquires MarketRegistry {
        get_market_count()
    }
}
