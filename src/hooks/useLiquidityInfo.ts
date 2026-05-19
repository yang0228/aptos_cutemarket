import { useState, useEffect, useCallback } from 'react';
import { aptos, MODULE_ADDRESS, MODULES } from '../config/aptos';

export interface LiquidityInfo {
  lpReserveOctas: number;
  lpSupplyOctas: number;
  userLpBalanceOctas: number;
}

const ZERO_ADDRESS = '0x0';

export function useLiquidityInfo(marketAddress?: string, userAddress?: string) {
  const [info, setInfo] = useState<LiquidityInfo>({
    lpReserveOctas: 0,
    lpSupplyOctas: 0,
    userLpBalanceOctas: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchInfo = useCallback(async () => {
    if (!marketAddress) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const provider = userAddress || ZERO_ADDRESS;
      const result = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::${MODULES.MARKET_CORE}::get_lp_info`,
          typeArguments: [],
          functionArguments: [marketAddress, provider],
        },
      });

      const [lpReserve, lpSupply, lpBalance] = result as [string, string, string];
      setInfo({
        lpReserveOctas: Number(lpReserve),
        lpSupplyOctas: Number(lpSupply),
        userLpBalanceOctas: userAddress ? Number(lpBalance) : 0,
      });
    } catch (err) {
      console.error('Failed to fetch LP info:', err);
    } finally {
      setLoading(false);
    }
  }, [marketAddress, userAddress]);

  useEffect(() => {
    fetchInfo();
    if (marketAddress) {
      const interval = setInterval(fetchInfo, 10000);
      return () => clearInterval(interval);
    }
  }, [fetchInfo, marketAddress]);

  return { info, loading, refetch: fetchInfo };
}
