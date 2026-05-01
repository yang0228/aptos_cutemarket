# 🚀 Vercel 部署指南

cuteMarket 可以完美部署到 Vercel！这是一个纯前端项目，非常适合 Vercel 的平台。

## 📋 前置条件

1. ✅ 一个 GitHub 账户（或 GitLab/Bitbucket）
2. ✅ 一个 Vercel 账户（免费注册：https://vercel.com）
3. ✅ 代码已经推送到 Git 仓库

## 🔧 部署步骤

### 方式 1：通过 Vercel Dashboard（推荐）

#### 1. 推送代码到 GitHub

```bash
git init
git add .
git commit -m "Initial commit: cuteMarket"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

#### 2. 在 Vercel 导入项目

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "Add New..." → "Project"
3. 选择你的 Git 仓库（GitHub/GitLab/Bitbucket）
4. 点击 "Import"

#### 3. 配置项目设置

Vercel 会自动检测 Vite 项目，默认配置如下：

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

**不需要修改任何设置，直接点击 "Deploy"！**

#### 4. 添加环境变量（可选）

如果你的合约地址是动态的，可以在 Vercel 中添加环境变量：

1. 进入项目设置 → "Environment Variables"
2. 添加变量（如果需要）

**注意**：合约地址目前是硬编码在 `src/config/aptos.ts` 中的。

### 方式 2：使用 Vercel CLI

#### 1. 安装 Vercel CLI

```bash
npm i -g vercel
```

#### 2. 登录 Vercel

```bash
vercel login
```

#### 3. 部署

```bash
# 在项目根目录
vercel

