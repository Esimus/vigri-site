// components/faq/FaqIndex.tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { FaqGeneral } from '@/components/faq/FaqGeneral';
import { FaqUserQuestions } from '@/components/faq/FaqUserQuestions';

type Tab = 'general' | 'users';

export function FaqIndex() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('general');

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-2xl bg-zinc-900/5 dark:bg-zinc-50/5 flex items-center justify-center">
            <span aria-hidden="true">❓</span>
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl font-semibold">{t('faq_index_title')}</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              {t('faq_index_intro')}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/faq/phantom" className="btn btn-outline">
                {t('faq_index_btn_phantom')}
              </Link>
              <Link href="/faq/solflare" className="btn btn-outline">
                {t('faq_index_btn_solflare')}
              </Link>
              <Link href="/litepaper" className="btn btn-outline">
                {t('faq_index_btn_litepaper')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="FAQ sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'general'}
          onClick={() => setTab('general')}
          className={[
            'inline-flex items-center rounded-full border px-4 py-2 text-sm',
            'cursor-pointer transition',
            'focus:outline-none focus:ring-2 focus:ring-zinc-400/20',
            tab === 'general'
              ? 'bg-brand-100 text-brand border-brand-200'
              : 'bg-transparent border-zinc-200 text-zinc-800 hover:bg-zinc-900/5 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-white/5 dark:hover:border-zinc-700',
          ].join(' ')}
        >
          {t('faq_tab_general')}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={tab === 'users'}
          onClick={() => setTab('users')}
          className={[
            'inline-flex items-center rounded-full border px-4 py-2 text-sm',
            'cursor-pointer transition',
            'focus:outline-none focus:ring-2 focus:ring-zinc-400/20',
            tab === 'users'
              ? 'bg-brand-100 text-brand border-brand-200'
              : 'bg-transparent border-zinc-200 text-zinc-800 hover:bg-zinc-900/5 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-white/5 dark:hover:border-zinc-700',
          ].join(' ')}
        >
          {t('faq_tab_users')}
        </button>
      </div>

      {tab === 'general' ? <FaqGeneral /> : <FaqUserQuestions />}
    </div>
  );
}
