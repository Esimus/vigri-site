// components/wallet/WalletBannerMain.tsx
'use client';

import Link from 'next/link';
import { WalletUiDropdown, useWalletUi } from '@wallet-ui/react';
import { useI18n } from '@/hooks/useI18n';

type WalletBannerMainProps = {
  className?: string;
};

export default function WalletBannerMain({ className }: WalletBannerMainProps) {
  const { t } = useI18n();
  const walletUi = useWalletUi();

  const address = walletUi.account?.address ?? null;
  const isConnected = Boolean(walletUi.connected && address);

  const shortAddress =
    address && address.length > 12
      ? `${address.slice(0, 4)}·${address.slice(4, 8)}…${address.slice(-4)}`
      : address || null;

  const walletHref = isConnected ? '/dashboard/assets' : '/dashboard/nft';

  return (
    <div
      className={
        'card flex items-center justify-between gap-3 px-3 py-2 md:px-4 md:py-3 ' +
        (className ?? '')
      }
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg shadow-lg md:h-10 md:w-10 md:text-xl"
          style={{
            background:
              'radial-gradient(circle at 30% 20%, rgba(110, 231, 183, 0.9), transparent 55%), radial-gradient(circle at 70% 80%, rgba(59, 130, 246, 0.9), transparent 55%)',
          }}
        >
          <span aria-hidden>◎</span>
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="text-[11px] opacity-70 md:text-xs">
            {t('overview.wallet_title')}
          </div>

          {shortAddress ? (
            <div className="truncate font-mono text-xs tracking-tight md:text-sm">
              {shortAddress}
            </div>
          ) : (
            <div className="truncate text-xs opacity-70 md:text-sm">
              {t('overview.wallet_disconnected')}
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden items-center gap-3 md:flex">
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
            <span className="mr-1 text-[11px] md:text-xs">
              {isConnected
                ? t('overview.wallet_status_connected')
                : t('overview.wallet_status_disconnected')}
            </span>
          </div>

          <div className="vigri-wallet-dropdown relative flex items-center gap-2">
            <WalletUiDropdown
              label={
                isConnected
                  ? t('overview.wallet_disconnect')
                  : t('overview.wallet_connect')
              }
            />

            {isConnected && (
              <Link
                href={walletHref}
                className="btn btn-outline !rounded-full !px-3 !py-1 text-[11px] whitespace-nowrap md:text-xs"
              >
                {t('overview.wallet_manage')}
              </Link>
            )}
          </div>
        </div>

        <div className="vigri-wallet-dropdown relative flex items-center gap-2 md:hidden">
          <WalletUiDropdown
            label={
              isConnected
                ? shortAddress ?? 'Wallet'
                : t('overview.wallet_connect')
            }
          />

          {isConnected && (
            <Link
              href={walletHref}
              className="btn btn-outline flex h-8 w-8 items-center justify-center !rounded-full !p-0 text-xs"
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

      <style jsx global>{`
        .vigri-wallet-dropdown :where(button) {
          display: inline-flex !important;
          height: 2rem !important;
          min-height: 2rem !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 0.45rem !important;
          border-radius: 9999px !important;
          border: 1px solid rgba(148, 163, 184, 0.28) !important;
          background: linear-gradient(
            135deg,
            rgba(37, 99, 235, 0.95),
            rgba(16, 185, 129, 0.95)
          ) !important;
          padding: 0 0.85rem !important;
          color: rgb(248, 250, 252) !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
          line-height: 1rem !important;
          white-space: nowrap !important;
          box-shadow: none !important;
          transition:
            border-color 160ms ease,
            background-color 160ms ease,
            filter 160ms ease !important;
        }

        .vigri-wallet-dropdown :where(button:hover) {
          border-color: rgba(226, 232, 240, 0.55) !important;
          filter: brightness(1.06) !important;
        }

        .vigri-wallet-dropdown :where(button:focus-visible) {
          outline: 2px solid rgba(147, 197, 253, 0.8) !important;
          outline-offset: 2px !important;
        }

        .vigri-wallet-dropdown :where(button img),
        .vigri-wallet-dropdown :where(button svg) {
          width: 1rem !important;
          height: 1rem !important;
          min-width: 1rem !important;
          min-height: 1rem !important;
          max-width: 1rem !important;
          max-height: 1rem !important;
          flex: 0 0 auto !important;
          border-radius: 9999px !important;
        }

        .vigri-wallet-dropdown :where([role='menu']),
        .vigri-wallet-dropdown :where([data-part='content']) {
          min-width: 11.5rem !important;
          overflow: hidden !important;
          border-radius: 1rem !important;
          border: 1px solid rgba(148, 163, 184, 0.24) !important;
          background: rgba(15, 23, 42, 0.98) !important;
          padding: 0.45rem !important;
          color: rgb(248, 250, 252) !important;
          box-shadow:
            0 18px 45px rgba(0, 0, 0, 0.32),
            inset 0 1px 0 rgba(255, 255, 255, 0.04) !important;
          z-index: 50 !important;
        }

        .vigri-wallet-dropdown :where([role='menu'] button),
        .vigri-wallet-dropdown :where([data-part='content'] button),
        .vigri-wallet-dropdown :where([role='menuitem']),
        .vigri-wallet-dropdown :where([data-part='item']) {
          display: flex !important;
          width: 100% !important;
          height: 2.15rem !important;
          min-height: 2.15rem !important;
          align-items: center !important;
          justify-content: flex-start !important;
          gap: 0.55rem !important;
          border-radius: 0.65rem !important;
          border: 1px solid rgba(148, 163, 184, 0.18) !important;
          background: rgba(30, 41, 59, 0.52) !important;
          padding: 0 0.65rem !important;
          color: rgb(226, 232, 240) !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
          line-height: 1rem !important;
          text-align: left !important;
          box-shadow: none !important;
          white-space: nowrap !important;
          filter: none !important;
        }

        .vigri-wallet-dropdown :where([role='menu'] button + button),
        .vigri-wallet-dropdown :where([data-part='content'] button + button),
        .vigri-wallet-dropdown :where([role='menuitem'] + [role='menuitem']),
        .vigri-wallet-dropdown :where([data-part='item'] + [data-part='item']) {
          margin-top: 0.35rem !important;
        }

        .vigri-wallet-dropdown :where([role='menu'] button:hover),
        .vigri-wallet-dropdown :where([data-part='content'] button:hover),
        .vigri-wallet-dropdown :where([role='menuitem']:hover),
        .vigri-wallet-dropdown :where([data-part='item']:hover) {
          border-color: rgba(148, 163, 184, 0.32) !important;
          background: rgba(51, 65, 85, 0.72) !important;
          color: rgb(248, 250, 252) !important;
          filter: none !important;
        }

        .vigri-wallet-dropdown :where([role='menu'] button img),
        .vigri-wallet-dropdown :where([role='menu'] button svg),
        .vigri-wallet-dropdown :where([data-part='content'] button img),
        .vigri-wallet-dropdown :where([data-part='content'] button svg),
        .vigri-wallet-dropdown :where([role='menuitem'] img),
        .vigri-wallet-dropdown :where([role='menuitem'] svg),
        .vigri-wallet-dropdown :where([data-part='item'] img),
        .vigri-wallet-dropdown :where([data-part='item'] svg) {
          width: 1.05rem !important;
          height: 1.05rem !important;
          min-width: 1.05rem !important;
          min-height: 1.05rem !important;
          max-width: 1.05rem !important;
          max-height: 1.05rem !important;
          flex: 0 0 auto !important;
          border-radius: 9999px !important;
        }

        @media (max-width: 767px) {
          .vigri-wallet-dropdown :where(button) {
            max-width: 9.5rem !important;
            padding: 0 0.7rem !important;
            font-size: 0.7rem !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          .vigri-wallet-dropdown :where([role='menu'] button),
          .vigri-wallet-dropdown :where([data-part='content'] button),
          .vigri-wallet-dropdown :where([role='menuitem']),
          .vigri-wallet-dropdown :where([data-part='item']) {
            max-width: none !important;
            padding: 0 0.65rem !important;
            font-size: 0.75rem !important;
          }
        }
      `}</style>
    </div>
  );
}