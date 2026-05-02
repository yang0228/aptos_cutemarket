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
