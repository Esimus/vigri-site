// components/ui/StatCarousel.tsx
'use client';

import { useRef } from 'react';

type Item = { title: string; value: string; hint?: string };

/** Mobile-first KPI carousel: snap, arrows-as-paddles, touch & wheel scroll */
export default function StatCarousel({ items }: { items: Item[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  // Scroll by exactly one slide width (including the visual gap)
  const scrollByOne = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>('[data-slide]');
    const gap = 12; // must match gap-3 below
    const step = first ? first.getBoundingClientRect().width + gap : el.clientWidth * 0.45;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  // Allow mouse-wheel to scroll horizontally on desktop trackpads/mice
  const onWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    const el = trackRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      el.scrollBy({ left: e.deltaY, behavior: 'auto' });
    }
  };

  return (
    <div className="relative md:hidden">
      {/* Paddles live outside the card content area; extra horizontal padding creates gutters */}
      <div className="relative px-8">
        {/* Left paddle (full height) */}
        <button
          type="button"
          aria-label="Previous"
          onClick={() => scrollByOne(-1)}
          className="
            absolute inset-y-0 left-0 w-7 z-10
            grid place-items-center
            bg-gradient-to-r from-white/95 to-transparent dark:from-black/45
            ring-1 ring-black/5 dark:ring-white/10
            shadow-sm hover:shadow transition
            rounded-l-xl
          "
        >
          <span className="text-xl leading-none select-none">‹</span>
        </button>

        {/* Right paddle (full height) */}
        <button
          type="button"
          aria-label="Next"
          onClick={() => scrollByOne(1)}
          className="
            absolute inset-y-0 right-0 w-7 z-10
            grid place-items-center
            bg-gradient-to-l from-white/95 to-transparent dark:from-black/45
            ring-1 ring-black/5 dark:ring-white/10
            shadow-sm hover:shadow transition
            rounded-r-xl
          "
        >
          <span className="text-xl leading-none select-none">›</span>
        </button>

        {/* Track (native swipe + wheel; scrollbar hidden) */}
        <div
          ref={trackRef}
          onWheel={onWheel}
          className="
            flex gap-3 overflow-x-auto snap-x snap-mandatory py-1
            touch-pan-x select-none
            [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
          "
          role="region"
          aria-label="Quick stats"
        >
          {items.map((it, i) => (
            <div
              key={i}
              data-slide
              className="
                snap-start shrink-0
                basis-[42%] sm:basis-[38%] /* narrower than 1/2; shows neighbor nicely */
                max-w-[520px]
              "
              tabIndex={0}
              aria-label={`${it.title}: ${it.value}`}
            >
              {/* Equal-height card */}
              <div className="card p-3 min-w-0 h-full min-h-[110px] flex flex-col justify-between">
                <div className="text-[11px] opacity-70">{it.title}</div>
                <div className="text-xl font-semibold mt-1 truncate">{it.value}</div>
                {it.hint && <div className="text-[11px] opacity-60 mt-1">{it.hint}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
