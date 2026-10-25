// components/NftList.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';
import Link from 'next/link';
import Image from 'next/image';
import { presaleElapsedMs, formatElapsed } from '@/lib/config';
import SalesBar from '@/components/ui/SalesBar';
import { resolveAmlZone } from '@/constants/amlAnnexA';
import {
  type CountryZone,
  type KycStatus,
  normalizeKycStatus,
  isCountryZone,
  getKycBadgeStateForNftList,
} from '@/lib/kyc/getKycUiState';

type Item = {
  id: string;
  name: string;
  blurb: string;
  eurPrice: number;
  vigriPrice: number;
  kycRequired?: boolean;
  limited?: number;
  vesting?: string | null;
  ownedQty?: number;
  invited?: boolean; // for WS-20
  summaryKeys?: string[];
  minted?: number;
  _sum?: { total: number; sold: number }; // merged global stats from /api/nft/summary
  onchain?: {
    tierId: number;
    priceSol: number;
    supplyTotal: number;
    supplyMinted: number;
  };
};

function pngNameFor(id: string): string {
  switch (id) {
    case 'nft-tree-steel':
      return '1_mb_wood_steel.webp';
    case 'nft-bronze':
      return '2_mb_bronze.webp';
    case 'nft-silver':
      return '3_mb_silver.webp';
    case 'nft-gold':
      return '4_mb_gold.webp';
    case 'nft-platinum':
      return '5_mb_platinum.webp';
    case 'nft-ws-20':
      return '6_mb_ws.webp';
    default:
      return '6_mb_ws.webp';
  }
}

type SummaryItem = { id: string; total: number; sold: number };
type SummaryResp = { ok: true; items: SummaryItem[] };

function isSummaryItem(x: unknown): x is SummaryItem {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.total === 'number' && typeof o.sold === 'number';
}

