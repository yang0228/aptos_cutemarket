import { Link } from 'react-router-dom';
import { Project } from '../types';
import { getProjectStatus, getStatusText, getStatusColor } from '../utils/dateUtils';
import { useProjectData } from '../hooks/useProjectData';
import { calculateOdds, formatOdds } from '../utils/oddsCalculator';
import { useMemo } from 'react';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const status = getProjectStatus(project);
  const statusText = getStatusText(status);
  const statusColor = getStatusColor(status);
  const { data, loading } = useProjectData(project.id);

  // 计算最热门的选项（投注比例最高的）
  const hotOption = useMemo(() => {
    if (!data || data.totalPool === 0) return null;

    let maxPool = 0;
    let maxIndex = 0;
    
    data.optionPools.forEach((pool, index) => {
      if (pool > maxPool) {
        maxPool = pool;
        maxIndex = index;
      }
    });

    if (maxPool === 0) return null;

    const odds = calculateOdds(maxPool, data.totalPool);
    const percentage = (maxPool / data.totalPool * 100).toFixed(1);

    return {
      index: maxIndex,
      name: project.options[maxIndex],
      pool: maxPool,
      percentage,
      odds: odds.odds,
    };
  }, [data, project.options]);

  return (
    <Link
      to={`/project/${project.id}`}
      className="block bg-white/95 backdrop-blur rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden"
    >
      {/* 项目图片 */}
      {project.image && (
        <div className="relative h-48 overflow-hidden">
          <img 
            src={project.image} 
            alt={project.name}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>
      )}

      <div className="p-6">
        {/* 标题和状态 */}
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-2xl font-bold text-gray-800">{project.name}</h3>
          <span
            className={`${statusColor} text-white text-xs px-3 py-1 rounded-full font-semibold`}
          >
            {data?.isSettled ? '已开奖' : statusText}
          </span>
        </div>

        {/* 描述 */}
        {project.description && (
          <p className="text-gray-600 mb-4 text-sm">{project.description}</p>
        )}

        {/* 选项 */}
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-2">投注选项：</p>
          <div className="flex flex-wrap gap-2">
            {project.options.map((option, index) => (
              <span
                key={index}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  data?.isSettled && data.winningOption === index
                    ? 'bg-green-100 text-green-700 ring-2 ring-green-500'
                    : 'bg-purple-100 text-purple-700'
                }`}
              >
                {option}
                {data?.isSettled && data.winningOption === index && ' 🏆'}
              </span>
            ))}
          </div>
        </div>

        {/* 投注池和热门选项 */}
        <div className="mb-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">总投注额:</p>
            <span className="font-bold text-purple-600 text-lg">
              {loading ? '...' : `${data?.totalPool.toFixed(2) || 0} APT`}
            </span>
          </div>

          {/* 最热门选项 */}
          {hotOption && (
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔥</span>
                  <span className="text-xs text-gray-600">最热选项</span>
                </div>
                <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                  {hotOption.percentage}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-800">{hotOption.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">赔率</span>
                  <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-sm font-bold">
                    x{formatOdds(hotOption.odds)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 结束时间 */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            截止日期: <span className="font-semibold text-gray-700">{project.endDate}</span>
          </p>
          <span className="text-purple-600 font-semibold hover:text-purple-700">
            查看详情 →
          </span>
        </div>
      </div>
    </Link>
  );
}

