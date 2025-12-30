// components/MyNftsStrip.tsx
'use client';

import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useI18n } from '@/hooks/useI18n';
import { usePhantomWallet } from '@/hooks/usePhantomWallet';
import { useSolflareWallet } from '@/hooks/useSolflareWallet';
import { NFT_CATALOG } from '@/constants/nftCatalog';

type CSSWithExtras = React.CSSProperties & {
  overflowX?: React.CSSProperties['overflowX'] | 'clip';
  scrollbarWidth?: 'auto' | 'thin' | 'none';
};

const TILE_W = 92;
const TILE_H = 120;
const GAP = 12;
const PADDLE_W = 28;
const EDGE_PAD = PADDLE_W + 12;
const MAX_EXPANDED_SHOW = 10;

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

function nftIdFromTier(tierId: number): string | null {
  switch (tierId) {
    case 0:
      return 'nft-tree-steel';
    case 1:
      return 'nft-bronze';
    case 2:
      return 'nft-silver';
    case 3:
      return 'nft-gold';
    case 4:
      return 'nft-platinum';
    case 5:
      return 'nft-ws-20';
    default:
      return null;
  }
}

type Group = { id: string; name: string; qty: number; src: string };
type MintEvent = {
  id: string;
  userId: string | null;
  wallet: string;
  tierId: number;
  quantity: number;
  txSignature: string;
  network: string;
  createdAt: string;
};

