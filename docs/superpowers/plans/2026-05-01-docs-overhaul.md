# Documentation Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 10 redundant/outdated root-level markdown files with 6 clean, organized documents (1 root + 5 in docs/).

**Architecture:** Flat docs/ directory with audience-targeted files. README.md (English) links to docs/ for both end users and developers. All docs/ files in Chinese. Old files deleted after new ones are verified.

**Tech Stack:** Markdown only — no code changes, no build impact.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Rewrite | `README.md` | English landing page (~80 lines) |
| Create | `docs/user-guide.md` | End-user betting guide (Chinese) |
| Create | `docs/quickstart.md` | Developer onboarding (Chinese) |
| Create | `docs/architecture.md` | System design & data flow (Chinese) |
| Create | `docs/contract-api.md` | Move contract reference (Chinese) |
| Create | `docs/deployment.md` | Deploy contract + frontend (Chinese) |
| Delete | `DEPLOY.md` | Replaced by docs/deployment.md |
| Delete | `DEPLOYMENT_SUMMARY.md` | One-time artifact |
| Delete | `FEATURES.md` | Merged into architecture + user-guide |
| Delete | `QUICKSTART.md` | Replaced by docs/quickstart.md |
| Delete | `SETUP.md` | Replaced by docs/quickstart.md |
| Delete | `USER_GUIDE.md` | Replaced by docs/user-guide.md |
| Delete | `WALLET_SETUP.md` | Merged into docs/user-guide.md |
| Delete | `VERCEL_DEPLOY.md` | Merged into docs/deployment.md |

---

### Task 1: Create docs/ directory

- [ ] **Step 1: Create the docs directory**

```bash
mkdir -p /Users/jason/repo/aptos_cutemarket/docs
```

- [ ] **Step 2: Verify it exists**

```bash
ls -la /Users/jason/repo/aptos_cutemarket/docs/
```

Expected: empty directory listing.

---

### Task 2: Write docs/quickstart.md

**File:** Create `docs/quickstart.md`

- [ ] **Step 1: Write the file**

```bash
cat > /Users/jason/repo/aptos_cutemarket/docs/quickstart.md << 'DOCEOF'
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
├── App.tsx                     # 路由 + 钱包 Provider
├── components/
│   ├── Header.tsx              # 顶部导航栏
│   ├── ProjectCard.tsx         # 首页项目卡片
│   └── WalletButton.tsx        # 钱包连接按钮
├── pages/
│   ├── Home.tsx                # 首页（项目列表 + 投资组合）
│   └── ProjectDetail.tsx       # 项目详情（下注页面）
├── hooks/
│   ├── useProjectData.ts       # 从链上读取单个项目数据
│   ├── useUserBets.ts          # 读取用户在某项目的下注
│   └── useAllUserBets.ts       # 聚合用户所有项目的下注
├── utils/
│   ├── oddsCalculator.ts       # 赔率与预期收益计算
│   └── dateUtils.ts            # 日期格式化
├── config/
│   └── aptos.ts                # Aptos SDK 配置、合约地址、单位转换
├── context/
│   └── WalletProvider.tsx      # 钱包适配器配置
├── data/
│   └── projects.ts             # 5 个内置项目定义（需与合约同步）
└── types/
    └── index.ts                # TypeScript 类型定义

move/
├── Move.toml                   # 合约依赖配置
└── sources/
    └── cutemarket.move         # 预测市场智能合约
```

## 关键文件说明

| 文件 | 作用 |
|------|------|
| `src/config/aptos.ts` | 合约地址、网络配置、APT/Octas 转换函数 |
| `src/data/projects.ts` | 前端项目定义，必须与合约 `initialize()` 保持同步 |
| `src/hooks/useProjectData.ts` | 核心数据 hook，每 10 秒从链上轮询 |
| `src/utils/oddsCalculator.ts` | 纯函数，无链上调用 |
| `move/sources/cutemarket.move` | 合约源码，所有链上逻辑 |

## 合约部署（可选）

如果需要重新部署合约，参见 [deployment.md](deployment.md)。

## 生产构建

```bash
npm run build      # tsc 类型检查 + vite 构建，输出到 dist/
npm run preview    # 本地预览生产构建
```

