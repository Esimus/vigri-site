// components/ui/PillCarousel.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

export type PillItem = {
  id: string;          // stable id
  label: string;       // text on the pill
  href: string;        // link to navigate
  active?: boolean;    // highlight current
};

/**
 * Reusable horizontal pills carousel (desktop & mobile):
 * - native swipe
 * - wheel:
 * - Paddles are always visible (disabled if there is nowhere to scroll)
 * - hides scrollbar
 * - uses site chips: .chip .chip--sm + .chip-nav(.chip-nav--active)
 */
export default function PillCarousel({ items, back }: { items: PillItem[]; back?: PillItem }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const all = useMemo(() => (back ? [back, ...items] : items), [back, items]);

  const update = () => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanLeft(scrollLeft > 2);
    setCanRight(scrollLeft + clientWidth < scrollWidth - 2);
  };

  const scrollByStep = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    // step: width of ~2 pills or 80% of viewport
    const first = el.querySelector<HTMLElement>('[data-pill]');
    const gap = 6; // px, must match gap-1.5 below
    const step = first ? first.getBoundingClientRect().width * 2 + gap : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  // We convert the vertical scroll wheel to horizontal scrolling and disable page scrolling.
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el) return;
    if (el.scrollWidth <= el.clientWidth) return; // no overflow - do nothing

    // vertical scrolling dominates - we assume the user is spinning the wheel
    if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
      e.preventDefault();
      e.stopPropagation();
      el.scrollBy({ left: e.deltaY, behavior: 'auto' });
    }
  };

  useEffect(() => {
    update();
    const el = trackRef.current;
    if (!el) return;
    const onScroll = () => update();
    el.addEventListener('scroll', onScroll, { passive: true });
    const onResize = () => update();
    window.addEventListener('resize', onResize);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div className="relative">
      <div className="card px-2 py-1.5 overflow-hidden">
        <div
          ref={trackRef}
          onWheelCapture={handleWheel}
          onWheel={handleWheel}
          className="
            flex items-center gap-1.5 px-8
            overflow-x-auto touch-pan-x select-none
            [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
          "
          style={{ overscrollBehavior: 'contain' }} /* disable the "chain" to the page */
          role="tablist"
          aria-label="NFT types"
        >
          {all.map((it) => {
            const active = !!it.active;
            return (
              <Link
                key={it.id}
                href={it.href}
                data-pill
                className={[
                  'chip chip--sm chip-nav',
                  active ? 'chip-nav--active' : '',
                ].join(' ')}
                aria-current={active ? 'page' : undefined}
                role="tab"
              >
                {it.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* paddles */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-[var(--card)] to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-[var(--card)] to-transparent" />
      {canLeft && (
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollByStep(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 card !rounded-lg !p-0 h-6 w-4 grid place-items-center text-zinc-800 hover:bg-brand-50"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        )}
        {canRight && (
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollByStep(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 card !rounded-lg !p-0 h-6 w-4 grid place-items-center text-zinc-800 hover:bg-brand-50"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M9 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        )}
    </div>
  );
}

