import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { TradeEvent } from '../services/indexer';

interface PriceChartProps {
  trades: TradeEvent[];
  options: string[];
}

export function PriceChart({ trades, options }: PriceChartProps) {
  if (trades.length === 0) {
    return (
      <div className="bg-white/95 rounded-xl p-6 text-center">
        <p className="text-gray-500">暂无交易数据</p>
      </div>
    );
  }

  const colors = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

  const chartData = trades.map((t) => {
    const date = new Date(t.timestamp * 1000);
    const point: Record<string, any> = {
      time: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timestamp: t.timestamp,
    };
    point[`option_${t.option_index}`] = (t.new_price_bps / 100).toFixed(1);
    return point;
  });

  // Merge consecutive points with same timestamp
  const merged: Record<string, any>[] = [];
  for (const point of chartData) {
    if (merged.length > 0 && merged[merged.length - 1].timestamp === point.timestamp) {
      Object.assign(merged[merged.length - 1], point);
    } else {
      merged.push({ ...point });
    }
  }

  // Forward-fill missing option prices
  for (let i = 1; i < merged.length; i++) {
    for (let optIdx = 0; optIdx < options.length; optIdx++) {
      const key = `option_${optIdx}`;
      if (merged[i][key] === undefined && merged[i - 1][key] !== undefined) {
        merged[i][key] = merged[i - 1][key];
      }
    }
  }

  return (
    <div className="bg-white/95 rounded-xl p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">价格走势</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={merged}>
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            formatter={(value, name) => {
              const optIdx = Number(String(name).replace('option_', ''));
              return [`${value}%`, options[optIdx] || `选项 ${optIdx}`];
            }}
          />
          {options.map((_, idx) => (
            <Line
              key={idx}
              type="stepAfter"
              dataKey={`option_${idx}`}
              stroke={colors[idx % colors.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
