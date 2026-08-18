# CuteMarket

基于 **Aptos Testnet** 的预测市场 DApp，支持创建多选项市场、买卖份额、管理流动性和领取结算奖励。前端直接通过 Aptos SDK 读取链上状态，由钱包签名提交交易，无需自建后端或数据库。

[快速开始](#快速开始) · [项目结构](#项目结构) · [当前限制](#当前限制) · [文档导航](#文档导航)

## 功能概览

| 功能 | 说明 |
| --- | --- |
| 市场浏览 | 搜索、分类筛选、排序，查看市场状态与选项概率 |
| 份额交易 | 买入、卖出预测份额，查看报价与交易反馈 |
| 行情与记录 | 根据链上交易事件展示价格走势和交易历史 |
| 流动性管理 | 添加或移除流动性，查看 LP 准备金和个人可赎回金额 |
| 个人持仓 | 查看持仓、成本和估算盈亏，领取已结算市场的奖励 |
| 创建市场 | 配置 2–10 个选项、分类、结束时间和初始流动性 |

## 快速开始

### 环境准备

- Node.js 20+ 与 npm。
- Petra 钱包：浏览市场无需连接；创建市场、交易和管理流动性时需要连接，并切换至 **Testnet**。
- 测试网 APT：用于交易金额、初始流动性与 Gas。
- Aptos CLI：仅在编译、测试或部署 Move 合约时需要。

### 本地启动

在仓库根目录执行：

```bash
npm install
npm run dev
```

打开 [http://localhost:5173](http://localhost:5173)。开发服务器固定使用 `5173` 端口；端口被占用时会退出，不会自动切换。

默认使用代码中配置的测试网合约地址，无需先部署合约或创建环境变量文件。

### 合约地址配置

连接自己部署的测试网合约时，在项目根目录创建 `.env.local`：

```dotenv
VITE_MODULE_ADDRESS=0xYOUR_CONTRACT_ADDRESS
```

修改后重启开发服务器；生产构建需重新执行 `npm run build`。此变量仅覆盖前端合约地址，**不会切换网络，也不会修改种子脚本中的地址**。

| 配置项 | 位置 |
| --- | --- |
| SDK 网络、默认合约地址、APT 单位转换 | [src/config/aptos.ts](src/config/aptos.ts) |
| 钱包网络与适配器 | [src/context/WalletProvider.tsx](src/context/WalletProvider.tsx) |
| Move 命名地址与框架依赖 | [move/Move.toml](move/Move.toml) |

默认合约地址：

```text
0xf28e42120ec3007579f530ac426b2d553f501681431a433f3584bf6d37c94f16
```

[在 Aptos Explorer 查看测试网账户与交易](https://explorer.aptoslabs.com/account/0xf28e42120ec3007579f530ac426b2d553f501681431a433f3584bf6d37c94f16/transactions?network=testnet)

### 首次体验

1. 打开首页，选择一个尚未到期的市场。
2. 连接 Petra 测试网钱包，选择选项并输入交易金额，在钱包中确认交易。
3. 在市场详情查看交易记录、持仓与流动性，在「我的持仓」页面查看汇总。
4. 创建自己的市场时，提供至少 **1 APT** 初始流动性，结束时间需晚于当前时间 **1 小时以上**。

## 开发与验证

| 命令 | 用途 |
| --- | --- |
| `npm install` | 安装前端依赖 |
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | 先运行 TypeScript 检查，再构建到 `dist/` |
| `npm run preview` | 在本地预览已生成的构建产物 |

仓库尚未配置前端测试或 lint 命令。Move 测试位于 [move/tests/](move/tests/)，安装 Aptos CLI 后可执行：

```bash
cd move
aptos move compile
aptos move test
```

### 创建测试市场（可选）

[种子脚本](scripts/seed-markets.ts)会向测试网提交交易，依次尝试创建 6 个示例市场。每次运行都会创建新市场，不会清理或复用之前的数据。

```bash
# 生成一个测试账户，输出地址与私钥
npx tsx scripts/seed-markets.ts --generate
```

为该账户领取测试网 APT 后，在仓库根目录执行以下命令，将占位符替换为测试账户私钥：

```bash
npx tsx scripts/seed-markets.ts "<TESTNET_PRIVATE_KEY>"
```

脚本要求余额至少 **30 APT**，其中 6 个市场的初始流动性合计为 **28 APT**。账户生成输出包含水龙头链接。脚本使用独立的硬编码合约地址；使用自部署合约时，需要同步修改脚本中的 `MODULE_ADDRESS`。示例中包含 Pyth 类型市场，其结算实现限制见下文。

## 项目结构

```text
src/
├── components/       # 钱包、交易、流动性、图表与领奖组件
├── pages/            # 市场首页、市场详情、个人持仓、创建市场
├── hooks/            # 市场、持仓与 LP 数据读取
├── services/         # 链上事件查询
├── config/           # Aptos SDK、合约地址与单位转换
├── context/          # 钱包 Provider
├── utils/            # 赔率与概率计算
└── types/            # TypeScript 类型定义
move/
├── sources/          # Move 合约模块
└── tests/            # 治理与集成测试
scripts/              # 测试账户、测试币与示例市场脚本
docs/                 # 用户、开发、架构与部署文档
```

前端使用 **React 18 + TypeScript + Vite + Tailwind CSS + Recharts**，通过 Aptos TypeScript SDK 与链交互，钱包接入使用 Aptos Wallet Adapter 和 Petra。

合约由 5 个 Move 模块组成：

| 模块 | 职责 |
| --- | --- |
| `governance` | 管理员权限、费率、暂停控制与市场计数 |
| `market_core` | 市场创建、状态存储与 view 查询 |
| `amm` | 份额买卖、选项定价与流动性管理 |
| `oracle` | 结算提议、延时执行、Pyth 占位逻辑与领奖 |
| `events` | 市场、交易、流动性与结算事件 |

市场状态通过 `aptos.view()` 查询，市场列表和交易历史通过账户交易中的事件获取。链上金额使用 Octas，前端显示为 APT：`1 APT = 100,000,000 Octas`。

## 当前限制

- **Pyth 结算仍是占位实现。** `settle_with_pyth` 接受调用者提供的价格，以价格是否大于 0 选择获胜选项，尚未读取或验证真实 Pyth 数据，也未校验市场的结算类型。创建页面亦未提供价格源和阈值配置。
- **事件查询范围有限。** 当前查询合约账户的一页交易（最多 100 条），尚无分页或独立索引服务，市场列表和历史记录可能不完整。
- **数据通过轮询刷新。** 市场列表每 30 秒刷新，市场详情状态每 5 秒刷新；图表依赖已获取的交易事件。
- **管理员结算需要链上操作。** 管理员提出结算结果后，需等待 24 小时再调用执行函数；当前前端未提供管理员结算页面。

## 部署

前端执行 `npm run build` 后生成静态文件，可部署到支持 SPA 路由回退的托管服务。仓库提供 [vercel.json](vercel.json)，将客户端路由重写到 `index.html`。

部署自己的合约时，需将 `move/Move.toml` 中的 `cutemarket` 命名地址设置为部署账户地址，发布后依次调用 `governance::initialize` 和 `market_core::initialize_market_list`，再更新前端配置。注意，`move/scripts/deploy.sh` 的初始化提示仍引用旧模块 `prediction_market`，应使用上述模块入口。

更多步骤见[部署指南](docs/deployment.md)。

## 文档导航

| 文档 | 内容 |
| --- | --- |
| [用户指南](docs/user-guide.md) | 钱包连接、交易操作与赔率说明 |
| [开发快速开始](docs/quickstart.md) | 本地开发流程与关键文件说明 |
| [架构说明](docs/architecture.md) | 系统设计、数据流与模块职责 |
| [合约 API](docs/contract-api.md) | Move 函数、参数与 CLI 示例 |
| [部署指南](docs/deployment.md) | 合约发布、初始化与前端部署 |

## License

MIT
