## 🧭 项目概述
CuteMarket 是一个类似 Polymarket 的去中心化预测市场。项目在 2025/11/15 Aptos 线下活动 3 小时 hackathon 期间完成最小可用版本（MVP），并已在 Testnet 部署。

- 完整链上合约（创建项目、下注、结算、查询）
- 前端支持连接钱包、下注、实时读取链上数据、计算赔率与预期收益
- 无后端、无数据库，所有数据存链上

---

## 🧱 技术栈（固定）
- 前端：React 18 + TypeScript + Vite
- 样式：Tailwind CSS
- 钱包：@aptos-labs/wallet-adapter-react（自定义选择器）
- 链 SDK：@aptos-labs/ts-sdk
- 合约：Move（Aptos Framework）

---

## 🔩 合约模块
- 模块：`prediction_market`
- 主要函数：
  - `initialize`：初始化内置 5 个项目（结束时间为未来，支持下注）
  - `place_bet`：下注（最小 0.01 APT，2% 平台手续费）
  - `settle_project`：结算并按比例分配奖金
  - `get_project_info`（view）：查询项目状态与投注池
  - `get_user_bets`（view）：查询用户在某项目的下注记录

---

## 🖥️ 前端功能
- 首页：项目卡片 + 链上总池金额 + “热门选项/赔率”提示
- 详情：实时赔率/收益、输入金额下注、用户历史下注、项目图片展示
- 顶部：Logo + 口号弹幕 + 钱包连接按钮
- 局域网访问：Vite 监听 `0.0.0.0`（手机/同网段可直接访问）

**快速开始：**

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 本地测试 Vercel 构建（部署前必测）
./test-vercel-build.sh
```

---

## 🔗 部署信息（Testnet）
- 当前合约地址（最新）：`0x8ebb5f208e99f14584dc352204b107f8c9570a8481cf23e830fee296bd1515cb`
- Explorer：`https://explorer.aptoslabs.com/account/0x8ebb5f208e99f14584dc352204b107f8c9570a8481cf23e830fee296bd1515cb?network=testnet`

查询项目示例：
```bash
aptos move view \
  --function-id 0x8ebb5f208e99f14584dc352204b107f8c9570a8481cf23e830fee296bd1515cb::prediction_market::get_project_info \
  --args u64:0
```

用户下注查询：
```bash
aptos move view \
  --function-id 0x8ebb5f208e99f14584dc352204b107f8c9570a8481cf23e830fee296bd1515cb::prediction_market::get_user_bets \
  --args u64:0 address:0xYOUR_ADDRESS
```

---

## 📦 固定内容（内置项目）
共 5 个项目（名称/选项/结束时间），前端做了基础展示，链上读投注池：
- 川普下台 — ["下台","继续呆着"] — 2026-12-25
- cuteMarket赢今晚比赛 — ["赢","输"] — 2026-11-15
- 比特币突破100万 — ["突破","未突破"] — 2026-12-31
- 诺奖得主地区 — ["亚洲","欧洲","其他"] — 2026-10-10
- 2026世界杯冠军 — ["巴西","阿根廷","法国","其他"] — 2026-07-19

---

## 📈 项目进展
- 合约已部署并初始化内置项目（结束时间改为 2026 年，支持下注）
- 前端已接入链上数据、完成下注流程与赔率计算
- 增加用户历史下注、首页投资组合、热门选项与赔率提示
- 优化钱包连接（未安装跳转下载）、支持局域网访问

待办方向（非必须）：
- 开奖历史页、通知提醒
- 多钱包（Martian/Pontem）插件引导与快捷安装
- 主网部署与生产构建

---

## 🧮 单位与规则
- 1 APT = 100,000,000 Octas
- 最小下注：0.01 APT（1,000,000 Octas）
- 平台手续费：2%

---

---

## 🚀 Vercel 部署指南

### 📋 前置条件

