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
