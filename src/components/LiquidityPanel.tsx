import { useState, useMemo } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { aptos, MODULE_ADDRESS, MODULES, aptToOctas, octasToApt } from '../config/aptos';

interface LiquidityPanelProps {
  marketId: number;
  lpReserveOctas: number;
  lpSupplyOctas: number;
  userLpBalanceOctas: number;
  isSettled: boolean;
  isExpired: boolean;
  onComplete: () => void;
}

function estimateAptFromLpShares(lpShares: number, lpReserveOctas: number, lpSupplyOctas: number): number {
  if (lpSupplyOctas <= 0 || lpShares <= 0) return 0;
  return octasToApt(Math.floor((lpShares * lpReserveOctas) / lpSupplyOctas));
}

function lpSharesForApt(apt: number, lpReserveOctas: number, lpSupplyOctas: number): number {
  if (lpReserveOctas <= 0 || lpSupplyOctas <= 0) return aptToOctas(apt);
  return Math.floor((aptToOctas(apt) * lpSupplyOctas) / lpReserveOctas);
}

export function LiquidityPanel({
  marketId,
  lpReserveOctas,
  lpSupplyOctas,
  userLpBalanceOctas,
  isSettled,
  isExpired,
  onComplete,
}: LiquidityPanelProps) {
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const [tab, setTab] = useState<'add' | 'remove'>('add');
  const [amount, setAmount] = useState('1');
  const [removeApt, setRemoveApt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isDisabled = isSettled || isExpired;
  const lpReserveApt = octasToApt(lpReserveOctas);

  const userRedeemableApt = useMemo(
    () => estimateAptFromLpShares(userLpBalanceOctas, lpReserveOctas, lpSupplyOctas),
    [userLpBalanceOctas, lpReserveOctas, lpSupplyOctas]
  );

  const removeLpShares = useMemo(() => {
    const apt = parseFloat(removeApt);
    if (isNaN(apt) || apt <= 0) return 0;
    return lpSharesForApt(apt, lpReserveOctas, lpSupplyOctas);
  }, [removeApt, lpReserveOctas, lpSupplyOctas]);

  const handleAdd = async () => {
    if (!connected) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 1) {
      setMessage({ type: 'error', text: '添加流动性至少 1 APT' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await signAndSubmitTransaction({
        sender: account!.address,
        data: {
          function: `${MODULE_ADDRESS}::${MODULES.AMM}::add_liquidity`,
          typeArguments: [],
          functionArguments: [marketId, aptToOctas(amountNum)],
        },
      });

      await aptos.waitForTransaction({ transactionHash: response.hash });
      setMessage({ type: 'success', text: `已添加 ${amountNum.toFixed(2)} APT 流动性` });
      onComplete();
      setAmount('1');
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Add liquidity failed:', error);
      setMessage({ type: 'error', text: err.message || '添加流动性失败' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!connected) return;

    if (userLpBalanceOctas <= 0) {
      setMessage({ type: 'error', text: '您在该市场没有 LP 份额' });
      return;
    }

    const sharesToBurn = removeLpShares;
    if (sharesToBurn <= 0 || sharesToBurn > userLpBalanceOctas) {
      setMessage({ type: 'error', text: '请输入有效的赎回金额' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await signAndSubmitTransaction({
        sender: account!.address,
        data: {
          function: `${MODULE_ADDRESS}::${MODULES.AMM}::remove_liquidity`,
          typeArguments: [],
          functionArguments: [marketId, sharesToBurn],
        },
      });

      await aptos.waitForTransaction({ transactionHash: response.hash });
      const redeemed = estimateAptFromLpShares(sharesToBurn, lpReserveOctas, lpSupplyOctas);
      setMessage({ type: 'success', text: `已赎回约 ${redeemed.toFixed(4)} APT` });
      onComplete();
      setRemoveApt('');
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Remove liquidity failed:', error);
      setMessage({ type: 'error', text: err.message || '移除流动性失败' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMaxRemove = () => {
    setRemoveApt(userRedeemableApt.toFixed(4));
  };

  return (
    <div className="bg-white/95 rounded-xl p-6 mt-4">
      <h3 className="text-lg font-bold text-gray-800 mb-1">流动性</h3>
      <p className="text-xs text-gray-500 mb-4">
        LP 资金进入准备金，不改变选项赔率；交易手续费归入 LP。
      </p>

      <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-gray-500 text-xs">LP 准备金</p>
          <p className="font-semibold text-gray-800">{lpReserveApt.toFixed(2)} APT</p>
        </div>
        {connected && (
          <div className="bg-purple-50 rounded-lg p-2">
            <p className="text-gray-500 text-xs">我的可赎回</p>
            <p className="font-semibold text-purple-700">{userRedeemableApt.toFixed(4)} APT</p>
          </div>
        )}
      </div>

      <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => setTab('add')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'add' ? 'bg-blue-500 text-white' : 'text-gray-600'
          }`}
        >
          添加
        </button>
        <button
          type="button"
          onClick={() => setTab('remove')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'remove' ? 'bg-amber-500 text-white' : 'text-gray-600'
          }`}
        >
          移除
        </button>
      </div>

      {tab === 'add' ? (
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">添加金额 (APT)</label>
          <input
            type="number"
            min="1"
            step="0.1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isDisabled}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="最少 1 APT"
          />
        </div>
      ) : (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm text-gray-600">赎回金额 (APT)</label>
            {userLpBalanceOctas > 0 && (
              <button
                type="button"
                onClick={handleMaxRemove}
                className="text-xs text-purple-600 hover:text-purple-800"
              >
                全部
              </button>
            )}
          </div>
          <input
            type="number"
            min="0"
            step="0.0001"
            value={removeApt}
            onChange={(e) => setRemoveApt(e.target.value)}
            disabled={isDisabled || userLpBalanceOctas <= 0}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder={userLpBalanceOctas > 0 ? `最多 ${userRedeemableApt.toFixed(4)}` : '无 LP 份额'}
          />
        </div>
      )}

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <button
        type="button"
        onClick={tab === 'add' ? handleAdd : handleRemove}
        disabled={
          isSubmitting ||
          !connected ||
          isDisabled ||
          (tab === 'remove' && userLpBalanceOctas <= 0)
        }
        className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
          isSubmitting || !connected || isDisabled
            ? 'bg-gray-400 cursor-not-allowed'
            : tab === 'add'
            ? 'bg-blue-500 hover:bg-blue-600'
            : 'bg-amber-500 hover:bg-amber-600'
        }`}
      >
        {isSubmitting
          ? '处理中...'
          : !connected
          ? '请连接钱包'
          : isDisabled
          ? '市场已关闭'
          : tab === 'add'
          ? '添加流动性'
          : '移除流动性'}
      </button>
    </div>
  );
}
