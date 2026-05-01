# 合约 API 参考

## 模块信息

- **模块地址:** `0x8ebb5f208e99f14584dc352204b107f8c9570a8481cf23e830fee296bd1515cb`
- **模块名:** `prediction_market`
- **网络:** Aptos Testnet

## 常量

| 常量 | 值 | 说明 |
|------|-----|------|
| `MIN_BET_AMOUNT` | 1,000,000 Octas | 最小下注金额（0.01 APT） |
| `platform_fee_rate` | 2 | 平台手续费百分比 |

## 数据结构

### Project

```move
struct Project has store {
    id: u64,                    // 项目 ID
    name: vector<u8>,           // 项目名称
    options_count: u64,         // 选项数量
    end_timestamp: u64,         // 结束时间（Unix 秒）
    is_settled: bool,           // 是否已结算
    winning_option: u64,        // 获胜选项索引
    option_pools: vector<u64>,  // 每个选项的总投注额（Octas）
    bets: vector<UserBet>,      // 所有下注记录
}
```

### UserBet

```move
struct UserBet has store, drop {
    user: address,      // 下注者地址
    option_index: u64,  // 选项索引
    amount: u64,        // 下注金额（Octas）
}
```

### MarketState

```move
struct MarketState has key {
    admin: address,             // 管理员地址（合约部署者）
    projects: vector<Project>,  // 所有项目
    platform_fee_rate: u64,     // 手续费率（2%）
}
```

## Entry Functions

### initialize()

初始化市场，创建 5 个内置项目。只能由部署者调用一次。

```bash
aptos move run \
  --function-id 0x8ebb5f208e99f14584dc352204b107f8c9570a8481cf23e830fee296bd1515cb::prediction_market::initialize \
  --assume-yes
```

创建的 5 个项目：

| ID | 名称 | 选项数 | 结束时间 |
|----|------|--------|----------|
| 0 | Trump Steps Down | 2 | 2026-12-25 |
| 1 | cuteMarket Wins Tonight | 2 | 2026-11-15 |
| 2 | Bitcoin Above 100K | 2 | 2026-12-31 |
| 3 | Nobel Prize Region | 3 | 2026-10-10 |
| 4 | 2026 World Cup Winner | 4 | 2026-07-19 |

### place_bet(project_id, option_index, amount)

用户下注。

**参数：**
- `project_id: u64` — 项目 ID（0-4）
- `option_index: u64` — 选项索引（从 0 开始）
- `amount: u64` — 下注金额（Octas，最少 1,000,000）

**验证规则：**
- project_id 有效
- option_index < options_count
- amount >= MIN_BET_AMOUNT
- 当前时间 < end_timestamp
- 项目未结算

**效果：**
- 从用户转账 amount Octas 到管理员地址
- 更新对应选项的 option_pool
- 记录一条 UserBet

```bash
aptos move run \
  --function-id 0x8ebb5f208e99f14584dc352204b107f8c9570a8481cf23e830fee296bd1515cb::prediction_market::place_bet \
  --args u64:0 u64:0 u64:10000000 \
  --assume-yes
```

### settle_project(project_id, winning_option)

结算项目并分配奖金。只有管理员可以调用。

**参数：**
- `project_id: u64` — 项目 ID
- `winning_option: u64` — 获胜选项索引

**验证规则：**
- 调用者是管理员
- project_id 有效
- winning_option < options_count
- 当前时间 >= end_timestamp
- 项目未结算

**奖金分配逻辑：**
1. 计算总奖池 = 所有选项投注之和
2. 手续费 = 总奖池 * 2%
3. 净奖池 = 总奖池 - 手续费
4. 对每个投注了获胜选项的用户：奖金 = (用户投注 / 获胜池总额) * 净奖池
5. 自动转账到用户钱包

```bash
aptos move run \
  --function-id 0x8ebb5f208e99f14584dc352204b107f8c9570a8481cf23e830fee296bd1515cb::prediction_market::settle_project \
  --args u64:0 u64:0 \
  --assume-yes
```

## View Functions

### get_project_info(project_id)

查询项目信息。

**参数：**
- `project_id: u64` — 项目 ID

**返回：** `(u64, u64, bool, u64, vector<u64>)`
- 项目 ID
- 结束时间戳（Unix 秒）
- 是否已结算
- 获胜选项索引
- 各选项投注池（Octas 数组）

```bash
aptos move view \
  --function-id 0x8ebb5f208e99f14584dc352204b107f8c9570a8481cf23e830fee296bd1515cb::prediction_market::get_project_info \
  --args u64:0
```

示例返回：
```json
["0", "1798160000", false, "0", ["50000000", "30000000"]]
```

### get_user_bets(project_id, user_addr)

查询用户在某项目的下注记录。

**参数：**
- `project_id: u64` — 项目 ID
- `user_addr: address` — 用户地址

**返回：** `vector<u64>` — 该用户在该项目的所有下注金额（Octas 数组）

```bash
aptos move view \
  --function-id 0x8ebb5f208e99f14584dc352204b107f8c9570a8481cf23e830fee296bd1515cb::prediction_market::get_user_bets \
  --args u64:0 address:0x8ebb5f208e99f14584dc352204b107f8c9570a8481cf23e830fee296bd1515cb
```

## 错误码

| 码 | 常量 | 说明 |
|----|------|------|
| 1 | E_NOT_INITIALIZED | 市场未初始化 |
| 2 | E_ALREADY_INITIALIZED | 市场已初始化 |
| 3 | E_INVALID_PROJECT_ID | 无效的项目 ID |
| 4 | E_INVALID_OPTION_INDEX | 无效的选项索引 |
| 5 | E_INSUFFICIENT_AMOUNT | 投注金额不足（< 0.01 APT） |
| 6 | E_PROJECT_CLOSED | 项目已关闭（超过截止时间） |
| 7 | E_PROJECT_NOT_CLOSED | 项目尚未关闭（结算前必须过期） |
| 8 | E_ALREADY_SETTLED | 项目已结算 |
| 9 | E_NOT_ADMIN | 非管理员调用 |
