'use client';

// All comments in English
import Image from 'next/image';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useI18n } from '@/hooks/useI18n';
import { CONFIG } from '@/lib/config';

export default function PublicHeader() {
  const { lang, setLang, t } = useI18n();

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-zinc-200">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Brand — same look as dashboard */}
          <Link href="/" className="flex items-center gap-3">
            <div className="h-11 w-11 overflow-hidden rounded-2xl ring-1 ring-zinc-200 bg-white">
              <Image
                src="/vigri-logo.png"          // use same path as DashboardShell
                alt="VIGRI logo"
                width={44}
                height={44}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <div className="font-semibold tracking-tight">VIGRI</div>
              <div className="text-xs text-zinc-500">Solana Utility Token</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {/* No ProfileMenu / Notifications in public header */}
            <LanguageSwitcher lang={lang} onChange={setLang} />
            <a href={CONFIG.TELEGRAM_URL} target="_blank" className="btn btn-outline" rel="noreferrer">
              {t('btn_telegram')}
            </a>
            <a href={CONFIG.DEX_URL} target="_blank" className="btn btn-primary" rel="noreferrer">
              {t('btn_trade')}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