function isSummaryResp(x: unknown): x is SummaryResp {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (o.ok !== true) return false;
  if (!Array.isArray(o.items)) return false;
  return o.items.every(isSummaryItem);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function asCountryCode(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length === 2 ? s : null;
}

/** Compact presale "since launch" counter: 4 cells (D/H/M/S). */
function usePresaleCountdown() {
  const [tick, setTick] = useState(() => formatElapsed(presaleElapsedMs()));

  // Timer: update counter every second (state changes only inside interval callback)
  useEffect(() => {
    const id = setInterval(() => {
      setTick(formatElapsed(presaleElapsedMs()));
    }, 1000);

    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  return {
    // we always show the counter; it's "time since launch" now
    isPresale: true,
    d: String(tick.d),
    h: pad(tick.h),
    m: pad(tick.m),
    s: pad(tick.s),
  };
}

// ---- AML / KYC snapshot from /api/me ----

type MeRaw = Record<string, unknown> & { ok?: unknown };

function useAmlSnapshot() {
  const { data } = useSWR<MeRaw | null>(
    'me-aml',
    async () => {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' });
        const raw: unknown = await res.json().catch(() => ({}));
        if (!isObject(raw) || (raw as { ok?: unknown }).ok !== true) return null;
        return raw as MeRaw;
      } catch {
        return null;
      }
    },
    { revalidateOnFocus: false }
  );

  let zone: CountryZone = null;
  let isEe = false;
  let kycStatus: KycStatus = 'none';

  if (data) {
    // KYC status for badge visibility (hide lock if already approved)
    kycStatus = normalizeKycStatus(data['kycStatus']);

    // 1) Prefer server-calculated zone (only if non-null)
    const zRaw = data['kycCountryZone'];
    if (isCountryZone(zRaw) && zRaw !== null) {
      zone = zRaw;

      const pRaw = data['profile'];
      if (isObject(pRaw)) {
        const p = pRaw as Record<string, unknown>;
        const r = asCountryCode(p['countryResidence'])?.toUpperCase() ?? null;
        const c = asCountryCode(p['countryCitizenship'])?.toUpperCase() ?? null;
        const tx = asCountryCode(p['countryTax'])?.toUpperCase() ?? null;
        isEe = r === 'EE' && c === 'EE' && tx === 'EE';
      }
    } else {
      // 2) Fallback: compute zone from profile
      const pRaw = data['profile'];
      if (isObject(pRaw)) {
        const p = pRaw as Record<string, unknown>;
        const r = asCountryCode(p['countryResidence'])?.toUpperCase() ?? null;
        const c = asCountryCode(p['countryCitizenship'])?.toUpperCase() ?? null;
        const tx = asCountryCode(p['countryTax'])?.toUpperCase() ?? null;

        isEe = r === 'EE' && c === 'EE' && tx === 'EE';

        const zones = [r, c, tx].map((code) => resolveAmlZone(typeof code === 'string' ? code : null));
        const z2: CountryZone =
          zones.includes('red') ? 'red' :
          zones.includes('grey') ? 'grey' :
          zones.includes('green') ? 'green' : null;

        zone = z2;
      }
    }
  }

  return { zone, isEe, kycStatus };
}

// ---- NFT list + summary (двухступенчатая загрузка) ----

type NftListApiResp = { ok: boolean; items: Item[] };

type NftListMode = 'dashboard' | 'public';

function NftLaunchTimer() {
  const { t } = useI18n();
  const presale = usePresaleCountdown();
  return (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-zinc-600 dark:text-zinc-300">
          <span>{t('nft.collection_since')}</span>
          <div role="timer" aria-live="off" aria-label={t('nft.collection_since')}
            className="flex flex-wrap gap-3 tabular-nums">
            {[
              { v: presale.d, l: t('nft.timer.d') },
              { v: presale.h, l: t('nft.timer.h') },
              { v: presale.m, l: t('nft.timer.m') },
              { v: presale.s, l: t('nft.timer.s') },
            ].map(({ v, l }) => (
              <span key={l}><b>{v}</b> {l}</span>
            ))}
          </div>
        </div>
  );
}

export default function NftList({ mode = 'dashboard' }: { mode?: NftListMode }) {
  const { t, lang } = useI18n();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const detailsPrefix = mode === 'public' ? '/nft' : '/dashboard/nft';

  const { zone, isEe, kycStatus } = useAmlSnapshot();

  // 1) базовый список
  const { data: listData } = useSWR<NftListApiResp | null>(
    'nft-list',
    async () => {
      const r = await api.nft.list();
      if (!r.ok) return null;
      return { ok: true, items: (r.items as Item[]) ?? [] };
    },
    { revalidateOnFocus: false }
  );

  // 2) summary / on-chain индикаторы
  const { data: summaryData } = useSWR<SummaryResp | null>(
    'nft-summary',
    async () => {
      try {
        const sRes = await fetch(`/api/nft/summary?ts=${Date.now()}`, {
          cache: 'no-store',
        });
        const raw: unknown = await sRes.json().catch(() => null);
        if (!sRes.ok || !isSummaryResp(raw)) return null;
        return raw;
      } catch {
        return null;
      }
    },
    { revalidateOnFocus: false }
  );

  // объединённый список: сначала чистый каталог, потом поверх данные summary
  const items: Item[] | null = useMemo(() => {
    if (!listData) return null; // ещё грузится
    if (!listData.ok) return []; // ошибка
    const baseItems = listData.items ?? [];

    if (!summaryData) return baseItems;

    const byId = new Map<string, SummaryItem>();
    for (const it of summaryData.items) {
      byId.set(it.id, it);
    }

    return baseItems.map((i) => {
      const s = byId.get(i.id);
      return s ? { ...i, _sum: { total: s.total, sold: s.sold }, minted: s.sold } : i;
    });
  }, [listData, summaryData]);

  // есть ли вообще хоть один SOL-прайс — чтобы не дёргать курс лишний раз
  const hasAnySol = useMemo(() => {
    if (!Array.isArray(items)) return false;
    return items.some(
      (i) => typeof i.onchain?.priceSol === 'number' && i.onchain.priceSol > 0
    );
  }, [items]);

  // курс SOL/EUR через SWR (вместо useEffect)
  const { data: solEurRate } = useSWR<number | null>(
    hasAnySol ? 'sol-eur' : null,
    async () => {
      // 1) бэкенд-эндпоинт
      try {
        const r = await fetch(`/api/price/sol-eur?ts=${Date.now()}`, { cache: 'no-store' });
        const j: unknown = await r.json().catch(() => ({}));
        if (r.ok && isObject(j) && (j as { ok?: unknown }).ok === true) {
          const eur =
            (j as { eur?: unknown }).eur ??
            (j as { rateEur?: unknown }).rateEur ??
            (j as { rate?: unknown }).rate;
          if (typeof eur === 'number' && eur > 0) return eur;
        }
      } catch {
        // пойдём на CoinGecko
      }

      // 2) CoinGecko
      try {
        const url = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=eur';
        const r = await fetch(url, { cache: 'no-store' });
        const j: unknown = await r.json().catch(() => ({}));
        const eur = isObject(j) && isObject((j as Record<string, unknown>)['solana'])
          ? (j as { solana?: { eur?: unknown } }).solana?.eur
          : undefined;

        if (typeof eur === 'number' && eur > 0) return eur;
      } catch {
        // ignore
      }
      return null;
    },
    { revalidateOnFocus: false }
  );

  const hasItems = Array.isArray(items) && items.length > 0;

  // small i18n helper with fallback
  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return v && v !== key ? v : fallback;
  };

  const skeletonCards = (
    <div className="grid grid-cols-1 gap-3 @min-[38rem]:grid-cols-2 @min-[60rem]:grid-cols-3">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="card min-w-0 animate-pulse rounded-2xl p-3">
          <div className="flex gap-3">
            <div className="aspect-[3/4] w-[86px] shrink-0 rounded-xl bg-zinc-200 dark:bg-zinc-700" />
            <div className="min-w-0 flex-1 space-y-3 py-1">
              <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
          </div>
          <div className="mt-3 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-700" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="@container min-w-0 space-y-3">
      {hasItems && <NftLaunchTimer />}

      {/* stage 1: skeleton grid while list is loading */}
      {items === null && skeletonCards}

      {/* stage 2: real cards once base list loaded */}
      {hasItems && (
        <div className="grid grid-cols-1 gap-3 @min-[38rem]:grid-cols-2 @min-[60rem]:grid-cols-3">
          {items!.map((i) => {
            const owned = (i.ownedQty || 0) > 0;
            const src = `/images/nft/${pngNameFor(i.id)}`;

            // Unified AML / KYC badge state (shared rules)
            const { blockedByAml, showKycBadge } = getKycBadgeStateForNftList({
              nftId: i.id,
              zone,
              isEe,
              kycStatus,
              kycRequired: i.kycRequired,
            });

            // Availability: prefer on-chain values; fallback to summary/catalog
            const onchainTotal = i.onchain?.supplyTotal;
            const onchainSold = i.onchain?.supplyMinted;

            const total =
              typeof onchainTotal === 'number' && onchainTotal > 0
                ? onchainTotal
                : typeof i._sum?.total === 'number'
                  ? i._sum.total
                  : Number.isFinite(i.limited)
                    ? i.limited || 0
                    : 0;

            const soldFromSummary = typeof i._sum?.sold === 'number' ? i._sum.sold : 0;
            const soldLocal = Math.min(i.minted || 0, total);

            const sold =
              typeof onchainSold === 'number' && onchainSold >= 0 ? onchainSold : Math.max(soldFromSummary, soldLocal);

            const pct = total > 0 ? Math.round((sold / total) * 100) : 0;
            const showAvailability = i.id !== 'nft-ws-20' && total > 0;

            const solPrice = typeof i.onchain?.priceSol === 'number' ? i.onchain.priceSol : null;
            const eurNow =
              solPrice !== null && solPrice > 0 && typeof solEurRate === 'number' && solEurRate > 0
                ? solPrice * solEurRate
                : null;

            const keys = Array.isArray(i.summaryKeys) ? i.summaryKeys : [];
            const hasResume = keys.length > 0;
            const resumeKey = hasResume ? keys[keys.length - 1] : undefined;
            const featureKeys = hasResume ? keys.slice(0, keys.length - 1) : [];

            const progressColor = pct > 70 ? '#EF4444' : pct >= 30 ? '#F59E0B' : '#10B981';

            return (
              <div key={i.id} className="card min-w-0 flex flex-col rounded-2xl p-3 transition-shadow hover:shadow-md">
                <div className="flow-root min-w-0">
                  <Link href={`${detailsPrefix}/${i.id}`}
                    className="relative float-left mr-3 block aspect-[3/4] w-[86px] overflow-hidden rounded-xl border border-zinc-200 focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-zinc-700">
                    <Image src={src} alt={i.name} fill sizes="86px"
                      className="object-contain" priority={false} />
                  </Link>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold leading-5">
                      <Link href={`${detailsPrefix}/${i.id}`} className="hover:underline">
                        {i.name}
                      </Link>
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] opacity-75">
                      {typeof total === 'number' && total > 0 && (
                        <span>{t('nft.total')}: {total}</span>
                      )}
                      {owned && <span>{t('nft.owned')}: <b>{i.ownedQty}</b></span>}
                    </div>
                    {/* Price + after-date pill */}
                    {(() => {
                      const hasSol = solPrice !== null && solPrice > 0;
                      const hasEur = i.eurPrice > 0;

                      if (!hasSol && !hasEur) {
                        return <div className="text-xs md:text-sm opacity-70 mb-2">{t('nft.badge.invite')}</div>;
                      }

                      return (
                        <div className="mt-2">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px] leading-5">
                            <span>
                              {t('nft.price')}: {hasSol ? <b>{solPrice} SOL</b> : <span className="opacity-70">—</span>}
                            </span>
                            {hasSol && eurNow !== null && (
                              <span className="text-[11px] leading-4 opacity-70">
                                ≈ {eurNow.toFixed(0)}€ (CoinGecko)
                              </span>
                            )}
                          </div>
                          {hasSol && (
                            <div className="mt-1 flex">
                              <span className="chip chip--sm max-w-full whitespace-normal">{t('nft.after')}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  </div>

                  {/* Short resume (💬) */}
                  {resumeKey && <div className="mt-2 text-xs leading-5 opacity-80">{t(resumeKey)}</div>}
                </div>

                {/* Collapsible features */}
                {featureKeys.length > 0 ? (
                  <details
                    className="mt-3 mb-2 rounded-lg"
                    open={!!expanded[i.id]}
                    onToggle={(e) =>
                      setExpanded((s) => ({
                        ...s,
                        [i.id]: (e.target as HTMLDetailsElement).open,
                      }))
                    }
                  >
                    <summary className="cursor-pointer select-none py-1 text-xs opacity-80 underline underline-offset-4">
                      {expanded[i.id] ? t('nft.hide') ?? 'Hide features' : t('nft.show') ?? 'Show features'}
                    </summary>
                    <ul className="mt-2 text-xs leading-5 opacity-80 list-disc pl-4 space-y-1">
                      {featureKeys.map((k, idx) => (
                        <li key={idx}>{t(k)}</li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  <div className="text-xs md:text-sm opacity-70 mb-2">{i.blurb}</div>
                )}

                {/* Availability (global summary) */}
                {showAvailability && (
                  <div className="space-y-1.5 mb-3">
                    <div className="text-[11px] md:text-xs opacity-80">{t('nft.availability')}</div>
                    <SalesBar t={t} limited={total} minted={sold} progressColor={progressColor} mintedLabel={t('nft.issued_short')} locale={lang} />
                  </div>
                )}

                {/* Meta chips */}
                <div className="flex flex-wrap gap-1.5 text-xs opacity-80 mb-3">
                  {blockedByAml && (
                    <span className="chip chip--sm max-w-full whitespace-normal" title={tr('nft.amlBlocked', 'Blocked by AML')} aria-label="AML blocked">
                      ⛔ {tr('nft.amlBlocked', 'Blocked')}
                    </span>
                  )}

                  {showKycBadge && (
                    <span className="chip chip--sm max-w-full whitespace-normal" title={t('nft.kyc')} aria-label="KYC">
                      🔒 {t('nft.kyc')}
                    </span>
                  )}

                  {(i.eurPrice <= 0 || i.id === 'nft-ws-20') && (
                    <span className="chip chip--sm max-w-full whitespace-normal" title={t('nft.badge.invite')} aria-label="Invite">
                      🔑 {t('nft.badge.invite')}
                    </span>
                  )}

                  <span className="chip chip--sm max-w-full whitespace-normal" title={i.vesting || 'No vesting'}>
                    {t('nft.vesting')}: {i.vesting ? t('yes') : t('no')}
                  </span>
                </div>

                <div className="mt-auto">
                  <Link href={`${detailsPrefix}/${i.id}`} className="btn btn-outline min-h-9 w-full justify-center rounded-xl px-3 py-1.5 text-xs leading-5">
                    {t('nft.details')}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
