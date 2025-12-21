'use client';

import Link from 'next/link';
import { useI18n } from '@/hooks/useI18n';
import CenterImage from '@/components/CenterImage';

export default function CenterPageClient() {
  const { t } = useI18n();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 md:py-10">
      {/* back link */}
      <div className="mb-3">
        <Link href="/" className="inline-flex items-center gap-1 text-xs font-normal link-accent">
          <span aria-hidden>←</span> {t('back_home')}
        </Link>
      </div>

      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
        {t('center.title')}
      </h1>

      {/* image floats right on desktop, stacks on mobile */}
      <CenterImage
        alt="International Training & Rehabilitation Center for Sports and Dance on the Gulf of Finland"
        caption={t('center.image_caption')}
      />

      {/* main text */}
      <p className="mt-3 text-sm md:text-base text-zinc-700">
        {t('beyond.text')}
      </p>

      {/* lead */}
      <p className="mt-3 text-sm md:text-base text-zinc-700">
        {t('center.context')}
      </p>

      {/* bullets */}
      <ul className="mt-5 space-y-2 text-zinc-800">
        <li>
          <span className="font-medium">{t('center.bullets.location.label')}</span>{' '}
          {t('center.bullets.location.value')}
        </li>
        <li>
          <span className="font-medium">{t('center.bullets.focus.label')}</span>{' '}
          {t('center.bullets.focus.value')}
        </li>
        <li>
          <span className="font-medium">{t('center.bullets.approach.label')}</span>{' '}
          {t('center.bullets.approach.value')}
        </li>
      </ul>

      {/* Transparency */}
      <div className="mt-6 p-5 rounded-2xl border border-zinc-200 bg-white shadow-sm clear-both">
        <div className="text-sm font-semibold tracking-tight">
          {t('transparency.title')}
        </div>

        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs text-zinc-500">{t('transparency.addresses')}</div>
            <div className="mt-1 text-sm text-zinc-700">{t('transparency.soon')}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">{t('transparency.reports')}</div>
            <div className="mt-1 text-sm text-zinc-700">{t('transparency.soon')}</div>
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-zinc-500">
        {t('center.disclaimer')}
      </p>
    </main>
  );
}
