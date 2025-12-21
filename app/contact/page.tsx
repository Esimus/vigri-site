// app/contact/page.tsx
'use client';

import PublicHeader from '@/components/layout/PublicHeader';
import { useI18n } from '@/hooks/useI18n';

export default function ContactPage() {
  const { t } = useI18n();
  const tf = (k: string, fb: string) => {
    const v = t(k);
    return v === k ? fb : v;
  };

  return (
    <main className="page-bg min-h-screen">
      <PublicHeader />

      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="space-y-4">
          <span className="chip chip--md chip-nav--active uppercase tracking-wide text-[10px]">
            {tf('contact.tagline', 'Legal information & contact')}
          </span>

          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            {tf('contact.title', 'Contact & platform operator')}
          </h1>

          <p className="max-w-2xl text-sm text-zinc-600 sm:text-base">
            {tf(
              'contact.lead',
              'Below you can find information about the legal operator of the Vigri platform.'
            )}
          </p>
        </header>

        {/* Operator card */}
        <section className="card border border-zinc-200/70 p-6 shadow-sm dark:border-zinc-800/70">
          {/* Header row: 1fr + auto => right block doesn’t steal space from company name */}
          <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                {tf('contact.operator_label', 'Platform operator')}
              </p>

              <p className="mt-1 text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-50 whitespace-nowrap">
                ADET Impex OÜ
              </p>
            </div>

            <p className="text-xs text-zinc-500 text-right leading-tight whitespace-pre-line sm:whitespace-nowrap max-w-[170px]">
              {tf('contact.jur_form', 'Private limited company (Osaühing)')}
            </p>
          </div>

          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-zinc-800 dark:text-zinc-100">
                {tf('contact.reg_code', 'Registry code')}
              </dt>
              <dd className="mt-0.5 text-zinc-700 dark:text-zinc-300">16470156</dd>
            </div>

            <div>
              <dt className="font-medium text-zinc-800 dark:text-zinc-100">
                {tf('contact.vat', 'VAT number (KMKR)')}
              </dt>
              <dd className="mt-0.5 text-zinc-700 dark:text-zinc-300">EE102479306</dd>
            </div>

            <div className="sm:col-span-2">
              <dt className="font-medium text-zinc-800 dark:text-zinc-100">
                {tf('contact.address', 'Legal address')}
              </dt>
              <dd className="mt-0.5 text-zinc-700 dark:text-zinc-300">
                Lootsi tn 8, 10151 Tallinn, Harju maakond, Estonia
              </dd>
            </div>

            {/* Email block: split into business/legal and support */}
            <div className="sm:col-span-2">
              <dt className="font-medium text-zinc-800 dark:text-zinc-100">
                {tf('contact.email', 'Email')}
              </dt>

              <dd className="mt-1 space-y-3 text-zinc-700 dark:text-zinc-300">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">
                    {tf('contact.email.business.label', 'Business / legal')}
                  </div>
                  <a
                    href="mailto:info@adet.ee"
                    className="underline decoration-[var(--brand-400)]/70 underline-offset-2 hover:decoration-[var(--brand-600)]"
                  >
                    info@adet.ee
                  </a>
                  <div className="mt-1 text-xs text-zinc-500">
                    {tf(
                      'contact.email.business.hint',
                      'For commercial, partnership, accounting and legal matters.'
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">
                    {tf('contact.email.support.label', 'Support')}
                  </div>
                  <a
                    href="mailto:support@vigri.ee"
                    className="underline decoration-[var(--brand-400)]/70 underline-offset-2 hover:decoration-[var(--brand-600)]"
                  >
                    support@vigri.ee
                  </a>
                  <div className="mt-1 text-xs text-zinc-500">
                    {tf(
                      'contact.email.support.hint',
                      'For platform support and user questions. Subject: GDPR request (for data deletion/correction).'
                    )}
                  </div>
                </div>
              </dd>
            </div>

            <div>
              <dt className="font-medium text-zinc-800 dark:text-zinc-100">
                {tf('contact.website', 'Website')}
              </dt>
              <dd className="mt-0.5 text-zinc-700 dark:text-zinc-300">
                <a
                  href="https://adet.ee"
                  className="underline decoration-[var(--brand-400)]/70 underline-offset-2 hover:decoration-[var(--brand-600)]"
                  target="_blank"
                  rel="noreferrer"
                >
                  adet.ee
                </a>
              </dd>
            </div>
          </dl>

          <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-500">
            {tf(
              'contact.note',
              'ADET Impex OÜ is responsible for the vigri.ee website and for the early-stage development of the Vigri project. Official company data is available in the Estonian e-Business Register.'
            )}{' '}
            <a
              href="https://ariregister.rik.ee/eng/company/16470156/ADET-Impex-O%C3%9C"
              className="underline decoration-[var(--brand-400)]/70 underline-offset-2 hover:decoration-[var(--brand-600)]"
              target="_blank"
              rel="noreferrer"
            >
              {tf('contact.registry_link', 'View record in e-Business Register')}
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