1. ✅ 一个 GitHub 账户（或 GitLab/Bitbucket）
2. ✅ 一个 Vercel 账户（免费注册：https://vercel.com）
3. ✅ 代码已推送到 Git 仓库

### 🔧 项目改动（已配置兼容 Vercel）

为了让项目兼容 Vercel 部署，已完成以下配置：

#### 1. 创建 `vercel.json` 配置文件

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**关键配置说明：**
- `rewrites`: 将所有路由重定向到 `index.html`（支持 React Router 客户端路由）
- `outputDirectory`: 指定构建输出目录为 `dist`
- `framework`: 指定为 Vite 框架，Vercel 会自动优化

#### 2. 优化 `vite.config.ts`

```typescript
export default defineConfig({
  base: '/',  // 确保静态资源路径正确
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'aptos-vendor': ['@aptos-labs/ts-sdk', '@aptos-labs/wallet-adapter-react'],
        },
      },
    },
  },
})
```

**优化点：**
- 代码分割：将 React 和 Aptos SDK 分开打包，提高缓存效率
- 静态资源路径：使用 `base: '/'` 确保在 Vercel 上路径正确

#### 3. 创建 `.vercelignore`

忽略不需要的文件：
```
node_modules
.move
.aptos
*.log
.DS_Store
dist
```

#### 4. 环境变量支持（可选）

`src/config/aptos.ts` 已支持环境变量：

```typescript
export const MODULE_ADDRESS = import.meta.env.VITE_MODULE_ADDRESS || '0x8ebb5f208e99f14584dc352204b107f8c9570a8481cf23e830fee296d1515cb';
```

在 Vercel Dashboard 中可以设置环境变量 `VITE_MODULE_ADDRESS` 来动态配置合约地址。

---

### 🚀 部署步骤

#### 方式 1：通过 Vercel Dashboard（推荐，最简单）

**步骤 1：推送代码到 GitHub**

```bash
git init
git add .
git commit -m "Ready for Vercel deployment"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

**步骤 2：在 Vercel 导入项目**

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "Add New..." → "Project"
3. 选择你的 Git 仓库
4. 点击 "Import"

**步骤 3：配置项目设置**

Vercel 会自动检测 Vite 项目，默认配置：
- **Framework Preset**: Vite ✅
- **Build Command**: `npm run build` ✅
- **Output Directory**: `dist` ✅
- **Install Command**: `npm install` ✅

**无需修改任何设置，直接点击 "Deploy"！**

**步骤 4：等待部署完成**

- 构建时间：约 1-3 分钟
- 部署完成后会获得 URL（如：`https://cutemarket.vercel.app`）

#### 方式 2：使用 Vercel CLI

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录（会打开浏览器）
vercel login

# 3. 在项目根目录执行（预览部署）
vercel

# 4. 生产环境部署
vercel --prod
```

---

### 🧪 本地模拟 Vercel 打包测试

在部署到 Vercel 之前，可以在本地模拟 Vercel 的构建过程，确保项目可以成功部署。

**快速测试（推荐）：**

```bash
# 使用测试脚本（一键完成清理、安装、构建、预览）
./test-vercel-build.sh
```

**手动测试：**

#### 步骤 1：清理之前的构建

```bash
# 删除之前的构建产物
rm -rf dist node_modules/.vite
```

#### 步骤 2：模拟 Vercel 构建环境

```bash
# 安装依赖（Vercel 会执行这一步）
npm ci  # 或 npm install

# 执行构建命令（Vercel 会执行这一步）
npm run build
```

#### 步骤 3：检查构建输出

```bash
# 查看 dist 目录
ls -la dist/

# 应该看到类似文件：
# - index.html
# - assets/
#   - index-xxxxx.js
#   - index-xxxxx.css
#   - react-vendor-xxxxx.js
#   - aptos-vendor-xxxxx.js
```

#### 步骤 4：本地预览构建结果

```bash
# 使用 Vite 预览模式（模拟生产环境）
npm run preview

