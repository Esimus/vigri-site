// components/NftWalletBar.tsx
'use client';

import { useMemo } from 'react';
import { usePhantomWallet } from '@/hooks/usePhantomWallet';
import { useI18n } from '@/hooks/useI18n';

function shortAddress(addr: string) {
  if (!addr) return '';
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export default function NftWalletBar() {
  const { t } = useI18n();
  const {
    connected,
    address,
    balance,
    connecting,
    error,
    connect,
    disconnect,
  } = usePhantomWallet();

  const label = useMemo(() => {
    if (connecting) return t('wallet.connecting');
    if (!connected || !address) return t('wallet.connect');

    const addrText = shortAddress(address) || t('wallet.connected');
    const balText =
      typeof balance === 'number' ? `${balance.toFixed(3)} SOL` : '';

    return balText ? `${addrText} · ${balText}` : addrText;
  }, [connected, address, balance, connecting, t]);

  const handleClick = () => {
    if (connected) {
      void disconnect();
    } else {
      void connect();
    }
  };

  const isPhantomMissing = error === 'Phantom wallet not found';

  const baseClasses =
    'btn btn-outline px-3 py-1 text-xs md:text-sm rounded-2xl flex items-center gap-1 cursor-pointer transition-colors';
  const warningClasses = ' border-amber-400 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-300';
  const normalClasses = 'hover:-translate-y-px';

  const buttonClasses =
    baseClasses + (connected ? normalClasses : warningClasses);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        className={buttonClasses}
        disabled={connecting}
      >
        {connected && address && (
            <>
            <span className="text-[10px] uppercase tracking-wide opacity-70">
                {t('wallet.pill.title')}
            </span>
            <span className="mx-1 h-3 w-px bg-[rgba(255,255,255,0.24)]" />
            </>
        )}
            {/* Yellow warning icon - only if the wallet is not yet connected */}
            {!connected && (
            <span aria-hidden className="text-[13px] leading-none mr-1">
            ⚠️
            </span>
        )}
        <span>{label}</span>
      </button>
      {error && (
        <div className="text-[11px] text-red-500 max-w-xs text-right">
          {isPhantomMissing
            ? t('wallet.error_phantom_missing')
            : error}
        </div>
      )}
    </div>
  );
}