`npm run build` 会先运行 `tsc`，类型错误会阻止构建。
DOCEOF
```

- [ ] **Step 2: Verify file was created**

```bash
wc -l /Users/jason/repo/aptos_cutemarket/docs/quickstart.md
```

Expected: ~80 lines.

- [ ] **Step 3: Commit**

```bash
git add docs/quickstart.md
git commit -m "docs: add quickstart guide"
```

---

### Task 3: Write docs/user-guide.md

**File:** Create `docs/user-guide.md`

- [ ] **Step 1: Write the file**

```bash
cat > /Users/jason/repo/aptos_cutemarket/docs/user-guide.md << 'DOCEOF'
# 用户指南

## 什么是 CuteMarket

CuteMarket 是一个去中心化预测市场，部署在 Aptos 区块链上。你可以对现实世界的事件下注，所有资金和赔率都由智能合约管理，没有后端服务器。

## 准备工作

### 安装钱包

推荐使用 [Petra Wallet](https://petra.app/)（Aptos 官方钱包）：

1. 访问 https://petra.app/ 下载浏览器扩展
2. 创建新钱包，安全保存助记词
3. 在设置中切换到 **Testnet**（测试网）

### 获取测试币

1. 在 Petra Wallet 中点击 "Faucet" 按钮，每次可获得 1 APT
2. 或访问 https://aptos.dev/tools/faucet/ 输入你的地址领取

## 连接钱包

1. 打开 CuteMarket 网站
2. 点击右上角 **Connect Wallet** 按钮
3. 选择 Petra Wallet
4. 在钱包弹窗中点击 "Connect" 授权连接
5. 连接成功后，右上角显示你的钱包地址

## 浏览预测市场

首页显示所有可参与的预测项目：

- **项目名称** — 预测的主题
- **投注选项** — 可以选择的结果
- **总投注额** — 当前池子大小（实时更新）
- **截止日期** — 该预测的结束时间
- **状态** — 开放中（绿色）/ 已关闭（黄色）/ 已开奖（蓝色）

点击任意项目卡片进入详情页。

## 下注

### 操作步骤

1. 在详情页点击你要投注的选项（选中后有紫色边框）
2. 输入投注金额（最少 0.01 APT）
3. 查看预期收益和盈利率
4. 点击 "下注" 按钮
5. 在 Petra Wallet 弹窗中确认交易
6. 等待 3-5 秒交易上链
7. 显示下注成功，页面自动刷新

### 注意事项

- 最小投注金额：0.01 APT
- 每笔交易需要支付少量 Gas 费（约 0.001 APT）
- 下注后**无法撤回**（链上交易不可逆）
- 赔率会随着其他人下注而实时变化
- 数据每 10 秒自动从链上刷新

## 理解赔率

赔率反映了市场对某个结果的共识：

- **低赔率**（如 x1.2）= 多数人看好，收益低但更稳妥
- **高赔率**（如 x5.0）= 少数人看好，收益高但风险大

赔率随投注池实时变化。如果更多人投了某个选项，该选项的赔率会下降。

平台收取 2% 手续费，已包含在赔率计算中。

## 查看结果

项目到期后，管理员会结算并公布获胜选项：

- 首页和详情页显示获胜选项（带标记）
- 赢家的奖金**自动转入钱包**，无需手动领取
- 奖金按投注比例分配：你的投注 / 获胜池总额 * 总奖池

## 常见问题

**Q: 最小下注多少？**
A: 0.01 APT（1,000,000 Octas）。

**Q: Gas 费是多少？**
A: 通常不到 0.001 APT。测试网免费。

**Q: 可以取消下注吗？**
A: 不可以。链上交易确认后无法撤回。

**Q: 赔率为什么会变？**
A: 赔率根据投注池实时计算。其他人下注会改变池子大小，从而改变赔率。

**Q: 中奖后怎么领奖？**
A: 自动发放到你的钱包，无需任何操作。

**Q: 数据多久更新一次？**
A: 每 10 秒自动刷新。下注成功后也会立即刷新。

## 故障排除

**钱包连接失败**
- 确认 Petra Wallet 扩展已安装
- 确认钱包网络设置为 Testnet
- 刷新页面重试

**交易失败**
- 检查钱包余额是否足够（投注金额 + Gas）
- 确认项目状态为 "开放中"
- 检查浏览器控制台的错误信息

**页面显示异常**
- 清除浏览器缓存
- 确认使用现代浏览器（Chrome / Firefox / Edge）
DOCEOF
```

- [ ] **Step 2: Verify file was created**

```bash
wc -l /Users/jason/repo/aptos_cutemarket/docs/user-guide.md
```

Expected: ~100 lines.

- [ ] **Step 3: Commit**

```bash
git add docs/user-guide.md
git commit -m "docs: add user guide"
```

---

### Task 4: Write docs/contract-api.md

**File:** Create `docs/contract-api.md`

- [ ] **Step 1: Write the file**

```bash
cat > /Users/jason/repo/aptos_cutemarket/docs/contract-api.md << 'DOCEOF'
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
DOCEOF
```

- [ ] **Step 2: Verify file was created**

```bash
wc -l /Users/jason/repo/aptos_cutemarket/docs/contract-api.md
```

Expected: ~150 lines.

- [ ] **Step 3: Commit**

```bash
git add docs/contract-api.md
git commit -m "docs: add contract API reference"
```

---

### Task 5: Write docs/architecture.md

**File:** Create `docs/architecture.md`

- [ ] **Step 1: Write the file**

```bash
cat > /Users/jason/repo/aptos_cutemarket/docs/architecture.md << 'DOCEOF'
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
DOCEOF
```

- [ ] **Step 2: Verify file was created**

```bash
wc -l /Users/jason/repo/aptos_cutemarket/docs/architecture.md
```

Expected: ~120 lines.

- [ ] **Step 3: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: add architecture guide"
```

---

### Task 6: Write docs/deployment.md

**File:** Create `docs/deployment.md`

- [ ] **Step 1: Write the file**

```bash
cat > /Users/jason/repo/aptos_cutemarket/docs/deployment.md << 'DOCEOF'
# 部署指南

## 合约部署（Testnet）

### 安装 Aptos CLI

```bash
curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3
aptos --version
```

### 初始化钱包

```bash
aptos init --network testnet
```

记录输出的地址：`0xYOUR_ADDRESS`

### 获取测试币

```bash
aptos account fund-with-faucet --account default
```

### 编译合约

```bash
cd move
aptos move compile --named-addresses cutemarket=default
```

### 部署合约

```bash
aptos move publish --named-addresses cutemarket=default --assume-yes
```

### 初始化市场

```bash
aptos move run \
  --function-id YOUR_ADDRESS::prediction_market::initialize \
  --assume-yes
```

### 验证

```bash
aptos move view \
  --function-id YOUR_ADDRESS::prediction_market::get_project_info \
  --args u64:0
```

应返回项目 0 的数据。

## 前端配置

### 更新合约地址

编辑 `src/config/aptos.ts`：

```typescript
export const MODULE_ADDRESS = '0xYOUR_ADDRESS';
```

或使用环境变量（推荐）：

```bash
# .env
VITE_MODULE_ADDRESS=0xYOUR_ADDRESS
```

代码已支持环境变量：
```typescript
export const MODULE_ADDRESS = import.meta.env.VITE_MODULE_ADDRESS || '0x8ebb...';
```

## 前端部署（Vercel）

### 推送到 GitHub

```bash
git add .
git commit -m "deploy: update contract address"
git push
```

### 在 Vercel 导入

1. 访问 https://vercel.com/dashboard
2. Add New → Project
3. 选择仓库，Import
4. 直接点击 Deploy（Vercel 自动检测 Vite）

### 环境变量

在 Vercel Dashboard → Settings → Environment Variables：

| 名称 | 值 |
|------|-----|
| `VITE_MODULE_ADDRESS` | `0xYOUR_ADDRESS` |

设置后需重新部署才生效。

### vercel.json

项目已包含配置：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

`rewrites` 确保 React Router 的客户端路由正常工作。

## 切换到主网

### 1. 修改合约依赖

编辑 `move/Move.toml`：
```toml
[dependencies.AptosFramework]
git = "https://github.com/aptos-labs/aptos-core.git"
rev = "mainnet"  # 改为 mainnet
```

### 2. 修改前端网络

编辑 `src/config/aptos.ts`：
```typescript
const config = new AptosConfig({ network: Network.MAINNET });
```

### 3. 重新部署合约

```bash
aptos move publish --named-addresses cutemarket=default --network mainnet --assume-yes
```

### 4. 更新合约地址

主网部署后会获得新地址，更新 `MODULE_ADDRESS`。

## 部署检查清单

- [ ] `npm run build` 无错误
- [ ] `npm run preview` 页面正常显示
- [ ] 直接访问 `/project/0` 路由正常
- [ ] 钱包连接功能正常
- [ ] `MODULE_ADDRESS` 指向正确合约
- [ ] 前端网络与合约网络一致（Testnet/Mainnet）
DOCEOF
```

- [ ] **Step 2: Verify file was created**

```bash
wc -l /Users/jason/repo/aptos_cutemarket/docs/deployment.md
```

Expected: ~120 lines.

- [ ] **Step 3: Commit**

```bash
git add docs/deployment.md
git commit -m "docs: add deployment guide"
```

---

### Task 7: Rewrite README.md

**File:** Rewrite `README.md`

- [ ] **Step 1: Read the current file**

```bash
cat /Users/jason/repo/aptos_cutemarket/README.md
```

- [ ] **Step 2: Overwrite with new content**

```bash
cat > /Users/jason/repo/aptos_cutemarket/README.md << 'DOCEOF'
# CuteMarket

Decentralized prediction market on Aptos. Similar to Polymarket — no backend, no database, all data on-chain.

Built during a 3-hour hackathon. Deployed on Aptos Testnet.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Contract:** Move (Aptos Framework)
- **Wallet:** @aptos-labs/wallet-adapter-react (Petra)
- **Network:** Aptos Testnet

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Documentation

**For users:**
- [User Guide](docs/user-guide.md) — How to connect wallet, place bets, understand odds

**For developers:**
- [Quickstart](docs/quickstart.md) — Get the project running locally
- [Architecture](docs/architecture.md) — System design, data flow, key decisions
- [Contract API](docs/contract-api.md) — Move function signatures, parameters, CLI examples
- [Deployment](docs/deployment.md) — Deploy contract and frontend

## License

MIT
DOCEOF
```

- [ ] **Step 3: Verify the file**

```bash
wc -l /Users/jason/repo/aptos_cutemarket/README.md
```

Expected: ~35 lines.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README as clean landing page"
```

---

### Task 8: Delete old documentation files

- [ ] **Step 1: Remove the files**

```bash
cd /Users/jason/repo/aptos_cutemarket
rm DEPLOY.md DEPLOYMENT_SUMMARY.md FEATURES.md QUICKSTART.md SETUP.md USER_GUIDE.md WALLET_SETUP.md VERCEL_DEPLOY.md
```

- [ ] **Step 2: Verify they're gone**

```bash
ls /Users/jason/repo/aptos_cutemarket/*.md
```

Expected: only `README.md` and `CLAUDE.md` remain at root.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: remove old documentation files"
```

---

### Task 9: Final verification

- [ ] **Step 1: Check all docs exist**

```bash
ls -la /Users/jason/repo/aptos_cutemarket/docs/*.md
```

Expected: 5 files (user-guide.md, quickstart.md, architecture.md, contract-api.md, deployment.md).

- [ ] **Step 2: Check no stale contract addresses**

```bash
grep -r "0xe726" /Users/jason/repo/aptos_cutemarket/docs/ /Users/jason/repo/aptos_cutemarket/README.md
```

Expected: no matches (old address fully removed).

- [ ] **Step 3: Check build still works**

```bash
cd /Users/jason/repo/aptos_cutemarket && npm run build
```

Expected: build succeeds (docs are markdown, not imported by code).

- [ ] **Step 4: Check internal links resolve**

```bash
grep -o '\[.*\](docs/[^)]*' /Users/jason/repo/aptos_cutemarket/README.md | grep -o 'docs/[^)]*' | while read f; do
  if [ -f "/Users/jason/repo/aptos_cutemarket/$f" ]; then
    echo "OK: $f"
  else
    echo "MISSING: $f"
  fi
done
```

Expected: all links show "OK".

- [ ] **Step 5: Final commit (if any fixes needed)**

```bash
git add -A && git commit -m "docs: final verification fixes" --allow-empty
```
