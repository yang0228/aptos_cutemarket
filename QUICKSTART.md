# 🚀 cuteMarket 快速开始指南

## 📋 功能概览

✅ **完整的链上下注系统**
- ✅ Move 智能合约（5个内置预测项目）
- ✅ 用户连接钱包下注
- ✅ 实时读取链上投注数据
- ✅ 自动计算赔率和预期收益
- ✅ 无需数据库（所有数据在链上）
- ✅ 自动奖金分配（2% 平台手续费）

## 🎯 实现原理

### 智能合约架构

```
cutemarket::prediction_market
├── initialize()        - 初始化市场（创建5个项目）
├── place_bet()         - 用户下注（转账 APT）
├── settle_project()    - 管理员结算（分配奖金）
├── get_project_info()  - 查询项目数据（View）
└── get_user_bets()     - 查询用户下注（View）
```

### 数据存储

**所有数据存储在链上** - 不需要额外数据库！

```move
struct Project {
    id: u64,
    options_count: u64,
    end_timestamp: u64,
    is_settled: bool,
    winning_option: u64,
    option_pools: vector<u64>,  // 每个选项的投注额
    bets: vector<UserBet>,       // 所有下注记录
}
```

### 前端集成

1. **useProjectData Hook** - 自动从链上读取数据（每10秒刷新）
2. **赔率计算器** - 实时计算赔率、概率、预期收益
3. **钱包适配器** - 支持 Martian/Pontem 钱包

## 🔧 部署步骤

### 1. 安装 Aptos CLI

```bash
curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3
aptos --version
```

### 2. 初始化钱包

```bash
aptos init --network testnet
```

记录你的地址：`0xYOUR_ADDRESS`

### 3. 获取测试币

```bash
aptos account fund-with-faucet --account default
```

### 4. 部署合约

```bash
cd move
aptos move compile --named-addresses cutemarket=default
aptos move publish --named-addresses cutemarket=default
```

### 5. 初始化市场

```bash
aptos move run \
  --function-id YOUR_ADDRESS::prediction_market::initialize \
  --assume-yes
```

### 6. 配置前端

编辑 `src/config/aptos.ts`:

```typescript
export const MODULE_ADDRESS = '0xYOUR_ADDRESS';
```

### 7. 启动前端

```bash
npm install
npm run dev
```

打开 http://localhost:5173

## 💰 下注流程

### 用户视角

1. 连接钱包（Martian/Pontem）
2. 选择预测项目
3. 选择投注选项
4. 输入投注金额
5. 查看实时赔率和预期收益
6. 确认下注（支付 APT + Gas）
7. 等待交易确认
8. 查看投注成功

### 技术实现

```typescript
// 1. 前端调用合约
const payload = {
  function: `${MODULE_ADDRESS}::prediction_market::place_bet`,
  arguments: [projectId, optionIndex, amountInOctas],
};

// 2. 钱包签名
const response = await signAndSubmitTransaction(payload);

// 3. 等待确认
await aptos.waitForTransaction({ transactionHash: response.hash });

// 4. 刷新数据
refetch();
```

### 合约处理

```move
// 1. 验证项目和选项
// 2. 验证金额 >= 1 APT
// 3. 验证项目未关闭
// 4. 转账到合约地址
coin::transfer<AptosCoin>(user, admin, amount);

// 5. 更新投注池
*pool = *pool + amount;

// 6. 记录下注
vector::push_back(&mut project.bets, UserBet {...});
```

## 📊 赔率计算

### 公式

```typescript
// 赔率 = 奖池 / 该选项投注额
const prizePool = totalPool * (1 - 0.02); // 扣除2%手续费
const odds = prizePool / optionPool;

// 预期收益 = (用户投注 / 获胜池) * 总奖池
const expectedReturn = (userBet / winningPool) * prizePool;

// 盈利率 = (收益 - 投注) / 投注
const profitRate = (expectedReturn - userBet) / userBet;
```

### 示例

假设项目有 2 个选项：

| 选项 | 投注额 | 市场占比 | 赔率 |
|------|--------|----------|------|
| A    | 100 APT | 66.7%   | x1.47 |
| B    | 50 APT  | 33.3%   | x2.94 |

用户投注 10 APT 在选项 B：
- 新赔率: x2.45
- 预期收益: 24.5 APT
- 盈利率: +145%

## 🎮 结算流程

### 管理员操作

```bash
# 结算项目 0，获胜选项为 1
aptos move run \
  --function-id YOUR_ADDRESS::prediction_market::settle_project \
  --args u64:0 u64:1 \
  --assume-yes
```

### 合约处理

1. 验证项目已关闭（当前时间 > 结束时间）
2. 计算总奖池和手续费
3. 遍历所有下注记录
4. 向获胜者按比例分配奖金
5. 标记为已结算

### 奖金分配公式

```move
// 用户获得奖金 = (用户投注 / 获胜选项总额) * 总奖池(扣除手续费)
let user_prize = (bet.amount * prize_pool) / winning_pool;
coin::transfer<AptosCoin>(admin, user, user_prize);
```

## 🔍 查询数据

### 查询项目信息

```bash
aptos move view \
  --function-id YOUR_ADDRESS::prediction_market::get_project_info \
  --args u64:0
```

返回：
```json
[
  "0",              // id
  "1735084800",     // end_timestamp
  false,            // is_settled
  "0",              // winning_option
  ["0", "0"]        // option_pools
]
```

### 前端实时查询

```typescript
const { data, loading } = useProjectData(projectId);

// data 包含：
// - totalPool: 总投注额
// - optionPools: 每个选项的投注额
// - isSettled: 是否已结算
// - winningOption: 获胜选项
```

## 🎨 UI 特性

### 实时更新
- ✅ 每 10 秒自动刷新链上数据
- ✅ 下注后立即刷新
- ✅ 赔率随投注实时变化

### 赔率显示
- 蓝色标签显示赔率（如 x2.5）
- 市场占比百分比
- 预期收益计算器
- 盈利率提示

### 状态提示
- 开放中（绿色）
- 已关闭（黄色）
- 已开奖（蓝色）
- 获胜选项标记 🏆

## ⚠️ 注意事项

1. **合约地址配置**
   - 部署后必须更新 `src/config/aptos.ts`
   - 否则前端无法与合约交互

2. **最小下注金额**
   - 1 APT = 100000000 Octas
   - 最少下注 1 APT

3. **Gas 费用**
   - 下注需要支付 Gas（约 0.001 APT）
   - 确保钱包有足够余额

4. **数据同步**
   - 交易确认需要几秒钟
   - 前端每 10 秒自动刷新

5. **结算权限**
   - 只有部署合约的地址可以结算
   - 需要在结束时间后才能结算

## 🚀 生产部署

### 切换到主网

1. 修改 `move/Move.toml`:
```toml
[dependencies.AptosFramework]
git = "https://github.com/aptos-labs/aptos-core.git"
rev = "mainnet"
```

2. 修改 `src/config/aptos.ts`:
```typescript
const config = new AptosConfig({ network: Network.MAINNET });
```

3. 重新部署合约到主网

## 📚 相关文档

- [Aptos 官方文档](https://aptos.dev)
- [Move 编程语言](https://move-language.github.io/move/)
- [钱包适配器](https://github.com/aptos-labs/aptos-wallet-adapter)

---

## ✨ 总结

这是一个**完全去中心化的预测市场**：

✅ 无需后端服务器
✅ 无需数据库
✅ 所有数据存储在链上
✅ 用户完全控制资金
✅ 透明的赔率计算
✅ 自动分配奖金

祝你使用愉快！🎉

