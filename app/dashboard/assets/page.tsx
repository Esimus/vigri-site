// app/dashboard/assets/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { usePhantomWallet } from '@/hooks/usePhantomWallet';
import Link from 'next/link';
import InlineLoader from '@/components/ui/InlineLoader';

type Position = {
  symbol: string;
  name: string;
  amount: number;
  priceEUR: number;
  valueEUR: number;
};

type HistoryEntry = {
  id: string;
  ts: number;
  type: string;
  symbol: string;
  amount: number;
  unitPriceSol: number;
  txSignature?: string;
};

type NftPortfolioItem = {
  tierId: string;          // e.g. "tree_steel", "bronze", ...
  label: string;           // human-readable name for UI, e.g. "Tree / Steel"
  count: number;           // how many NFTs of this tier the user owns
  paidSol: number;         // total SOL spent for this tier (all NFTs)
  currentPriceSol: number; // current price of 1 NFT of this tier in SOL
  currentValueSol: number; // current portfolio value for this tier in SOL
};

type GetResp = {
  ok: boolean;
  positions: Position[];
  totalValueEUR: number;
  nftPortfolio: NftPortfolioItem[];
  history: HistoryEntry[];
};

// Claim per 1 NFT (100%) by tier – same logic as on DashboardOverview
const CLAIM_PER_NFT: Record<string, number> = {
  tree_steel: 62500,
  bronze: 187500,
  silver: 1250000,
  gold: 6250000,
  platinum: 12500000,
  ws20: 625000,
};

const VIGRI_TGE_PRICE_EUR = 0.0008;

function calcClaimFromNft(portfolio?: NftPortfolioItem[]): number {
  if (!portfolio || portfolio.length === 0) return 0;

  return portfolio.reduce((sum, item) => {
    const perNft = CLAIM_PER_NFT[item.tierId] ?? 0;
    const count = item.count || 0;
    return sum + perNft * count;
  }, 0);
}

function summarizeNftPortfolio(items?: NftPortfolioItem[]) {
  if (!items || !items.length) {
    return { count: 0, valueSol: 0 };
  }

  return items.reduce(
    (acc, item) => ({
      count: acc.count + item.count,
      valueSol: acc.valueSol + item.currentValueSol,
    }),
    { count: 0, valueSol: 0 }
  );
}

