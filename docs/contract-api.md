# 合约 API 参考

## 模块信息

- **合约地址:** `0xf28e42120ec3007579f530ac426b2d553f501681431a433f3584bf6d37c94f16`
- **网络:** Aptos Testnet
- **Explorer:** [查看合约](https://explorer.aptoslabs.com/account/0xf28e42120ec3007579f530ac426b2d553f501681431a433f3584bf6d37c94f16/transactions?network=testnet)

## 模块列表

| 模块 | 用途 |
|------|------|
| `governance` | MarketRegistry、管理员管理、费率配置、暂停 |
| `market_core` | 市场状态、创建市场、view 函数 |
| `amm` | 买卖份额、流动性管理、定价 |
| `oracle` | 结算（管理员/Pyth）、领取奖金 |
| `events` | 事件结构体和发射辅助函数 |

---

## governance

### initialize()

初始化 MarketRegistry。部署后首先调用。

```bash
aptos move run \
  --function-id 0xf28e...::governance::initialize \
  --profile testnet --assume-yes
```

### add_admin(new_admin)

添加管理员。

### remove_admin(remove_addr)

移除管理员。

### set_fee(new_fee_bps)

设置平台手续费（BPS，100 = 1%）。

### toggle_pause()

暂停/恢复市场。

---

## market_core

### initialize_market_list()

初始化 MarketList resource。创建市场前必须先调用。

```bash
aptos move run \
  --function-id 0xf28e...::market_core::initialize_market_list \
  --profile testnet --assume-yes
```

### create_market(...)

创建新市场。参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| name | String | 市场名称（1-100 字符） |
| description | String | 描述（1-500 字符） |
| options | vector<String> | 选项列表（2-10 个） |
| end_timestamp | u64 | 结束时间（Unix 秒，至少 1 小时后） |
| category | u8 | 分类（0=体育, 1=加密, 2=政治, 3=娱乐, 4=科技, 5=其他） |
| resolution_type | u8 | 结算方式（0=管理员, 1=Pyth 预言机） |
| pyth_price_id | vector<u8> | Pyth 价格 ID（管理员结算时为空） |
| pyth_threshold | u64 | Pyth 阈值 |
| pyth_above_wins | bool | 高于阈值是否获胜 |
| initial_liquidity | u64 | 初始流动性（Octas，最少 1 APT），进入 `lp_reserve` 并给创建者 LP 份额 |

### get_market_meta(market_id)

查询市场元数据。返回：market_id, market_address, creator, category, created_at。

### get_market_state(market_address)

查询市场完整状态。返回 10 个值：
1. market_id
2. name
3. description
4. options (vector<String>)
5. option_pools (vector<u64>) — 各选项下注池（Octas）
6. betting_pool_total (u64) — 下注池总和（Octas）
7. lp_reserve (u64) — LP 准备金（Octas）
8. end_timestamp (u64)
9. is_settled (bool)
10. winning_option (u64)

### get_lp_info(market_address, provider)

查询 LP 准备金、总 LP 份额、指定地址的 LP 余额（均为 Octas / 份额单位）。

```bash
aptos move view \
  --function-id 0xf28e...::market_core::get_lp_info \
  --args address:<market_addr> address:<provider_addr>
```

```bash
aptos move view \
  --function-id 0xf28e...::market_core::get_market_state \
  --args address:0x1d93f3ac36662ed14883ceadca4a5b9af30957fa5c93c1c656469c63de399148
```

---

## amm

### buy_shares(market_id, option_index, amount)

购买份额。amount 为支付的 APT 数量（Octas）。

### sell_shares(market_id, option_index, shares)

出售份额。shares 为要卖出的份额数量。

### add_liquidity(market_id, amount)

向市场 `lp_reserve` 添加流动性并铸造 LP 份额。**不会**改变 `option_pools`，因此不扭曲赔率。最少 1 APT。

### remove_liquidity(market_id, lp_shares)

按 LP 份额从 `lp_reserve` 赎回 APT。`lp_shares` 为要销毁的份额数量（非 APT 金额）。

### get_option_price(market_address, option_index)

查询选项当前价格（BPS，10000 = 100%）。**仅基于下注池** `sum(option_pools)`，不含 `lp_reserve`。

---

## oracle

### propose_admin_settlement(market_id, winning_option)

管理员提议结算（需在 dispute period 后执行）。

### execute_admin_settlement(market_id)

执行已提议的结算。

### settle_with_pyth(market_id, pyth_price)

使用 Pyth 价格结算。

### claim_winnings(market_id)

用户领取获胜奖金。

```bash
aptos move run \
  --function-id 0xf28e...::oracle::claim_winnings \
  --args u64:0 \
  --profile testnet --assume-yes
```

---

## events

6 种事件类型：

| 事件 | 字段 |
|------|------|
| `MarketCreatedEvent` | market_id, market_address, creator, name, options, end_timestamp, category |
| `SharesPurchasedEvent` | market_id, user, option_index, amount, shares_received, new_price_bps, timestamp |
| `SharesSoldEvent` | market_id, user, option_index, shares, amount_received, new_price_bps, timestamp |
| `MarketSettledEvent` | market_id, winning_option, betting_pool_total, timestamp |
| `LiquidityAddedEvent` | market_id, provider, amount, lp_shares, timestamp |
| `LiquidityRemovedEvent` | market_id, provider, amount, lp_shares, timestamp |
| `WinningsClaimedEvent` | market_id, user, amount, timestamp |

## 常量

| 常量 | 值 | 说明 |
|------|-----|------|
| `MIN_BET_AMOUNT` | 1,0000,000 Octas | 最小交易金额（0.01 APT） |
| `MIN_LIQUIDITY` | 100,000,000 Octas | 最小初始流动性（1 APT） |
| `MAX_OPTIONS` | 10 | 最大选项数 |
| `MIN_OPTIONS` | 2 | 最小选项数 |
