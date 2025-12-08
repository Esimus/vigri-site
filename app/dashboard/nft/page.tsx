// app/dashboard/nft/page.tsx
'use client';

import Link from 'next/link';
import { useI18n } from '@/hooks/useI18n';
import { usePhantomWallet } from '@/hooks/usePhantomWallet';
import NftList from '@/components/NftList';
import NftIntro from '@/components/NftIntro';
import MyNftsStrip from '@/components/MyNftsStrip';

export default function NftPage() {
  const { t } = useI18n();
  const { address, connect, disconnect } = usePhantomWallet();

  const shortAddress =
    address && address.length > 12
      ? `${address.slice(0, 4)}·${address.slice(4, 8)}…${address.slice(-4)}`
      : address || null;

  const walletHref = shortAddress ? '/dashboard/assets' : '/dashboard/nft';
  const isConnected = Boolean(shortAddress);

  return (
    <div className="space-y-4">
      {/* Wallet */}
      <div className="card flex items-center justify-between gap-3 px-3 py-2 md:px-4 md:py-3">
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 md:h-10 md:w-10 rounded-full grid place-items-center text-lg md:text-xl shadow-lg"
            style={{
              background:
                'radial-gradient(circle at 30% 20%, rgba(110, 231, 183, 0.9), transparent 55%), radial-gradient(circle at 70% 80%, rgba(59, 130, 246, 0.9), transparent 55%)',
            }}
          >
            <span aria-hidden>◎</span>
          </div>

          <div className="flex flex-col">
            <div className="text-[11px] md:text-xs opacity-70">
              {t('overview.wallet_title')}
            </div>

            {shortAddress ? (
              <div className="font-mono text-xs md:text-sm tracking-tight">
                {shortAddress}
              </div>
            ) : (
              <div className="text-xs md:text-sm opacity-70">
                {t('overview.wallet_disconnected')}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={
                'h-2.5 w-2.5 rounded-full ' +
                (isConnected
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                  : 'bg-zinc-500/60')
              }
              aria-hidden
            />
            <span className="text-[11px] md:text-xs mr-1">
              {isConnected
                ? t('overview.wallet_status_connected')
                : t('overview.wallet_status_disconnected')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void (isConnected ? disconnect() : connect())}
              className="relative inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] md:text-xs font-medium shadow-md whitespace-nowrap transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: isConnected
                  ? 'linear-gradient(135deg, #1d4ed8, #22c55e)'
                  : 'linear-gradient(135deg, #22c55e, #0ea5e9)',
                color: '#f9fafb',
                border: '1px solid rgba(148,163,184,0.6)',
              }}
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-xs"
                style={{
                  background: 'rgba(15,23,42,0.2)',
                  border: '1px solid rgba(148,163,184,0.6)',
                }}
              >
                ◎
              </span>
              <span>
                {isConnected
                  ? t('overview.wallet_disconnect') ?? 'Disconnect wallet'
                  : t('overview.wallet_connect')}
              </span>
            </button>

            {isConnected && (
              <Link
                href={walletHref}
                className="btn btn-outline !rounded-full !px-3 !py-1 text-[11px] md:text-xs whitespace-nowrap"
              >
                {t('overview.wallet_manage')}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* NFT intro */}
      <div className="flex items-start justify-between gap-3">
        <NftIntro />
      </div>

      {/* My NFTs + list */}
      <MyNftsStrip />
      <NftList />
    </div>
  );
}
