'use client';

import {
  WalletUi,
  createSolanaMainnet,
  createWalletUiConfig,
} from '@wallet-ui/react';
import { CONFIG } from '@/lib/config';

const mainnet = createSolanaMainnet({
  label: 'Solana Mainnet',
  url: CONFIG.RPC_URL,
});

const walletUiConfig = createWalletUiConfig({
  clusters: [mainnet],
});

export default function WalletUiProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WalletUi config={walletUiConfig}>{children}</WalletUi>;
}