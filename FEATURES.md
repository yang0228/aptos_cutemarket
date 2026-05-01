# 🎯 cuteMarket 功能说明

## ✅ 已实现的功能

### 1. 💼 钱包连接功能

**位置**: 右上角固定按钮

**功能**:
- ✅ 自动检测钱包连接状态
- ✅ 支持多种钱包（Martian、Pontem 等）
- ✅ 显示连接的钱包图标和地址（截断显示）
- ✅ 断开连接功能

**实现文件**: `src/components/WalletButton.tsx`

**技术栈**:
- `@aptos-labs/wallet-adapter-react` - 钱包适配器
- `@aptos-labs/wallet-adapter-ant-design` - UI 组件

**使用方法**:
1. 点击右上角"Connect Wallet"按钮
2. 选择钱包（Martian/Pontem）
3. 在钱包中确认连接
4. 连接成功后显示地址

---

### 2. 📊 链上数据实时获取

**功能**:
- ✅ 从 Aptos 链上读取项目详情
- ✅ 显示每个选项的投注金额
- ✅ 显示项目总投注额
- ✅ 每 10 秒自动刷新数据
- ✅ 下注后立即刷新

**实现文件**: `src/hooks/useProjectData.ts`

**数据源**: Aptos 智能合约 View 函数
```typescript
function: `${MODULE_ADDRESS}::prediction_market::get_project_info`
```

**返回数据**:
```typescript
{
  id: number;              // 项目ID
  endTimestamp: number;    // 结束时间戳
  isSettled: boolean;      // 是否已结算
  winningOption: number;   // 获胜选项
  optionPools: number[];   // 各选项投注池（APT）
  totalPool: number;       // 总投注额（APT）
}
```

**自动刷新机制**:
- 页面加载时立即获取
- 每 10 秒自动刷新
- 下注成功后手动刷新

---

### 3. 💰 下注功能

**位置**: 项目详情页

**功能**:
- ✅ 选择投注选项（单选）
- ✅ 输入下注金额（最小 0.01 APT）
- ✅ 实时验证钱包连接状态
- ✅ 调用智能合约下注
- ✅ 等待交易确认
- ✅ 显示成功/失败消息

**实现文件**: `src/pages/ProjectDetail.tsx`

**下注流程**:
1. 用户连接钱包
2. 选择一个投注选项
3. 输入下注金额（≥ 0.01 APT）
4. 点击"下注"按钮
5. 钱包弹出确认窗口
6. 用户确认并支付（APT + Gas费）
7. 等待交易上链
8. 显示成功消息并刷新数据

**智能合约调用**:
```typescript
function: `${MODULE_ADDRESS}::prediction_market::place_bet`
arguments: [projectId, optionIndex, amountInOctas]
```

**错误处理**:
- 未连接钱包 → 提示"请先连接钱包"
- 未选择选项 → 提示"请选择一个投注选项"
- 金额不足 → 提示"投注金额至少为 0.01 APT"
- 项目关闭 → 提示"该项目已关闭，无法下注"
- 交易失败 → 显示具体错误信息

---

### 4. 📈 实时赔率计算

**功能**:
- ✅ 根据投注池实时计算赔率
- ✅ 显示每个选项的当前赔率（如 x2.5）
- ✅ 显示市场占比（隐含概率）
- ✅ 计算预期收益
- ✅ 计算盈利率（百分比）
- ✅ 考虑 2% 平台手续费

**实现文件**: `src/utils/oddsCalculator.ts`

**赔率公式**:
```typescript
// 扣除 2% 手续费后的奖池
prizePool = totalPool × (1 - 0.02)

// 赔率 = 奖池 / 该选项投注额
odds = prizePool / optionPool

// 隐含概率 = 该选项投注额 / 总投注额
probability = (optionPool / totalPool) × 100
```

**预期收益公式**:
```typescript
// 加上用户下注后的新池子
newOptionPool = optionPool + betAmount
newTotalPool = totalPool + betAmount
newPrizePool = newTotalPool × (1 - 0.02)

// 用户能获得的奖金
expectedReturn = (betAmount / newOptionPool) × newPrizePool
```

**盈利率公式**:
```typescript
profitRate = ((expectedReturn - betAmount) / betAmount) × 100
```

**显示位置**:
1. **选项卡片**: 显示当前赔率标签（蓝色，如"x2.5"）
2. **预期收益面板**: 显示详细信息
   - 投注金额
   - 当前赔率
   - 预期收益（绿色）
   - 盈利率（绿色/红色）

**实时更新**:
- 用户输入金额时实时计算
- 其他人下注后自动刷新（10秒）

---

### 5. 🎨 UI/UX 功能

**首页（Home）**:
- ✅ 项目卡片列表（网格布局）
- ✅ 显示项目名称、选项、状态
- ✅ 显示总投注额（从链上获取）
- ✅ 显示截止日期
- ✅ 已开奖项目显示🏆标记

