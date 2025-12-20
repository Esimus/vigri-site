// components/DashboardOverview.tsx
'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useI18n } from '@/hooks/useI18n';
import StatCarousel from '@/components/ui/StatCarousel';
import MyNftsStrip from '@/components/MyNftsStrip';
import { usePhantomWallet } from '@/hooks/usePhantomWallet';
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
  tierId: string;          // "tree_steel", "bronze", ...
  label: string;
  count: number;
  paidSol: number;
  currentPriceSol: number;
  currentValueSol: number;
};

type AssetsResp = {
  ok: boolean;
  history: Array<{ id: string; ts: number; type: string; symbol: string; amount: number; eurPrice: number }>;
  nftPortfolio?: NftPortfolioItem[];
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

function calcClaimFromNft(portfolio?: NftPortfolioItem[]): number {
  if (!portfolio || portfolio.length === 0) return 0;

  return portfolio.reduce((sum, item) => {
    const perNft = CLAIM_PER_NFT[item.tierId] ?? 0;
    const count = item.count || 0;
    return sum + perNft * count;
  }, 0);
}

function StatCard({ title, value, hint, }: { title: string; value: ReactNode; hint?: string; }) {
  return (
    <div className="card p-3 md:p-4 min-w-0 h-full min-h-[110px] flex flex-col justify-between">
      <div className="text-[11px] md:text-xs opacity-70">{title}</div>
      <div className="text-xl md:text-2xl font-semibold mt-1 truncate text-green-900 dark:text-zinc-400">
        {value}
      </div>
      {hint && (
        <div className="text-[11px] md:text-xs opacity-60 mt-1">{hint}</div>
      )}
    </div>
  );
}

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
const activityLabel = (type: string, t: (k: string) => string) => {
  const key = ACTIVITY_KEYS[type] ?? 'activity.unknown';
  const v = t(key);
  return v === key ? type : v;
};
const activityIcon = (type: string) => ACTIVITY_ICONS[type] ?? '•';

export default function DashboardOverview() {
  const { t } = useI18n();
  const { address } = usePhantomWallet();
  const [me, setMe] = useState<MeResp | null>(null);
  const [rights, setRights] = useState<Rights[]>([]);
  const [history, setHistory] = useState<AssetsResp['history'] | null>(null);
  const [nftPortfolio, setNftPortfolio] = useState<NftPortfolioItem[]>([]);
  const [portfolioLoaded, setPortfolioLoaded] = useState(false);
  const [nftValueSol, setNftValueSol] = useState<number | null>(null);

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
          params.set('network', 'devnet');
        }
        const qs = params.toString();

        const ar = await fetch(`/api/assets${qs ? `?${qs}` : ''}`, {
          cache: 'no-store',
        });
        const aj: AssetsResp = await ar.json().catch(
          () => ({ ok: false, history: [] } as AssetsResp)
        );

        if (!alive) return;

        if (ar.ok && aj.ok) {
          const history = aj.history || [];
          const portfolio = aj.nftPortfolio || [];

          setHistory(history);
          setNftPortfolio(portfolio);

          const totalSol = portfolio.reduce(
            (sum, item) => sum + (item.currentValueSol ?? 0),
            0
          );
          setNftValueSol(totalSol);
        } else {
          setNftValueSol(null);
        }

        setPortfolioLoaded(true);
      } catch {
        if (!alive) return;
        setNftValueSol(null);
        setPortfolioLoaded(true);
      }
    };

    // Slow layer: /api/nft/rights
    const loadRights = async () => {
      try {
        const rr = await fetch('/api/nft/rights', { cache: 'no-store' });
        const rj: RightsResp = await rr.json().catch(() => ({ ok: false, items: [], tgePriceEur: 0 }));
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

  const totalClaim = useMemo(() => {
    if (!portfolioLoaded) return null;
    return Math.floor(calcClaimFromNft(nftPortfolio));
  }, [portfolioLoaded, nftPortfolio]);

  const daysLeftMin = useMemo(() => {
    const lefts = rights
      .map((r) =>
        r.expiresAt ? Math.ceil((new Date(r.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null
      )
      .filter((x): x is number => x !== null && x >= 0);
    if (!lefts.length) return null;
    return Math.min(...lefts);
  }, [rights]);

  // Map KYC status to label directly
  type KycKey = 'approved' | 'pending' | 'none';

  function normalizeKyc(v: unknown): KycKey {
    if (v === 'approved' || v === 'pending' || v === 'none') return v;
    if (v === true)  return 'approved';
    return 'none'; // false, null, undefined, любые другие значения
  }

  const kycKey = normalizeKyc(me?.kyc);
  const kycLabel = t(`kyc.status.${kycKey}`);

  const shortAddress =
    address && address.length > 12
      ? `${address.slice(0, 4)}·${address.slice(4, 8)}…${address.slice(-4)}`
      : address || null;

  const walletHref = shortAddress ? '/dashboard/assets' : '/dashboard/nft';

  return (
    <div className="space-y-6">
      {/* Wallet status block */}
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

        <div className="flex items-center gap-2 shrink-0">
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
                ? t('overview.wallet_manage')
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
                ? t('overview.wallet_manage')
                : t('overview.wallet_connect')}
            </span>
          </Link>
        </div>
      </div>

      {/* KPI (mobile: carousel; desktop: 4-col grid) */}
      {/* Mobile */}
      <div className="md:hidden">
        <StatCarousel
          items={[
            {
              title: t('overview.claim_avail'),
              value:
                totalClaim === null
                  ? <InlineLoader label={t('overview.loading_claim')} />
                  : `${totalClaim.toLocaleString()} VIGRI`,
              hint: t('overview.hint_claim'),
            },
            {
              title: t('overview.nft_portfolio_title'),
              value:
                nftValueSol === null
                  ? <InlineLoader label={t('overview.loading_nft')} />
                  : `${nftValueSol.toLocaleString('en-US', {
                      maximumFractionDigits: 4,
                    })} SOL`,
              hint: t('overview.nft_portfolio_hint'),
            },
            {
              title: t('kyc.status'),
              value: kycLabel,
              hint: kycKey !== 'approved' ? t('overview.kyc_hint') : undefined,
            },
            {
              title: t('overview.discount_expiry'),
              value:
                daysLeftMin === null
                  ? t('overview.infinity')
                  : daysLeftMin <= 0
                  ? t('overview.expired')
                  : `${daysLeftMin} ${t('nft.rights.days')}`,
              hint: t('overview.hint_expiry'),
            },
          ]}
        />
      </div>

      {/* Desktop */}
      <div className="hidden md:grid grid-cols-4 gap-3 items-stretch">
        <StatCard
          title={t('overview.claim_avail')}
          value={
            totalClaim === null
              ? <InlineLoader label={t('overview.loading_claim')} />
              : `${totalClaim.toLocaleString()} VIGRI`
          }
          hint={t('overview.hint_claim')}
        />
        <StatCard
          title={t('overview.nft_portfolio_title')}
          value={
            nftValueSol === null
              ? <InlineLoader label={t('overview.loading_nft')} />
              : `${nftValueSol.toLocaleString('en-US', {
                  maximumFractionDigits: 4,
                })} SOL`
          }
          hint={t('overview.nft_portfolio_hint')}
        />
        <StatCard
          title={t('kyc.status')}
          value={kycLabel}
          hint={kycKey !== 'approved' ? t('overview.kyc_hint') : undefined}
        />
        <StatCard
          title={t('overview.discount_expiry')}
          value={
            daysLeftMin === null
              ? t('overview.infinity')
              : daysLeftMin <= 0
              ? t('overview.expired')
              : `${daysLeftMin} ${t('nft.rights.days')}`
          }
          hint={t('overview.hint_expiry')}
        />
      </div>

      {/* My NFTs */}
      <MyNftsStrip />

      {/* Recent activity */}
      {/* Recent activity */}
      <div className="card p-4">
        <div className="text-sm font-medium mb-3">{t('overview.recent')}</div>

        {history === null ? (
          // We don't know yet whether there are operations or not - we're just loading
          <InlineLoader label={t('overview.loading_history')} />
        ) : history.length ? (
          <ul className="text-sm space-y-1">
            {history.slice(0, 5).map((h) => (
              <li key={h.id} className="flex items-center justify-between">
                <span>{new Date(h.ts).toLocaleString()}</span>
                <span className="opacity-70">
                  <span aria-hidden className="mr-1">{activityIcon(h.type)}</span>
                  {activityLabel(h.type, t)}
                </span>
                <span className="font-mono">
                  {h.symbol} {h.amount > 0 ? '+' : ''}
                  {h.amount}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm opacity-70">{t('overview.no_activity')}</div>
        )}

        <div className="mt-3">
          <Link href="/dashboard/assets" className="underline text-sm">
            {t('overview.go_assets')}
          </Link>
        </div>
      </div>
    </div>
  );
}
