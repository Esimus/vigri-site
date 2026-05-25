'use client';

import { useMemo } from 'react';
import {
  WalletUi,
  createSolanaMainnet,
  createStorageAccount,
  createStorageCluster,
  createWalletUiConfig,
} from '@wallet-ui/react';
import { CONFIG } from '@/lib/config';

export default function WalletUiProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = useMemo(() => {
    const mainnet = createSolanaMainnet({
      label: 'Solana Mainnet',
      url: CONFIG.RPC_URL,
    });

    return createWalletUiConfig({
      clusters: [mainnet],
      accountStorage: createStorageAccount({
        key: 'vigri_wallet_ui_account',
      }),
      clusterStorage: createStorageCluster({
        initial: mainnet.id,
        key: 'vigri_wallet_ui_cluster',
      }),
    });
  }, []);

  return <WalletUi config={config}>{children}</WalletUi>;
}