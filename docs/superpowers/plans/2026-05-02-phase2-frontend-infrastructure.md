# Phase 2: Frontend Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the frontend to work with the new modular contract architecture, add event indexing, and set up routing for new pages.

**Architecture:** Update config/types for multi-module contract, create event indexer service using `aptos.getEvents()`, refactor hooks to call new contract view functions, add routes for /create, /portfolio, /history.

**Tech Stack:** React 18, TypeScript, @aptos-labs/ts-sdk, react-router-dom v6, Tailwind CSS

---

## File Structure

```
src/
├── config/
│   └── aptos.ts                    # Modify: add module name constants
├── types/
│   └── index.ts                    # Modify: add new types
├── services/
│   └── indexer.ts                  # Create: event indexing service
├── hooks/
│   ├── useMarkets.ts               # Create: market list hook
│   ├── useMarketData.ts            # Rewrite: adapt to new contract
│   ├── useUserPositions.ts         # Create: user positions hook
│   └── useAllUserBets.ts           # Delete: replaced by useUserPositions
├── components/
│   └── MarketCard.tsx              # Create: market card component
├── pages/
│   ├── Home.tsx                    # Modify: use new hooks
│   └── Portfolio.tsx               # Create: portfolio page
├── App.tsx                         # Modify: add new routes
└── data/
    └── projects.ts                 # Keep: still used for static metadata
```

---

### Task 1: Update Config and Types

**Files:**
- Modify: `src/config/aptos.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Update aptos.ts with new module names**

```typescript
// src/config/aptos.ts
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

const config = new AptosConfig({ network: Network.TESTNET });
export const aptos = new Aptos(config);

export const MODULE_ADDRESS = import.meta.env.VITE_MODULE_ADDRESS || '0x8ebb5f208e99f14584dc352204b107f8c9570a8481cf23e830fee296bd1515cb';

// Module names for the new modular contract
export const MODULES = {
  MARKET_CORE: 'market_core',
  AMM: 'amm',
  ORACLE: 'oracle',
  GOVERNANCE: 'governance',
  EVENTS: 'events',
} as const;

// Legacy module name (for backward compatibility during migration)
export const MODULE_NAME = 'prediction_market';

export const OCTAS_PER_APT = 100000000;

export function octasToApt(octas: number): number {
  return octas / OCTAS_PER_APT;
}

export function aptToOctas(apt: number): number {
  return Math.floor(apt * OCTAS_PER_APT);
}
```

- [ ] **Step 2: Update types/index.ts**

```typescript
// src/types/index.ts
export interface Project {
  id: number;
  name: string;
  options: string[];
  endDate: string;
  description?: string;
  image?: string;
}

export enum ProjectStatus {
  Open = 'open',
  Closed = 'closed',
  Settled = 'settled',
}

export interface BetOption {
  index: number;
  name: string;
  totalAmount: number;
}

// New types for modular contract

export interface MarketMeta {
  market_id: number;
  market_address: string;
  creator: string;
  category: number;
  created_at: number;
}

export interface MarketData {
  market_id: number;
  name: string;
  description: string;
  options: string[];
  option_pools: number[];      // in APT
  total_pool: number;           // in APT
  end_timestamp: number;
  is_settled: boolean;
  winning_option: number;
}

export interface UserBetRecord {
  option_index: number;
  shares: number;
  cost: number;                 // in APT
}

export const CATEGORY_LABELS: Record<number, string> = {
  0: '体育',
  1: '加密货币',
  2: '政治',
  3: '娱乐',
  4: '科技',
  5: '其他',
};
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/jason/repo/aptos_cutemarket && npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/config/aptos.ts src/types/index.ts
git commit -m "feat(frontend): update config and types for modular contract"
```

---

### Task 2: Create Event Indexer Service

**Files:**
- Create: `src/services/indexer.ts`

- [ ] **Step 1: Create the indexer service**

```typescript
// src/services/indexer.ts
import { aptos, MODULE_ADDRESS, MODULES, octasToApt } from '../config/aptos';
import type { MarketMeta, MarketData } from '../types';

