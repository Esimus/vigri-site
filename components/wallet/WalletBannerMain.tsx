'use client';

import Link from 'next/link';
import { useI18n } from '@/hooks/useI18n';
import { usePhantomWallet } from '@/hooks/usePhantomWallet';

type WalletBannerMainProps = {
  className?: string;
};

export default function WalletBannerMain({ className }: WalletBannerMainProps) {
  const { t } = useI18n();
  const { address, connect, disconnect } = usePhantomWallet();

  const shortAddress =
    address && address.length > 12
      ? `${address.slice(0, 4)}·${address.slice(4, 8)}…${address.slice(-4)}`
      : address || null;

  const walletHref = shortAddress ? '/dashboard/assets' : '/dashboard/nft';
  const isConnected = Boolean(shortAddress);

  return (
    <div
      className={
        'card flex items-center justify-between gap-3 px-3 py-2 md:px-4 md:py-3 ' +
        (className ?? '')
      }
    >
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
        {/* Desktop layout */}
        <div className="hidden md:flex items-center gap-3">
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
                  ? (t('overview.wallet_disconnect') ?? 'Disconnect wallet')
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

        {/* Mobile layout */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => void (isConnected ? disconnect() : connect())}
            className="btn btn-outline !rounded-full !px-2.5 !py-1 text-[11px] flex items-center gap-1.5"
            aria-label={
              isConnected
                ? (t('overview.wallet_disconnect') ?? 'Disconnect wallet')
                : t('overview.wallet_connect')
            }
          >
            <span
              className={
                'h-2.5 w-2.5 rounded-full ' +
                (isConnected
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                  : 'bg-zinc-500/70')
              }
              aria-hidden
            />
            <span
              className={
                'ml-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] ' +
                (isConnected
                  ? 'bg-emerald-500 text-emerald-50'
                  : 'bg-zinc-800 text-zinc-100')
              }
              aria-hidden
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 3v7"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <path
                  d="M8.5 5.75A6.5 6.5 0 1 0 15.5 5.75"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </button>

          {isConnected && (
            <Link
              href={walletHref}
              className="btn btn-outline !rounded-full !p-0 h-8 w-8 flex items-center justify-center text-xs"
              aria-label={t('overview.wallet_manage')}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="3"
                  y="6"
                  width="18"
                  height="12"
                  rx="2.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="M17 12h2.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <circle cx="15" cy="12" r="1.2" fill="currentColor" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
