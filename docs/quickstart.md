# 快速开始

## 前置条件

- Node.js 18+
- Aptos CLI（仅部署合约时需要）

## 本地运行

```bash
git clone <repo-url>
cd aptos_cutemarket
npm install
npm run dev
```

打开 http://localhost:5173

## 项目结构

```
src/
├── main.tsx                    # 入口
├── App.tsx                     # 路由 + ErrorBoundary + 钱包 Provider
├── components/
│   ├── Header.tsx              # 顶部导航栏（市场/持仓/创建市场）
│   ├── WalletButton.tsx        # 钱包连接按钮
│   ├── MarketCard.tsx          # 首页市场卡片
│   ├── OrderPanel.tsx          # 交易面板（买入/卖出）
│   ├── PriceChart.tsx          # 价格走势图（recharts）
│   ├── TradeHistory.tsx        # 交易历史列表
│   ├── ClaimButton.tsx         # 领取奖金按钮
│   ├── Skeleton.tsx            # 加载骨架屏组件
│   └── ErrorBoundary.tsx       # 错误边界
├── pages/
│   ├── Home.tsx                # 首页（市场列表 + 搜索/筛选 + 投资组合）
│   ├── ProjectDetail.tsx       # 市场详情（交易面板 + 价格图 + 历史）
│   ├── Portfolio.tsx           # 用户持仓（P&L + 领奖）
│   └── CreateMarket.tsx        # 创建市场表单
├── hooks/
│   ├── useMarkets.ts           # 从链上事件获取所有市场列表
│   ├── useProjectData.ts       # 从链上读取单个市场数据
│   └── useUserPositions.ts     # 用户持仓 + P&L 计算
├── services/
│   └── indexer.ts              # 链上事件索引（getAccountTransactions）
├── utils/
│   └── oddsCalculator.ts       # 赔率与概率计算（AMM 定价）
├── config/
│   └── aptos.ts                # Aptos SDK 配置、合约地址、单位转换
├── context/
│   └── WalletProvider.tsx      # 钱包适配器配置
└── types/
    └── index.ts                # TypeScript 类型定义

move/
├── Move.toml                   # 合约依赖配置
└── sources/
    ├── governance.move          # 管理员注册表、权限
    ├── market_core.move         # 市场状态、创建、view
    ├── amm.move                 # AMM 交易逻辑
    ├── oracle.move              # 结算、领奖
    └── events.move              # 事件定义

scripts/
├── seed-markets.ts             # 创建测试市场的脚本
├── faucet.ts                   # 测试币领取辅助
└── test-events.ts              # 事件 API 调试脚本
```

## 关键文件说明

| 文件 | 作用 |
|------|------|
| `src/config/aptos.ts` | 合约地址、网络配置、APT/Octas 转换函数 |
| `src/services/indexer.ts` | 通过 getAccountTransactions 获取链上事件 |
| `src/hooks/useMarkets.ts` | 市场列表 hook，每 30 秒轮询 |
| `src/hooks/useProjectData.ts` | 市场详情 hook，每 10 秒轮询 |
| `src/utils/oddsCalculator.ts` | AMM 定价计算，纯函数 |
| `move/sources/*.move` | 5 个合约模块源码 |

## 创建测试数据

```bash
# 生成新账户
npx tsx scripts/seed-markets.ts --generate

# 去水龙头领 APT：https://aptos.dev/network/faucet

# 创建 6 个测试市场
npx tsx scripts/seed-markets.ts <private-key>
```

## 生产构建

```bash
npm run build      # tsc 类型检查 + vite 构建，输出到 dist/
npm run preview    # 本地预览生产构建
```

`npm run build` 会先运行 `tsc`，类型错误会阻止构建。
