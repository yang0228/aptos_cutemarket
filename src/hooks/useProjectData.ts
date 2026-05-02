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

      const [id, , , , optionPools, , endTimestamp, isSettled, winningOption] = result as [
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
