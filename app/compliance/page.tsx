// app/compliance/page.tsx
'use client';

import PublicHeader from '@/components/layout/PublicHeader';
import { useI18n } from '@/hooks/useI18n';

export default function CompliancePage() {
  const { t } = useI18n();

  return (
    <main className="min-h-screen page-bg">
      <PublicHeader />

      <section className="mx-auto max-w-4xl px-4 py-10 md:py-12">
        {/* Hero */}
        <header className="mb-8 md:mb-10">
          <p className="text-xs font-semibold tracking-wide uppercase text-brand">
            {t('aml_badge')}
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">
            {t('aml_title')}
          </h1>
          <p className="mt-3 text-sm md:text-base text-zinc-600 max-w-3xl">
            {t('aml_intro')}
          </p>
        </header>

        {/* Top cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-10">
          <div className="card p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-brand">
              {t('aml_block_aml_label')}
            </div>
            <h2 className="mt-1 text-sm font-semibold">
              {t('aml_block_aml_title')}
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              {t('aml_block_aml_text')}
            </p>
          </div>

          <div className="card p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-brand">
              {t('aml_block_kyc_label')}
            </div>
            <h2 className="mt-1 text-sm font-semibold">
              {t('aml_block_kyc_title')}
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              {t('aml_block_kyc_text')}
            </p>
          </div>

          <div className="card p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-brand">
              {t('aml_block_gdpr_label')}
            </div>
            <h2 className="mt-1 text-sm font-semibold">
              {t('aml_block_gdpr_title')}
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              {t('aml_block_gdpr_text')}
            </p>
          </div>
        </div>

        {/* Detailed sections */}
        <div className="space-y-6 text-sm text-zinc-600">
          <section>
            <h2 className="text-base font-semibold">
              {t('aml_section_profile_title')}
            </h2>
            <p className="mt-2">
              {t('aml_section_profile_text')}
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">
              {t('aml_section_documents_title')}
            </h2>
            <p className="mt-2">
              {t('aml_section_documents_text')}
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">
              {t('aml_section_countries_title')}
            </h2>
            <p className="mt-2">
              {t('aml_section_countries_text')}
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">
              {t('aml_section_storage_title')}
            </h2>
            <p className="mt-2">
              {t('aml_section_storage_text')}
            </p>
          </section>
        </div>

        <p className="mt-8 text-xs text-zinc-500">
          {t('aml_note_dynamic')}{' '}
          <a href="/terms" className="link-accent">
            {t('footer_terms')}
          </a>{' '}
          ·{' '}
          <a href="/privacy" className="link-accent">
            {t('footer_privacy')}
          </a>
        </p>
      </section>
    </main>
  );
}
