import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react';
import { PetraWallet } from 'petra-plugin-wallet-adapter';
import { Network } from '@aptos-labs/ts-sdk';
import { PropsWithChildren } from 'react';

export function WalletProvider({ children }: PropsWithChildren) {
  const wallets = [new PetraWallet()];

  return (
    <AptosWalletAdapterProvider
      plugins={wallets}
      autoConnect={false}
      dappConfig={{
        network: Network.TESTNET,
      }}
      onError={(error) => {
        console.error('Wallet error:', error);
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}

