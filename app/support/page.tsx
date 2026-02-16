// app/support/page.tsx
'use client';

import Link from 'next/link';
import PublicHeader from '@/components/layout/PublicHeader';
import { useI18n } from '@/hooks/useI18n';

export default function SupportInboxPage() {
  const { t } = useI18n();

  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="card p-6 space-y-4">
          <h1 className="text-2xl font-semibold">
            {t('support_inbox_title')}
          </h1>

          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {t('support_inbox_desc')}
          </p>

          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {t('support_inbox_hint')}
          </p>

          <div className="pt-2">
            <Link href="/contact" className="btn btn-primary">
              {t('support_inbox_contact_btn')}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
