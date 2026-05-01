# CuteMarket 全面升级设计文档

日期：2026-05-02
状态：已批准
方案：方案 B — 合约重构 + 前端并行

## 目标

将 CuteMarket 从 hackathon 原型升级为产品级预测市场平台，对标 Polymarket 的核心能力。

**关键决策：**
- 交易模型：增强 AMM（常数和做市 + 动态滑点保护）
- 结算机制：Pyth 预言机自动结算（价格类市场）+ 增强型管理员结算（主观类市场）
- 存储模型：Resource account 隔离每个市场
- 范围：合约 + 前端全面升级

## 一、合约架构

### 模块拆分

```
move/sources/
├── market_core.move      # 市场管理（创建、查询、注册）
├── amm.move              # AMM 交易引擎（买卖份额、价格计算、流动性）
├── oracle.move           # 预言机抽象层（Pyth 集成、管理员结算）
├── governance.move       # 治理（多管理员、平台参数、紧急暂停）
└── events.move           # 事件定义（统一事件发射）
```

### 核心数据结构

```move
// 全局注册表（deployer 账户下）
struct MarketRegistry has key {
    markets: vector<MarketMeta>,
    market_count: u64,
    platform_fee_bps: u64,        // 手续费（基点，100 = 1%）
    admins: vector<address>,
    paused: bool,
}

// 市场元数据（注册表中）
struct MarketMeta has store, copy, drop {
    market_id: u64,
    market_address: address,       // resource account 地址
    creator: address,
    category: u8,                  // 分类（体育/加密/政治/其他）
    created_at: u64,
}

// 市场详情（每个市场独立 resource account）
struct MarketState has key {
    market_id: u64,
    name: String,
    description: String,
    options: vector<String>,
    option_pools: vector<u64>,
    total_pool: u64,
    end_timestamp: u64,
    resolution: ResolutionType,
    is_settled: bool,
    winning_option: u64,
    lp_supply: u64,
    lp_balances: Table<address, u64>,
    bets: vector<BetRecord>,
}

// 结算方式
enum ResolutionType {
    PythOracle(PythPriceId, threshold),
    AdminResolve,
}
```

### Resource Account 模式

每个市场创建时，用 `create_resource_account` 生成独立账户。市场资金存放在该账户中，而非全局 admin 账户。

好处：
- 市场间资金完全隔离
- 单个市场合约升级不影响其他市场
- 便于查询单个市场的 TVL

### 入口函数

| 函数 | 说明 |
|------|------|
| `create_market` | 创建市场（名称、描述、选项、结束时间、结算方式、初始流动性） |
| `buy_shares` | 购买份额（下注） |
| `sell_shares` | 出售份额（平仓） |
| `add_liquidity` | 添加流动性 |
| `settle_market` | 结算市场（预言机触发或管理员） |
| `claim_winnings` | 领取奖金 |

### 事件定义

| 事件 | 字段 |
|------|------|
| `MarketCreatedEvent` | market_id, creator, name, options, end_timestamp |
| `SharesPurchasedEvent` | market_id, user, option_index, amount, shares_received, new_price, timestamp |
| `SharesSoldEvent` | market_id, user, option_index, shares, amount_received, new_price, timestamp |
| `MarketSettledEvent` | market_id, winning_option, total_pool, timestamp |

## 二、AMM 引擎

### 定价模型

常数和做市（Constant Sum）：

```
价格(选项i) = 选项i池 / 总池
份额 = 投入金额 / 当前价格
```

### 动态滑点保护

| 单量占比 | 滑点 |
|----------|------|
| < 总池 1% | 无额外滑点 |
| 1%-5% | 线性增加 |
| > 5% | 高滑点保护，防止价格操纵 |

### 买入流程

1. 计算当前价格 = option_pool / total_pool
2. 验证用户投入金额
3. 计算份额 = amount / price
4. 更新 option_pool += amount
5. 更新 total_pool += amount
6. 记录用户份额
7. 发射事件

### 卖出流程

1. 验证用户持有足够份额
2. 计算当前价格 = option_pool / total_pool
3. 计算可得金额 = shares * price
4. 扣除手续费
5. 更新 option_pool -= amount
6. 更新 total_pool -= amount
7. 转账给用户
8. 发射事件

### 流动性机制

- 用户可向市场提供流动性，获得 LP 份额
- LP 收益：交易手续费分成 + 市场结算后剩余资金按比例分配
- 初期不做 LP 代币转账，只记录持仓
- 市场创建者自动成为首个 LP

