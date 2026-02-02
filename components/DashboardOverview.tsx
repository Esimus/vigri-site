// components/DashboardOverview.tsx
'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useI18n } from '@/hooks/useI18n';
import StatCarousel from '@/components/ui/StatCarousel';
import MyNftsStrip from '@/components/MyNftsStrip';
import WalletBannerMain from '@/components/wallet/WalletBannerMain';
import { usePhantomWallet } from '@/hooks/usePhantomWallet';
import { useSolflareWallet } from '@/hooks/useSolflareWallet';
import InlineLoader from '@/components/ui/InlineLoader';

type Rights = {
  id: string;
  discountPctEffective: number;
  claimAvailVigri: number;
  discountBudgetEur: number;
  discountUsedEur: number;
  expiresAt: string | null;
};
type RightsResp = { ok: boolean; items: Rights[]; tgePriceEur: number };

type MeResp = {
  ok: boolean;
  signedIn: boolean;
  kyc: 'none' | 'pending' | 'approved';
  lum: unknown;
  user?: { id: string; email: string };
};

type NftPortfolioItem = {
  tierId: string;
  label: string;
  count: number;
  paidSol: number;
  currentPriceSol: number;
  currentValueSol: number;
};

type Position = {
  symbol: string;
  name: string;
  amount: number;
  priceEUR: number;
  valueEUR: number;
};

type AssetsResp = {
  ok: boolean;
  history: Array<{
    id: string;
    ts: number;
    type: string;
    symbol: string;
    amount: number;
    eurPrice: number;
  }>;
  nftPortfolio?: NftPortfolioItem[];
  positions?: Position[];
};

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

const activityLabel = (type: string, t: (k: string) => string) => {
  const key = ACTIVITY_KEYS[type] ?? 'activity.unknown';
  const v = t(key);
  return v === key ? type : v;
};

const activityIcon = (type: string) => ACTIVITY_ICONS[type] ?? '•';

const amountText = (h: AssetsResp['history'][number]) => {
  const sign = h.amount > 0 ? '+' : '';
  return `${h.symbol} ${sign}${h.amount}`;
};

// ----- fetchers -----

const fetchMe = async (): Promise<MeResp | null> => {
  try {
    const mr = await fetch('/api/me', { cache: 'no-store' });
    const mj: MeResp | null = await mr.json().catch(() => null);
    if (mr.ok && mj?.ok) return mj;
    return null;
  } catch {
    return null;
  }
};

const buildAssetsUrl = (wallet?: string | null) => {
  const params = new URLSearchParams();
  if (wallet) {
    params.set('wallet', wallet);
    params.set('network', 'mainnet');
  }
  const qs = params.toString();
  return `/api/assets${qs ? `?${qs}` : ''}`;
};

const fetchAssets = async (url: string): Promise<AssetsResp | null> => {
  try {
    const ar = await fetch(url, { cache: 'no-store' });
    const aj: AssetsResp | null = await ar.json().catch(() => null);
    if (!ar.ok || !aj?.ok) return null;
    return aj;
  } catch {
    return null;
  }
};

const fetchRights = async (): Promise<RightsResp | null> => {
  try {
    const rr = await fetch('/api/nft/rights', { cache: 'no-store' });
    const rj: RightsResp | null = await rr.json().catch(() => null);
    if (!rr.ok || !rj?.ok) return null;
    return rj;
  } catch {
    return null;
  }
};