# 生产环境部署
vercel --prod
```

## ⚙️ 配置文件说明

### vercel.json

已创建 `vercel.json` 配置文件：

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

**关键配置：**
- `rewrites`: 将所有路由重定向到 `index.html`（支持 React Router）
- `outputDirectory`: 构建输出目录
- `framework`: 指定为 Vite

### vite.config.ts

已优化构建配置：

```typescript
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
}
```

**优化：**
- 代码分割，减少初始加载时间
- 分离第三方库，提高缓存效率

## 🔍 部署后检查清单

### ✅ 功能测试

1. **首页加载**
   - [ ] 页面正常显示
   - [ ] Logo 显示正常
   - [ ] 5 个项目卡片显示

2. **路由功能**
   - [ ] 点击项目卡片进入详情页
   - [ ] 浏览器返回按钮正常
   - [ ] 直接访问 `/project/0` 正常

3. **钱包连接**
   - [ ] 点击右上角钱包按钮
   - [ ] 钱包选择器弹出
   - [ ] 可以连接 Petra Wallet

4. **链上数据**
   - [ ] 项目数据正常加载（如果合约已部署）
   - [ ] 投注池显示正常
   - [ ] 赔率计算正常

5. **下注功能**
   - [ ] 可以选择选项
   - [ ] 可以输入金额
   - [ ] 显示预期收益
   - [ ] 可以提交交易（如果合约已部署）

### 🔗 配置合约地址

部署后，确保前端指向正确的合约地址：

**方法 1：硬编码（当前方式）**

编辑 `src/config/aptos.ts`:

```typescript
export const MODULE_ADDRESS = '0x你的合约地址';
```

然后重新提交和部署。

**方法 2：使用环境变量（推荐生产环境）**

1. 修改 `src/config/aptos.ts`:

```typescript
export const MODULE_ADDRESS = import.meta.env.VITE_MODULE_ADDRESS || '0x1';
```

2. 在 Vercel 中添加环境变量：
   - 名称: `VITE_MODULE_ADDRESS`
   - 值: `0x你的合约地址`

3. 重新部署

### 🌐 网络配置

确保前端和智能合约在同一网络：

- **测试网**: `Network.TESTNET`
- **主网**: `Network.MAINNET`

配置在 `src/config/aptos.ts`:

```typescript
const config = new AptosConfig({ network: Network.TESTNET });
```

## 🚀 自动部署

Vercel 支持自动部署：

### Git 推送自动部署

每次推送到 `main` 分支会自动触发部署：

```bash
git add .
git commit -m "Update contract address"
git push
```

Vercel 会自动：
1. 检测到新的提交
2. 运行构建命令
3. 部署新版本

### 预览部署

每次 Pull Request 会创建预览部署：

1. 创建 PR
2. Vercel 自动创建预览链接
3. 可以在 PR 中查看预览
4. 合并后自动部署到生产环境

## 📊 性能优化

### Vercel 自动优化

- ✅ **CDN 加速**: 全球边缘节点
- ✅ **自动压缩**: Gzip/Brotli
- ✅ **HTTP/2**: 更快传输
- ✅ **自动 HTTPS**: SSL 证书
- ✅ **缓存策略**: 静态资源长期缓存

### 代码优化建议

1. **图片优化**
   - Logo 图片已放在 `public/` 目录
   - 建议压缩图片大小
   - 可以使用 WebP 格式

2. **代码分割**
   - 已在 `vite.config.ts` 配置
   - React 和 Aptos SDK 分开打包

3. **懒加载**
   - 路由已自动代码分割
   - 按需加载组件

## 🔧 常见问题

### Q: 部署后页面空白？

**A: 检查以下几点：**
1. 浏览器控制台是否有错误
2. 路由配置是否正确（`vercel.json` 中的 rewrites）
3. 静态资源路径是否正确（`vite.config.ts` 中的 `base`）

### Q: 无法连接钱包？

**A: 确保：**
1. 使用 HTTPS（Vercel 自动提供）
2. Petra Wallet 扩展已安装
3. 钱包和前端在同一网络

### Q: 合约调用失败？

**A: 检查：**
1. `MODULE_ADDRESS` 是否正确
2. 合约是否已部署
3. 网络配置是否一致（测试网/主网）
4. 浏览器控制台错误信息

### Q: 构建失败？

**A: 常见原因：**
1. TypeScript 错误：运行 `npm run build` 本地测试
2. 依赖问题：确保 `package.json` 正确
3. 内存不足：Vercel 免费版有内存限制，尝试优化构建

### Q: 如何回滚？

**A: 在 Vercel Dashboard：**
1. 进入项目 → "Deployments"
2. 找到之前的版本
3. 点击 "⋯" → "Promote to Production"

## 🌍 自定义域名

### 添加域名

1. 进入项目设置 → "Domains"
2. 输入你的域名（如 `cutemarket.com`）
3. 按照提示配置 DNS
4. Vercel 自动配置 SSL

### DNS 配置

添加 CNAME 记录：
- **类型**: CNAME
- **名称**: @ 或 www
- **值**: `cname.vercel-dns.com`

## 📈 监控和分析

### Vercel Analytics

1. 进入项目 → "Analytics"
2. 启用 Analytics（免费版有限制）
3. 查看访问统计

### 错误监控

建议集成 Sentry：

```bash
npm install @sentry/react @sentry/vite-plugin
```

## 🎯 最佳实践

1. ✅ **使用环境变量**管理合约地址
2. ✅ **启用预览部署**测试 PR
3. ✅ **监控构建时间**优化依赖
4. ✅ **定期更新依赖**保持安全
5. ✅ **测试所有功能**部署后验证

## 📚 相关资源

- [Vercel 文档](https://vercel.com/docs)
- [Vite 部署指南](https://vitejs.dev/guide/static-deploy.html)
- [Vercel + React Router](https://vercel.com/guides/deploying-react-with-vercel)

---

## ✨ 总结

cuteMarket 完全适合部署到 Vercel：

✅ **零配置**: Vercel 自动检测 Vite
✅ **自动部署**: Git 推送即部署
✅ **全球 CDN**: 快速访问
✅ **免费 SSL**: HTTPS 自动配置
✅ **预览部署**: PR 自动预览

祝你部署顺利！🚀

