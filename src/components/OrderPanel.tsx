import { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { aptos, MODULE_ADDRESS, MODULES, aptToOctas } from '../config/aptos';

interface OrderPanelProps {
  marketId: number;
  marketAddress: string;
  options: string[];
  optionPools: number[];
  totalPool: number;
  isSettled: boolean;
  isExpired: boolean;
  onTradeComplete: () => void;
}

export function OrderPanel({
  marketId,
  options,
  optionPools,
  totalPool,
  isSettled,
  isExpired,
  onTradeComplete,
}: OrderPanelProps) {
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('0.1');
  const [shares, setShares] = useState('100');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isDisabled = isSettled || isExpired;

  const getOptionPrice = (idx: number) => {
    if (totalPool === 0) return 0;
    return optionPools[idx] / totalPool;
  };

  const handleBuy = async () => {
    if (!connected || selectedOption === null) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 0.01) {
      setMessage({ type: 'error', text: '金额至少 0.01 APT' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const amountOctas = aptToOctas(amountNum);
      const response = await signAndSubmitTransaction({
        sender: account!.address,
        data: {
          function: `${MODULE_ADDRESS}::${MODULES.AMM}::buy_shares`,
          typeArguments: [],
          functionArguments: [marketId, selectedOption, amountOctas],
        },
      });

      await aptos.waitForTransaction({ transactionHash: response.hash });

      const price = getOptionPrice(selectedOption);
      const estimatedShares = price > 0 ? amountNum / price : 0;
      setMessage({
        type: 'success',
        text: `买入成功！约获得 ${estimatedShares.toFixed(2)} 份额`,
      });

      onTradeComplete();
      setAmount('0.1');
    } catch (error: any) {
      console.error('Buy failed:', error);
      setMessage({ type: 'error', text: error.message || '交易失败' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSell = async () => {
    if (!connected || selectedOption === null) return;

    const sharesNum = parseFloat(shares);
    if (isNaN(sharesNum) || sharesNum <= 0) {
      setMessage({ type: 'error', text: '请输入卖出份额' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const sharesOctas = aptToOctas(sharesNum);
      const response = await signAndSubmitTransaction({
        sender: account!.address,
        data: {
          function: `${MODULE_ADDRESS}::${MODULES.AMM}::sell_shares`,
          typeArguments: [],
          functionArguments: [marketId, selectedOption, sharesOctas],
        },
      });

      await aptos.waitForTransaction({ transactionHash: response.hash });

      setMessage({ type: 'success', text: '卖出成功！' });
      onTradeComplete();
      setShares('100');
    } catch (error: any) {
      console.error('Sell failed:', error);
      setMessage({ type: 'error', text: error.message || '卖出失败' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white/95 rounded-xl p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">交易</h3>

      {/* Buy/Sell tabs */}
      <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setTab('buy')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'buy' ? 'bg-green-500 text-white' : 'text-gray-600'
          }`}
        >
          买入
        </button>
        <button
          onClick={() => setTab('sell')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'sell' ? 'bg-red-500 text-white' : 'text-gray-600'
          }`}
        >
          卖出
        </button>
      </div>

      {/* Option selection */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">选择选项</p>
        <div className="grid grid-cols-2 gap-2">
          {options.map((opt, idx) => {
            const price = getOptionPrice(idx);
            const isSelected = selectedOption === idx;
            return (
              <button
                key={idx}
                onClick={() => setSelectedOption(idx)}
                disabled={isDisabled}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <p className="text-sm font-bold text-gray-800">{opt}</p>
                <p className="text-xs text-gray-500">{(price * 100).toFixed(1)}%</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Amount input */}
      {tab === 'buy' ? (
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">投入金额 (APT)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isDisabled}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="最少 0.01 APT"
          />
        </div>
      ) : (
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">卖出份额</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            disabled={isDisabled}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="输入份额"
          />
        </div>
      )}

      {/* Estimated return */}
      {selectedOption !== null && tab === 'buy' && parseFloat(amount) > 0 && (
        <div className="mb-4 bg-gray-50 rounded-lg p-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">当前价格</span>
            <span className="font-medium">{(getOptionPrice(selectedOption) * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-500">预计份额</span>
            <span className="font-medium">
              {getOptionPrice(selectedOption) > 0
                ? (parseFloat(amount) / getOptionPrice(selectedOption)).toFixed(2)
                : '0'}
            </span>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={tab === 'buy' ? handleBuy : handleSell}
        disabled={isSubmitting || !connected || selectedOption === null || isDisabled}
        className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
          isSubmitting || !connected || selectedOption === null || isDisabled
            ? 'bg-gray-400 cursor-not-allowed'
            : tab === 'buy'
            ? 'bg-green-500 hover:bg-green-600'
            : 'bg-red-500 hover:bg-red-600'
        }`}
      >
        {isSubmitting
          ? '处理中...'
          : !connected
          ? '请连接钱包'
          : selectedOption === null
          ? '请选择选项'
          : isDisabled
          ? '市场已关闭'
          : tab === 'buy'
          ? `买入 ${options[selectedOption]}`
          : `卖出 ${options[selectedOption]}`}
      </button>
    </div>
  );
}
