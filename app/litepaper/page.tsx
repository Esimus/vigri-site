// app/litepaper/page.tsx
'use client';

import Link from 'next/link';
import PublicHeader from '@/components/layout/PublicHeader';
import TokenParameters from '@/components/TokenParameters';
import { useI18n } from '@/hooks/useI18n';

export default function LitepaperPage() {
  const { t } = useI18n();

  return (
    <main className="page-bg min-h-screen">
      <PublicHeader />

      <div className="mx-auto flex max-w-4xl flex-col gap-12 px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="space-y-4">
          <span className="chip chip--md chip-nav--active uppercase tracking-wide text-[10px]">
            {t('litepaper.tagline')}
          </span>

          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            {t('litepaper.title')}
          </h1>

          <p className="max-w-2xl text-sm text-zinc-600 sm:text-base">
            {t('litepaper.lead')}
          </p>
        </header>

        {/* Short overview blocks */}
        <section className="grid gap-6 md:grid-cols-2">
          <div className="card p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900">
              {t('litepaper.block_what_title')}
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              {t('litepaper.block_what_text')}
            </p>
          </div>

          <div className="card p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900">
              {t('litepaper.block_why_title')}
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              {t('litepaper.block_why_text')}
            </p>
          </div>

          <div className="card p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900">
              {t('litepaper.block_launch_title')}
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              {t('litepaper.block_launch_text')}
            </p>
          </div>

          <div className="card p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900">
              {t('litepaper.block_vision_title')}
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              {t('litepaper.block_vision_text')}
            </p>
          </div>
        </section>

        <TokenParameters t={t} />

        {/* Download section */}
        <section className="space-y-4 border-t border-zinc-200 pt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t('litepaper.download_heading')}
          </h2>

          <p className="max-w-2xl text-sm text-zinc-600">
            {t('litepaper.download_text')}
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/docs/vigri-litepaper-ru.pdf"
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline rounded-full"
            >
              {t('litepaper.download_ru')}
            </Link>

            <Link
              href="/docs/vigri-litepaper-en.pdf"
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline rounded-full"
            >
              {t('litepaper.download_en')}
            </Link>

            <Link
              href="/docs/vigri-litepaper-et.pdf"
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline rounded-full"
            >
              {t('litepaper.download_et')}
            </Link>
          </div>

          <p className="text-xs text-zinc-500">
            {t('litepaper.note')}
          </p>
        </section>
      </div>
    </main>
  );
}
