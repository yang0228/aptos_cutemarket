import { useState, useEffect } from 'react';
import { aptos, MODULE_ADDRESS, MODULE_NAME, octasToApt } from '../config/aptos';

export interface UserBet {
  projectId: number;
  amounts: number[]; // 用户在该项目的所有下注金额（APT）
  totalAmount: number; // 总下注金额
}

export function useUserBets(userAddress: string | undefined, projectId?: number) {
  const [userBets, setUserBets] = useState<number[]>([]);
  const [totalBet, setTotalBet] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserBets = async () => {
    if (!userAddress || projectId === undefined) {
      setUserBets([]);
      setTotalBet(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 调用合约的 get_user_bets view 函数
      const result = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_user_bets`,
          typeArguments: [],
          functionArguments: [projectId.toString(), userAddress],
        },
      });

      // 解析返回数据
      const betsInOctas = result[0] as string[];
      const betsInApt = betsInOctas.map((bet) => octasToApt(Number(bet)));
      const total = betsInApt.reduce((sum, bet) => sum + bet, 0);

      setUserBets(betsInApt);
      setTotalBet(total);
    } catch (err: any) {
      console.error('获取用户下注失败:', err);
      setError(err.message || '获取数据失败');
      setUserBets([]);
      setTotalBet(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserBets();
  }, [userAddress, projectId]);

  return { userBets, totalBet, loading, error, refetch: fetchUserBets };
}

