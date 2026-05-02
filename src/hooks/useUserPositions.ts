import { useState, useEffect } from 'react';
import { aptos, MODULE_ADDRESS, MODULES, octasToApt } from '../config/aptos';

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
            const metaResult = await aptos.view({
              payload: {
                function: `${MODULE_ADDRESS}::${MODULES.MARKET_CORE}::get_market_meta`,
                typeArguments: [],
                functionArguments: [i.toString()],
              },
            });
            const meta = metaResult[0] as any;
            const marketAddr = meta.market_address;

            const betsResult = await aptos.view({
              payload: {
                function: `${MODULE_ADDRESS}::${MODULES.MARKET_CORE}::get_user_bets`,
                typeArguments: [],
                functionArguments: [marketAddr, userAddress],
              },
            });
            const bets = betsResult[0] as any[];

            if (bets.length === 0) continue;

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
                currentPrice: 0,
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
