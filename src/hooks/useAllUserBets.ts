import { useState, useEffect } from 'react';
import { PROJECTS } from '../data/projects';

export interface UserBetSummary {
  totalBet: number; // 总下注金额
  projectsCount: number; // 参与的项目数
  betsCount: number; // 总下注次数
  projectDetails: Array<{
    projectId: number;
    projectName: string;
    totalBet: number;
    betsCount: number;
  }>;
}

export function useAllUserBets(userAddress: string | undefined) {
  const [summary, setSummary] = useState<UserBetSummary>({
    totalBet: 0,
    projectsCount: 0,
    betsCount: 0,
    projectDetails: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userAddress) {
      setSummary({
        totalBet: 0,
        projectsCount: 0,
        betsCount: 0,
        projectDetails: [],
      });
      return;
    }

    const fetchAllBets = async () => {
      setLoading(true);
      
      const projectDetails = [];
      let totalBet = 0;
      let totalBetsCount = 0;
      let projectsWithBets = 0;

      // 导入所有项目的 useUserBets hook
      for (const project of PROJECTS) {
        try {
          // 这里需要直接调用 API，因为不能在循环中使用 hook
          const { aptos, MODULE_ADDRESS, MODULE_NAME, octasToApt } = await import('../config/aptos');
          
          const result = await aptos.view({
            payload: {
              function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_user_bets`,
              typeArguments: [],
              functionArguments: [project.id.toString(), userAddress],
            },
          });

          const betsInOctas = result[0] as string[];
          const betsInApt = betsInOctas.map((bet) => octasToApt(Number(bet)));
          const projectTotal = betsInApt.reduce((sum, bet) => sum + bet, 0);

          if (projectTotal > 0) {
            projectDetails.push({
              projectId: project.id,
              projectName: project.name,
              totalBet: projectTotal,
              betsCount: betsInApt.length,
            });
            totalBet += projectTotal;
            totalBetsCount += betsInApt.length;
            projectsWithBets++;
          }
        } catch (error) {
          // 忽略错误，继续下一个项目
          console.error(`获取项目 ${project.id} 失败:`, error);
        }
      }

      setSummary({
        totalBet,
        projectsCount: projectsWithBets,
        betsCount: totalBetsCount,
        projectDetails,
      });
      setLoading(false);
    };

    fetchAllBets();
  }, [userAddress]);

  return { summary, loading };
}

