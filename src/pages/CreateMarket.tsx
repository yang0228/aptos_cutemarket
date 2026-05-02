import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { aptos, MODULE_ADDRESS, MODULES, aptToOctas } from '../config/aptos';
import { CATEGORY_LABELS } from '../types';

const RESOLUTION_ADMIN = 0;
const RESOLUTION_PYTH = 1;

export function CreateMarket() {
  const navigate = useNavigate();
  const { account, connected, signAndSubmitTransaction } = useWallet();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('23:59');
  const [category, setCategory] = useState(0);
  const [resolutionType, setResolutionType] = useState(RESOLUTION_ADMIN);
  const [initialLiquidity, setInitialLiquidity] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const addOption = () => {
    if (options.length < 10) setOptions([...options, '']);
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, value: string) => {
    const updated = [...options];
    updated[idx] = value;
    setOptions(updated);
  };

  const handleSubmit = async () => {
    if (!connected) {
      setMessage({ type: 'error', text: '请先连接钱包' });
      return;
    }

    // Validate
    if (!name.trim() || name.length > 100) {
      setMessage({ type: 'error', text: '市场名称需在 1-100 字符之间' });
      return;
    }
    if (!description.trim() || description.length > 500) {
      setMessage({ type: 'error', text: '描述需在 1-500 字符之间' });
      return;
    }
    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length < 2) {
      setMessage({ type: 'error', text: '至少需要 2 个选项' });
      return;
    }
    if (!endDate) {
      setMessage({ type: 'error', text: '请选择结束日期' });
      return;
    }

    const endTimestamp = Math.floor(new Date(`${endDate}T${endTime}:00`).getTime() / 1000);
    const now = Math.floor(Date.now() / 1000);
    if (endTimestamp <= now + 3600) {
      setMessage({ type: 'error', text: '结束时间需在当前时间至少 1 小时后' });
      return;
    }

    const liquidity = parseFloat(initialLiquidity);
    if (isNaN(liquidity) || liquidity < 1) {
      setMessage({ type: 'error', text: '初始流动性至少 1 APT' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await signAndSubmitTransaction({
        sender: account!.address,
        data: {
          function: `${MODULE_ADDRESS}::${MODULES.MARKET_CORE}::create_market`,
          typeArguments: [],
          functionArguments: [
            name.trim(),
            description.trim(),
            validOptions,
            endTimestamp,
            category,
            resolutionType,
            [], // pyth_price_id (empty for admin resolution)
            0,  // pyth_threshold
            false, // pyth_above_wins
            aptToOctas(liquidity),
          ],
        },
      });

      await aptos.waitForTransaction({ transactionHash: response.hash });
      setMessage({ type: 'success', text: '市场创建成功！' });
      setTimeout(() => navigate('/'), 2000);
    } catch (error: any) {
      console.error('Create market failed:', error);
      setMessage({ type: 'error', text: error.message || '创建失败' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!connected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white/95 rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">请先连接钱包</h2>
          <p className="text-gray-600">连接钱包后创建市场</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-white mb-8">创建市场</h1>

      <div className="bg-white/95 rounded-xl shadow-lg p-8">
        {/* Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">市场名称 *</label>
          <input
            type="text"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            placeholder="例如：比特币年底突破10万？"
          />
          <p className="text-xs text-gray-500 mt-1">{name.length}/100</p>
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">描述 *</label>
          <textarea
            maxLength={500}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            placeholder="详细描述市场规则和结算条件"
          />
          <p className="text-xs text-gray-500 mt-1">{description.length}/500</p>
        </div>

        {/* Options */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">选项 * (2-10 个)</label>
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  maxLength={50}
                  value={opt}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder={`选项 ${idx + 1}`}
                />
                {options.length > 2 && (
                  <button
                    onClick={() => removeOption(idx)}
                    className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 10 && (
            <button
              onClick={addOption}
              className="mt-2 text-sm text-purple-600 hover:text-purple-700"
            >
              + 添加选项
            </button>
          )}
        </div>

        {/* End date */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">结束日期 *</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">结束时间</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Category */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">分类 *</label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setCategory(Number(id))}
                className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  category === Number(id)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Resolution type */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">结算方式 *</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setResolutionType(RESOLUTION_ADMIN)}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                resolutionType === RESOLUTION_ADMIN
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <p className="font-bold text-gray-800">管理员结算</p>
              <p className="text-xs text-gray-500">适用于主观类市场（政治、体育等）</p>
            </button>
            <button
              onClick={() => setResolutionType(RESOLUTION_PYTH)}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                resolutionType === RESOLUTION_PYTH
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <p className="font-bold text-gray-800">Pyth 预言机</p>
              <p className="text-xs text-gray-500">适用于价格类市场（加密货币等）</p>
            </button>
          </div>
        </div>

        {/* Initial liquidity */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">初始流动性 (APT) *</label>
          <input
            type="number"
            min="1"
            step="0.1"
            value={initialLiquidity}
            onChange={(e) => setInitialLiquidity(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-xs text-gray-500 mt-1">最低 1 APT，将作为初始做市资金</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
            isSubmitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {isSubmitting ? '创建中...' : '创建市场'}
        </button>
      </div>
    </div>
  );
}
