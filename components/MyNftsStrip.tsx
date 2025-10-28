// components/MyNftsStrip.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';

type CSSWithExtras = React.CSSProperties & {
  overflowX?: React.CSSProperties['overflowX'] | 'clip';
  scrollbarWidth?: 'auto' | 'thin' | 'none';
};

const TILE_W = 92;
const TILE_H = 120;
const GAP = 12;
const PADDLE_W = 40;
const EDGE_PAD = PADDLE_W + 16;
const MAX_EXPANDED_SHOW = 10;

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

type Item  = { id: string; name: string; ownedQty?: number };
type Group = { id: string; name: string; qty: number; src: string };

export default function MyNftsStrip() {
  const { t } = useI18n();
  const [groups, setGroups] = useState<Group[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      const r = await api.nft.list();
      if (!r.ok) return setGroups([]);
      const gs: Group[] = r.items
        .filter((it: Item) => (it.ownedQty ?? 0) > 0)
        .map((it: Item) => ({
          id: it.id,
          name: it.name,
          qty: it.ownedQty ?? 0,
          src: `/images/nft/${pngNameFor(it.id)}`,
        }));
      setGroups(gs);
    })();
  }, []);

  const hasAny = groups.length > 0;
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

  const Tile = ({ src, alt, overlay }: { src: string; alt: string; overlay?: React.ReactNode }) => (
    <div
      className="relative rounded-xl overflow-hidden border select-none snap-start"
      style={{ width: TILE_W, height: TILE_H, background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <Image src={src} alt={alt} fill className="object-cover" sizes={`${TILE_W}px`} />
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
            style={{ width: TILE_W, height: TILE_H, flex: '0 0 auto', background: 'var(--card)', borderColor: 'var(--border)' }}
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
      style={{ width: TILE_W, height: TILE_H, flex: '0 0 auto', background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      +
    </Link>
  );

  const sectionStyle: CSSWithExtras = { contain: 'layout paint', overflowX: 'clip' };
  const viewportStyle: CSSWithExtras = { height: TILE_H, overflowX: 'clip', contain: 'layout paint' };
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
      <div className="flex items-center justify-center mb-2" style={{ paddingInline: EDGE_PAD }}>
        <div className="h-px bg-zinc-200 flex-1 mx-2 rounded-full" />
        <div 
          className="px-3 py-1 rounded-full border text-[11px] uppercase tracking-wide shadow-sm"
          style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--fg)' }}
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
          <style>{`[aria-label="My NFTs"]::-webkit-scrollbar{display:none}`}</style>

          {hasAny &&
            groups.map((g) =>
              expanded[g.id] ? <ExpandedRow key={g.id} g={g} /> : <Stack key={g.id} g={g} />
            )}
          <PlusTile />
          <div aria-hidden style={{ width: GAP }} />
        </div>

        {/* Background-matched masks (use page bg rgb(247,247,251)) */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2"
          style={{
            width: EDGE_PAD,
            height: TILE_H,
            background: 'linear-gradient(90deg, var(--bg) 70%, rgba(0,0,0,0) 100%)',
            zIndex: 10,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2"
          style={{
            width: EDGE_PAD,
            height: TILE_H,
            background: 'linear-gradient(270deg, var(--bg) 70%, rgba(0,0,0,0) 100%)',
            zIndex: 10,
          }}
        />

        {/* Paddles */}
        <button
          type="button"
          aria-label="Previous"
          onClick={() => scrollByOne(-1)}
          className="absolute left-2 top-1 bottom-1 z-30 grid place-items-center rounded-xl border"
          style={{ width: PADDLE_W, background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <span className="text-xl leading-none select-none">‹</span>
        </button>

        <button
          type="button"
          aria-label="Next"
          onClick={() => scrollByOne(1)}
          className="absolute right-2 top-1 bottom-1 z-30 grid place-items-center rounded-xl border"
          style={{ width: PADDLE_W, background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <span className="text-xl leading-none select-none">›</span>
        </button>
      </div>

      <div className="mt-2 h-px bg-zinc-200 rounded-full" style={{ marginInline: EDGE_PAD }} />
    </section>
  );
}