const EVENTS = {
  MARKET_CREATED: `${MODULE_ADDRESS}::${MODULES.EVENTS}::MarketCreatedEvent`,
  SHARES_PURCHASED: `${MODULE_ADDRESS}::${MODULES.EVENTS}::SharesPurchasedEvent`,
  SHARES_SOLD: `${MODULE_ADDRESS}::${MODULES.EVENTS}::SharesSoldEvent`,
  MARKET_SETTLED: `${MODULE_ADDRESS}::${MODULES.EVENTS}::MarketSettledEvent`,
  LIQUIDITY_ADDED: `${MODULE_ADDRESS}::${MODULES.EVENTS}::LiquidityAddedEvent`,
  WINNINGS_CLAIMED: `${MODULE_ADDRESS}::${MODULES.EVENTS}::WinningsClaimedEvent`,
};

export interface TradeEvent {
  type: 'buy' | 'sell';
  market_id: number;
  user: string;
  option_index: number;
  amount: number;       // APT
  shares: number;
  new_price_bps: number;
  timestamp: number;
}

export interface MarketCreatedEventRaw {
  market_id: number;
  market_address: string;
  creator: string;
  name: string;
  options: string[];
  end_timestamp: number;
  category: number;
}

// Fetch all market creation events
export async function fetchMarketCreatedEvents(): Promise<MarketCreatedEventRaw[]> {
  try {
    const events = await aptos.getEventsByEventType({
      eventType: EVENTS.MARKET_CREATED,
      options: { orderBy: [{ transaction_version: 'desc' }] },
    });

    return events.map((e: any) => ({
      market_id: Number(e.data.market_id),
      market_address: e.data.market_address,
      creator: e.data.creator,
      name: e.data.name,
      options: e.data.options,
      end_timestamp: Number(e.data.end_timestamp),
      category: Number(e.data.category),
    }));
  } catch {
    return [];
  }
}

// Fetch trade events for a market
export async function fetchTradeEvents(marketId: number): Promise<TradeEvent[]> {
  try {
    const [buyEvents, sellEvents] = await Promise.all([
      aptos.getEventsByEventType({
        eventType: EVENTS.SHARES_PURCHASED,
        options: {
          where: { indexed_type: { _eq: EVENTS.SHARES_PURCHASED } },
          orderBy: [{ transaction_version: 'asc' }],
        },
      }),
      aptos.getEventsByEventType({
        eventType: EVENTS.SHARES_SOLD,
        options: {
          where: { indexed_type: { _eq: EVENTS.SHARES_SOLD } },
          orderBy: [{ transaction_version: 'asc' }],
        },
      }),
    ]);

    const trades: TradeEvent[] = [];

    for (const e of buyEvents as any[]) {
      if (Number(e.data.market_id) === marketId) {
        trades.push({
          type: 'buy',
          market_id: marketId,
          user: e.data.user,
          option_index: Number(e.data.option_index),
          amount: octasToApt(Number(e.data.amount)),
          shares: Number(e.data.shares_received),
          new_price_bps: Number(e.data.new_price_bps),
          timestamp: Number(e.data.timestamp),
        });
      }
    }

    for (const e of sellEvents as any[]) {
      if (Number(e.data.market_id) === marketId) {
        trades.push({
          type: 'sell',
          market_id: marketId,
          user: e.data.user,
          option_index: Number(e.data.option_index),
          amount: octasToApt(Number(e.data.amount_received)),
          shares: Number(e.data.shares),
          new_price_bps: Number(e.data.new_price_bps),
          timestamp: Number(e.data.timestamp),
        });
      }
    }

    return trades.sort((a, b) => a.timestamp - b.timestamp);
  } catch {
    return [];
  }
}

// Fetch price history for a market (derived from trade events)
export interface PricePoint {
  timestamp: number;
  prices: number[]; // price per option in BPS (0-10000)
}

