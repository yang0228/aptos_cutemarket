import { useState, useEffect } from 'react';
import { aptos, MODULE_ADDRESS, MODULES, octasToApt } from '../config/aptos';
import { fetchMarketCreatedEvents, type MarketCreatedEventRaw } from '../services/indexer';

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

      const metaEvents = await fetchMarketCreatedEvents();
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

          const [, , , , optionPools, bettingPool, lpReserve, , isSettled] = result as [
            string, string, string, string[], string[], string, string, string, boolean, string
          ];

          marketsWithState.push({
            ...meta,
            total_pool: octasToApt(Number(bettingPool) + Number(lpReserve)),
            is_settled: isSettled,
            option_pools: (optionPools as string[]).map((p) => octasToApt(Number(p))),
          });
        } catch {
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
