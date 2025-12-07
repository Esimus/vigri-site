// components/ui/StatCarousel.tsx
'use client';

import { useRef, type WheelEventHandler } from 'react';
import type { ReactNode } from 'react';

type Item = {
  title: string;
  value: ReactNode;
  hint?: string;
};

export default function StatCarousel({ items }: { items: Item[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  // Scroll by exactly one slide width (including the visual gap)
  const scrollByOne = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>('[data-slide]');
    const gap = 12; // must match gap-3 below
    const step = first
      ? first.getBoundingClientRect().width + gap
      : el.clientWidth * 0.45;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  // Wheel: always scroll the carousel horizontally and block page scroll
  const onWheelCapture: WheelEventHandler<HTMLDivElement> = (e) => {
    const el = trackRef.current;
    if (!el) return;

    const dominant =
      Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;

    // If there is any wheel movement, prevent the page itself from scrolling
    if (dominant !== 0) {
      e.preventDefault();
      e.stopPropagation();
      el.scrollBy({ left: dominant, behavior: 'auto' });
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
            absolute inset-y-0 left-0 w-7 z-10 grid place-items-center rounded-l-xl border 
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

        {/* Right paddle (full height) */}
        <button
          type="button"
          aria-label="Next"
          onClick={() => scrollByOne(1)}
          className="
            absolute inset-y-0 right-0 w-7 z-10 grid place-items-center rounded-r-xl border 
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

        {/* Track (native swipe + wheel; scrollbar hidden) */}
        <div
          ref={trackRef}
          onWheelCapture={onWheelCapture}
          className="
            flex gap-3 overflow-x-auto snap-x snap-mandatory py-1
            touch-pan-x select-none overscroll-contain
            [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
          "
          role="region"
          aria-label="Quick stats"
        >
          {items.map((it, i) => {
            const valueText = typeof it.value === 'string' ? it.value : '';
            return (
              <div
                key={i}
                data-slide
                className="
                  snap-start shrink-0
                  basis-[42%] sm:basis-[38%]
                  max-w-[520px]
                "
                tabIndex={0}
                aria-label={
                  valueText ? `${it.title}: ${valueText}` : it.title
                }
              >
                {/* Equal-height card */}
                <div className="card p-3 min-w-0 h-full min-h-[110px] flex flex-col justify-between">
                  <div className="text-[11px] opacity-70">{it.title}</div>
                  <div className="text-xl font-semibold mt-1 truncate">
                    {it.value}
                  </div>
                  {it.hint && (
                    <div className="text-[11px] opacity-60 mt-1">
                      {it.hint}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
