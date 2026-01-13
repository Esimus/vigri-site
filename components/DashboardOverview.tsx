// components/DashboardOverview.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
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

// unified "me"
type MeResp = {
  ok: boolean;
  signedIn: boolean;
  kyc: 'none' | 'pending' | 'approved';
  lum: unknown;
  user?: { id: string; email: string };
};

type NftPortfolioItem = {
  tierId: string; // "tree_steel", "bronze", ...
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

// Claim per 1 NFT (100%) by tier
const CLAIM_PER_NFT: Record<string, number> = {
  tree_steel: 62500,
  bronze: 187500,
  silver: 1250000,
  gold: 6250000,
  platinum: 12500000,
  ws20: 625000,
};

// TGE price (EUR) – как на странице "Активы"
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

export default function DashboardOverview() {
  const { t } = useI18n();
  const phantom = usePhantomWallet();
  const solflare = useSolflareWallet();
  const address = phantom.address || solflare.address;
  const [me, setMe] = useState<MeResp | null>(null);
  const [rights, setRights] = useState<Rights[]>([]);
  const [history, setHistory] = useState<AssetsResp['history'] | null>(null);
  const [nftPortfolio, setNftPortfolio] = useState<NftPortfolioItem[]>([]);
  const [portfolioLoaded, setPortfolioLoaded] = useState(false);
  const [nftValueSol, setNftValueSol] = useState<number | null>(null);
  const [portfolioValueEur, setPortfolioValueEur] = useState<number | null>(
    null
  );
  const HISTORY_PAGE_SIZE = 6;
  const [historyPage, setHistoryPage] = useState(0);

  const cf = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 2,
      }),
    []
  );

  useEffect(() => {
    let alive = true;
    setPortfolioLoaded(false);

    // Fast layer: /api/me + /api/assets (with optional wallet)
    const loadFast = async () => {
      try {
        // /api/me does not depend on wallet
        const mr = await fetch('/api/me', { cache: 'no-store' });
        const mj: MeResp | null = await mr.json().catch(() => null);
        if (alive && mr.ok && mj?.ok) {
          setMe(mj);
        }
      } catch {
        // ignore
      }

      try {
        const params = new URLSearchParams();
        if (address) {
          params.set('wallet', address);
          params.set('network', 'mainnet');
        }
        const qs = params.toString();

        const ar = await fetch(`/api/assets${qs ? `?${qs}` : ''}`, {
          cache: 'no-store',
        });
        const aj: AssetsResp = await ar
          .json()
          .catch(() => ({ ok: false, history: [] } as AssetsResp));

        if (!alive) return;

        if (ar.ok && aj.ok) {
          const history = aj.history || [];
          const portfolio = aj.nftPortfolio || [];
          const positions = aj.positions || [];

          setHistory(history);
          setNftPortfolio(portfolio);

          const totalSol = portfolio.reduce(
            (sum, item) => sum + (item.currentValueSol ?? 0),
            0
          );
          setNftValueSol(totalSol);

          // Общая стоимость портфеля в EUR — логика как на странице "Активы":
          // сумма всех активов (кроме VIGRI) + будущие VIGRI из NFT по цене TGE.
          const nonVigriPositions = positions.filter(
            (p) => p.symbol !== 'VIGRI'
          );
          let displayTotalEur = 0;
          for (const p of nonVigriPositions) {
            displayTotalEur += p.valueEUR;
          }

          const claimFromNft = calcClaimFromNft(portfolio);
          if (claimFromNft > 0) {
            displayTotalEur += claimFromNft * VIGRI_TGE_PRICE_EUR;
          }

          setPortfolioValueEur(displayTotalEur);
        } else {
          setNftValueSol(null);
          setPortfolioValueEur(null);
        }

        setPortfolioLoaded(true);
      } catch {
        if (!alive) return;
        setNftValueSol(null);
        setPortfolioValueEur(null);
        setPortfolioLoaded(true);
      }
    };

    // Slow layer: /api/nft/rights
    const loadRights = async () => {
      try {
        const rr = await fetch('/api/nft/rights', { cache: 'no-store' });
        const rj: RightsResp = await rr
          .json()
          .catch(() => ({ ok: false, items: [], tgePriceEur: 0 }));
        if (!alive) return;
        if (rr.ok && rj.ok) setRights(rj.items || []);
      } catch {
        // ignore
      }
    };

    loadFast();
    loadRights();

    return () => {
      alive = false;
    };
  }, [address]);

  useEffect(() => {
    setHistoryPage(0);
  }, [history]);

  const totalClaim = useMemo(() => {
    if (!portfolioLoaded) return null;
    return Math.floor(calcClaimFromNft(nftPortfolio));
  }, [portfolioLoaded, nftPortfolio]);

  const daysLeftMin = useMemo(() => {
    const lefts = rights
      .map((r) =>
        r.expiresAt
          ? Math.ceil(
              (new Date(r.expiresAt).getTime() - Date.now()) /
                (24 * 60 * 60 * 1000)
            )
          : null
      )
      .filter((x): x is number => x !== null && x >= 0);
    if (!lefts.length) return null;
    return Math.min(...lefts);
  }, [rights]);

  const historyPageCount = useMemo(() => {
    if (!history?.length) return 0;
    return Math.ceil(history.length / HISTORY_PAGE_SIZE);
  }, [history, HISTORY_PAGE_SIZE]);

  const historyPageItems = useMemo(() => {
    if (!history?.length) return [];
    const start = historyPage * HISTORY_PAGE_SIZE;
    return history.slice(start, start + HISTORY_PAGE_SIZE);
  }, [history, historyPage, HISTORY_PAGE_SIZE]);

  // Map KYC status to label directly
  type KycKey = 'approved' | 'pending' | 'none';

  function normalizeKyc(v: unknown): KycKey {
    if (v === 'approved' || v === 'pending' || v === 'none') return v;
    if (v === true) return 'approved';
    return 'none'; // false, null, undefined, любые другие значения
  }

  const kycKey = normalizeKyc(me?.kyc);
  const kycLabel = t(`kyc.status.${kycKey}`);

  return (
    <div className="space-y-6">
      <WalletBannerMain />

      {/* Одна карусель KPI для всех экранов */}
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
              'NFT + будущие VIGRI по текущим ценам, оценка в EUR.',
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
          // We don't know yet whether there are operations or not - we're just loading
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

                  {/* Desktop: keep current layout */}
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
                  onClick={() =>
                    setHistoryPage((p) =>
                      Math.min(historyPageCount - 1, p + 1)
                    )
                  }
                  disabled={historyPage >= historyPageCount - 1}
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
