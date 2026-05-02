# Phase 3: Frontend Core Features Implementation Plan

**Goal:** Rewrite the market detail page with trading panel, price chart, and trade history.

**Architecture:** Replace old ProjectDetail.tsx with new MarketDetail that calls modular contract entry functions (amm::buy_shares, amm::sell_shares), displays price charts from trade events, and shows trade history.

**Tech Stack:** React 18, TypeScript, @aptos-labs/ts-sdk, recharts, Tailwind CSS

---

### Task 1: Install recharts and create PriceChart component

**Files:**
- Install: `recharts`
- Create: `src/components/PriceChart.tsx`

- [ ] **Step 1: Install recharts**

```bash
npm install recharts
```

- [ ] **Step 2: Create PriceChart component**

```tsx
// src/components/PriceChart.tsx
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

  // Build chart data: each trade becomes a data point with prices for all options
  const colors = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

  // Group trades by timestamp and build price snapshots
  const chartData = trades.map((t) => {
    const date = new Date(t.timestamp * 1000);
    const point: Record<string, any> = {
      time: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timestamp: t.timestamp,
    };
    // Set the price for the traded option
    point[`option_${t.option_index}`] = (t.new_price_bps / 100).toFixed(1);
    return point;
  });

  // Merge consecutive points that have the same timestamp
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
            formatter={(value: string, name: string) => {
              const optIdx = Number(name.replace('option_', ''));
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
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/jason/repo/aptos_cutemarket && npm run build`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/components/PriceChart.tsx
git commit -m "feat(frontend): add recharts and PriceChart component"
```

---

### Task 2: Create TradeHistory component

**Files:**
- Create: `src/components/TradeHistory.tsx`

- [ ] **Step 1: Create TradeHistory component**

```tsx
// src/components/TradeHistory.tsx
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

  // Show most recent first
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
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/jason/repo/aptos_cutemarket && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/TradeHistory.tsx
git commit -m "feat(frontend): add TradeHistory component"
```

---

### Task 3: Create OrderPanel component (buy/sell trading)

**Files:**
- Create: `src/components/OrderPanel.tsx`

- [ ] **Step 1: Create OrderPanel component**

```tsx
// src/components/OrderPanel.tsx
import { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { aptos, MODULE_ADDRESS, MODULES, aptToOctas, octasToApt } from '../config/aptos';

interface OrderPanelProps {
  marketId: number;
  marketAddress: string;
  options: string[];
  optionPools: number[];
  totalPool: number;
  isSettled: boolean;
  isExpired: boolean;
  onTradeComplete: () => void;
}

export function OrderPanel({
  marketId,
  options,
  optionPools,
  totalPool,
  isSettled,
  isExpired,
  onTradeComplete,
}: OrderPanelProps) {
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('0.1');
  const [shares, setShares] = useState('100');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isDisabled = isSettled || isExpired;

  const getOptionPrice = (idx: number) => {
    if (totalPool === 0) return 0;
    return optionPools[idx] / totalPool;
  };

  const handleBuy = async () => {
    if (!connected || selectedOption === null) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 0.01) {
      setMessage({ type: 'error', text: '金额至少 0.01 APT' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const amountOctas = aptToOctas(amountNum);
      const response = await signAndSubmitTransaction({
        sender: account!.address,
        data: {
          function: `${MODULE_ADDRESS}::${MODULES.AMM}::buy_shares`,
          typeArguments: [],
          functionArguments: [marketId, selectedOption, amountOctas],
        },
      });

      await aptos.waitForTransaction({ transactionHash: response.hash });

      const price = getOptionPrice(selectedOption);
      const estimatedShares = price > 0 ? amountNum / price : 0;
      setMessage({
        type: 'success',
        text: `买入成功！约获得 ${estimatedShares.toFixed(2)} 份额`,
      });

      onTradeComplete();
      setAmount('0.1');
    } catch (error: any) {
      console.error('Buy failed:', error);
      setMessage({ type: 'error', text: error.message || '交易失败' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSell = async () => {
    if (!connected || selectedOption === null) return;

    const sharesNum = parseFloat(shares);
    if (isNaN(sharesNum) || sharesNum <= 0) {
      setMessage({ type: 'error', text: '请输入卖出份额' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const sharesOctas = aptToOctas(sharesNum);
      const response = await signAndSubmitTransaction({
        sender: account!.address,
        data: {
          function: `${MODULE_ADDRESS}::${MODULES.AMM}::sell_shares`,
          typeArguments: [],
          functionArguments: [marketId, selectedOption, sharesOctas],
        },
      });

      await aptos.waitForTransaction({ transactionHash: response.hash });

      setMessage({ type: 'success', text: '卖出成功！' });
      onTradeComplete();
      setShares('100');
    } catch (error: any) {
      console.error('Sell failed:', error);
      setMessage({ type: 'error', text: error.message || '卖出失败' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white/95 rounded-xl p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">交易</h3>

      {/* Buy/Sell tabs */}
      <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setTab('buy')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'buy' ? 'bg-green-500 text-white' : 'text-gray-600'
          }`}
        >
          买入
        </button>
        <button
          onClick={() => setTab('sell')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'sell' ? 'bg-red-500 text-white' : 'text-gray-600'
          }`}
        >
          卖出
        </button>
      </div>

      {/* Option selection */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">选择选项</p>
        <div className="grid grid-cols-2 gap-2">
          {options.map((opt, idx) => {
            const price = getOptionPrice(idx);
            const isSelected = selectedOption === idx;
            return (
              <button
                key={idx}
                onClick={() => setSelectedOption(idx)}
                disabled={isDisabled}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <p className="text-sm font-bold text-gray-800">{opt}</p>
                <p className="text-xs text-gray-500">{(price * 100).toFixed(1)}%</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Amount input */}
      {tab === 'buy' ? (
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">投入金额 (APT)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isDisabled}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="最少 0.01 APT"
          />
        </div>
      ) : (
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">卖出份额</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            disabled={isDisabled}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="输入份额"
          />
        </div>
      )}

      {/* Estimated return */}
      {selectedOption !== null && tab === 'buy' && parseFloat(amount) > 0 && (
        <div className="mb-4 bg-gray-50 rounded-lg p-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">当前价格</span>
            <span className="font-medium">{(getOptionPrice(selectedOption) * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-500">预计份额</span>
            <span className="font-medium">
              {getOptionPrice(selectedOption) > 0
                ? (parseFloat(amount) / getOptionPrice(selectedOption)).toFixed(2)
                : '0'}
            </span>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={tab === 'buy' ? handleBuy : handleSell}
        disabled={isSubmitting || !connected || selectedOption === null || isDisabled}
        className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
          isSubmitting || !connected || selectedOption === null || isDisabled
            ? 'bg-gray-400 cursor-not-allowed'
            : tab === 'buy'
            ? 'bg-green-500 hover:bg-green-600'
            : 'bg-red-500 hover:bg-red-600'
        }`}
      >
        {isSubmitting
          ? '处理中...'
          : !connected
          ? '请连接钱包'
          : selectedOption === null
          ? '请选择选项'
          : isDisabled
          ? '市场已关闭'
          : tab === 'buy'
          ? `买入 ${options[selectedOption]}`
          : `卖出 ${options[selectedOption]}`}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/jason/repo/aptos_cutemarket && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/OrderPanel.tsx
git commit -m "feat(frontend): add OrderPanel with buy/sell trading"
```

---

### Task 4: Rewrite ProjectDetail page

**Files:**
- Modify: `src/pages/ProjectDetail.tsx` (full rewrite)

- [ ] **Step 1: Rewrite ProjectDetail to use new contract**

The page needs to:
1. Look up the market address from the market ID using `market_core::get_market_meta`
2. Fetch market state using `useProjectData(marketId, marketAddress)`
3. Fetch trade events using `fetchTradeEvents(marketId)`
4. Display OrderPanel, PriceChart, TradeHistory, and market info
5. Call `amm::buy_shares` and `amm::sell_shares` via OrderPanel

Full rewrite content — see the implementation subagent for details.

- [ ] **Step 2: Verify build**

Run: `cd /Users/jason/repo/aptos_cutemarket && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/pages/ProjectDetail.tsx
git commit -m "feat(frontend): rewrite ProjectDetail with trading panel, chart, and history"
```

---

### Task 5: Remove old ProjectCard and unused utilities

**Files:**
- Delete: `src/components/ProjectCard.tsx` (replaced by MarketCard)
- Keep: `src/utils/oddsCalculator.ts` (still used by OrderPanel calculations)
- Keep: `src/utils/dateUtils.ts` (still used)

- [ ] **Step 1: Check for remaining imports**

```bash
grep -r "ProjectCard" src/ --include="*.ts" --include="*.tsx"
grep -r "useUserBets" src/ --include="*.ts" --include="*.tsx"
```

- [ ] **Step 2: Remove unused files**

- [ ] **Step 3: Verify build and commit**

---

## Verification Checklist

- [ ] `npm run build` succeeds
- [ ] Market detail page loads with trading panel
- [ ] Buy/sell transactions submit correctly
- [ ] Price chart renders from trade events
- [ ] Trade history shows recent trades
- [ ] All commits are clean
