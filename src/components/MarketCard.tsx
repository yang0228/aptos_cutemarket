import { Link } from 'react-router-dom';
import type { MarketWithMeta } from '../hooks/useMarkets';
import { CATEGORY_LABELS } from '../types';

interface MarketCardProps {
  market: MarketWithMeta;
}

export function MarketCard({ market }: MarketCardProps) {
  const now = Math.floor(Date.now() / 1000);
  const isExpired = now >= market.end_timestamp;
  const endDate = new Date(market.end_timestamp * 1000);

  const statusLabel = market.is_settled ? '已结算' : isExpired ? '已过期' : '进行中';
  const statusColor = market.is_settled
    ? 'bg-green-500'
    : isExpired
    ? 'bg-gray-500'
    : 'bg-blue-500';

  return (
    <Link
      to={`/project/${market.market_id}`}
      className="block bg-white/95 backdrop-blur rounded-xl shadow-lg hover:shadow-xl transition-all overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-800 line-clamp-2">{market.name}</h3>
          <span className={`${statusColor} text-white text-xs px-2 py-1 rounded-full whitespace-nowrap ml-2`}>
            {statusLabel}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
            {CATEGORY_LABELS[market.category] || '其他'}
          </span>
          <span className="text-gray-500 text-xs">
            {endDate.toLocaleDateString()}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">总池</p>
            <p className="text-lg font-bold text-purple-600">
              {market.total_pool.toFixed(2)} APT
            </p>
          </div>
          {market.option_pools.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-500">选项</p>
              <p className="text-sm font-medium text-gray-700">
                {market.options.length} 个
              </p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
