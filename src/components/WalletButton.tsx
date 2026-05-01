import { useWallet, WalletReadyState, WalletName } from '@aptos-labs/wallet-adapter-react';
import { useState } from 'react';

export function WalletButton() {
  const { account, connected, wallet, connect, disconnect, wallets } = useWallet();
  const [showModal, setShowModal] = useState(false);

  const walletInstallLinks: Record<string, string> = {
    Petra: 'https://petra.app/',
    Martian: 'https://martianwallet.xyz/',
    Pontem: 'https://pontem.network/wallet',
    Fewcha: 'https://fewcha.app/',
    Rise: 'https://risewallet.io/',
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleConnect = async (walletName: string) => {
    const targetWallet = wallets?.find((w) => w.name === walletName);
    if (!targetWallet) {
      alert('未找到该钱包，请刷新页面后重试');
      return;
    }

    if (targetWallet.readyState !== WalletReadyState.Installed) {
      const installUrl = walletInstallLinks[walletName] || 'https://petra.app/';
      window.open(installUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      await connect(targetWallet.name as WalletName);
      setShowModal(false);
    } catch (error) {
      console.error('连接失败:', error);
      alert('连接失败，请确保已安装钱包插件');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('断开连接失败:', error);
    }
  };

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        {connected && account ? (
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2">
              {wallet?.icon && (
                <img src={wallet.icon} alt={wallet.name} className="w-5 h-5 rounded-full" />
              )}
              <span>{formatAddress(account.address)}</span>
            </div>
            <button
              onClick={handleDisconnect}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              断开
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium shadow-lg transition-all hover:shadow-xl"
          >
            Connect Wallet
          </button>
        )}
      </div>

      {/* 钱包选择模态框 */}
      {showModal && !connected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">选择钱包</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              如果未安装钱包插件，点击钱包将跳转至下载页面。
            </p>
            
            <div className="space-y-3">
              {wallets && wallets.length > 0 ? (
                wallets.map((w) => (
                  <button
                    key={w.name}
                    onClick={() => handleConnect(w.name)}
                    className={`w-full flex items-center gap-4 p-4 border-2 rounded-lg transition-all ${
                      w.readyState === WalletReadyState.Installed
                        ? 'border-gray-200 hover:border-purple-500 hover:bg-purple-50'
                        : 'border-dashed border-gray-300 bg-gray-50 text-gray-400'
                    }`}
                  >
                    {w.icon && (
                      <img src={w.icon} alt={w.name} className="w-10 h-10 rounded-lg" />
                    )}
                    <div className="text-left">
                      <p className="font-bold text-gray-800">{w.name}</p>
                      <p className="text-sm text-gray-500">
                        {w.readyState === WalletReadyState.Installed ? '已安装' : '未检测到插件，点击去安装'}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">未检测到可用的钱包</p>
                  <p className="text-sm text-gray-400">
                    请安装 Petra 钱包插件
                  </p>
                  <a
                    href="https://petra.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-4 text-purple-600 hover:text-purple-700 underline"
                  >
                    下载 Petra 钱包
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

