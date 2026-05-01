#!/bin/bash

# 🧪 Vercel 构建测试脚本
# 用于在本地模拟 Vercel 的构建过程，确保项目可以成功部署

set -e  # 遇到错误立即退出

echo "🧹 清理旧构建..."
rm -rf dist node_modules/.vite

echo ""
echo "📦 安装依赖..."
npm ci

if [ $? -ne 0 ]; then
  echo "❌ 依赖安装失败！"
  exit 1
fi

echo ""
echo "🔨 执行构建（模拟 Vercel 构建过程）..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ 构建失败！请检查错误信息"
  exit 1
fi

echo ""
echo "✅ 构建成功！"
echo ""
echo "📁 构建输出："
ls -lh dist/

echo ""
echo "📊 文件统计："
find dist -type f | wc -l | xargs echo "  文件数量："
du -sh dist | awk '{print "  总大小：" $1}'

echo ""
echo "🌐 启动预览服务器..."
echo "   访问 http://localhost:4173 测试"
echo ""
echo "   ✅ 测试项："
echo "   - 页面正常加载"
echo "   - 路由跳转正常（如 /project/0）"
echo "   - Logo 和静态资源显示正常"
echo "   - 钱包连接功能正常"
echo ""
echo "   ⏹️  按 Ctrl+C 停止预览服务器"
echo ""

npm run preview

