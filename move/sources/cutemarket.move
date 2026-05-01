module cutemarket::prediction_market {
    use std::signer;
    use std::vector;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::account;

    /// 错误码
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_INVALID_PROJECT_ID: u64 = 3;
    const E_INVALID_OPTION_INDEX: u64 = 4;
    const E_INSUFFICIENT_AMOUNT: u64 = 5;
    const E_PROJECT_CLOSED: u64 = 6;
    const E_PROJECT_NOT_CLOSED: u64 = 7;
    const E_ALREADY_SETTLED: u64 = 8;
    const E_NOT_ADMIN: u64 = 9;

    /// 最小下注金额（0.01 APT = 1000000 Octas）
    const MIN_BET_AMOUNT: u64 = 1000000;

    /// 用户下注记录
    struct UserBet has store, drop {
        user: address,
        option_index: u64,
        amount: u64,
    }

    /// 投注项目
    struct Project has store {
        id: u64,
        name: vector<u8>,
        options_count: u64,
        end_timestamp: u64,
        is_settled: bool,
        winning_option: u64,
        /// 每个选项的总投注额
        option_pools: vector<u64>,
        /// 所有下注记录
        bets: vector<UserBet>,
    }

    /// 全局市场状态
    struct MarketState has key {
        admin: address,
        projects: vector<Project>,
        /// 收取的平台手续费（2%）
        platform_fee_rate: u64,
    }

    /// 初始化市场（只能由部署者调用一次）
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<MarketState>(admin_addr), E_ALREADY_INITIALIZED);

        // 创建 5 个内置项目
        let projects = vector::empty<Project>();

        // 项目 0: 川普下台
        vector::push_back(&mut projects, Project {
            id: 0,
            name: b"Trump Steps Down",
            options_count: 2,
            end_timestamp: 1798160000, // 2026-12-25
            is_settled: false,
            winning_option: 0,
            option_pools: vector[0, 0],
            bets: vector::empty<UserBet>(),
        });

        // 项目 1: cuteMarket赢今晚比赛
        vector::push_back(&mut projects, Project {
            id: 1,
            name: b"cuteMarket Wins Tonight",
            options_count: 2,
            end_timestamp: 1794672000, // 2026-11-15
            is_settled: false,
            winning_option: 0,
            option_pools: vector[0, 0],
            bets: vector::empty<UserBet>(),
        });

        // 项目 2: 比特币突破10万
        vector::push_back(&mut projects, Project {
            id: 2,
            name: b"Bitcoin Above 100K",
            options_count: 2,
            end_timestamp: 1798736000, // 2026-12-31
            is_settled: false,
            winning_option: 0,
            option_pools: vector[0, 0],
            bets: vector::empty<UserBet>(),
        });

        // 项目 3: 诺奖得主地区
        vector::push_back(&mut projects, Project {
            id: 3,
            name: b"Nobel Prize Region",
            options_count: 3,
            end_timestamp: 1791590400, // 2026-10-10
            is_settled: false,
            winning_option: 0,
            option_pools: vector[0, 0, 0],
            bets: vector::empty<UserBet>(),
        });

        // 项目 4: 2026世界杯冠军
        vector::push_back(&mut projects, Project {
            id: 4,
            name: b"2026 World Cup Winner",
            options_count: 4,
            end_timestamp: 1784908800, // 2026-07-19
            is_settled: false,
            winning_option: 0,
            option_pools: vector[0, 0, 0, 0],
            bets: vector::empty<UserBet>(),
        });

        move_to(admin, MarketState {
            admin: admin_addr,
            projects,
            platform_fee_rate: 2, // 2%
        });
    }

    /// 用户下注
    public entry fun place_bet(
        user: &signer,
        project_id: u64,
        option_index: u64,
        amount: u64
    ) acquires MarketState {
        let user_addr = signer::address_of(user);
        
        // 获取市场状态（从管理员账户）
        let market = borrow_global_mut<MarketState>(@cutemarket);
        
        // 验证项目 ID
        assert!(project_id < vector::length(&market.projects), E_INVALID_PROJECT_ID);
        
        let project = vector::borrow_mut(&mut market.projects, project_id);
        
        // 验证选项索引
        assert!(option_index < project.options_count, E_INVALID_OPTION_INDEX);
        
        // 验证金额
        assert!(amount >= MIN_BET_AMOUNT, E_INSUFFICIENT_AMOUNT);
        
        // 验证项目未关闭
        let now = timestamp::now_seconds();
        assert!(now < project.end_timestamp, E_PROJECT_CLOSED);
        
        // 验证未结算
        assert!(!project.is_settled, E_ALREADY_SETTLED);
        
        // 转账到合约（管理员地址）
        coin::transfer<AptosCoin>(user, market.admin, amount);
        
        // 更新选项池
        let pool = vector::borrow_mut(&mut project.option_pools, option_index);
        *pool = *pool + amount;
        
        // 记录下注
        vector::push_back(&mut project.bets, UserBet {
            user: user_addr,
            option_index,
            amount,
        });
    }

    /// 结算项目（只有管理员可以调用）
    public entry fun settle_project(
        admin: &signer,
        project_id: u64,
        winning_option: u64
    ) acquires MarketState {
        let admin_addr = signer::address_of(admin);
        let market = borrow_global_mut<MarketState>(@cutemarket);
        
        // 验证管理员权限
        assert!(admin_addr == market.admin, E_NOT_ADMIN);
        
        // 验证项目 ID
        assert!(project_id < vector::length(&market.projects), E_INVALID_PROJECT_ID);
        
        let project = vector::borrow_mut(&mut market.projects, project_id);
        
        // 验证选项索引
        assert!(winning_option < project.options_count, E_INVALID_OPTION_INDEX);
        
        // 验证项目已关闭
        let now = timestamp::now_seconds();
        assert!(now >= project.end_timestamp, E_PROJECT_NOT_CLOSED);
        
        // 验证未结算
        assert!(!project.is_settled, E_ALREADY_SETTLED);
        
        // 标记为已结算
        project.is_settled = true;
        project.winning_option = winning_option;
        
        // 计算总奖池
        let total_pool: u64 = 0;
        let i = 0;
        while (i < vector::length(&project.option_pools)) {
            total_pool = total_pool + *vector::borrow(&project.option_pools, i);
            i = i + 1;
        };
        
        // 计算手续费
        let fee = (total_pool * market.platform_fee_rate) / 100;
        let prize_pool = total_pool - fee;
        
        // 获胜选项的总投注额
        let winning_pool = *vector::borrow(&project.option_pools, winning_option);
        
        // 如果没有人下注获胜选项，奖金归平台
        if (winning_pool == 0) {
            return
        };
        
        // 分发奖金给获胜者
        let j = 0;
        let bets_len = vector::length(&project.bets);
        while (j < bets_len) {
            let bet = vector::borrow(&project.bets, j);
            if (bet.option_index == winning_option) {
                // 计算该用户应得奖金：(用户投注 / 获胜池总额) * 总奖池
                let user_prize = (bet.amount * prize_pool) / winning_pool;
                
                // 转账给用户
                if (!account::exists_at(bet.user)) {
                    // 如果用户账户不存在，跳过
                    j = j + 1;
                    continue
                };
                coin::transfer<AptosCoin>(admin, bet.user, user_prize);
            };
            j = j + 1;
        };
    }

    /// 查询项目信息（View 函数）
    #[view]
    public fun get_project_info(project_id: u64): (u64, u64, bool, u64, vector<u64>) acquires MarketState {
        let market = borrow_global<MarketState>(@cutemarket);
        assert!(project_id < vector::length(&market.projects), E_INVALID_PROJECT_ID);
        
        let project = vector::borrow(&market.projects, project_id);
        (
            project.id,
            project.end_timestamp,
            project.is_settled,
            project.winning_option,
            project.option_pools
        )
    }

    /// 查询用户在某个项目的下注
    #[view]
    public fun get_user_bets(project_id: u64, user_addr: address): vector<u64> acquires MarketState {
        let market = borrow_global<MarketState>(@cutemarket);
        assert!(project_id < vector::length(&market.projects), E_INVALID_PROJECT_ID);
        
        let project = vector::borrow(&market.projects, project_id);
        let user_bets = vector::empty<u64>();
        
        let i = 0;
        let bets_len = vector::length(&project.bets);
        while (i < bets_len) {
            let bet = vector::borrow(&project.bets, i);
            if (bet.user == user_addr) {
                vector::push_back(&mut user_bets, bet.amount);
            };
            i = i + 1;
        };
        
        user_bets
    }
}

