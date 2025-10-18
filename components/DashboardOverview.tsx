'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/hooks/useI18n';
import StatCarousel from '@/components/ui/StatCarousel';

type Rights = {
  id: string;
  discountPctEffective: number;
  claimAvailVigri: number;
  discountBudgetEur: number;
  discountUsedEur: number;
  expiresAt: string | null;
};
type RightsResp = { ok: boolean; items: Rights[]; tgePriceEur: number };
type AssetsResp = {
  ok: boolean;
  history: Array<{ id: string; ts: number; type: string; symbol: string; amount: number; eurPrice: number }>;
};

// unified "me"
type MeResp = {
  ok: boolean;
  signedIn: boolean;
  kyc: boolean | null;
  lum: unknown;
  user?: { id: string; email: string };
};

// cookie helper (client-only)
function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([$?*|{}\]\\^])/g, '\\$1') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function StatCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="card p-3 md:p-4 min-w-0 h-full min-h-[110px] flex flex-col justify-between">
      <div className="text-[11px] md:text-xs opacity-70">{title}</div>
      <div className="text-xl md:text-2xl font-semibold mt-1 truncate">{value}</div>
      {hint && <div className="text-[11px] md:text-xs opacity-60 mt-1">{hint}</div>}
    </div>
  );
}

export default function DashboardOverview() {
  const { t } = useI18n();
  const [me, setMe] = useState<MeResp | null>(null);
  const [rights, setRights] = useState<Rights[]>([]);
  const [history, setHistory] = useState<AssetsResp['history']>([]);
  const ACTIVITY_KEYS: Record<string, string> = {
  buy_vigri: 'activity.buy_vigri',
  sell_vigri: 'activity.sell_vigri',
  deposit: 'activity.deposit',
  withdraw: 'activity.withdraw',
  buy_nft: 'activity.buy_nft',
  reward: 'activity.reward',
};

const activityLabel = (type: string) => {
  const key = ACTIVITY_KEYS[type] ?? 'activity.unknown';
  const v = t(key);
  return v === key ? type : v; 
};

const ACTIVITY_ICONS: Record<string, string> = {
  buy_vigri: '🟢',   // buy
  sell_vigri:'🔴',   // sell
  deposit:  '⬇️',
  withdraw: '⬆️',
  buy_nft:  '🧾',
  reward:   '🎁',
};
const activityIcon = (type: string) => ACTIVITY_ICONS[type] ?? '•';


  // IMPORTANT: start with EUR to match SSR markup and avoid hydration mismatch
  const [ccy, setCcy] = useState<'EUR' | 'USD'>('EUR');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const mr = await fetch('/api/auth/me', { cache: 'no-store' });
      const mj: MeResp | null = await mr.json().catch(() => null);

      const rr = await fetch('/api/nft/rights', { cache: 'no-store' });
      const rj: RightsResp = await rr.json().catch(() => ({ ok: false, items: [], tgePriceEur: 0 } as any));

      const ar = await fetch('/api/assets', { cache: 'no-store' });
      const aj: AssetsResp = await ar.json().catch(() => ({ ok: false, history: [] } as any));

      if (!alive) return;
      if (mr.ok && mj?.ok) setMe(mj);
      if (rr.ok && rj.ok) setRights(rj.items || []);
      if (ar.ok && aj.ok) setHistory(aj.history || []);
    })();

    // after mount: read saved currency and subscribe to changes
    setHydrated(true);
    const saved = readCookie('vigri_ccy');
    if (saved === 'USD' || saved === 'EUR') setCcy(saved as 'EUR' | 'USD');

    const onCcy = (e: Event) => {
      // @ts-expect-error custom event detail
      const next = (e?.detail?.currency as 'EUR' | 'USD') || 'EUR';
      setCcy(next);
    };
    window.addEventListener('vigri:currency', onCcy as EventListener);

    return () => {
      alive = false;
      window.removeEventListener('vigri:currency', onCcy as EventListener);
    };
  }, []);

  const totalClaim = useMemo(
    () => Math.floor(rights.reduce((s, r) => s + (r.claimAvailVigri || 0), 0)),
    [rights]
  );

  // temporary fixed FX; will be replaced with live rates
  const FX_USD_PER_EUR = 1.08;
  const convert = (eur: number) => (ccy === 'USD' ? eur * FX_USD_PER_EUR : eur);

  const totalDiscountEur = useMemo(
    () => rights.reduce((s, r) => s + Math.max(0, r.discountBudgetEur - r.discountUsedEur), 0),
    [rights]
  );

  const bestDiscountPct = useMemo(
    () => rights.reduce((m, r) => Math.max(m, Math.round((r.discountPctEffective || 0) * 100)), 0),
    [rights]
  );

  const daysLeftMin = useMemo(() => {
    const lefts = rights
      .map((r) =>
        r.expiresAt ? Math.ceil((new Date(r.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null
      )
      .filter((x): x is number => x !== null && x >= 0);
    if (!lefts.length) return null;
    return Math.min(...lefts);
  }, [rights]);

  // formatter depends on currency; on first SSR/hydration we render EUR
  const cf = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency: ccy }),
    [ccy]
  );

  // Map boolean kyc to i18n key suffix: approved / none
  const kycKey: 'approved' | 'none' | null = me?.kyc === true ? 'approved' : me ? 'none' : null;
  const kycLabel = kycKey ? t(`kyc.status.${kycKey}`) : '—';

  return (
    <div className="space-y-6">
      {/* KPI (mobile: carousel; desktop: 4-col grid) */}
      {/* Mobile */}
      <div className="md:hidden">
        <StatCarousel
          items={[
            {
              title: t('overview.claim_avail'),
              value: `${totalClaim.toLocaleString()} VIGRI`,
              hint: t('overview.hint_claim'),
            },
            {
              title: t('overview.discount_budget'),
              value: cf.format(convert(totalDiscountEur)),
              hint: `${t('overview.best_discount')}: ${bestDiscountPct}%`,
            },
            {
              title: t('overview.kyc'),
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
          value={`${totalClaim.toLocaleString()} VIGRI`}
          hint={t('overview.hint_claim')}
        />
        <StatCard
          title={t('overview.discount_budget')}
          value={cf.format(convert(totalDiscountEur))}
          hint={`${t('overview.best_discount')}: ${bestDiscountPct}%`}
        />
        <StatCard
          title={t('overview.kyc')}
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


      {/* Quick actions */}
      <div className="card p-4">
        <div className="text-sm font-medium mb-3">{t('overview.quick')}</div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/nft" className="btn btn-primary">
            {t('overview.go_nft')}
          </Link>
          <Link href="/dashboard/assets" className="btn btn-outline">
            {t('overview.go_assets')}
          </Link>
          {kycKey !== 'approved' && (
            <Link href="/kyc" className="btn btn-outline">
              {t('kyc.banner.start')}
            </Link>
          )}
          <Link href="/dashboard/rewards" className="btn btn-outline">
            {t('overview.go_rewards')}
          </Link>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card p-4">
        <div className="text-sm font-medium mb-3">{t('overview.recent')}</div>
        {history?.length ? (
          <ul className="text-sm space-y-1">
            {history.slice(0, 5).map((h) => (
              <li key={h.id} className="flex items-center justify-between">
  <span>{new Date(h.ts).toLocaleString()}</span>
  <span className="opacity-70">
    <span aria-hidden className="mr-1">{activityIcon(h.type)}</span>
    {activityLabel(h.type)}
  </span>
  <span className="font-mono">
    {h.symbol} {h.amount > 0 ? '+' : ''}{h.amount}
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
