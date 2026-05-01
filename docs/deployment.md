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