## 三、预言机集成

### Pyth Network（价格类市场）

```move
public entry fun settle_with_pyth(
    market_id: u64,
    pyth_price_id: PriceId,
    threshold: u64,
    above_wins: bool,
)
```

流程：从 Pyth 获取最新价格 → 验证市场已到期 → 根据价格和阈值确定获胜选项 → 执行结算。

### 管理员结算（主观类市场）

适用于无法用预言机判断的市场（如政治事件）。

流程：管理员提出结算结果 → 进入 24 小时争议期 → 争议期内其他管理员可以否决 → 争议期结束自动执行结算。

初期不做代币投票，仅多管理员否决机制。

## 四、前端架构

### 页面路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | Home | 市场列表 + 搜索筛选 |
| `/market/:id` | MarketDetail | 交易 + 图表 + 历史 |
| `/create` | CreateMarket | 创建市场表单 |
| `/portfolio` | Portfolio | 仓位管理 + P&L |
| `/history` | History | 全局交易历史 |

### 组件结构

```
src/
├── components/
│   ├── Header.tsx              # 导航栏（增加搜索框 + 菜单）
│   ├── WalletButton.tsx        # 保留
│   ├── MarketCard.tsx          # 市场卡片
│   ├── PriceChart.tsx          # 价格走势图
│   ├── OrderPanel.tsx          # 交易面板（买入/卖出）
│   ├── TradeHistory.tsx        # 交易记录列表
│   ├── PositionCard.tsx        # 仓位卡片
│   ├── SearchBar.tsx           # 搜索 + 分类筛选
│   ├── MarketStatus.tsx        # 市场状态徽章
│   └── ClaimButton.tsx         # 领取奖金按钮
├── pages/
│   ├── Home.tsx                # 重构
│   ├── MarketDetail.tsx        # 重构
│   ├── CreateMarket.tsx        # 新增
│   ├── Portfolio.tsx           # 新增
│   └── History.tsx             # 新增
├── hooks/
│   ├── useMarketData.ts        # 重构
│   ├── useMarkets.ts           # 新增
│   ├── useTradeHistory.ts      # 新增
│   ├── usePriceHistory.ts      # 新增
│   ├── useUserPositions.ts     # 新增
│   └── useClaimWinnings.ts     # 新增
├── services/
│   ├── indexer.ts              # 事件索引服务
│   └── pyth.ts                 # Pyth 价格查询
└── utils/
    ├── oddsCalculator.ts       # 保留 + 适配
    └── formatters.ts           # 通用格式化
```

### 事件索引服务

```typescript
class MarketIndexer {
  async getMarkets(): Promise<MarketMeta[]>
  async getTradeEvents(marketId: number): Promise<TradeEvent[]>
  async getUserTradeEvents(address: string): Promise<TradeEvent[]>
  async getSettlementEvents(): Promise<SettlementEvent[]>
}
```

轮询策略：
- 市场列表页：30s 刷新
- 市场详情页（交易中）：5s 刷新
- 价格图表：首次加载全量事件，之后增量更新

### 价格图表

- 使用 lightweight-charts（TradingView 开源库）或 recharts
- 基于交易事件数据绘制
- X 轴：时间，Y 轴：价格（0-1）
- 多选项时显示多条线

### 仓位管理 + P&L

```typescript
interface Position {
  marketId: number;
  marketName: string;
  optionIndex: number;
  optionName: string;
  shares: number;
  avgBuyPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedROI: number;
}
```

计算公式：
- 未实现盈亏 = (当前价格 - 平均买入价) * 份额
- ROI = 盈亏 / 总投入 * 100

## 五、市场创建

### 表单字段

| 字段 | 必填 | 说明 |
|------|------|------|
| 市场名称 | 是 | 限 100 字符 |
| 描述 | 是 | 限 500 字符 |
| 选项列表 | 是 | 2-10 个，每个限 50 字符 |
| 结束时间 | 是 | 需大于当前时间至少 1 小时 |
| 分类 | 是 | 体育/加密货币/政治/娱乐/科技/其他 |
| 结算方式 | 是 | Pyth 预言机 或 管理员结算 |
| 初始流动性 | 是 | 最低 1 APT |

### Pyth 价格源配置（仅价格类市场）

- 预设常用价格源：BTC/USD、ETH/USD、APT/USD
- 用户输入阈值（如 "100000"）
- 选择方向：高于阈值胜 / 低于阈值胜

