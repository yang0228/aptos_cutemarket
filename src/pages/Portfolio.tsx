import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useUserPositions } from '../hooks/useUserPositions';
import { Link } from 'react-router-dom';
import { ClaimButton } from '../components/ClaimButton';
import { PositionCardSkeleton } from '../components/Skeleton';

export function Portfolio() {
  const { account, connected } = useWallet();
  const { summary, loading } = useUserPositions(account?.address);

  if (!connected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white/95 rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">请先连接钱包</h2>
          <p className="text-gray-600">连接钱包后查看你的持仓</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">我的持仓</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/95 rounded-xl p-6">
          <p className="text-sm text-gray-500">总投资</p>
          <p className="text-2xl font-bold text-purple-600">{summary.totalInvested.toFixed(4)} APT</p>
        </div>
        <div className="bg-white/95 rounded-xl p-6">
          <p className="text-sm text-gray-500">参与市场</p>
          <p className="text-2xl font-bold text-blue-600">{summary.marketsParticipated}</p>
        </div>
        <div className="bg-white/95 rounded-xl p-6">
          <p className="text-sm text-gray-500">持仓数</p>
          <p className="text-2xl font-bold text-green-600">{summary.totalPositions}</p>
        </div>
      </div>

      {/* Positions list */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <PositionCardSkeleton key={i} />
          ))}
        </div>
      ) : summary.positions.length === 0 ? (
        <div className="bg-white/95 rounded-xl p-8 text-center">
          <p className="text-gray-600">暂无持仓</p>
          <Link to="/" className="text-purple-600 hover:underline mt-2 inline-block">
            去浏览市场
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {summary.positions.map((pos, i) => (
            <div key={i} className="bg-white/95 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <Link to={`/project/${pos.marketId}`} className="text-lg font-bold text-gray-800 hover:text-purple-600">
                  {pos.marketName}
                </Link>
                {pos.isSettled && (
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      pos.optionIndex === pos.winningOption ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {pos.optionIndex === pos.winningOption ? '获胜' : '未中'}
                    </span>
                    {pos.optionIndex === pos.winningOption && (
                      <ClaimButton
                        marketId={pos.marketId}
                        marketName={pos.marketName}
                        isWinner={true}
                      />
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-5 gap-4 mt-3">
                <div>
                  <p className="text-xs text-gray-500">选项</p>
                  <p className="font-medium text-gray-700">{pos.optionName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">投入</p>
                  <p className="font-medium text-gray-700">{pos.cost.toFixed(4)} APT</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">份额</p>
                  <p className="font-medium text-gray-700">{pos.shares.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">当前价格</p>
                  <p className="font-medium text-gray-700">{pos.isSettled ? '-' : (pos.currentPrice / 100).toFixed(2) + '%'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">盈亏</p>
                  {pos.isSettled ? (
                    <p className="font-medium text-gray-500">-</p>
                  ) : (
                    <>
                      <p className={`font-medium ${pos.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pos.unrealizedPnL >= 0 ? '+' : ''}{pos.unrealizedPnL.toFixed(4)} APT
                      </p>
                      <p className={`text-xs ${pos.unrealizedROI >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {pos.unrealizedROI >= 0 ? '+' : ''}{pos.unrealizedROI.toFixed(1)}%
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
