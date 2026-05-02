import { useState, useMemo } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useMarkets } from '../hooks/useMarkets';
import { useUserPositions } from '../hooks/useUserPositions';
import { MarketCard } from '../components/MarketCard';
import { MarketCardSkeleton } from '../components/Skeleton';
import { CATEGORY_LABELS } from '../types';

export function Home() {
  const { account, connected } = useWallet();
  const { markets, loading } = useMarkets();
  const { summary } = useUserPositions(account?.address);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'tvl' | 'newest' | 'ending'>('tvl');

  const filteredMarkets = useMemo(() => {
    let result = markets;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(q));
    }

    if (selectedCategory !== null) {
      result = result.filter((m) => m.category === selectedCategory);
    }

    switch (sortBy) {
      case 'tvl':
        result = [...result].sort((a, b) => b.total_pool - a.total_pool);
        break;
      case 'newest':
        result = [...result].sort((a, b) => b.market_id - a.market_id);
        break;
      case 'ending':
        result = [...result].sort((a, b) => a.end_timestamp - b.end_timestamp);
        break;
    }

    return result;
  }, [markets, search, selectedCategory, sortBy]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-4xl font-bold text-white mb-2">预测市场</h2>
        <p className="text-white/80 text-lg">选择一个市场，预测未来，赢取奖励</p>
      </div>

      {/* Portfolio summary */}
      {connected && summary.totalInvested > 0 && (
        <div className="mb-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">💎</span>
            </div>
            <div>
              <p className="text-white/80 text-sm">你的投资组合</p>
              <p className="text-2xl font-bold text-white">{summary.totalInvested.toFixed(4)} APT</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-white/70 text-xs">参与市场</p>
              <p className="text-xl font-bold text-white">{summary.marketsParticipated}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-white/70 text-xs">持仓数</p>
              <p className="text-xl font-bold text-white">{summary.totalPositions}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search and filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="搜索市场..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg bg-white/90 text-gray-800 placeholder-gray-500"
        />
        <select
          value={selectedCategory ?? ''}
          onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
          className="px-4 py-2 rounded-lg bg-white/90 text-gray-800"
        >
          <option value="">全部分类</option>
          {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'tvl' | 'newest' | 'ending')}
          className="px-4 py-2 rounded-lg bg-white/90 text-gray-800"
        >
          <option value="tvl">热门</option>
          <option value="newest">最新</option>
          <option value="ending">即将到期</option>
        </select>
      </div>

      {/* Market grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <MarketCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredMarkets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/80 text-lg">暂无市场</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMarkets.map((market) => (
            <MarketCard key={market.market_id} market={market} />
          ))}
        </div>
      )}
    </div>
  );
}
