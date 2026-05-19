# 架构说明

## 系统概览

CuteMarket 是一个纯前端 DApp，没有后端服务器或数据库。所有数据存储在 Aptos 区块链上。

```
用户浏览器
  ├─ React SPA（Vite 构建）
  ├─ Wallet Adapter（Petra 等钱包）
  └─ Aptos TS SDK
       │
       ▼
  Aptos Testnet
  └─ 模块化合约（5 个模块）
       ├─ governance（管理员注册表、权限、费率）
       ├─ market_core（市场状态、创建市场）
       ├─ amm（买卖份额、流动性、定价）
       ├─ oracle（结算、Pyth 预言机、领奖）
       └─ events（事件定义和发射）
```

## 前端架构

### 入口与路由

```
main.tsx → App.tsx → ErrorBoundary → WalletProvider → Router
                                                        ├─ / → Home
                                                        ├─ /project/:id → ProjectDetail
                                                        ├─ /portfolio → Portfolio
                                                        └─ /create → CreateMarket
```

- `WalletProvider` 使用 `@aptos-labs/wallet-adapter-react`，配置 Petra 钱包和 Testnet 网络
- `ErrorBoundary` 捕获渲染错误，显示友好错误页
- 四条路由，无嵌套路由

### 数据获取

三个自定义 hook 负责所有链上数据读取：

| Hook | 用途 | 数据源 |
|------|------|--------|
| `useMarkets()` | 所有市场列表 + 状态 | `getAccountTransactions` 扫描事件 + `get_market_state` view |
| `useProjectData(marketId, marketAddress)` | 单个市场详情 | `get_market_state` view 函数 |
| `useLiquidityInfo(marketAddress, userAddress)` | LP 准备金与用户 LP 份额 | `get_lp_info` view 函数 |
| `useUserPositions(address)` | 用户所有市场的持仓和 P&L | 多次调用 view + `get_option_price` |

事件数据通过 `getAccountTransactions` 获取（Aptos indexer 的 `events` 表已废弃）。

所有 hook 使用 `setInterval` 轮询链上数据（市场列表 30 秒，详情 10 秒）。交易成功后手动触发刷新。

### 数据流

```
页面加载
  → useMarkets 调用 getAccountTransactions 获取 MarketCreatedEvent
  → 对每个市场调用 get_market_state view
  → 返回 Octas 值
  → octasToApt() 转换
  → React state 更新
  → UI 渲染

用户交易
  → OrderPanel 验证输入
  → signAndSubmitTransaction() 调用 amm::buy_shares / sell_shares / add_liquidity / remove_liquidity
  → 等待交易确认
  → 触发 refetch + fetchTradeEvents
  → UI 更新
```

### 单位转换

所有链上交互使用 Octas（1 APT = 100,000,000 Octas）。转换发生在 hook 边界：

```typescript
// src/config/aptos.ts
export function octasToApt(octas: number): number {
  return octas / 100000000;
}

export function aptToOctas(apt: number): number {
  return Math.floor(apt * 100000000);
}
```

UI 层只处理 APT，合约层只处理 Octas。

## 智能合约架构

### 模块结构

```
move/sources/
├── governance.move     — MarketRegistry、admin 管理、费率、暂停
├── market_core.move    — MarketState、create_market、view 函数
├── amm.move            — buy_shares、sell_shares、add/remove_liquidity、定价
├── oracle.move         — 结算（admin/Pyth）、claim_winnings
└── events.move         — 6 个事件结构体和发射辅助函数
```

### 关键数据结构

**MarketState**（每个市场一个 resource，存在资源账户上）：
- market_id, name, description, options
- option_pools（各选项下注池）, lp_reserve（LP 准备金，不参与赔率）
- end_timestamp, resolution_type, is_settled, winning_option
- lp_supply, lp_balances, user_bets

**MarketMeta**（存在 MarketList 中）：
- market_id, market_address, creator, category, created_at

**MarketList**（全局 resource，存在部署者账户上）：
- markets: vector<MarketMeta>

### AMM 定价模型

使用 Constant Sum AMM（赔率仅看下注池）：
- price = option_pool / sum(option_pools)（BPS，10000 = 100%）
- `lp_reserve` 与 `add_liquidity` 不改变各选项隐含价格
- 滑点深度 = 下注池 + lp_reserve
- `sell_shares` 手续费计入 `lp_reserve`，由 LP 分享

### 事件系统

7 种链上事件：
- `MarketCreatedEvent` — 市场创建
- `SharesPurchasedEvent` — 买入份额
- `SharesSoldEvent` — 卖出份额
- `MarketSettledEvent` — 市场结算
- `LiquidityAddedEvent` — 添加流动性
- `LiquidityRemovedEvent` — 移除流动性
- `WinningsClaimedEvent` — 领取奖金

## 设计决策

**无后端** — 所有数据在链上，减少运维复杂度，增加去中心化程度。

**模块化合约** — 5 个独立模块（governance, market_core, amm, oracle, events）取代旧的单文件合约。每个市场有独立的资源账户，实现资金隔离。

**事件驱动 + 轮询** — 通过链上事件获取市场列表，通过 view 函数获取详细状态。轮询间隔 10-30 秒。

**动态市场创建** — 任何连接钱包的用户都可以创建市场（需要初始流动性）。不再硬编码市场。
