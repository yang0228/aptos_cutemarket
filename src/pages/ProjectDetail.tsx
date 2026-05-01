import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { PROJECTS } from '../data/projects';
import { getProjectStatus, getStatusText, getStatusColor } from '../utils/dateUtils';
import { ProjectStatus } from '../types';
import { aptos, MODULE_ADDRESS, MODULE_NAME, aptToOctas } from '../config/aptos';
import { useProjectData } from '../hooks/useProjectData';
import { useUserBets } from '../hooks/useUserBets';
import { 
  calculateOdds, 
  calculateExpectedReturn, 
  formatOdds, 
  formatProbability,
  calculateProfitRate 
} from '../utils/oddsCalculator';

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { account, connected, signAndSubmitTransaction } = useWallet();
  
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState<string>('0.1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const project = PROJECTS.find((p) => p.id === Number(id));
  const { data: projectData, loading, refetch } = useProjectData(Number(id));
  const { userBets, totalBet, refetch: refetchBets } = useUserBets(
    account?.address,
    Number(id)
  );

  // 计算每个选项的赔率和预期收益
  const oddsInfo = useMemo(() => {
    if (!projectData || projectData.optionPools.length === 0) return [];
    
    const betAmountNum = parseFloat(betAmount) || 0;
    
    return projectData.optionPools.map((pool) => {
      const odds = calculateOdds(pool, projectData.totalPool);
      const expectedReturn = calculateExpectedReturn(
        betAmountNum,
        pool,
        projectData.totalPool
      );
      const profitRate = calculateProfitRate(betAmountNum, expectedReturn);
      
      return {
        ...odds,
        expectedReturn,
        profitRate,
      };
    });
  }, [projectData, betAmount]);

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white/95 rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">项目未找到</h2>
          <button
            onClick={() => navigate('/')}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const status = getProjectStatus(project);
  const statusText = getStatusText(status);
  const statusColor = getStatusColor(status);
  const isClosed = status !== ProjectStatus.Open || (projectData?.isSettled ?? false);

  const handleBet = async () => {
    if (!connected) {
      setMessage({ type: 'error', text: '请先连接钱包' });
      return;
    }

    if (selectedOption === null) {
      setMessage({ type: 'error', text: '请选择一个投注选项' });
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount < 0.01) {
      setMessage({ type: 'error', text: '投注金额至少为 0.01 APT' });
      return;
    }

    if (isClosed) {
      setMessage({ type: 'error', text: '该项目已关闭，无法下注' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      // 将 APT 转换为 Octas
      const amountInOctas = aptToOctas(amount);

      const response = await signAndSubmitTransaction({
        sender: account!.address,
        data: {
          function: `${MODULE_ADDRESS}::${MODULE_NAME}::place_bet`,
          typeArguments: [],
          functionArguments: [project.id, selectedOption, amountInOctas],
        },
      });
      
      // 等待交易确认
      await aptos.waitForTransaction({ transactionHash: response.hash });

      setMessage({
        type: 'success',
        text: `下注成功！已在选项 "${project.options[selectedOption]}" 上投注 ${amount} APT`,
      });
      
      // 刷新数据
      await refetch();
      await refetchBets();
      
      // 重置表单
      setSelectedOption(null);
      setBetAmount('0.1');
    } catch (error: any) {
      console.error('下注失败:', error);
      setMessage({
        type: 'error',
        text: error.message || '下注失败，请重试',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/')}
        className="mb-6 text-white hover:text-white/80 flex items-center gap-2"
      >
        ← 返回首页
      </button>

      <div className="bg-white/95 backdrop-blur rounded-xl shadow-lg overflow-hidden">
        {/* 项目头部 */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-4xl font-bold">{project.name}</h1>
            <span className={`${statusColor} px-4 py-2 rounded-full text-sm font-semibold`}>
              {projectData?.isSettled ? '已开奖' : statusText}
            </span>
          </div>
          {project.description && (
            <p className="text-white/90 text-lg">{project.description}</p>
          )}
          <div className="flex justify-between items-center mt-4">
            <p className="text-white/80">
              截止日期: <span className="font-semibold">{project.endDate}</span>
            </p>
            <p className="text-white/80">
              总投注额: <span className="font-semibold text-2xl">
                {loading ? '...' : `${projectData?.totalPool.toFixed(2) || 0} APT`}
              </span>
            </p>
          </div>
        </div>

        {/* 项目内容 */}
        <div className="p-8">
          {/* 项目图片 */}
          {project.image && (
            <div className="mb-8 rounded-xl overflow-hidden shadow-2xl">
              <img 
                src={project.image} 
                alt={project.name}
                className="w-full h-auto object-cover"
              />
            </div>
          )}

          {isClosed && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6">
              <p className="font-bold">已截止，等待开奖</p>
              <p className="text-sm">该项目已过结束时间，不能继续下注</p>
            </div>
          )}

          {message && (
            <div
              className={`${
                message.type === 'success'
                  ? 'bg-green-100 border-green-500 text-green-700'
                  : 'bg-red-100 border-red-500 text-red-700'
              } border-l-4 p-4 mb-6`}
            >
              <p>{message.text}</p>
            </div>
          )}

          {/* 用户历史下注 */}
          {connected && totalBet > 0 && (
            <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">你在此项目的历史下注</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {totalBet.toFixed(4)} APT
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">下注次数</p>
                  <p className="text-xl font-bold text-purple-600">
                    {userBets.length} 次
                  </p>
                </div>
              </div>
              {userBets.length > 0 && (
                <div className="mt-4 pt-4 border-t border-purple-200">
                  <p className="text-xs text-gray-500 mb-2">下注明细：</p>
                  <div className="flex flex-wrap gap-2">
                    {userBets.map((bet, index) => (
                      <span 
                        key={index}
                        className="bg-white px-3 py-1 rounded-full text-sm font-medium text-purple-700 shadow-sm"
                      >
                        {bet.toFixed(4)} APT
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 投注选项 */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">选择投注选项</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.options.map((option, index) => {
                const isWinner = projectData?.isSettled && projectData.winningOption === index;
                const pool = projectData?.optionPools[index] || 0;
                const odds = oddsInfo[index];
                
                return (
                  <button
                    key={index}
                    onClick={() => !isClosed && setSelectedOption(index)}
                    disabled={isClosed}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      isWinner
                        ? 'border-green-500 bg-green-50 ring-2 ring-green-500'
                        : selectedOption === index
                        ? 'border-purple-600 bg-purple-50 shadow-lg'
                        : 'border-gray-300 bg-white hover:border-purple-400 hover:shadow-md'
                    } ${isClosed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="text-left">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-xl font-bold text-gray-800">
                          {option} {isWinner && '🏆'}
                        </h3>
                        {odds && odds.odds > 0 && (
                          <div className="text-right">
                            <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-md">
                            x{formatOdds(odds.odds)}
                          </span>
                            <p className="text-xs text-gray-500 mt-1">赔率</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <div>
                          <p className="text-xs text-gray-500">当前投注额</p>
                          <p className="text-lg font-bold text-purple-600">
                        {loading ? '...' : `${pool.toFixed(2)} APT`}
                      </p>
                        </div>
                      {odds && projectData && projectData.totalPool > 0 && (
                          <div>
                            <p className="text-xs text-gray-500">市场占比</p>
                            <p className="text-lg font-bold text-gray-700">
                              {formatProbability(odds.probability)}
                        </p>
                          </div>
                        )}
                      </div>
                      
                      {selectedOption === index && parseFloat(betAmount) > 0 && odds && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-1">若下注 {betAmount} APT 获胜：</p>
                          <p className="text-lg font-bold text-green-600">
                            💰 {odds.expectedReturn.toFixed(2)} APT
                          </p>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 下注表单 */}
          {!isClosed && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">投注金额</h2>
              
              {/* 预期收益提示 */}
              {selectedOption !== null && oddsInfo[selectedOption] && parseFloat(betAmount) > 0 && (
                <div className="mb-4 space-y-4">
                  {/* 主要收益卡片 */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-2xl">💰</span>
                        </div>
                    <div>
                          <p className="text-sm text-gray-600">如果你赢了，将获得</p>
                          <p className="text-3xl font-bold text-green-600">
                            {oddsInfo[selectedOption].expectedReturn.toFixed(4)} APT
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">净利润</p>
                        <p className="text-2xl font-bold text-green-700">
                          +{(oddsInfo[selectedOption].expectedReturn - parseFloat(betAmount)).toFixed(4)} APT
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-green-200">
                      <span className="text-sm text-gray-600">投资回报率 (ROI)</span>
                      <span className="text-lg font-bold text-green-600">
                        +{oddsInfo[selectedOption].profitRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* 详细数据 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">你的投注</p>
                      <p className="text-lg font-bold text-gray-800">{betAmount} APT</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-600 mb-1">当前赔率</p>
                      <p className="text-lg font-bold text-blue-600">
                        x{formatOdds(oddsInfo[selectedOption].odds)}
                      </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-600 mb-1">市场占比</p>
                        <p className="text-lg font-bold text-purple-600">
                          {formatProbability(oddsInfo[selectedOption].probability)}
                      </p>
                    </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3 text-center">
                      💡 赔率会随投注池变化 | 平台手续费 2% | 结算后自动转账到你的钱包
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    输入金额 (APT)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                    placeholder="最少 0.01 APT"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleBet}
                    disabled={isSubmitting || !connected || selectedOption === null}
                    className={`px-8 py-3 rounded-lg font-bold text-white transition-all ${
                      isSubmitting || !connected || selectedOption === null
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {isSubmitting
                      ? '提交中...'
                      : !connected
                      ? '请连接钱包'
                      : selectedOption === null
                      ? '请选择选项'
                      : `下注 ${betAmount} APT`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 总投注池 */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">项目统计</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">总投注额</p>
                <p className="text-2xl font-bold text-purple-600">
                  {loading ? '...' : `${projectData?.totalPool.toFixed(2) || 0} APT`}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">投注选项</p>
                <p className="text-2xl font-bold text-blue-600">{project.options.length}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">平台手续费</p>
                <p className="text-2xl font-bold text-green-600">2%</p>
              </div>
            </div>
            
            {/* 开奖结果 */}
            {projectData?.isSettled && (
              <div className="mt-6 p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                <h3 className="text-lg font-bold text-green-800 mb-2">🏆 开奖结果</h3>
                <p className="text-xl font-bold text-green-700">
                  获胜选项: {project.options[projectData.winningOption]}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


