// components/NftList.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
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

export default function NftList() {
  const { t } = useI18n();
  const [items, setItems] = useState<Item[] | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // AML / KYC snapshot from /api/me (fallback: compute zone from profile countries)
  const [zone, setZone] = useState<CountryZone>(null);
  const [isEe, setIsEe] = useState(false);
  const [kycStatus, setKycStatus] = useState<KycStatus>('none');

  // small i18n helper with fallback
  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return v && v !== key ? v : fallback;
  };

  // Two-stage load: fast catalog, then slower summary/indicators
  const load = async () => {
    // also read /api/me once (cheap)
    void (async () => {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' });
        const raw: unknown = await res.json().catch(() => ({}));
        if (!isObject(raw) || (raw as { ok?: unknown }).ok !== true) return;

        const root = raw as Record<string, unknown>;

        // KYC status for badge visibility (hide lock if already approved)
        setKycStatus(normalizeKycStatus(root['kycStatus']));

        // 1) Prefer server-calculated zone (only if non-null)
        const zRaw = root['kycCountryZone'];
        if (isCountryZone(zRaw) && zRaw !== null) {
          setZone(zRaw);

          const pRaw = root['profile'];
          if (isObject(pRaw)) {
            const p = pRaw as Record<string, unknown>;
            const r = asCountryCode(p['countryResidence'])?.toUpperCase() ?? null;
            const c = asCountryCode(p['countryCitizenship'])?.toUpperCase() ?? null;
            const tx = asCountryCode(p['countryTax'])?.toUpperCase() ?? null;
            setIsEe(r === 'EE' && c === 'EE' && tx === 'EE');
          }

          return;
        }

        // 2) Fallback: compute zone from profile
        const pRaw = root['profile'];
        if (!isObject(pRaw)) return;

        const p = pRaw as Record<string, unknown>;
        const r = asCountryCode(p['countryResidence'])?.toUpperCase() ?? null;
        const c = asCountryCode(p['countryCitizenship'])?.toUpperCase() ?? null;
        const tx = asCountryCode(p['countryTax'])?.toUpperCase() ?? null;

        setIsEe(r === 'EE' && c === 'EE' && tx === 'EE');

        // IMPORTANT: do NOT pass '' into AML resolver; use null
        const zones = [r, c, tx].map((code) => resolveAmlZone(typeof code === 'string' ? code : null));
        const z2: CountryZone =
          zones.includes('red') ? 'red' :
          zones.includes('grey') ? 'grey' :
          zones.includes('green') ? 'green' : null;

        setZone(z2);
      } catch {
        // ignore
      }
    })();

    // 1) Fast stage: base catalog from API
    const r = await api.nft.list();
    if (!r.ok) {
      setItems([]);
      return;
    }

    const baseItems = (r.items as Item[]) ?? [];

    // Draw full cards immediately with base data
    setItems(baseItems);

    // 2) Slow stage: on-chain / summary for availability indicators
    const sRes = await fetch(`/api/nft/summary?ts=${Date.now()}`, {
      cache: 'no-store',
    }).catch(() => null);

    if (!sRes || !sRes.ok) {
      // keep baseItems as-is; indicators will stay at base values
      return;
    }

    const raw: unknown = await sRes.json().catch(() => null);
    if (!isSummaryResp(raw)) {
      return;
    }

    const byId = new Map<string, SummaryItem>();
    for (const it of raw.items) {
      byId.set(it.id, it);
    }

    // Update only indicators (total/sold/minted), keep everything else
    setItems((prev) => {
      const src = Array.isArray(prev) && prev.length ? prev : baseItems;

      return src.map((i) => {
        const s = byId.get(i.id);
        return s ? { ...i, _sum: { total: s.total, sold: s.sold }, minted: s.sold } : i;
      });
    });
  };

  useEffect(() => {
    void load();
  }, []);

  const cf = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
      }),
    [],
  );
  const presale = usePresaleCountdown();

  const hasItems = Array.isArray(items) && items.length > 0;

  const skeletonCards = (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="card p-3 md:p-4 flex flex-col rounded-2xl animate-pulse">
          <div
            className="relative w-full mb-3 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/70"
            style={{ aspectRatio: '3 / 4' }}
          />
          <div className="h-3 w-2/3 rounded-full bg-zinc-100/60 dark:bg-zinc-800/60 mb-2" />
          <div className="h-2.5 w-full rounded-full bg-zinc-100/50 dark:bg-zinc-800/50 mb-1" />
          <div className="h-2.5 w-4/5 rounded-full bg-zinc-100/50 dark:bg-zinc-800/50 mb-4" />
          <div className="mt-auto h-8 w-full rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/70" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* stage 1: skeleton grid while list is loading */}
      {items === null && skeletonCards}

      {/* stage 2: real cards once base list loaded */}
      {hasItems && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {items!.map((i) => {
            const owned = (i.ownedQty || 0) > 0;
            const src = `/images/nft/${pngNameFor(i.id)}`;
            const showCountdown = presale.isPresale && i.id !== 'nft-ws-20';

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

            const keys = Array.isArray(i.summaryKeys) ? i.summaryKeys : [];
            const hasResume = keys.length > 0;
            const resumeKey = hasResume ? keys[keys.length - 1] : undefined;
            const featureKeys = hasResume ? keys.slice(0, keys.length - 1) : [];

            const progressColor = pct > 70 ? '#EF4444' : pct >= 30 ? '#F59E0B' : '#10B981';

            return (
              <div key={i.id} className="card p-3 md:p-4 flex flex-col rounded-2xl">
                {/* Preview with overlays */}
                <div className="relative w-full mb-3" style={{ aspectRatio: '3 / 4' }}>
                  <Image
                    src={src}
                    alt={i.name}
                    fill
                    sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 320px"
                    className="object-cover rounded-xl border"
                    priority={false}
                  />

                  {/* Owned chip (top-right) */}
                  {owned && (
                    <div className="absolute top-2 right-2 chip shadow">
                      {t('nft.owned')}: <b className="ml-1">{i.ownedQty}</b>
                    </div>
                  )}

                  {/* Micro countdown (bottom-left) */}
                  {showCountdown && (
                    <div className="absolute left-2 bottom-2 text-white text-shadow-sm">
                      <div className="text-[10px] font-semibold uppercase tracking-wide mb-0.5 drop-shadow">
                        {t('nft.badge.presale')}
                      </div>
                      <div className="text-[10px] leading-none opacity-80 -mt-[6px]">
                        {t('nft.badge.presale_since')}
                      </div>
                      <div className="flex gap-2 mt-[4px]">
                        {[
                          { v: presale.d, l: t('nft.timer.d') },
                          { v: presale.h, l: t('nft.timer.h') },
                          { v: presale.m, l: t('nft.timer.m') },
                          { v: presale.s, l: t('nft.timer.s') },
                        ].map(({ v, l }) => (
                          <div key={l} className="flex flex-col items-center leading-none drop-shadow">
                            <div className="text-[11px] font-semibold tabular-nums">{v}</div>
                            <div className="text-[8px] font-light opacity-90 leading-[0.95]">{l}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Title row + total */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="font-semibold text-sm md:text-base">{i.name}</div>
                  {typeof total === 'number' && total > 0 && (
                    <div className="chip shrink-0" title={t('nft.total')}>
                      {t('nft.total')}: {total}
                    </div>
                  )}
                </div>

                {/* Collapsible features */}
                {featureKeys.length > 0 ? (
                  <details
                    className="mb-2 rounded-lg"
                    open={!!expanded[i.id]}
                    onToggle={(e) =>
                      setExpanded((s) => ({
                        ...s,
                        [i.id]: (e.target as HTMLDetailsElement).open,
                      }))
                    }
                  >
                    <summary className="cursor-pointer select-none text-[11px] md:text-xs opacity-80 underline underline-offset-4">
                      {expanded[i.id] ? t('nft.hide') ?? 'Hide features' : t('nft.show') ?? 'Show features'}
                    </summary>
                    <ul className="mt-2 text-[10px] md:text-xs opacity-80 list-disc pl-4 space-y-1">
                      {featureKeys.map((k, idx) => (
                        <li key={idx}>{t(k)}</li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  <div className="text-xs md:text-sm opacity-70 mb-2">{i.blurb}</div>
                )}

                {/* Short resume (💬) */}
                {resumeKey && <div className="text-[11px] md:text-xs opacity-80 mb-2">{t(resumeKey)}</div>}

                {/* Price + after-date pill */}
                {(() => {
                  const hasSol = solPrice !== null && solPrice > 0;
                  const hasEur = i.eurPrice > 0;

                  if (!hasSol && !hasEur) {
                    return <div className="text-xs md:text-sm opacity-70 mb-2">{t('nft.badge.invite')}</div>;
                  }

                  return (
                    <div className="text-xs md:text-sm mb-2 flex items-center gap-2 flex-wrap">
                      <div>
                        {t('nft.price')}: {hasSol ? <b>{solPrice} SOL</b> : <span className="opacity-70">—</span>}
                        {hasSol && hasEur && (
                          <span className="ml-2 text-[11px] opacity-70">
                            ≈ {cf.format(i.eurPrice)} (presale reference)
                          </span>
                        )}
                      </div>
                      {hasSol && <span className="chip">{t('nft.after')}</span>}
                    </div>
                  );
                })()}

                {/* Availability (global summary) */}
                {showAvailability && (
                  <div className="space-y-1.5 mb-3">
                    <div className="text-[11px] md:text-xs opacity-80">{t('nft.availability')}</div>
                    <SalesBar t={t} limited={total} minted={sold} progressColor={progressColor} />
                  </div>
                )}

                {/* Meta chips */}
                <div className="flex flex-wrap gap-2 text-[10px] md:text-xs opacity-70 mb-3">
                  {blockedByAml && (
                    <span className="chip" title={tr('nft.amlBlocked', 'Blocked by AML')} aria-label="AML blocked">
                      ⛔ {tr('nft.amlBlocked', 'Blocked')}
                    </span>
                  )}

                  {showKycBadge && (
                    <span className="chip" title={t('nft.kyc')} aria-label="KYC">
                      🔒 {t('nft.kyc')}
                    </span>
                  )}

                  {(i.eurPrice <= 0 || i.id === 'nft-ws-20') && (
                    <span className="chip" title={t('nft.badge.invite')} aria-label="Invite">
                      🔑 {t('nft.badge.invite')}
                    </span>
                  )}

                  <span className="chip" title={i.vesting || 'No vesting'}>
                    {t('nft.vesting')}: {i.vesting ? t('yes') : t('no')}
                  </span>
                </div>

                <div className="mt-auto">
                  <Link href={`/dashboard/nft/${i.id}`} className="btn btn-outline w-full justify-center rounded-2xl">
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
