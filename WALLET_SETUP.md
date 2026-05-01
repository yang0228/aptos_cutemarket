# 🔐 钱包连接配置说明

## 📦 已使用最新版本的 Wallet Adapter

本项目已更新到最新版本的 Aptos Wallet Adapter React 库：

```json
{
  "@aptos-labs/ts-sdk": "^1.39.0",
  "@aptos-labs/wallet-adapter-react": "^3.7.3",
  "@aptos-labs/wallet-adapter-ant-design": "^2.2.3",
  "petra-plugin-wallet-adapter": "^0.4.5"
}
```

## 🎯 主要变化

### 1. 移除旧钱包插件

❌ 移除了：
- `@martianwallet/aptos-wallet-adapter`
- `@pontem/wallet-adapter-plugin`
- `antd` 依赖

✅ 新增了：
- `petra-plugin-wallet-adapter` - Petra 是 Aptos 官方推荐的钱包

### 2. 更新 WalletProvider 配置

**文件：`src/context/WalletProvider.tsx`**

```typescript
import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react';
import { PetraWallet } from 'petra-plugin-wallet-adapter';
import { Network } from '@aptos-labs/ts-sdk';

export function WalletProvider({ children }: PropsWithChildren) {
  const wallets = [new PetraWallet()];

  return (
    <AptosWalletAdapterProvider
      plugins={wallets}
      autoConnect={true}
      dappConfig={{
        network: Network.TESTNET,
        aptosConnectDappId: 'cutemarket-dapp',
      }}
      onError={(error) => {
        console.error('Wallet error:', error);
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}
```

### 3. 更新交易签名 API

**旧版本 API：**
```typescript
const payload = {
  type: 'entry_function_payload',
  function: `${MODULE_ADDRESS}::${MODULE_NAME}::place_bet`,
  type_arguments: [],
  arguments: [projectId, optionIndex, amount],
};
const response = await signAndSubmitTransaction(payload);
```

**新版本 API（v3.7+）：**
```typescript
const response = await signAndSubmitTransaction({
  sender: account!.address,
  data: {
    function: `${MODULE_ADDRESS}::${MODULE_NAME}::place_bet`,
    typeArguments: [],
    functionArguments: [projectId, optionIndex, amount],
  },
});
```

### 4. WalletButton 增强

现在会显示钱包图标：

```typescript
{wallet?.icon && (
  <img src={wallet.icon} alt={wallet.name} className="w-5 h-5 rounded-full" />
)}
```

## 🪙 支持的钱包

### Petra Wallet（官方推荐）✅

**安装方法：**
1. 访问 [Petra Wallet 官网](https://petra.app/)
2. 下载浏览器扩展（Chrome/Firefox/Edge）
3. 创建或导入钱包
4. 切换到测试网（Testnet）

**特点：**
- ✅ Aptos 官方开发
- ✅ 界面友好
- ✅ 支持测试网水龙头
- ✅ 完整的交易历史
- ✅ NFT 支持

### 如何添加更多钱包

如果你想支持其他钱包（如 Martian、Pontem 等），可以这样做：

**1. 安装钱包适配器**

```bash
npm install @martianwallet/aptos-wallet-adapter
npm install @pontem/wallet-adapter-plugin
```

**2. 更新 WalletProvider**

```typescript
import { PetraWallet } from 'petra-plugin-wallet-adapter';
import { MartianWallet } from '@martianwallet/aptos-wallet-adapter';
import { PontemWallet } from '@pontem/wallet-adapter-plugin';

const wallets = [
  new PetraWallet(),
  new MartianWallet(),
  new PontemWallet(),
];
```

## 🔄 迁移指南

如果你从旧版本升级，按照以下步骤：

### 1. 清理旧依赖

```bash
rm -rf node_modules package-lock.json
```

### 2. 安装新依赖

```bash
npm install
```

### 3. 更新代码

查看上面的 API 变化，更新所有使用 `signAndSubmitTransaction` 的地方。

### 4. 测试连接

```bash
npm run dev
```

打开浏览器，点击右上角"连接钱包"按钮，选择 Petra Wallet。

## 📱 用户使用流程

### 1. 安装钱包

访问 [Petra Wallet](https://petra.app/) 安装浏览器扩展。

### 2. 创建钱包

- 首次使用：创建新钱包，保存助记词
- 已有钱包：导入助记词或私钥

### 3. 切换到测试网

Petra Wallet 设置 → 网络 → 选择 "Testnet"

### 4. 获取测试币

方法 1：Petra 内置水龙头
- 点击 "Faucet" 按钮
- 每次可获得 1 APT

方法 2：Aptos 官方水龙头
- 访问 https://aptos.dev/tools/faucet/
- 输入你的地址
- 获取 100 APT

### 5. 连接到 cuteMarket

- 打开 cuteMarket 网站
- 点击右上角"连接钱包"
- 选择 Petra Wallet
- 批准连接请求

### 6. 开始下注

- 浏览预测项目
- 选择投注选项
- 输入金额
- 确认交易（支付 Gas 费）

## 🛠️ 开发者选项

### 使用自定义网络

如果你想使用自定义网络或主网：

```typescript
dappConfig={{
  network: Network.MAINNET, // 或 Network.DEVNET
  aptosConnectDappId: 'your-dapp-id',
}}
```

### 禁用自动连接

```typescript
<AptosWalletAdapterProvider
  plugins={wallets}
  autoConnect={false} // 改为 false
  ...
>
```

### 自定义错误处理

```typescript
onError={(error) => {
  if (error.message.includes('User rejected')) {
    console.log('用户拒绝了连接');
  } else {
    console.error('钱包错误:', error);
    // 显示友好的错误提示
  }
}}
```

## 🔍 调试技巧

### 检查钱包连接状态

```typescript
const { connected, account, wallet } = useWallet();

console.log('已连接:', connected);
console.log('账户:', account?.address);
console.log('钱包:', wallet?.name);
```

### 检查网络配置

确保钱包和前端都在同一个网络：

- 前端配置：`src/context/WalletProvider.tsx` → `Network.TESTNET`
- 钱包设置：Petra Wallet → 设置 → 网络 → Testnet

### 常见错误

**1. "Wallet not installed"**
- 解决：安装 Petra Wallet 浏览器扩展

**2. "Network mismatch"**
- 解决：确保钱包和前端都在同一网络

**3. "Insufficient balance"**
- 解决：从水龙头获取测试 APT

**4. "Transaction failed"**
- 检查合约是否已部署
- 检查 `MODULE_ADDRESS` 是否正确配置

## 📚 相关资源

- [Petra Wallet 官网](https://petra.app/)
- [Aptos Wallet Adapter 文档](https://aptos.dev/guides/wallet-adapter-concept)
- [Aptos SDK 文档](https://aptos.dev/sdks/ts-sdk)
- [Aptos 测试网水龙头](https://aptos.dev/tools/faucet/)

## ✅ 检查清单

部署前确认：

- [ ] 已安装最新依赖（`npm install`）
- [ ] WalletProvider 配置正确
- [ ] 合约已部署并初始化
- [ ] `MODULE_ADDRESS` 已更新
- [ ] 钱包扩展已安装
- [ ] 切换到测试网
- [ ] 有足够的测试 APT

祝你使用愉快！🎉