# 访问 http://localhost:4173
# 检查：
# ✅ 页面正常加载
# ✅ 路由跳转正常（如 /project/0）
# ✅ Logo 和静态资源显示正常
# ✅ 钱包连接功能正常
```

#### 步骤 5：使用 Vercel CLI 本地测试（可选）

```bash
# 安装 Vercel CLI
npm i -g vercel

# 在项目目录执行（会创建一个本地开发服务器，模拟 Vercel）
vercel dev
```

**注意：** 项目已包含测试脚本 `test-vercel-build.sh`，可以直接使用。

---

### ✅ 部署前检查清单

确保以下检查项都通过：

- [ ] **本地构建成功**：`npm run build` 无错误
- [ ] **预览正常**：`npm run preview` 页面正常显示
- [ ] **路由正常**：直接访问 `/project/0` 可以正常显示
- [ ] **静态资源**：Logo 和图片正常显示
- [ ] **环境变量**：如果使用环境变量，在 Vercel 中已配置
- [ ] **合约地址**：`MODULE_ADDRESS` 已正确配置
- [ ] **网络配置**：前端网络（Testnet/Mainnet）与合约一致

---

### 🔍 常见问题排查

#### Q: 部署后页面空白？

**解决方案：**
1. 检查浏览器控制台错误（F12）
2. 确认 `vercel.json` 中的 `rewrites` 配置正确
3. 确认 `vite.config.ts` 中 `base: '/'` 已设置

#### Q: 路由 404 错误？

**解决方案：**
确认 `vercel.json` 包含：
```json
"rewrites": [
  {
    "source": "/(.*)",
    "destination": "/index.html"
  }
]
```

#### Q: 静态资源加载失败？

**解决方案：**
1. 确认 `vite.config.ts` 中 `base: '/'` 设置
2. 检查 `public/` 目录下的文件是否已提交到 Git

#### Q: 构建失败？

**解决方案：**
1. 本地执行 `npm run build` 查看具体错误
2. 检查 TypeScript 类型错误：`npx tsc --noEmit`
3. 检查依赖版本兼容性

#### Q: 环境变量不生效？

**解决方案：**
1. Vercel 环境变量必须以 `VITE_` 开头（Vite 要求）
2. 部署后需要重新构建才能生效
3. 在 Vercel Dashboard → Settings → Environment Variables 中检查

---

### 💰 Vercel 免费方案说明

完全够用的免费套餐：

- ✅ **无限部署**：每次 Git push 自动部署
- ✅ **100GB 带宽/月**：约每天 3GB+
- ✅ **全球 CDN**：自动加速
- ✅ **自动 HTTPS**：SSL 证书自动配置
- ✅ **自定义域名**：支持绑定自己的域名
- ✅ **预览部署**：每个 Pull Request 自动创建预览链接
- ✅ **无信用卡**：完全免费，无需绑定

---

### 🎯 部署后下一步

1. **访问部署的网站**：使用 Vercel 提供的 URL
2. **配置自定义域名**（可选）：
   - 在 Vercel Dashboard → Settings → Domains
   - 添加你的域名
   - 按照提示配置 DNS
3. **测试功能**：
   - 连接钱包
   - 测试下注功能
   - 验证链上数据读取
4. **监控和日志**：
   - Vercel Dashboard → Deployments 查看部署历史
   - 点击部署查看构建日志

---

### 📚 相关文档

- **详细部署指南**：查看 `VERCEL_DEPLOY.md`
- **钱包配置**：查看 `WALLET_SETUP.md`
- **快速开始**：查看 `QUICKSTART.md`
- **Vercel 官方文档**：https://vercel.com/docs
- **Vite 部署指南**：https://vitejs.dev/guide/static-deploy.html

---

## 📚 参考
- Aptos 文档：`https://aptos.dev`
- Aptos Explorer：`https://explorer.aptoslabs.com/?network=testnet`
- Wallet Adapter：`https://github.com/aptos-labs/aptos-wallet-adapter`
- Vercel 文档：`https://vercel.com/docs`