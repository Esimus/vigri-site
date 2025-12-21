// components/NftIntro.tsx
'use client';

import { useState } from 'react';
import { useI18n } from '@/hooks/useI18n';

export default function NftIntro() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="card p-4 md:p-5 rounded-2xl">
      {/* Collapsible container:
         - closed: show ~2 lines (half of p1) with a fade curtain
         - open: show full intro (p1..p4) */}
      <div className="relative">
        <div className={open ? 'space-y-2.5' : 'space-y-2.5 max-h-12 overflow-hidden'}>
          <p className="text-xs md:text-sm">
            <b>{t('nft.intro_title_bold')}</b> {t('nft.intro_p1_tail')}
          </p>
          <p className="text-xs md:text-sm opacity-90">{t('nft.intro_p2')}</p>
          <p className="text-xs md:text-sm opacity-90">{t('nft.intro_p3')}</p>
          <p className="text-xs md:text-sm opacity-90">{t('nft.intro_p4')}</p>
        </div>

        {!open && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12 fade-curtain"
            aria-hidden="true"
          />
        )}
      </div>

      <button
        type="button"
        className="mt-2 inline-flex items-center gap-1 text-xs md:text-sm link-accent"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (t('nft.read_less') ?? 'Show less') : (t('nft.read_more') ?? 'Show more')}
        <span aria-hidden>{open ? '↑' : '↓'}</span>
      </button>
    </div>
  );
}
