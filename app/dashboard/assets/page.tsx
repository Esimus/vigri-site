// app/dashboard/assets/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { usePhantomWallet } from '@/hooks/usePhantomWallet';
import { useSolflareWallet } from '@/hooks/useSolflareWallet';
import WalletBannerMain from '@/components/wallet/WalletBannerMain';
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
  prices?: Record<string, number>;
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
  const HISTORY_PAGE_SIZE = 6;
  const [historyPage, setHistoryPage] = useState(0);
  const totals = summarizeNftPortfolio(data?.nftPortfolio);

  const phantom = usePhantomWallet();
  const solflare = useSolflareWallet();

  // Active wallet address for API calls (/api/assets)
  const address = phantom.address || solflare.address;

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

    'nft-mint': 'activity.buy_nft',
  };

  const ACTIVITY_ICONS: Record<string, string> = {
    buy_vigri: '🟢',
    sell_vigri: '🔴',
    deposit: '⬇️',
    withdraw: '⬆️',
    buy_nft: '🧾',
    reward: '🎁',

    'nft-mint': '🧾',
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
        params.set('network', 'mainnet');
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

  // Data history
  const historyPageCount = useMemo(() => {
    if (!data?.history?.length) return 0;
    return Math.ceil(data.history.length / HISTORY_PAGE_SIZE);
  }, [data?.history?.length]);

  const historyPageItems = useMemo(() => {
    if (!data?.history?.length) return [];
    const start = historyPage * HISTORY_PAGE_SIZE;
    return data.history.slice(start, start + HISTORY_PAGE_SIZE);
  }, [data?.history, historyPage]);

  useEffect(() => {
    setHistoryPage(0);
  }, [data?.history?.length]);

  // Just show info message for now, no API calls
  const buy = () => {
    setMsg(
      t('assets.buy.comingSoon') ||
        'VIGRI token purchase on the platform will be available after TGE.'
    );
  };

  return (
    <div className="space-y-6">
      <WalletBannerMain />

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
            <div className="text-xs text-zinc-600 opacity-70">
              {t('assets.history.wallet_required')}
            </div>
          )
        ) : data?.history?.length ? (
          <>
            <ul className="text-sm">
              {historyPageItems.map((h) => (
                <li
                  key={h.id}
                  className="flex items-start justify-between gap-3 border-t first:border-t-0 border-zinc-200 py-3"
                >
                  <div className="flex-1 min-w-0">
                    {/* Line 1 */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        aria-hidden
                        className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium shrink-0"
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

                    {/* Line 2 */}
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500 min-w-0">
                      <span className="truncate">
                        {new Date(h.ts).toLocaleString()}
                      </span>

                      {h.txSignature && (
                        <a
                          href={`https://solscan.io/tx/${h.txSignature}`}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate underline opacity-70 hover:opacity-100"
                        >
                          Tx on Solscan
                        </a>
                      )}
                    </div>
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

            {historyPageCount > 1 && (
              <div className="mt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  className="btn btn-outline !px-3 !py-1 text-sm"
                  onClick={() => setHistoryPage((p) => Math.max(0, p - 1))}
                  disabled={historyPage <= 0}
                  aria-label="Previous page"
                >
                  ‹
                </button>

                <span className="text-sm opacity-70 tabular-nums">
                  {historyPage + 1} / {historyPageCount}
                </span>

                <button
                  type="button"
                  className="btn btn-outline !px-3 !py-1 text-sm"
                  onClick={() => setHistoryPage((p) => Math.min(historyPageCount - 1, p + 1))}
                  disabled={historyPage >= historyPageCount - 1}
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-xs text-zinc-600 opacity-70">
            {t('overview.no_activity')}
          </div>
        )}
      </div>
    </div>
  );
}