type MintLogResp = {
  ok: boolean;
  items: MintEvent[];
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function shortTx(sig: string, prefix = 14, suffix = 10): string {
  if (!sig) return '';

  if (sig.length <= prefix + suffix + 3) {
    return sig;
  }

  return `${sig.slice(0, prefix)}…${sig.slice(-suffix)}`;
}

export default function MyNftsStrip() {
  const { t } = useI18n();
  const { address: phantomAddress } = usePhantomWallet();
  const { address: solflareAddress } = useSolflareWallet();

  // Универсальный адрес: сначала Phantom, если нет — Solflare
  const walletAddress = phantomAddress ?? solflareAddress ?? null;

  const [groups, setGroups] = useState<Group[]>([]);
  const [events, setEvents] = useState<MintEvent[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [recentExpanded, setRecentExpanded] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!walletAddress) {
      // очищаем только если что-то было
      setGroups((prev) => (prev.length ? [] : prev));
      setEvents((prev) => (prev.length ? [] : prev));
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const params = new URLSearchParams({
          wallet: walletAddress,
          network: 'mainnet',
        });

        const res = await fetch(`/api/nft/mint-log?${params.toString()}`, {
          cache: 'no-store',
        });

        const data: MintLogResp = await res.json().catch(() => ({
          ok: false,
          items: [],
        }));

        if (!res.ok || !data.ok) {
          if (!cancelled) {
            setGroups((prev) => (prev.length ? [] : prev));
            setEvents((prev) => (prev.length ? [] : prev));
          }
          return;
        }

        const items = Array.isArray(data.items) ? data.items : [];
        if (!cancelled) {
          setEvents(items);
        }

        const map = new Map<string, Group>();

        for (const ev of items) {
          const nftId = nftIdFromTier(ev.tierId);
          if (!nftId) continue;

          const existing = map.get(nftId);
          const meta = NFT_CATALOG[nftId];
          const name =
            (meta?.nameKey ? t(meta.nameKey) : meta?.name) ?? nftId;
          const src = `/images/nft/${pngNameFor(nftId)}`;
          const qty = (existing?.qty ?? 0) + (ev.quantity || 1);

          map.set(nftId, {
            id: nftId,
            name,
            qty,
            src,
          });
        }

        if (!cancelled) {
          setGroups(Array.from(map.values()));
        }
      } catch {
        if (!cancelled) {
          setGroups((prev) => (prev.length ? [] : prev));
          setEvents((prev) => (prev.length ? [] : prev));
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [walletAddress, t]);

  const hasAny = groups.length > 0;

  const recentEvents = useMemo(() => {
    if (!events.length) return [];
    const sorted = [...events].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return sorted.slice(0, 7);
  }, [events]);

  const MAX_RECENT_COLLAPSED = 3;
  const hasRecentOverflow = recentEvents.length > MAX_RECENT_COLLAPSED;
  const visibleRecent =
    hasRecentOverflow && !recentExpanded
      ? recentEvents.slice(0, MAX_RECENT_COLLAPSED)
      : recentEvents;

  const step = useMemo(() => TILE_W + GAP, []);

  const scrollByOne = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  const onWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    const el = scrollerRef.current;
    if (!el) return;
    const useY = Math.abs(e.deltaY) >= Math.abs(e.deltaX);
    const delta = useY ? e.deltaY : e.deltaX;
    if (delta !== 0) {
      e.preventDefault();
      e.stopPropagation();
      el.scrollBy({ left: delta, behavior: 'auto' });
    }
  };

  const Tile = ({
    src,
    alt,
    overlay,
  }: {
    src: string;
    alt: string;
    overlay?: React.ReactNode;
  }) => (
    <div
      className="relative rounded-xl overflow-hidden border select-none snap-start"
      style={{
        width: TILE_W,
        height: TILE_H,
        background: 'var(--card)',
        borderColor: 'var(--border)',
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes={`${TILE_W}px`}
      />
      {overlay}
    </div>
  );

  const Stack = ({ g }: { g: Group }) => (
    <button
      type="button"
      className="relative snap-start"
      onClick={() => setExpanded((s) => ({ ...s, [g.id]: !s[g.id] }))}
      title={`${g.name} ×${g.qty}`}
      style={{ width: TILE_W, height: TILE_H }}
    >
      <div
        className="absolute left-1 top-1 rotate-[2deg] opacity-60 pointer-events-none"
        style={{ width: TILE_W, height: TILE_H }}
      >
        <Tile src={g.src} alt={g.name} />
      </div>
      <Tile src={g.src} alt={g.name} />
      <div className="absolute right-1 top-1 text-[12px] bg-black/75 text-white rounded-full px-1.5 py-[1px]">
        ×{g.qty}
      </div>
    </button>
  );

  const ExpandedRow = ({ g }: { g: Group }) => {
    const firstBatch = Math.min(g.qty, MAX_EXPANDED_SHOW);
    const [shown, setShown] = useState(firstBatch);

    useEffect(() => {
      setShown(Math.min(g.qty, MAX_EXPANDED_SHOW));
    }, [g.id, g.qty]);

    const rest = g.qty - shown;
    const revealMore = () => {
      if (rest <= 0) return;
      setShown((v) => Math.min(g.qty, v + MAX_EXPANDED_SHOW));
    };

    return (
      <>
        {Array.from({ length: shown }).map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setExpanded((s) => ({ ...s, [g.id]: false }))}
            title={`${g.name} #${idx + 1}`}
            className="relative snap-start"
            style={{ width: TILE_W, height: TILE_H }}
          >
            <Tile
              src={g.src}
              alt={g.name}
              overlay={
                <div
                  className="absolute bottom-1 left-1 font-bold leading-none select-none"
                  style={{
                    fontSize: 22,
                    color: 'rgba(184, 184, 184, 0.45)',
                    zIndex: 1,
                  }}
                >
                  {idx + 1}
                </div>
              }
            />
          </button>
        ))}

        {rest > 0 && (
          <button
            type="button"
            onClick={revealMore}
            title={`Show ${Math.min(rest, MAX_EXPANDED_SHOW)} more`}
            className="grid place-items-center text-sm rounded-xl border snap-start"
            style={{
              width: TILE_W,
              height: TILE_H,
              flex: '0 0 auto',
              background: 'var(--card)',
              borderColor: 'var(--border)',
            }}
          >
            +{rest}
          </button>
        )}

        <button
          className="text-sm opacity-70 hover:opacity-100 ml-1 snap-start"
          onClick={() => setExpanded((s) => ({ ...s, [g.id]: false }))}
          title="Close"
          style={{ height: TILE_H }}
        >
          ×
        </button>
      </>
    );
  };

  const PlusTile = () => (
    <Link
      href="/dashboard/nft"
      className="grid place-items-center rounded-xl border border-dashed snap-start"
      title={t('nft.add_more') ?? 'Add NFT'}
      style={{
        width: TILE_W,
        height: TILE_H,
        flex: '0 0 auto',
        background: 'var(--card)',
        borderColor: 'var(--border)',
      }}
    >
      +
    </Link>
  );

  const sectionStyle: CSSWithExtras = {
    contain: 'layout paint',
    overflowX: 'clip',
  };
  const viewportStyle: CSSWithExtras = {
    height: TILE_H,
    overflowX: 'clip',
    contain: 'layout paint',
  };
  const scrollerStyle: CSSWithExtras = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    gap: `${GAP}px`,
    paddingInline: `${EDGE_PAD}px`,
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollSnapType: 'x mandatory',
    scrollPaddingInline: `${EDGE_PAD}px`,
    WebkitOverflowScrolling: 'touch',
    overscrollBehaviorX: 'contain',
    overscrollBehaviorY: 'contain',
    scrollbarWidth: 'none',
    touchAction: 'pan-x pan-y',
  };

  return (
    <section className="relative w-full" style={sectionStyle}>
      <div
        className="flex items-center justify-center mb-2"
        style={{ paddingInline: EDGE_PAD }}
      >
        <div className="h-px bg-zinc-200 flex-1 mx-2 rounded-full" />
        <div
          className="px-3 py-1 rounded-full border text-[11px] uppercase tracking-wide shadow-sm"
          style={{
            background: 'var(--card)',
            borderColor: 'var(--border)',
            color: 'var(--fg)',
          }}
        >
          {t('nft.my_title') ?? 'My NFT'}
        </div>
        <div className="h-px bg-zinc-200 flex-1 mx-2 rounded-full" />
      </div>

      <div className="relative w-full" style={viewportStyle}>
        <div
          ref={scrollerRef}
          onWheel={onWheel}
          role="region"
          aria-label="My NFTs"
          className="snap-x snap-mandatory select-none"
          style={scrollerStyle}
        >
          <style>
            {`[aria-label="My NFTs"]::-webkit-scrollbar{display:none}`}
          </style>

          {hasAny &&
            groups.map((g) =>
              expanded[g.id] ? (
                <ExpandedRow key={g.id} g={g} />
              ) : (
                <Stack key={g.id} g={g} />
              ),
            )}
          <PlusTile />
          <div aria-hidden style={{ width: GAP }} />
        </div>

        {/* Background-matched masks */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2"
          style={{
            width: EDGE_PAD,
            height: TILE_H,
            background:
              'linear-gradient(90deg, var(--bg) 70%, rgba(0,0,0,0) 100%)',
            zIndex: 10,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2"
          style={{
            width: EDGE_PAD,
            height: TILE_H,
            background:
              'linear-gradient(270deg, var(--bg) 70%, rgba(0,0,0,0) 100%)',
            zIndex: 10,
          }}
        />

        {/* Paddles */}
        <button
          type="button"
          aria-label="Previous"
          onClick={() => scrollByOne(-1)}
          className="
            absolute inset-y-0 left-0 w-7 z-50 grid place-items-center rounded-l-xl border
            hover:brightness-110 active:brightness-95 transition
          "
          style={{
            background: 'var(--card)',
            borderColor: 'var(--border)',
            color: 'var(--fg)',
          }}
        >
          <span aria-hidden className="text-xl leading-none select-none">
            ‹
          </span>
        </button>

        <button
          type="button"
          aria-label="Next"
          onClick={() => scrollByOne(1)}
          className="
            absolute inset-y-0 right-0 w-7 z-50 grid place-items-center rounded-r-xl border
            hover:brightness-110 active:brightness-95 transition
          "
          style={{
            background: 'var(--card)',
            borderColor: 'var(--border)',
            color: 'var(--fg)',
          }}
        >
          <span aria-hidden className="text-xl leading-none select-none">
            ›
          </span>
        </button>
      </div>

      {recentEvents.length > 0 && (
        <div
          className="mt-3 mb-3 text-[11px] leading-snug"
          style={{
            marginLeft: EDGE_PAD,
            marginRight: Math.max(0, EDGE_PAD - Math.round(PADDLE_W / 2)),
          }}
        >
          <div className="mb-1 font-semibold opacity-70">
            {t('nft.my_recent_mints') ?? 'My recent purchases'}
          </div>
          <ul className="space-y-0.5 opacity-75">
            {visibleRecent.map((ev) => {
              const nftId = nftIdFromTier(ev.tierId);
              const meta = nftId ? NFT_CATALOG[nftId] : undefined;
              const tierName =
                (meta?.nameKey ? t(meta.nameKey) : meta?.name) ??
                (nftId ?? `Tier #${ev.tierId}`);

              return (
                <li
                  key={ev.id}
                  className="truncate md:whitespace-normal md:overflow-visible md:text-clip"
                >
                  {tierName} · {formatDate(ev.createdAt)} ·{' '}
                  <a
                    href={`https://solscan.io/tx/${ev.txSignature}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:no-underline"
                  >
                    <span className="md:hidden">
                      {shortTx(ev.txSignature, 8, 4)}
                    </span>
                    <span className="hidden md:inline">
                      {shortTx(ev.txSignature, 14, 10)}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
          {recentExpanded && (
            <div className="mt-1 opacity-75">
              <Link
                href="/dashboard/assets"
                className="underline hover:no-underline"
              >
                {t('assets.history') ?? 'All operations'}
              </Link>
            </div>
          )}
        </div>
      )}

      {hasRecentOverflow ? (
        <div className="relative mt-2" style={{ marginInline: EDGE_PAD }}>
          {/* Base line (always visible) */}
          <div className="h-px w-full bg-zinc-200 rounded-full" />

          {/* Handle on top of the line */}
          <button
            type="button"
            onClick={() => setRecentExpanded((v) => !v)}
            className="group absolute inset-x-0 -top-[8px] flex justify-center"
            aria-expanded={recentExpanded}
            aria-label={
              recentExpanded
                ? t('nft.recent_toggle_hide') ??
                  'Hide full purchase history'
                : t('nft.recent_toggle_show') ?? 'Show all purchases'
            }
          >
            <span
              className="mt-[-3px] inline-flex items-center justify-center rounded-full border px-1.5 py-0.5 text-[9px] leading-none shadow-sm"
              style={{
                background: 'var(--card)',
                borderColor: 'var(--border)',
              }}
            >
              <span
                className={
                  'inline-flex items-center justify-center transition-transform ' +
                  (!recentExpanded ? 'rotate-180' : '')
                }
                aria-hidden
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 14l6-6 6 6"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </span>
          </button>
        </div>
      ) : (
        <div
          className="mt-2 h-px bg-zinc-200 rounded-full"
          style={{ marginInline: EDGE_PAD }}
        />
      )}
    </section>
  );
}
