import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { aptos, MODULE_ADDRESS, MODULES } from '../config/aptos';
import { useProjectData } from '../hooks/useProjectData';
import { fetchTradeEvents, type TradeEvent } from '../services/indexer';
import { OrderPanel } from '../components/OrderPanel';
import { PriceChart } from '../components/PriceChart';
import { TradeHistory } from '../components/TradeHistory';
import { calculateOdds, formatOdds, formatProbability } from '../utils/oddsCalculator';
import { Skeleton } from '../components/Skeleton';

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const marketId = Number(id);

  const [marketAddress, setMarketAddress] = useState<string | null>(null);
  const [marketName, setMarketName] = useState<string>('');
  const [marketOptions, setMarketOptions] = useState<string[]>([]);
  const [marketDescription, setMarketDescription] = useState<string>('');
  const [trades, setTrades] = useState<TradeEvent[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const { data: projectData, loading, refetch } = useProjectData(marketId, marketAddress || undefined);

  // Fetch market meta (address, name, options)
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        setLoadingMeta(true);
        const result = await aptos.view({
          payload: {
            function: `${MODULE_ADDRESS}::${MODULES.MARKET_CORE}::get_market_meta`,
            typeArguments: [],
            functionArguments: [marketId.toString()],
          },
        });
        const meta = result[0] as any;
        setMarketAddress(meta.market_address);

        // Also fetch market state for name/options/description
        const stateResult = await aptos.view({
          payload: {
            function: `${MODULE_ADDRESS}::${MODULES.MARKET_CORE}::get_market_state`,
            typeArguments: [],
            functionArguments: [meta.market_address],
          },
        });
        const [, name, description, options] = stateResult as [
          string, string, string, string[], string[], string, string, boolean, string
        ];
        setMarketName(name);
        setMarketDescription(description);
        setMarketOptions(options);
      } catch (err) {
        console.error('Failed to fetch market meta:', err);
      } finally {
        setLoadingMeta(false);
      }
    };
    fetchMeta();
  }, [marketId]);

  // Fetch trade events
  useEffect(() => {
    if (marketId === undefined) return;
    const loadTrades = async () => {
      const events = await fetchTradeEvents(marketId);
      setTrades(events);
    };
    loadTrades();
  }, [marketId]);

  // Odds calculation
  const oddsInfo = useMemo(() => {
    if (!projectData || projectData.optionPools.length === 0) return [];
    return projectData.optionPools.map((pool) => {
      return calculateOdds(pool, projectData.totalPool);
    });
  }, [projectData]);

  if (loadingMeta) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-6 w-24 mb-6" />
        <div className="bg-white/95 rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8">
            <Skeleton className="h-10 w-2/3 mb-4" />
            <Skeleton className="h-5 w-1/3" />
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96" />
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-80" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!marketAddress) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white/95 rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">市场未找到</h2>
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

  const now = Math.floor(Date.now() / 1000);
  const isExpired = projectData ? now >= projectData.endTimestamp : false;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <Link to="/" className="mb-6 text-white hover:text-white/80 flex items-center gap-2 inline-block">
        ← 返回首页
      </Link>

      {/* Market header */}
      <div className="bg-white/95 backdrop-blur rounded-xl shadow-lg overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 md:p-8 text-white">
          <div className="flex justify-between items-start mb-4 gap-2">
            <h1 className="text-2xl md:text-4xl font-bold">{marketName}</h1>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
              projectData?.isSettled
                ? 'bg-green-500'
                : isExpired
                ? 'bg-gray-500'
                : 'bg-blue-500'
            }`}>
              {projectData?.isSettled ? '已结算' : isExpired ? '已过期' : '进行中'}
            </span>
          </div>
          {marketDescription && (
            <p className="text-white/90 text-lg">{marketDescription}</p>
          )}
          <div className="flex justify-between items-center mt-4">
            <p className="text-white/80">
              总池: <span className="font-semibold text-2xl">
                {loading ? '...' : `${projectData?.totalPool.toFixed(2) || 0} APT`}
              </span>
            </p>
          </div>
        </div>

        {/* Option pools */}
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">选项</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {marketOptions.map((option, index) => {
              const isWinner = projectData?.isSettled && projectData.winningOption === index;
              const pool = projectData?.optionPools[index] || 0;
              const odds = oddsInfo[index];

              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${
                    isWinner
                      ? 'border-green-500 bg-green-50 ring-2 ring-green-500'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-gray-800">
                      {option} {isWinner && '🏆'}
                    </h3>
                    {odds && odds.odds > 0 && (
                      <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        x{formatOdds(odds.odds)}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500">投注额</p>
                      <p className="text-lg font-bold text-purple-600">
                        {loading ? '...' : `${pool.toFixed(2)} APT`}
                      </p>
                    </div>
                    {odds && projectData && projectData.totalPool > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">市场占比</p>
                        <p className="text-lg font-bold text-gray-700">
                          {formatProbability(odds.probability)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Settlement result */}
          {projectData?.isSettled && (
            <div className="mt-6 p-4 bg-green-50 border-2 border-green-500 rounded-lg">
              <h3 className="text-lg font-bold text-green-800 mb-2">🏆 结算结果</h3>
              <p className="text-xl font-bold text-green-700">
                获胜选项: {marketOptions[projectData.winningOption]}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main content: Trading + Chart + History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Order panel */}
        <div className="lg:col-span-1">
          <OrderPanel
            marketId={marketId}
            marketAddress={marketAddress}
            options={marketOptions}
            optionPools={projectData?.optionPools || []}
            totalPool={projectData?.totalPool || 0}
            isSettled={projectData?.isSettled || false}
            isExpired={isExpired}
            onTradeComplete={() => {
              refetch();
              fetchTradeEvents(marketId).then(setTrades);
            }}
          />
        </div>

        {/* Right: Chart + History */}
        <div className="lg:col-span-2 space-y-6">
          <PriceChart trades={trades} options={marketOptions} />
          <TradeHistory trades={trades} options={marketOptions} />
        </div>
      </div>
    </div>
  );
}
