# cuteMarket 项目启动说明

## 安装依赖

```bash
npm install
```

## 启动开发服务器

```bash
npm run dev
```

项目将在 `http://localhost:5173` 运行。

## 构建生产版本

```bash
npm run build
```

## 预览生产版本

```bash
npm run preview
```

## 配置合约地址

在开始下注之前，需要配置合约地址：

1. 打开 `src/config/aptos.ts`
2. 将 `MODULE_ADDRESS` 修改为你部署的合约地址
3. 如果需要，修改 `MODULE_NAME` 为你的模块名

```typescript
export const MODULE_ADDRESS = '0x你的合约地址';
export const MODULE_NAME = 'cutemarket';
```

## 功能说明

### 首页
- 展示所有 5 个内置投注项目
- 卡片显示项目名称、选项、截止日期和状态
- 点击卡片进入项目详情

### 项目详情页
- 显示项目完整信息
- 选择投注选项
- 输入投注金额（最少 1 APT）
- 点击下注按钮提交交易

### 钱包连接
- 右上角钱包按钮
- 支持 Martian Wallet 和 Pontem Wallet
- 自动检测已连接的钱包
- 显示用户地址（截断显示）

## 技术栈

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Aptos SDK v1.12+
- Aptos Wallet Adapter
- React Router v6

## 注意事项

1. 当前投注池数据显示为 0 APT（硬编码）
2. 需要先部署智能合约并配置合约地址
3. 确保钱包中有足够的 APT 用于下注和 Gas 费
4. 使用 Aptos Testnet 进行测试

