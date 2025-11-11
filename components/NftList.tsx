// components/NftList.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';
import Link from 'next/link';
import Image from 'next/image';
import { PRESALE_END_ISO, presaleRemainingMs, formatRemaining } from '@/lib/config';
import SalesBar from '@/components/ui/SalesBar';

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
};

function pngNameFor(id: string): string {
  switch (id) {
    case 'nft-tree-steel':  return '1_mb_wood_stell.webp';
    case 'nft-bronze':      return '2_mb_bronze.webp';
    case 'nft-silver':      return '3_mb_silver.webp';
    case 'nft-gold':        return '4_mb_gold.webp';
    case 'nft-platinum':    return '5_mb_platinum.webp';
    case 'nft-ws-20':       return '6_mb_ws.webp';
    default:                return '6_mb_ws.webp';
  }
}

type SummaryItem = { id: string; total: number; sold: number };
type SummaryResp = { ok: true; items: SummaryItem[] };

function isSummaryItem(x: unknown): x is SummaryItem {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === 'string'
      && typeof o.total === 'number'
      && typeof o.sold === 'number';
}

function isSummaryResp(x: unknown): x is SummaryResp {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (o.ok !== true) return false;
  if (!Array.isArray(o.items)) return false;
  return o.items.every(isSummaryItem);
}

/** Compact presale countdown: 4 cells (D/H/M/S). */
function usePresaleCountdown() {
  const [tick, setTick] = useState(() => formatRemaining(presaleRemainingMs()));
  useEffect(() => {
    const id = setInterval(() => setTick(formatRemaining(presaleRemainingMs())), 1000);
    return () => clearInterval(id);
  }, []);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    isPresale: presaleRemainingMs() > 0,
    d: String(tick.d),
    h: pad(tick.h),
    m: pad(tick.m),
    s: pad(tick.s),
  };
}

export default function NftList() {
  const { t } = useI18n();
  const [items, setItems] = useState<Item[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Load base list and merge global summary (single source of truth for totals)
  const load = async () => {
    const r = await api.nft.list();
    if (!r.ok) return;

    const baseItems = (r.items as Item[]) ?? [];

    // fetch global summary (no caching)
    const sRes = await fetch(`/api/nft/summary?ts=${Date.now()}`, { cache: 'no-store' }).catch(() => null);

    // map id -> summary
    const byId = new Map<string, SummaryItem>();
    if (sRes && sRes.ok) {
      const raw: unknown = await sRes.json().catch(() => null);
      if (isSummaryResp(raw)) {
        for (const it of raw.items) byId.set(it.id, it);
      }
    }

    // merge summary into items (write to _sum; do not trust local minted)
    const merged = baseItems.map((i) => {
      const s = byId.get(i.id);
      return s ? { ...i, _sum: { total: s.total, sold: s.sold }, minted: s.sold } : i;
    });

    setItems(merged);
  };
  useEffect(() => { load(); }, []);

  const cf = useMemo(() => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }), []);
  const afterDateLabel = useMemo(() => {
    const d = new Date(PRESALE_END_ISO);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }, []);

  const presale = usePresaleCountdown();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {msg ? <div className="text-sm">{msg}</div> : <div />}
        <div className="flex items-center gap-2">
          <button
            className="btn btn-outline px-3 py-1 text-xs"
            onClick={async () => { await api.nft.invite(true); await load(); setMsg(t('nft.dev.invite_grant')); }}
          >
            {t('nft.dev.invite_grant')}
          </button>
          <button
            className="btn btn-outline px-3 py-1 text-xs"
            onClick={async () => { await api.nft.invite(false); await load(); setMsg(t('nft.dev.invite_revoke')); }}
          >
            {t('nft.dev.invite_revoke')}
          </button>
          <form action="/api/nft/reset" method="POST">
            <button className="btn btn-outline px-3 py-1 text-xs">{t('nft.reset')}</button>
          </form>
        </div>
      </div>

      {/* 2 cols on mobile, 3 on md+ */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {items.map((i) => {
          const owned = (i.ownedQty || 0) > 0;
          const src = `/images/nft/${pngNameFor(i.id)}`;
          const showCountdown = presale.isPresale && i.id !== 'nft-ws-20';

          // Availability: use global summary; fallback to local catalog
          const total = typeof i._sum?.total === 'number'
            ? i._sum.total
            : (Number.isFinite(i.limited) ? (i.limited || 0) : 0);

          const soldFromSummary = typeof i._sum?.sold === 'number' ? i._sum.sold : 0;
          const soldLocal = Math.min(i.minted || 0, total);
          const sold = Math.max(soldFromSummary, soldLocal);

          const pct = total > 0 ? Math.round((sold / total) * 100) : 0;
          const showAvailability = i.id !== 'nft-ws-20' && total > 0;

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
                    <div className="flex gap-2">
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
                    setExpanded((s) => ({ ...s, [i.id]: (e.target as HTMLDetailsElement).open }))
                  }
                >
                  <summary className="cursor-pointer select-none text-[11px] md:text-xs opacity-80 underline underline-offset-4">
                    {expanded[i.id] ? (t('nft.hide') ?? 'Hide features') : (t('nft.show') ?? 'Show features')}
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
              {resumeKey && (
                <div className="text-[11px] md:text-xs opacity-80 mb-2">
                  {t(resumeKey)}
                </div>
              )}

              {/* Price + after-date pill */}
              {i.eurPrice > 0 ? (
                <div className="text-xs md:text-sm mb-2 flex items-center gap-2 flex-wrap">
                  <div>
                    {t('nft.price')}: <b>{cf.format(i.eurPrice)}</b>
                  </div>
                  <span className="chip">
                    {t('nft.after')} {afterDateLabel}: {cf.format(i.eurPrice * 2)}
                  </span>
                </div>
              ) : (
                <div className="text-xs md:text-sm opacity-70 mb-2">{t('nft.badge.invite')}</div>
              )}

              {/* Availability (global summary) */}
              {showAvailability && (
                <div className="space-y-1.5 mb-3">
                  <div className="text-[11px] md:text-xs opacity-80">{t('nft.availability')}</div>
                  <SalesBar
                    t={t}
                    limited={total}
                    minted={sold}
                    progressColor={progressColor}
                  />
                </div>
              )}

              {/* Meta chips */}
              <div className="flex flex-wrap gap-2 text-[10px] md:text-xs opacity-70 mb-3">
                {i.kycRequired && (
                  <span className="chip" title={t('nft.kyc')} aria-label="KYC">🔒 {t('nft.kyc')}</span>
                )}
                {(i.eurPrice <= 0 || i.id === 'nft-ws-20') && (
                  <span className="chip" title={t('nft.badge.invite')} aria-label="Invite">🔑 {t('nft.badge.invite')}</span>
                )}
                <span className="chip" title={i.vesting || 'No vesting'}>
                  {t('nft.vesting')}: {i.vesting ? t('nft.yes') : t('nft.no')}
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
    </div>
  );
}