export default function AssetsPage() {
  const { t } = useI18n();
  const [data, setData] = useState<GetResp | null>(null);
  const totals = summarizeNftPortfolio(data?.nftPortfolio);
  const { address } = usePhantomWallet();
  const shortAddress =
    address && address.length > 12
      ? `${address.slice(0, 4)}·${address.slice(4, 8)}…${address.slice(-4)}`
      : address || null;

  const walletHref = shortAddress ? '/dashboard/assets' : '/dashboard/nft';

  const claimFromNft = useMemo(
    () => calcClaimFromNft(data?.nftPortfolio),
    [data?.nftPortfolio]
  );

  const positions = data?.positions ?? [];
  const nonVigriPositions = positions.filter((p) => p.symbol !== 'VIGRI');

  const vigriFromNftValueEur = claimFromNft * VIGRI_TGE_PRICE_EUR;

  let displayTotalEur = 0;
  for (const p of nonVigriPositions) {
    displayTotalEur += p.valueEUR;
  }
  if (claimFromNft > 0) {
    displayTotalEur += vigriFromNftValueEur;
  }

  // Psychological trigger for future VIGRI purchase
  const [buyAmount, setBuyAmount] = useState<number>(1000);
  const [msg, setMsg] = useState<string | null>(null);

  const ACTIVITY_KEYS: Record<string, string> = {
    buy_vigri: 'activity.buy_vigri',
    sell_vigri: 'activity.sell_vigri',
    deposit: 'activity.deposit',
    withdraw: 'activity.withdraw',
    buy_nft: 'activity.buy_nft',
    reward: 'activity.reward',
  };

  const ACTIVITY_ICONS: Record<string, string> = {
    buy_vigri: '🟢',
    sell_vigri: '🔴',
    deposit: '⬇️',
    withdraw: '⬆️',
    buy_nft: '🧾',
    reward: '🎁',
  };

  const activityLabel = (type: string) => {
    const key = ACTIVITY_KEYS[type] ?? 'activity.unknown';
    const v = t(key);
    return v === key ? type : v; // fallback to raw type if no key
  };
  const activityIcon = (type: string) => ACTIVITY_ICONS[type] ?? '•';

  const cf = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
      }),
    []
  );

  const load = async (wallet?: string) => {
    try {
      const params = new URLSearchParams();

      if (wallet) {
        params.set('wallet', wallet);
        params.set('network', 'devnet');
      }

      const qs = params.toString();
      const res = await fetch(`/api/assets${qs ? `?${qs}` : ''}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        console.error('Failed to load assets', res.status);
        return;
      }

      const j: GetResp = await res.json();
      if (j.ok) {
        setData(j);
      }
    } catch (err) {
      console.error('Assets load error', err);
    }
  };

  useEffect(() => {
    if (!address) {
      setData(null);
      return;
    }
    void load(address);
  }, [address]);


  // Just show info message for now, no API calls
  const buy = () => {
    setMsg(
      t('assets.buy.comingSoon') ||
        'VIGRI token purchase on the platform will be available after TGE.'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {/* Wallet status block (same as on Overview) */}
      <div className="card flex items-center justify-between gap-3 px-3 py-2 md:px-4 md:py-3">
        <div className="flex flex-1 min-w-0 items-center gap-3">
          {/* Icon bubble */}
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
              <div className="text-xs md:text-sm opacity-70 hidden md:block">
                {t('overview.wallet_disconnected')}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={
              'h-2.5 w-2.5 rounded-full ' +
              (shortAddress
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                : 'bg-zinc-500/60')
            }
            aria-hidden
          />
          <span className="text-[11px] md:text-xs mr-1">
            {shortAddress
              ? t('overview.wallet_status_connected')
              : t('overview.wallet_status_disconnected')}
          </span>

          <Link
            href={walletHref}
            className="btn btn-outline !rounded-full !px-2.5 !py-1 text-[11px] md:text-xs whitespace-nowrap flex items-center justify-center gap-1"
            aria-label={
              shortAddress
                ? t('assets.wallet_refresh')
                : t('overview.wallet_connect')
            }
          >
            {/* Mobile: icon only */}
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 bg-white md:hidden"
              aria-hidden
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Simple wallet icon */}
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
            </span>

            {/* Desktop: text label */}
            <span className="hidden md:inline">
              {shortAddress
                ? t('assets.wallet_refresh')
                : t('overview.wallet_connect')}
            </span>
          </Link>
        </div>
      </div>

      {/* VIGRI purchase block with psychological trigger + "coming soon" */}
      <div className="card p-4 space-y-3">
        <div className="text-sm font-medium">
          {t('assets.buy.title')}
        </div>

        <p className="text-xs text-zinc-600">
          {t('assets.buy.subtitle')}
        </p>

        <div className="flex flex-wrap items-end gap-3 mt-2">
          <div>
            <label className="block text-xs mb-1">
              {t('assets.buy.amount')}
            </label>
            <input
              type="number"
              min={1}
              step={1}
              className="input w-32 text-sm"
              value={buyAmount}
              onChange={(e) =>
                setBuyAmount(
                  Math.max(1, Math.floor(Number(e.target.value) || 1))
                )
              }
            />
          </div>

          <button
            type="button"
            onClick={buy}
            className="btn btn-outline text-sm"
          >
            {t('assets.buy.btn')}
          </button>

          {msg && (
            <div className="text-xs text-zinc-600">
              {msg}
            </div>
          )}
        </div>
      </div>

      {/* NFT portfolio */}
      <div className="card overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <div className="text-sm font-medium">
            {t('assets.nft.title')}
          </div>
        </div>
        {data === null ? (
          address ? (
            <div className="px-4 pb-4">
              <InlineLoader label={t('overview.loading_nft')} />
            </div>
          ) : (
            <p className="px-4 pb-4 text-xs text-zinc-600">
              {t('assets.nft.wallet_required')}
            </p>
          )
        ) : data?.nftPortfolio && data.nftPortfolio.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="text-left px-4 py-2 w-40 text-xs font-medium text-zinc-600">
                      {t('assets.nft.type')}
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-zinc-600">
                      {t('assets.nft.count')}
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-zinc-600">
                      {t('assets.nft.paidSol')}
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-zinc-600">
                      {t('assets.nft.priceSol')}
                      <sup
                        className="ml-1 cursor-help opacity-70 text-[10px]"
                        title={
                          t('assets.nft.priceSol_hint') ??
                          'Price of one NFT of this tier at the current presale stage.'
                        }
                      >
                        ?
                      </sup>
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-zinc-600">
                      {t('assets.nft.valueSol')}
                      <sup
                        className="ml-1 cursor-help opacity-70 text-[10px]"
                        title={
                          t('assets.nft.valueSol_hint') ??
                          'Current value of all your NFTs of this tier: quantity × current price.'
                        }
                      >
                        ?
                      </sup>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data.nftPortfolio.map((item) => (
                    <tr key={item.tierId} className="border-t border-zinc-200">
                      <td className="px-4 py-2 text-zinc-700">
                        <div className="font-medium">{item.label}</div>
                      </td>
                      <td className="px-4 py-2 text-zinc-700">
                        {item.count.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-zinc-700">
                        {item.paidSol.toLocaleString('en-US', {
                          maximumFractionDigits: 4,
                        })}{' '}
                        SOL
                      </td>
                      <td className="px-4 py-2 text-zinc-700">
                        {item.currentPriceSol.toLocaleString('en-US', {
                          maximumFractionDigits: 4,
                        })}{' '}
                        SOL
                      </td>
                      <td className="px-4 py-2 text-zinc-700">
                        {item.currentValueSol.toLocaleString('en-US', {
                          maximumFractionDigits: 4,
                        })}{' '}
                        SOL
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr className="border-t border-zinc-200 bg-zinc-50">
                    <td className="px-4 py-2 text-sm font-medium">
                      {t('assets.total') ?? 'Total NFT portfolio:'}{' '}
                    </td>
                    <td className="px-4 py-2">{totals.count.toLocaleString()} NFT</td>
                    <td colSpan={2}></td>
                    <td className="px-4 py-2 text-sm font-semibold">
                      {totals.valueSol.toLocaleString('en-US', {
                        maximumFractionDigits: 4,
                      })}{' '}
                      SOL
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
        ) : (
          <p className="px-4 text-xs text-zinc-600">
            {t('assets.nft.empty')}
          </p>
        )}
      </div>

      {/* Token positions table */}
      <div className="card overflow-hidden">
        {data === null ? (
          address ? (
            <div className="p-4">
              <InlineLoader label={t('assets.positions.loading')} />
            </div>
          ) : (
            <p className="p-4 text-xs text-zinc-600">
              {t('assets.positions.wallet_required')}
            </p>
          )
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-4 py-2 w-40 text-xs font-medium text-zinc-600">
                  {t('assets.symbol')}
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-600">
                  {t('assets.amount')}
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-600">
                  {t('assets.price')}
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-600">
                  {t('assets.value')}
                </th>
              </tr>
            </thead>

            <tbody>
              {claimFromNft > 0 && (
                <tr className="border-t border-zinc-200">
                  <td className="px-4 py-2 text-zinc-700">
                    <div className="font-medium">VIGRI</div>
                    <div className="text-xs opacity-70">
                      {t('assets.vigri.from_nft')}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-zinc-700">
                    {claimFromNft.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-zinc-700">
                    {VIGRI_TGE_PRICE_EUR.toLocaleString('en-US', {
                      minimumFractionDigits: 4,
                      maximumFractionDigits: 4,
                    })}{' '}
                    €
                  </td>
                  <td className="px-4 py-2 text-zinc-700">
                    {cf.format(vigriFromNftValueEur)}
                  </td>
                </tr>
              )}

              <tr className="border-t border-zinc-200">
                <td className="px-4 py-2 text-zinc-700">
                  <div className="font-medium">VIGRI</div>
                  <div className="text-xs opacity-70">Vigri Token</div>
                </td>
                <td className="px-4 py-2 text-zinc-700">
                  {(0).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-zinc-700">
                  {VIGRI_TGE_PRICE_EUR.toLocaleString('en-US', {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4,
                  })}{' '}
                  €
                </td>
                <td className="px-4 py-2 text-zinc-700">
                  {cf.format(0)}
                </td>
              </tr>

              {nonVigriPositions.map((p) => (
                <tr key={p.symbol} className="border-t border-zinc-200">
                  <td className="px-4 py-2 text-zinc-700">
                    <div className="font-medium">{p.symbol}</div>
                    <div className="text-xs opacity-70">{p.name}</div>
                  </td>
                  <td className="px-4 py-2 text-zinc-700">
                    {p.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-zinc-700">
                    {cf.format(p.priceEUR)}
                  </td>
                  <td className="px-4 py-2 text-zinc-700">
                    {cf.format(p.valueEUR)}
                  </td>
                </tr>
              ))}
            </tbody>

            <tfoot>
              <tr className="border-t border-zinc-200 bg-zinc-50">
                <td
                  className="px-4 py-2 text-right font-medium"
                  colSpan={3}
                >
                  {t('assets.total')}
                </td>
                <td className="px-4 py-2 font-semibold">
                  {cf.format(displayTotalEur)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* History */}
      <div className="card p-4">
        <div className="text-sm font-medium mb-2">
          {t('assets.history')}
        </div>
        {data === null ? (
          address ? (
            <InlineLoader label={t('overview.loading_history')} />
          ) : (
            <div className="text-sm opacity-70">
              {t('assets.history.wallet_required')}
            </div>
          )
        ) : data?.history?.length ? (
          <ul className="text-sm">
            {data.history.slice(0, 10).map((h) => (
              <li
                key={h.id}
                className="flex items-start justify-between gap-3 border-t first:border-t-0 border-zinc-200 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      aria-hidden
                      className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium"
                    >
                      {activityIcon(h.type)}{' '}
                      <span className="ml-1">
                        {activityLabel(h.type)}
                      </span>
                    </span>

                    <span className="truncate text-xs text-zinc-500">
                      {h.symbol}{' '}
                      {h.amount > 0 ? `+${h.amount}` : h.amount}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-500">
                    {new Date(h.ts).toLocaleString()}
                  </div>

                  {h.txSignature && (
                    <div className="mt-0.5 text-xs">
                      <a
                        href={`https://solscan.io/tx/${h.txSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline opacity-70 hover:opacity-100"
                      >
                        Tx on Solscan
                      </a>
                    </div>
                  )}
                </div>

                <div className="whitespace-nowrap text-sm font-mono text-emerald-500">
                  {h.unitPriceSol.toLocaleString('en-US', {
                    maximumFractionDigits: 4,
                  })}{' '}
                  SOL
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm opacity-70">
            {t('overview.no_activity')}
          </div>
        )}
      </div>
    </div>
  );
}
