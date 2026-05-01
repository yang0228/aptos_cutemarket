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
  └─ prediction_market 合约
       ├─ MarketState（全局状态）
       └─ 5 个内置 Project
```

## 前端架构

### 入口与路由

```
main.tsx → App.tsx → WalletProvider → Router
                                        ├─ / → Home
                                        └─ /project/:id → ProjectDetail
```

- `WalletProvider` 使用 `@aptos-labs/wallet-adapter-react`，配置 Petra 钱包和 Testnet 网络
- 两条路由，无嵌套路由

### 数据获取

三个自 hook 负责所有链上数据读取：

| Hook | 用途 | 数据源 |
|------|------|--------|
| `useProjectData(projectId)` | 单个项目的状态和投注池 | `get_project_info` view 函数 |
| `useUserBets(address, projectId)` | 用户在某项目的下注记录 | `get_user_bets` view 函数 |
| `useAllUserBets(address)` | 聚合用户在所有项目的下注 | 多次调用 `get_user_bets` |

所有 hook 使用 `setInterval` 每 10 秒轮询链上数据。下注成功后手动触发刷新。

### 数据流

```
页面加载
  → useProjectData 调用 aptos.view()
  → 返回 Octas 值
  → octasToApt() 转换
  → React state 更新
  → UI 渲染

用户下注
  → 前端验证输入
  → signAndSubmitTransaction() 调用合约
  → 等待交易确认
  → 手动刷新所有 hook
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
cutemarket::prediction_market
├── MarketState（全局状态 resource）
│   ├── admin: address
│   ├── projects: vector<Project>
│   └── platform_fee_rate: u64（2%）
│
├── Entry Functions（需要签名）
│   ├── initialize()        — 一次性初始化，创建 5 个项目
│   ├── place_bet()         — 用户下注
│   └── settle_project()    — 管理员结算
│
└── View Functions（只读）
    ├── get_project_info()  — 查询项目状态和投注池
    └── get_user_bets()     — 查询用户下注记录
```

### 内置项目

合约 `initialize()` 创建 5 个项目，前端 `src/data/projects.ts` 必须保持同步（相同的 ID 和选项数量）：

| ID | 选项数 | 结束时间 |
|----|--------|----------|
| 0 | 2 | 2026-12-25 |
| 1 | 2 | 2026-11-15 |
| 2 | 2 | 2026-12-31 |
| 3 | 3 | 2026-10-10 |
| 4 | 4 | 2026-07-19 |

## 赔率计算

赔率计算是纯前端逻辑（`src/utils/oddsCalculator.ts`），不涉及链上调用。

### 公式

```
奖池 = 总投注额 × (1 - 手续费率)
赔率 = 奖池 / 该选项投注额
隐含概率 = 该选项投注额 / 总投注额 × 100%
```

### 预期收益

```
新选项池 = 当前选项池 + 用户投注
新总池 = 当前总池 + 用户投注
新奖池 = 新总池 × (1 - 手续费率)
预期收益 = (用户投注 / 新选项池) × 新奖池
```

### 示例

假设某项目有两个选项，总投注 150 APT：
- 选项 A：100 APT（赔率 x1.47，概率 66.7%）
- 选项 B：50 APT（赔率 x2.94，概率 33.3%）

用户在选项 B 投注 10 APT：
- 新选项 B 池 = 60 APT
- 新总池 = 160 APT
- 预期收益 = (10 / 60) × 156.8 = 26.13 APT
- 盈利率 = +161%

## 设计决策

**无后端** — 所有数据在链上，减少运维复杂度，增加去中心化程度。代价是轮询效率低于事件推送。

**轮询 vs 事件** — 使用 10 秒轮询而非链上事件监听。实现简单，但有延迟。适合 hackathon MVP。

**硬编码 5 个项目** — 合约和前端都硬编码了相同的 5 个项目。不支持动态创建项目，简化了合约逻辑。
