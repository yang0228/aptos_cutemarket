import type { TradeEvent } from '../services/indexer';

interface TradeHistoryProps {
  trades: TradeEvent[];
  options: string[];
}

export function TradeHistory({ trades, options }: TradeHistoryProps) {
  if (trades.length === 0) {
    return (
      <div className="bg-white/95 rounded-xl p-6 text-center">
        <p className="text-gray-500">暂无交易记录</p>
      </div>
    );
  }

  const sorted = [...trades].reverse().slice(0, 50);

  return (
    <div className="bg-white/95 rounded-xl p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">交易记录</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {sorted.map((trade, i) => {
          const date = new Date(trade.timestamp * 1000);
          const timeStr = date.toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  trade.type === 'buy'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {trade.type === 'buy' ? '买入' : '卖出'}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {options[trade.option_index] || `选项 ${trade.option_index}`}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-800">{trade.amount.toFixed(4)} APT</p>
                <p className="text-xs text-gray-500">{timeStr}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