**项目详情页（ProjectDetail）**:
- ✅ 渐变色头部（紫色→粉色）
- ✅ 项目状态标签（开放中/已关闭/已开奖）
- ✅ 选项卡片（可点击选择）
- ✅ 选中状态高亮（紫色边框）
- ✅ 获胜选项绿色高亮 + 🏆
- ✅ 赔率标签（蓝色）
- ✅ 预期收益面板（蓝色背景）
- ✅ 下注表单（输入框 + 按钮）
- ✅ 成功/错误消息提示
- ✅ 加载状态显示

**状态管理**:
- ✅ 开放中（绿色）
- ✅ 已关闭（黄色）
- ✅ 已开奖（蓝色）

**响应式设计**:
- ✅ 移动端适配
- ✅ 平板适配
- ✅ 桌面端适配

---

### 6. 🔄 数据流

```
用户操作 → 前端验证 → 钱包签名 → 智能合约 → 链上存储
                                    ↓
用户界面 ← 数据解析 ← View函数 ← 定时查询
```

**完整流程**:
1. **页面加载**: 调用 `useProjectData` hook 获取链上数据
2. **显示数据**: 转换 Octas → APT，渲染界面
3. **用户下注**: 
   - 验证输入
   - 调用合约 `place_bet`
   - 等待交易确认
   - 刷新数据
4. **自动刷新**: 每 10 秒调用 `get_project_info` 更新数据

---

## 🔧 技术架构

### 前端技术栈
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **路由**: React Router v6
- **样式**: Tailwind CSS
- **钱包**: Aptos Wallet Adapter
- **链交互**: @aptos-labs/ts-sdk

### 智能合约
- **语言**: Move
- **网络**: Aptos Testnet
- **合约地址**: `0xe726a89a870375b2ff603505df02e9d9e412b999186df6ad46292a42069c84ac`

### 核心模块
```
src/
├── components/
│   ├── Header.tsx          # 头部导航
│   ├── ProjectCard.tsx     # 项目卡片（带链上数据）
│   └── WalletButton.tsx    # 钱包连接按钮
├── pages/
│   ├── Home.tsx           # 首页
│   └── ProjectDetail.tsx  # 项目详情（下注页面）
├── hooks/
│   └── useProjectData.ts  # 链上数据获取 Hook
├── utils/
│   ├── oddsCalculator.ts  # 赔率计算工具
│   └── dateUtils.ts       # 日期工具
├── config/
│   └── aptos.ts          # Aptos 配置
└── context/
    └── WalletProvider.tsx # 钱包上下文
```

---

## 📦 单位转换

- **1 APT** = 100,000,000 Octas
- **0.01 APT** = 1,000,000 Octas（最小下注金额）
- **0.1 APT** = 10,000,000 Octas（默认下注金额）

**转换函数**:
```typescript
// APT → Octas
function aptToOctas(apt: number): number {
  return Math.floor(apt * 100000000);
}

// Octas → APT
function octasToApt(octas: number): number {
  return octas / 100000000;
}
```

---

## 🚀 使用步骤

### 开发环境启动

1. **安装依赖**:
```bash
npm install
```

2. **启动开发服务器**:
```bash
npm run dev
```

3. **打开浏览器**: http://localhost:5173

### 用户操作流程

1. **连接钱包**:
   - 点击右上角"Connect Wallet"
   - 选择钱包并授权

2. **浏览项目**:
   - 在首页查看所有项目
   - 查看投注金额和状态

3. **下注**:
   - 点击项目卡片进入详情
   - 选择一个选项
   - 输入金额（≥ 0.01 APT）
   - 点击"下注"并在钱包中确认

4. **查看结果**:
   - 等待交易确认
   - 页面自动刷新显示新数据
   - 赔率实时更新

---

## 🎯 功能亮点

✅ **完全去中心化** - 所有数据存储在链上  
✅ **实时数据** - 自动从链上获取最新状态  
✅ **透明赔率** - 公开计算公式，实时显示  
✅ **用户友好** - 简洁的UI，清晰的提示  
✅ **安全可靠** - 智能合约保证资金安全  
✅ **响应式设计** - 支持各种设备  

---

## 📝 注意事项

1. **网络**: 当前部署在 Testnet，使用测试币
2. **最小金额**: 0.01 APT
3. **手续费**: 2% 平台手续费 + Gas 费
4. **刷新频率**: 每 10 秒自动刷新
5. **项目状态**: 只能对开放中的项目下注

---

## 🔗 相关链接

- **合约浏览器**: https://explorer.aptoslabs.com/account/0xe726a89a870375b2ff603505df02e9d9e412b999186df6ad46292a42069c84ac?network=testnet
- **Aptos 官方文档**: https://aptos.dev
- **钱包适配器文档**: https://github.com/aptos-labs/aptos-wallet-adapter

