# 🚀 cuteMarket 合约部署指南

## 前置条件

### 1. 安装 Aptos CLI

```bash
# macOS/Linux
curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3

# 验证安装
aptos --version
```

### 2. 创建或导入钱包

```bash
# 初始化 Aptos CLI（会创建新钱包）
aptos init --network testnet

# 或者导入现有钱包
aptos init --network testnet --private-key <你的私钥>
```

### 3. 获取测试币

访问水龙头获取测试 APT：
- https://aptos.dev/tools/faucet/

或使用 CLI：
```bash
aptos account fund-with-faucet --account default
```

## 部署步骤

### 方式 1：使用脚本部署（推荐）

```bash
cd move
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 方式 2：手动部署

#### 1. 编译合约

```bash
cd move
aptos move compile --named-addresses cutemarket=default
```

#### 2. 部署合约

```bash
aptos move publish --named-addresses cutemarket=default
```

#### 3. 初始化市场

部署成功后，需要初始化市场（创建 5 个项目）：

```bash
# 获取你的账户地址
aptos account list

# 初始化（将 YOUR_ADDRESS 替换为你的地址）
aptos move run \
  --function-id YOUR_ADDRESS::prediction_market::initialize \
  --assume-yes
```

## 配置前端

部署成功后，复制你的账户地址，更新前端配置：

**文件：`src/config/aptos.ts`**

```typescript
export const MODULE_ADDRESS = '0x你的合约地址';
export const MODULE_NAME = 'prediction_market';
```

## 测试合约

### 1. 查询项目信息

```bash
aptos move view \
  --function-id YOUR_ADDRESS::prediction_market::get_project_info \
  --args u64:0
```

### 2. 下注测试

```bash
aptos move run \
  --function-id YOUR_ADDRESS::prediction_market::place_bet \
  --args u64:0 u64:0 u64:100000000
```

参数说明：
- 第一个 `0`: 项目 ID（0-4）
- 第二个 `0`: 选项索引
- `100000000`: 下注金额（1 APT = 100000000 Octas）

### 3. 结算项目（管理员）

```bash
aptos move run \
  --function-id YOUR_ADDRESS::prediction_market::settle_project \
  --args u64:0 u64:0
```

参数说明：
- 第一个 `0`: 项目 ID
- 第二个 `0`: 获胜选项索引

## 合约功能说明

### 核心功能

1. **initialize()** - 初始化市场（创建 5 个项目）
2. **place_bet()** - 用户下注
3. **settle_project()** - 管理员结算项目
4. **get_project_info()** - 查询项目信息（View 函数）
5. **get_user_bets()** - 查询用户下注（View 函数）

### 数据结构

```move
struct Project {
    id: u64,
    name: vector<u8>,
    options_count: u64,
    end_timestamp: u64,
    is_settled: bool,
    winning_option: u64,
    option_pools: vector<u64>,  // 每个选项的总投注额
    bets: vector<UserBet>,       // 所有下注记录
}
```

### 特性

- ✅ 所有数据存储在链上（无需数据库）
- ✅ 自动计算奖金分配
- ✅ 2% 平台手续费
- ✅ 防止项目关闭后下注
- ✅ 防止重复结算
- ✅ 最小下注 1 APT

## 常见问题

### Q: 如何切换网络？
A: 修改 `Move.toml` 中的依赖版本，或在命令中添加 `--network mainnet`

### Q: 如何查看我的地址？
A: 运行 `aptos account list --profile default`

### Q: Gas 费用是多少？
A: 测试网免费，主网约 0.001-0.01 APT

### Q: 如何备份钱包？
A: 私钥存储在 `~/.aptos/config.yaml`，请妥善保管

## 下一步

1. ✅ 部署合约
2. ✅ 初始化市场
3. ✅ 更新前端配置
4. ✅ 测试下注功能
5. ✅ 启动网站 `npm run dev`

祝你部署顺利！🎉

