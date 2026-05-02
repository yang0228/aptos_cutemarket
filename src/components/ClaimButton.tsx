import { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { aptos, MODULE_ADDRESS, MODULES } from '../config/aptos';

interface ClaimButtonProps {
  marketId: number;
  marketName: string;
  isWinner: boolean;
  onClaimComplete?: () => void;
}

export function ClaimButton({ marketId, marketName, isWinner, onClaimComplete }: ClaimButtonProps) {
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const [isClaiming, setIsClaiming] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleClaim = async () => {
    if (!connected) return;

    setIsClaiming(true);
    setMessage(null);

    try {
      const response = await signAndSubmitTransaction({
        sender: account!.address,
        data: {
          function: `${MODULE_ADDRESS}::${MODULES.ORACLE}::claim_winnings`,
          typeArguments: [],
          functionArguments: [marketId],
        },
      });

      await aptos.waitForTransaction({ transactionHash: response.hash });
      setMessage({ type: 'success', text: '奖金领取成功！' });
      onClaimComplete?.();
    } catch (error: any) {
      console.error('Claim failed:', error);
      setMessage({ type: 'error', text: error.message || `${marketName} 领取失败` });
    } finally {
      setIsClaiming(false);
    }
  };

  if (!isWinner) return null;

  return (
    <div>
      <button
        onClick={handleClaim}
        disabled={isClaiming}
        className={`px-4 py-2 rounded-lg font-bold text-white text-sm transition-all ${
          isClaiming
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-green-500 hover:bg-green-600'
        }`}
      >
        {isClaiming ? '领取中...' : '领取奖金'}
      </button>
      {message && (
        <p className={`text-xs mt-1 ${
          message.type === 'success' ? 'text-green-600' : 'text-red-600'
        }`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