export default function DashboardOverview() {
  const { t } = useI18n();
  const phantom = usePhantomWallet();
  const solflare = useSolflareWallet();
  const address = phantom.address || solflare.address;

  const [now] = useState(() => Date.now());

  const { data: me } = useSWR<MeResp | null>('me', fetchMe, {
    revalidateOnFocus: false,
  });

  const assetsUrl = buildAssetsUrl(address);
  const { data: assets } = useSWR<AssetsResp | null>(assetsUrl, fetchAssets, {
    revalidateOnFocus: false,
  });

  const { data: rightsResp } = useSWR<RightsResp | null>(
    '/api/nft/rights',
    fetchRights,
    { revalidateOnFocus: false }
  );

  const rights: Rights[] = rightsResp?.items ?? [];

  const HISTORY_PAGE_SIZE = 6;
  const [historyPage, setHistoryPage] = useState(0);

  const nftPortfolio: NftPortfolioItem[] = assets?.nftPortfolio ?? [];
  const positions: Position[] = assets?.positions ?? [];
  const history = assets ? assets.history ?? [] : null;

  const cf = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 2,
      }),
    []
  );

  const totalClaim =
    assets != null ? Math.floor(calcClaimFromNft(nftPortfolio)) : null;

  const nftValueSol =
    assets != null
      ? nftPortfolio.reduce(
          (sum, item) => sum + (item.currentValueSol ?? 0),
          0
        )
      : null;

  const portfolioValueEur =
    assets != null
      ? (() => {
          const nonVigriPositions = positions.filter(
            (p) => p.symbol !== 'VIGRI'
          );
          let total = 0;
          for (const p of nonVigriPositions) {
            total += p.valueEUR;
          }

          const claimFromNft = calcClaimFromNft(nftPortfolio);
          if (claimFromNft > 0) {
            total += claimFromNft * VIGRI_TGE_PRICE_EUR;
          }

          return total;
        })()
      : null;

  const daysLeftMin = (() => {
    if (!rights.length) return null;

    const msPerDay = 24 * 60 * 60 * 1000;
    const lefts = rights
      .map((r) =>
        r.expiresAt
          ? Math.ceil(
              (new Date(r.expiresAt).getTime() - now) / msPerDay
            )
          : null
      )
      .filter((x): x is number => x !== null && x >= 0);

    return lefts.length ? Math.min(...lefts) : null;
  })();

  const historyArray = history ?? [];
  const historyPageCount =
    historyArray.length > 0
      ? Math.ceil(historyArray.length / HISTORY_PAGE_SIZE)
      : 0;

  const effectiveHistoryPage =
    historyPageCount > 0 ? Math.min(historyPage, historyPageCount - 1) : 0;

  const historyPageItems =
    historyArray.length > 0
      ? (() => {
          const start = effectiveHistoryPage * HISTORY_PAGE_SIZE;
          return historyArray.slice(start, start + HISTORY_PAGE_SIZE);
        })()
      : [];

  type KycKey = 'approved' | 'pending' | 'none';

  function normalizeKyc(v: unknown): KycKey {
    if (v === 'approved' || v === 'pending' || v === 'none') return v;
    if (v === true) return 'approved';
    return 'none';
  }

  const kycKey = normalizeKyc(me?.kyc);
  const kycLabel = t(`kyc.status.${kycKey}`);

  return (
    <div className="space-y-6">
      <WalletBannerMain />

      {/* KPI carousel */}
      <StatCarousel
        items={[
          {
            title: t('overview.claim_avail'),
            value:
              totalClaim === null ? (
                <InlineLoader label={t('overview.loading_claim')} />
              ) : (
                <div className="leading-tight">
                  <span className="block text-green-900 dark:text-zinc-400">
                    {totalClaim.toLocaleString()}
                  </span>
                  <span className="mt-1 text-lg md:text-xl font-semibold leading-tight text-green-900 dark:text-zinc-400 whitespace-normal break-words">
                    VIGRI
                  </span>
                </div>
              ),
            hint: t('overview.hint_claim'),
          },
          {
            title: t('overview.nft_portfolio_title'),
            value:
              nftValueSol === null ? (
                <InlineLoader label={t('overview.loading_nft')} />
              ) : (
                <span className="text-green-900 dark:text-zinc-400 font-semibold">
                  {`${nftValueSol.toLocaleString('en-US', {
                    maximumFractionDigits: 4,
                  })} SOL`}
                </span>
              ),
            hint: t('overview.nft_portfolio_hint'),
          },
          {
            title: t('overview.portfolio_value'),
            value:
              portfolioValueEur === null ? (
                <InlineLoader
                  label={
                    t('overview.loading_portfolio') ||
                    t('overview.loading_nft')
                  }
                />
              ) : (
                <span className="text-green-900 dark:text-zinc-400 font-semibold">
                  {cf.format(portfolioValueEur)}
                </span>
              ),
            hint:
              t('overview.portfolio_value_hint') ||
              'NFT + future VIGRI at TGE price, estimated in EUR.',
          },
          {
            title: t('kyc.status'),
            value: (
              <span className="text-sm font-semibold text-green-900 dark:text-zinc-400">
                {kycLabel}
              </span>
            ),
            hint: kycKey !== 'approved' ? t('overview.kyc_hint') : undefined,
          },
          {
            title: t('overview.discount_expiry'),
            value: (
              <span className="text-green-900 dark:text-zinc-400 font-semibold">
                {daysLeftMin === null
                  ? t('overview.infinity')
                  : daysLeftMin <= 0
                  ? t('overview.expired')
                  : `${daysLeftMin} ${t('nft.rights.days')}`}
              </span>
            ),
            hint: t('overview.hint_expiry'),
          },
        ]}
      />

      {/* My NFTs */}
      <MyNftsStrip />

      {/* Recent activity */}
      <div className="card p-4 pb-3">
        <div className="text-sm font-medium mb-3">
          {t('overview.recent')}
        </div>

        {history === null ? (
          <InlineLoader label={t('overview.loading_history')} />
        ) : history.length ? (
          <>
            <ul className="text-sm space-y-1">
              {historyPageItems.map((h) => (
                <li key={h.id}>
                  {/* Mobile: single-line with ellipsis */}
                  <div className="md:hidden flex items-center gap-2 text-sm">
                    <div className="truncate w-full">
                      <span className="mr-2 whitespace-nowrap">
                        {new Date(h.ts).toLocaleDateString()}
                      </span>

                      <span className="opacity-70 mr-2">
                        <span aria-hidden className="mr-1">
                          {activityIcon(h.type)}
                        </span>
                        {activityLabel(h.type, t)}
                      </span>

                      <span className="font-mono whitespace-nowrap">
                        {amountText(h)}
                      </span>
                    </div>
                  </div>

                  {/* Desktop: multi-column layout */}
                  <div className="hidden md:flex items-center justify-between">
                    <span>{new Date(h.ts).toLocaleString()}</span>
                    <span className="opacity-70">
                      <span aria-hidden className="mr-1">
                        {activityIcon(h.type)}
                      </span>
                      {activityLabel(h.type, t)}
                    </span>
                    <span className="font-mono">
                      {h.symbol} {h.amount > 0 ? '+' : ''}
                      {h.amount}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            {historyPageCount > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  className="btn btn-outline !px-3 !py-1 text-sm"
                  onClick={() =>
                    setHistoryPage((p) => Math.max(0, p - 1))
                  }
                  disabled={effectiveHistoryPage <= 0}
                  aria-label="Previous page"
                >
                  ‹
                </button>

                <span className="text-sm opacity-70 tabular-nums">
                  {effectiveHistoryPage + 1} / {historyPageCount}
                </span>

                <button
                  type="button"
                  className="btn btn-outline !px-3 !py-1 text-sm"
                  onClick={() =>
                    setHistoryPage((p) =>
                      Math.min(historyPageCount - 1, p + 1)
                    )
                  }
                  disabled={effectiveHistoryPage >= historyPageCount - 1}
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-sm opacity-70">
            {t('overview.no_activity')}
          </div>
        )}

        <div className="mt-0">
          <Link href="/dashboard/assets" className="underline text-sm">
            {t('overview.go_assets')}
          </Link>
        </div>
      </div>
    </div>
  );
}
