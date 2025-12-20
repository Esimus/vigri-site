// components/layout/PublicHeader.tsx
'use client';

import Link from 'next/link';
import { LanguageSwitcher } from '@/components/nav/LanguageSwitcher';
import { useI18n } from '@/hooks/useI18n';
import { CONFIG } from '@/lib/config';
import VigriLogo from '@/components/VigriLogo';

export default function PublicHeader() {
  const { lang, setLang, t } = useI18n();

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-zinc-200">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Brand — same look as dashboard */}
          <Link href="/" className="flex items-center gap-3">
            <div className="h-11 w-11 overflow-hidden rounded-2xl ring-1 ring-zinc-200 bg-white">
              <VigriLogo className="shrink-0 size-11" /> {/* 44px */}
            </div>
            <div className="min-w-0">
              <div className="font-semibold tracking-tight leading-5">VIGRI</div>
              <div className="text-xs text-zinc-500">Solana Utility Token</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {/* No ProfileMenu / Notifications in public header */}
            <LanguageSwitcher lang={lang} onChange={setLang} />

            <a
              href={CONFIG.TELEGRAM_URL}
              target="_blank"
              className="btn btn-outline"
              rel="noreferrer"
              aria-label={t('btn_telegram')}
              title={t('btn_telegram')}
            >
              {/* Mobile: Telegram plane icon in Telegram blue */}
              <span className="inline-flex sm:hidden text-[#229ED9]" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M22.05 2.02a1.5 1.5 0 0 0-1.62-.24L2.6 9.27a1.5 1.5 0 0 0 .15 2.83l4.74 1.58 1.72 5.66a1.5 1.5 0 0 0 2.48.67l2.76-2.64 4.93 3.63a1.5 1.5 0 0 0 2.36-.9l2.27-15.97a1.5 1.5 0 0 0-.96-1.11ZM9.2 13.25l10.36-7.05-8.3 8.4-.3 3.14-1.52-4.98-3.1-1.03 12.86-5.03-10 6.55Z" />
                </svg>
              </span>

              {/* Desktop: keep text */}
              <span className="hidden sm:inline">{t('btn_telegram')}</span>
            </a>

            {/* Desktop only: "Soon on DEX" (disabled) */}
            <button
              type="button"
              className="hidden sm:inline-flex btn btn-primary rounded-2xl opacity-60 cursor-not-allowed"
              disabled
            >
              {t('btn_trade')}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
