import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { PROJECTS } from '../data/projects';
import { ProjectCard } from '../components/ProjectCard';
import { useAllUserBets } from '../hooks/useAllUserBets';

export function Home() {
  const { account, connected } = useWallet();
  const { summary } = useAllUserBets(account?.address);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-4xl font-bold text-white mb-2">预测市场</h2>
        <p className="text-white/80 text-lg">
          选择一个项目，预测未来，赢取奖励
        </p>
      </div>

      {/* 用户统计面板 */}
      {connected && summary.totalBet > 0 && (
        <div className="mb-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-4xl">💎</span>
              </div>
              <div className="max-w-[260px]">
                <p className="text-white/80 text-sm leading-snug">你的投资组合</p>
                <p className="text-3xl font-bold text-white truncate">
                  {summary.totalBet.toFixed(4)} APT
                </p>
                {account?.address && (
                  <p className="text-white/70 text-xs font-mono break-all mt-1">
                    {account.address}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <p className="text-white/70 text-sm mb-1">参与项目</p>
              <p className="text-2xl font-bold text-white">{summary.projectsCount}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <p className="text-white/70 text-sm mb-1">下注次数</p>
              <p className="text-2xl font-bold text-white">{summary.betsCount}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <p className="text-white/70 text-sm mb-1">平均每注</p>
              <p className="text-2xl font-bold text-white">
                {(summary.totalBet / summary.betsCount).toFixed(2)}
              </p>
            </div>
          </div>

          {/* 项目明细 */}
          {summary.projectDetails.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-white/80 text-sm mb-3">投资分布：</p>
              <div className="space-y-2">
                {summary.projectDetails.map((detail) => (
                  <div 
                    key={detail.projectId}
                    className="flex items-center justify-between bg-white/10 backdrop-blur rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">{detail.projectName}</span>
                      <span className="text-white/60 text-sm">({detail.betsCount} 次)</span>
                    </div>
                    <span className="text-white font-bold">{detail.totalBet.toFixed(4)} APT</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PROJECTS.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}

