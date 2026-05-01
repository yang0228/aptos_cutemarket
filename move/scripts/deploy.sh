#!/bin/bash

# 部署 cuteMarket 智能合约到 Aptos 测试网

echo "🚀 开始部署 cuteMarket 智能合约..."

# 检查 Aptos CLI 是否安装
if ! command -v aptos &> /dev/null
then
    echo "❌ 错误: Aptos CLI 未安装"
    echo "请访问 https://aptos.dev/cli-tools/aptos-cli-tool/install-aptos-cli 安装"
    exit 1
fi

# 编译合约
echo "📦 编译合约..."
cd "$(dirname "$0")/.."
aptos move compile --named-addresses cutemarket=default

if [ $? -ne 0 ]; then
    echo "❌ 合约编译失败"
    exit 1
fi

echo "✅ 合约编译成功"

# 部署合约
echo "🌐 部署到测试网..."
aptos move publish --named-addresses cutemarket=default --assume-yes

if [ $? -ne 0 ]; then
    echo "❌ 合约部署失败"
    exit 1
fi

echo "✅ 合约部署成功！"

# 获取账户地址
ACCOUNT_ADDR=$(aptos config show-profiles | grep "account" | awk '{print $2}')
echo ""
echo "📝 请记录以下信息："
echo "合约地址: $ACCOUNT_ADDR"
echo ""
echo "⚠️ 请将此地址复制到前端配置文件："
echo "src/config/aptos.ts"
echo "将 MODULE_ADDRESS 改为: '$ACCOUNT_ADDR'"
echo ""
echo "🎯 接下来需要初始化合约："
echo "aptos move run --function-id ${ACCOUNT_ADDR}::prediction_market::initialize --assume-yes"