## 六、搜索与筛选

### 首页布局

```
┌─────────────────────────────────────────┐
│  搜索框 + 分类标签栏                      │
├─────────────────────────────────────────┤
│  排序：热门 / 最新 / 即将到期 / 最高TVL   │
├─────────────────────────────────────────┤
│  市场卡片网格（响应式 1/2/3 列）           │
├─────────────────────────────────────────┤
│  加载更多 / 分页                          │
└─────────────────────────────────────────┘
```

### 市场卡片内容

- 市场名称 + 分类标签
- 当前价格（各选项）
- 总 TVL
- 结束时间倒计时
- 状态徽章（开放 / 即将到期 / 已结算）

### 筛选逻辑（前端过滤）

- 分类：`category === selected`
- 搜索：`name.includes(keyword) || description.includes(keyword)`
- 排序：热门（TVL 降序）、最新（created_at 降序）、即将到期（end_timestamp 升序）、最高 TVL（total_pool 降序）

## 七、数据流

```
用户操作 → React 组件 → Custom Hooks
    ├── aptos.view() → 读取链上状态
    └── MarketIndexer → aptos.getEvents() → 事件列表 → 本地聚合
    → 组件渲染

用户发起交易 → signAndSubmitTransaction → 等待确认 → 刷新数据
```

### 缓存策略

| 数据类型 | 策略 |
|----------|------|
| 市场元数据（名称、选项、结束时间） | 缓存，市场结算前不变 |
| 市场状态（池子大小、价格） | 5s 轮询更新 |
| 事件数据 | 首次全量加载，之后增量拉取 |
| 用户仓位 | 交易后刷新，10s 轮询兜底 |

## 八、错误处理

### 合约层

新增错误码：
- `E_MARKET_NOT_FOUND` - 市场不存在
- `E_MARKET_EXPIRED` - 市场已过期
- `E_INVALID_SHARES` - 份额不足
- `E_ORACLE_NOT_CONFIGURED` - 预言机未配置
- `E_DISPUTE_PERIOD` - 争议期内
- `E_PAUSED` - 平台暂停

### 前端层

- 交易失败：解析合约错误码，展示用户友好提示
- 网络异常：指数退避重试，最多 3 次
- 数据加载：骨架屏 + 错误状态 + 重试按钮
- 钱包断连：自动检测，提示重连

## 九、测试策略

### 合约测试（Move 单元测试）

```
├── market_core_test.move
│   ├── test_create_market
│   ├── test_create_market_invalid_params
│   └── test_market_registry
├── amm_test.move
│   ├── test_buy_shares_basic
│   ├── test_buy_shares_slippage
│   ├── test_sell_shares
│   ├── test_sell_shares_insufficient
│   ├── test_price_calculation
│   └── test_multiple_options
├── oracle_test.move
│   ├── test_settle_with_pyth (mock)
│   ├── test_admin_settle
│   ├── test_dispute_period
│   └── test_settle_already_settled
└── integration_test.move
    ├── test_full_lifecycle
    └── test_fee_distribution
```

### 前端验证

- `npm run build`（tsc 类型检查）作为基本门禁
- 手动测试核心流程：连接钱包 → 浏览市场 → 下注 → 查看仓位 → 领奖

## 十、实施分期

### Phase 1：合约重构

- 拆分模块：market_core / amm / oracle / governance / events
- Resource account 存储模型
- 动态市场创建
- 买入/卖出份额
- 事件发射
- 单元测试

验证：所有测试通过，合约部署到测试网。

### Phase 2：前端基础设施

- 事件索引服务（MarketIndexer）
- 数据 hooks 重构（适配新合约接口）
- 路由重构（新增 /create, /portfolio, /history）

验证：首页能展示动态市场列表，市场详情能展示链上数据。

### Phase 3：前端核心功能

- 交易面板（买入/卖出）
- 价格图表
- 交易历史
- 搜索筛选

验证：完整交易流程可用，图表正确显示价格变化。

### Phase 4：高级功能

- 市场创建 UI
- 仓位管理 + P&L
- Pyth 预言机结算集成
- 领取奖金

验证：用户可以创建市场、查看持仓盈亏、Pyth 结算自动触发。

### Phase 5：打磨

- 响应式优化
- 错误处理完善
- Loading 状态 / 骨架屏
- 性能优化（缓存、分页）

验证：移动端可用，核心流程无明显体验问题。
