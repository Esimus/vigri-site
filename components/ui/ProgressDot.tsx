import React from 'react';

export function ProgressDot({ value }: { value?: number }) {
  if (value == null) {
    return (
      <div
        className="h-8 w-8 shrink-0 rounded-full border border-zinc-300 grid place-items-center"
        aria-hidden="true"
      >
        <span className="text-zinc-400">•</span>
      </div>
    );
  }
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  const deg = (pct / 100) * 360;

  return (
    <div
      className="relative h-8 w-8 shrink-0 rounded-full"
      style={{ background: `conic-gradient(var(--brand-600) ${deg}deg, #e5e7eb ${deg}deg)` }}
      aria-label={`Progress ${pct}%`}
      title={`${pct}% complete`}
    >
      <div className="absolute inset-1 rounded-full bg-white border border-zinc-300" />
    </div>
  );
}
