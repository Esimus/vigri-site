// components/ui/SalesBar.tsx
'use client';

import { useMemo } from 'react';

type Props = {
  t: (k: string) => string;
  /** Preferred: finite per-SKU cap from API (same as i.limited / item.limited) */
  limited?: number | null;
  /** How many already minted/sold (same as i.minted / item.minted) */
  minted?: number | null;
  /** Fallback total if limited is not finite (e.g., meta.supply) */
  fallbackTotal?: number | null;
  /** Optional: keep same dynamic color as in the list */
  progressColor?: string;
  /** Optional wrapper class */
  className?: string;
};

export default function SalesBar({
  t, limited, minted, fallbackTotal, progressColor, className,
}: Props) {
  const { sold, left, pct } = useMemo(() => {
    const tot = Number.isFinite(limited as number)
      ? Number(limited || 0)
      : Number(fallbackTotal || 0);
    const s = Math.min(Number(minted || 0), tot);
    const l = Math.max(tot - s, 0);
    const p = tot > 0 ? Math.round((s / tot) * 100) : 0;
    return { sold: s, left: l, pct: p };
  }, [limited, minted, fallbackTotal]);

  return (
    <div className={className}>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, ...(progressColor ? { backgroundColor: progressColor } : {}) }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] md:text-xs opacity-80 mt-2">
        <span>{t('nft.sold_short')}: <b>{sold}</b> ({pct}%)</span>
        <span>{t('nft.available_short')}: <b>{left}</b></span>
      </div>
    </div>
  );
}
