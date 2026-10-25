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
  mintedLabel?: string;
  locale?: string;
};

export default function SalesBar({
  t, limited, minted, fallbackTotal, progressColor, className, mintedLabel, locale,
}: Props) {
  const { sold, left, pct } = useMemo(() => {
    const tot = Number.isFinite(limited as number)
      ? Number(limited || 0)
      : Number(fallbackTotal || 0);
    const s = Math.min(Number(minted || 0), tot);
    const l = Math.max(tot - s, 0);
    const p = tot > 0 ? (s / tot) * 100 : 0;
    return { sold: s, left: l, pct: p };
  }, [limited, minted, fallbackTotal]);

  const fmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const pctText = pct > 0 && pct < 0.01 ? `<${fmt.format(0.01)}` : fmt.format(pct);

  return (
    <div className={className}>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, ...(progressColor ? { backgroundColor: progressColor } : {}) }}
        />
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[11px] opacity-80 mt-1.5">
        <span>{mintedLabel ?? t('nft.sold_short')}: <b>{sold}</b> ({pctText}%)</span>
        <span>{t('nft.available_short')}: <b>{left}</b></span>
      </div>
    </div>
  );
}
