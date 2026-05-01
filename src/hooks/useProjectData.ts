import { useState, useEffect } from 'react';
import { aptos, MODULE_ADDRESS, MODULE_NAME, octasToApt } from '../config/aptos';

export interface ProjectData {
  id: number;
  endTimestamp: number;
  isSettled: boolean;
  winningOption: number;
  optionPools: number[]; // 单位：APT
  totalPool: number;      // 单位：APT
}

export function useProjectData(projectId: number) {
  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 调用合约的 view 函数
      const result = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_project_info`,
          typeArguments: [],
          functionArguments: [projectId.toString()],
        },
      });

      // 解析返回数据
      const [id, endTimestamp, isSettled, winningOption, optionPools] = result as [
        string,
        string,
        boolean,
        string,
        string[]
      ];

      // 转换为 APT
      const poolsInApt = optionPools.map((pool) => octasToApt(Number(pool)));
      const total = poolsInApt.reduce((sum, pool) => sum + pool, 0);

      setData({
        id: Number(id),
        endTimestamp: Number(endTimestamp),
        isSettled,
        winningOption: Number(winningOption),
        optionPools: poolsInApt,
        totalPool: total,
      });
    } catch (err: any) {
      // 如果合约未初始化，返回默认值
      if (err.message?.includes('RESOURCE_NOT_FOUND') || err.message?.includes('not published')) {
        setData({
          id: projectId,
          endTimestamp: 0,
          isSettled: false,
          winningOption: 0,
          optionPools: [],
          totalPool: 0,
        });
      } else {
        console.error('获取项目数据失败:', err);
        setError(err.message || '获取数据失败');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // 每 10 秒刷新一次数据
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [projectId]);

  return { data, loading, error, refetch: fetchData };
}