export async function fetchPriceHistory(marketId: number): Promise<PricePoint[]> {
  const trades = await fetchTradeEvents(marketId);
  return trades.map((t) => ({
    timestamp: t.timestamp,
    prices: [t.new_price_bps], // simplified: only tracks the traded option's price
  }));
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/jason/repo/aptos_cutemarket && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/services/indexer.ts
git commit -m "feat(frontend): add event indexer service for market and trade events"
```

---

### Task 3: Create useMarkets Hook

**Files:**
- Create: `src/hooks/useMarkets.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/hooks/useMarkets.ts
import { useState, useEffect } from 'react';
import { aptos, MODULE_ADDRESS, MODULES, octasToApt } from '../config/aptos';
import { fetchMarketCreatedEvents, type MarketCreatedEventRaw } from '../services/indexer';
import type { MarketData } from '../types';

export interface MarketWithMeta extends MarketCreatedEventRaw {
  total_pool: number;
  is_settled: boolean;
  option_pools: number[];
}

export function useMarkets() {
  const [markets, setMarkets] = useState<MarketWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkets = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all market creation events
      const metaEvents = await fetchMarketCreatedEvents();

      // For each market, fetch current state
      const marketsWithState: MarketWithMeta[] = [];

      for (const meta of metaEvents) {
        try {
          const result = await aptos.view({
            payload: {
              function: `${MODULE_ADDRESS}::${MODULES.MARKET_CORE}::get_market_state`,
              typeArguments: [],
              functionArguments: [meta.market_address],
            },
          });

          const [, , , , optionPools, totalPool, , isSettled] = result as [
            string, string, string, string[], string[], string, string, boolean, string
          ];

          marketsWithState.push({
            ...meta,
            total_pool: octasToApt(Number(totalPool)),
            is_settled: isSettled,
            option_pools: (optionPools as string[]).map((p) => octasToApt(Number(p))),
          });
        } catch {
          // If state fetch fails, still include the market with defaults
          marketsWithState.push({
            ...meta,
            total_pool: 0,
            is_settled: false,
            option_pools: [],
          });
        }
      }

      setMarkets(marketsWithState);
    } catch (err: any) {
      console.error('Failed to fetch markets:', err);
      setError(err.message || 'Failed to fetch markets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 30000);
    return () => clearInterval(interval);
  }, []);

  return { markets, loading, error, refetch: fetchMarkets };
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/jason/repo/aptos_cutemarket && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMarkets.ts
git commit -m "feat(frontend): add useMarkets hook for dynamic market list"
```

---

### Task 4: Rewrite useMarketData Hook

**Files:**
- Modify: `src/hooks/useProjectData.ts` (rewrite)

- [ ] **Step 1: Rewrite the hook to use new contract**

```typescript
// src/hooks/useProjectData.ts
import { useState, useEffect } from 'react';
import { aptos, MODULE_ADDRESS, MODULES, octasToApt } from '../config/aptos';

export interface ProjectData {
  id: number;
  marketAddress: string;
  endTimestamp: number;
  isSettled: boolean;
  winningOption: number;
  optionPools: number[]; // in APT
  totalPool: number;     // in APT
}

export function useProjectData(marketId: number, marketAddress?: string) {
  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!marketAddress) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::${MODULES.MARKET_CORE}::get_market_state`,
          typeArguments: [],
          functionArguments: [marketAddress],
        },
      });

      const [id, , , , optionPools, totalPool, endTimestamp, isSettled, winningOption] = result as [
        string, string, string, string[], string[], string, string, boolean, string
      ];

      const poolsInApt = (optionPools as string[]).map((pool) => octasToApt(Number(pool)));
      const total = poolsInApt.reduce((sum, pool) => sum + pool, 0);

      setData({
        id: Number(id),
        marketAddress,
        endTimestamp: Number(endTimestamp),
        isSettled,
        winningOption: Number(winningOption),
        optionPools: poolsInApt,
        totalPool: total,
      });
    } catch (err: any) {
      if (err.message?.includes('RESOURCE_NOT_FOUND') || err.message?.includes('not published')) {
        setData(null);
      } else {
        console.error('Failed to fetch market data:', err);
        setError(err.message || 'Failed to fetch data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (marketAddress) {
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [marketId, marketAddress]);

  return { data, loading, error, refetch: fetchData };
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/jason/repo/aptos_cutemarket && npm run build`
Expected: Build succeeds (may have type errors in pages that use the old interface — those will be fixed in later tasks).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useProjectData.ts
git commit -m "feat(frontend): rewrite useProjectData for modular contract"
```

---

### Task 5: Create useUserPositions Hook

**Files:**
- Create: `src/hooks/useUserPositions.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/hooks/useUserPositions.ts
import { useState, useEffect } from 'react';
import { aptos, MODULE_ADDRESS, MODULES, octasToApt } from '../config/aptos';
import type { MarketMeta } from '../types';

export interface Position {
  marketId: number;
  marketAddress: string;
  marketName: string;
  optionIndex: number;
  optionName: string;
  shares: number;
  cost: number;           // total cost in APT
  currentPrice: number;   // in BPS (0-10000)
  isSettled: boolean;
  winningOption: number;
}

export interface PortfolioSummary {
  totalInvested: number;   // APT
  totalPositions: number;
  marketsParticipated: number;
  positions: Position[];
}

export function useUserPositions(userAddress: string | undefined) {
  const [summary, setSummary] = useState<PortfolioSummary>({
    totalInvested: 0,
    totalPositions: 0,
    marketsParticipated: 0,
    positions: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userAddress) {
      setSummary({ totalInvested: 0, totalPositions: 0, marketsParticipated: 0, positions: [] });
      return;
    }

    const fetchPositions = async () => {
      setLoading(true);
      try {
        // Get all markets from registry
        const countResult = await aptos.view({
          payload: {
            function: `${MODULE_ADDRESS}::${MODULES.MARKET_CORE}::get_market_count`,
            typeArguments: [],
            functionArguments: [],
          },
        });
        const marketCount = Number(countResult[0]);

        const positions: Position[] = [];
        let totalInvested = 0;
        const marketSet = new Set<number>();

        for (let i = 0; i < marketCount; i++) {
          try {
            // Get market meta
            const metaResult = await aptos.view({
              payload: {
                function: `${MODULE_ADDRESS}::${MODULES.MARKET_CORE}::get_market_meta`,
                typeArguments: [],
                functionArguments: [i.toString()],
              },
            });
            const meta = metaResult[0] as any;
            const marketAddr = meta.market_address;

            // Get user bets
            const betsResult = await aptos.view({
              payload: {
                function: `${MODULE_ADDRESS}::${MODULES.MARKET_CORE}::get_user_bets`,
                typeArguments: [],
                functionArguments: [marketAddr, userAddress],
              },
            });
            const bets = betsResult[0] as any[];

            if (bets.length === 0) continue;

            // Get market state for option names
            const stateResult = await aptos.view({
              payload: {
                function: `${MODULE_ADDRESS}::${MODULES.MARKET_CORE}::get_market_state`,
                typeArguments: [],
                functionArguments: [marketAddr],
              },
            });
            const [, name, , options, , , , isSettled, winningOption] = stateResult as [
              string, string, string, string[], string[], string, string, boolean, string
            ];

            // Aggregate bets by option
            const optionMap = new Map<number, { shares: number; cost: number }>();
            for (const bet of bets) {
              const optIdx = Number(bet.option_index);
              const existing = optionMap.get(optIdx) || { shares: 0, cost: 0 };
              existing.shares += Number(bet.shares);
              existing.cost += octasToApt(Number(bet.cost));
              optionMap.set(optIdx, existing);
            }

            for (const [optIdx, { shares, cost }] of optionMap) {
              positions.push({
                marketId: i,
                marketAddress: marketAddr,
                marketName: name,
                optionIndex: optIdx,
                optionName: options[optIdx] || `Option ${optIdx}`,
                shares,
                cost,
                currentPrice: 0, // would need price calculation
                isSettled,
                winningOption: Number(winningOption),
              });
              totalInvested += cost;
              marketSet.add(i);
            }
          } catch {
            // Skip markets that fail
          }
        }

        setSummary({
          totalInvested,
          totalPositions: positions.length,
          marketsParticipated: marketSet.size,
          positions,
        });
      } catch (err) {
        console.error('Failed to fetch positions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();
    const interval = setInterval(fetchPositions, 10000);
    return () => clearInterval(interval);
  }, [userAddress]);

  return { summary, loading };
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/jason/repo/aptos_cutemarket && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useUserPositions.ts
git commit -m "feat(frontend): add useUserPositions hook for portfolio tracking"
```

---

### Task 6: Create MarketCard Component and Update Home Page

**Files:**
- Create: `src/components/MarketCard.tsx`
- Modify: `src/pages/Home.tsx`

- [ ] **Step 1: Create MarketCard component**

```tsx
// src/components/MarketCard.tsx
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
```

- [ ] **Step 2: Update Home.tsx to use new hooks**

```tsx
// src/pages/Home.tsx
import { useState, useMemo } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useMarkets } from '../hooks/useMarkets';
import { useUserPositions } from '../hooks/useUserPositions';
import { MarketCard } from '../components/MarketCard';
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
      result = result.filter(
        (m) => m.name.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== null) {
      result = result.filter((m) => m.category === selectedCategory);
    }

    switch (sortBy) {
      case 'tvl':
        result = [...result].sort((a, b) => b.total_pool - a.total_pool);
        break;
      case 'newest':
        result = [...result].sort((a, b) => b.created_at - a.created_at);
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
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 rounded-lg bg-white/90 text-gray-800"
        >
          <option value="tvl">热门</option>
          <option value="newest">最新</option>
          <option value="ending">即将到期</option>
        </select>
      </div>

      {/* Market grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-white/80 text-lg">加载中...</p>
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
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/jason/repo/aptos_cutemarket && npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/MarketCard.tsx src/pages/Home.tsx
git commit -m "feat(frontend): add MarketCard and update Home with search/filter/sort"
```

---

### Task 7: Add New Routes and Portfolio Page

**Files:**
- Create: `src/pages/Portfolio.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create Portfolio page**

```tsx
// src/pages/Portfolio.tsx
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useUserPositions } from '../hooks/useUserPositions';
import { Link } from 'react-router-dom';

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
        <p className="text-white/80 text-center">加载中...</p>
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
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    pos.optionIndex === pos.winningOption ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                  }`}>
                    {pos.optionIndex === pos.winningOption ? '获胜' : '未中'}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3">
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx with new routes**

```tsx
// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './context/WalletProvider';
import { Header } from './components/Header';
import { WalletButton } from './components/WalletButton';
import { Home } from './pages/Home';
import { ProjectDetail } from './pages/ProjectDetail';
import { Portfolio } from './pages/Portfolio';

function App() {
  return (
    <WalletProvider>
      <Router>
        <div className="min-h-screen">
          <Header />
          <WalletButton />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/project/:id" element={<ProjectDetail />} />
            <Route path="/portfolio" element={<Portfolio />} />
          </Routes>
        </div>
      </Router>
    </WalletProvider>
  );
}

export default App;
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/jason/repo/aptos_cutemarket && npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Portfolio.tsx src/App.tsx
git commit -m "feat(frontend): add Portfolio page and new routes"
```

---

### Task 8: Cleanup and Final Verification

**Files:**
- Delete: `src/hooks/useAllUserBets.ts` (replaced by useUserPositions)
- Modify: `src/pages/Home.tsx` (remove old import if any)

- [ ] **Step 1: Remove old hook**

```bash
rm src/hooks/useAllUserBets.ts
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/jason/repo/aptos_cutemarket && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add -A src/
git commit -m "refactor(frontend): remove old useAllUserBets hook, replaced by useUserPositions"
```

---

## Verification Checklist

After all tasks:

- [ ] `npm run build` succeeds
- [ ] Home page loads with market list (from chain events)
- [ ] Search/filter/sort work on Home page
- [ ] Portfolio page shows user positions
- [ ] New routes (/portfolio) are accessible
- [ ] All commits are clean
