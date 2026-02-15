// app/docs/page.tsx
'use client';

import Link from 'next/link';
import PublicHeader from '@/components/layout/PublicHeader';
import { useI18n } from '@/hooks/useI18n';

type LangCode = 'en' | 'ru' | 'et' | 'de';

type DocFile = {
  href: string;
  lang: LangCode;
};

const pitchFiles: DocFile[] = [
  // add more languages later when PDFs are ready
  { href: '/docs/vigri-app-pitch-2026-02-en.pdf', lang: 'en' },
];

const litepaperFiles: DocFile[] = [
  { href: '/docs/vigri-litepaper-en.pdf', lang: 'en' },
  { href: '/docs/vigri-litepaper-ru.pdf', lang: 'ru' },
  { href: '/docs/vigri-litepaper-et.pdf', lang: 'et' },
];

function langLabel(lang: LangCode, t: (key: string) => string) {
  switch (lang) {
    case 'en':
      return t('docs_lang_en');
    case 'ru':
      return t('docs_lang_ru');
    case 'et':
      return t('docs_lang_et');
    case 'de':
      return t('docs_lang_de');
    default:
      return lang;
  }
}

export default function DocsPage() {
  const { t } = useI18n();

  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="card p-4">
          <h1 className="text-2xl font-semibold">
            {t('docs_page_title')}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            {t('docs_page_intro')}
          </p>
        </div>

        <section className="space-y-4">
          {/* Pitch deck */}
          <div className="card p-4">
            <h2 className="text-lg font-semibold">
              {t('docs_pitch_title')}
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              {t('docs_pitch_desc')}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {pitchFiles.map((file) => (
                <Link
                  key={file.href}
                  href={file.href}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline text-sm"
                >
                  {t('docs_btn_download')} ({langLabel(file.lang, t)}, PDF)
                </Link>
              ))}
            </div>
          </div>

          {/* Litepaper */}
          <div className="card p-4">
            <h2 className="text-lg font-semibold">
              {t('docs_litepaper_title')}
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              {t('docs_litepaper_desc')}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {litepaperFiles.map((file) => (
                <Link
                  key={file.href}
                  href={file.href}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline text-sm"
                >
                  {t('docs_btn_download')} ({langLabel(file.lang, t)}, PDF)
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
