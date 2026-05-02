# 部署指南

## 合约部署（Testnet）

### 安装 Aptos CLI

```bash
curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3
aptos --version
```

### 初始化钱包

```bash
aptos init --network testnet --profile testnet
```

记录输出的地址：`0xYOUR_ADDRESS`

### 获取测试币

访问 https://aptos.dev/network/faucet 输入地址领取（CLI 方式已废弃）。

### 编译合约

```bash
cd move
aptos move compile
```

### 部署合约

```bash
aptos move publish --profile testnet --assume-yes
```

### 初始化（按顺序）

```bash
# 1. 初始化 governance
aptos move run --function-id YOUR_ADDRESS::governance::initialize --profile testnet --assume-yes

# 2. 初始化 market_core
aptos move run --function-id YOUR_ADDRESS::market_core::initialize_market_list --profile testnet --assume-yes
```

### 创建测试市场

```bash
npx tsx scripts/seed-markets.ts <your-private-key>
```

### 验证

```bash
aptos move view \
  --function-id YOUR_ADDRESS::market_core::get_market_state \
  --args address:0x...
```

## 当前部署信息

- **合约地址:** `0xf28e42120ec3007579f530ac426b2d553f501681431a433f3584bf6d37c94f16`
- **Explorer:** [查看交易](https://explorer.aptoslabs.com/account/0xf28e42120ec3007579f530ac426b2d553f501681431a433f3584bf6d37c94f16/transactions?network=testnet)
- **测试市场:** 6 个（BTC、FIFA、ETH/BTC、美国总统、Apple AR、APT 价格方向）

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
rev = "mainnet"
```

### 2. 修改前端网络

编辑 `src/config/aptos.ts`：
```typescript
const config = new AptosConfig({ network: Network.MAINNET });
```

### 3. 重新部署合约

```bash
aptos move publish --profile mainnet --assume-yes
```

### 4. 初始化并更新地址

部署后按顺序初始化 governance → market_core，然后更新 `MODULE_ADDRESS`。

## 部署检查清单

- [ ] `npm run build` 无错误
- [ ] `npm run preview` 页面正常显示
- [ ] 直接访问 `/project/0` 路由正常
- [ ] 钱包连接功能正常
- [ ] `MODULE_ADDRESS` 指向正确合约
- [ ] 前端网络与合约网络一致（Testnet/Mainnet）
