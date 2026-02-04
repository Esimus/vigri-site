// components/faq/FaqIndex.tsx
'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useI18n } from '@/hooks/useI18n';

type FaqItem = {
  qKey: string;
  a: ReactNode;
};

function FaqAccordionItem({
  index,
  q,
  children,
}: {
  index: number;
  q: string;
  children: ReactNode;
}) {
  return (
    <details className="card p-4">
      <summary className="btn btn-outline w-full justify-between cursor-pointer">
        <span className="flex items-center gap-2 min-w-0">
          <span className="chip chip--sm" aria-hidden="true">
            {index}
          </span>
          <span className="truncate">{q}</span>
        </span>
        <span aria-hidden="true">▾</span>
      </summary>

      <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-200">{children}</div>
    </details>
  );
}

export function FaqIndex() {
  const { t } = useI18n();

  const faqs: FaqItem[] = [
    {
      qKey: 'faq_index_q_1',
      a: (
        <div className="space-y-2">
          <p>
            <b>{t('faq_index_a1_bold_1')}</b> {t('faq_index_a1_p1_rest')}
          </p>
          <p className="text-zinc-600 dark:text-zinc-300">{t('faq_index_a1_p2')}</p>
        </div>
      ),
    },
    {
      qKey: 'faq_index_q_2',
      a: (
        <div className="space-y-2">
          <p>
            {t('faq_index_a2_p1_pre')} <b>{t('faq_index_a2_p1_bold')}</b>
            {t('faq_index_a2_p1_post')}
          </p>
          <p className="text-zinc-600 dark:text-zinc-300">{t('faq_index_a2_p2')}</p>
        </div>
      ),
    },
    {
      qKey: 'faq_index_q_3',
      a: (
        <div className="space-y-2">
          <p>{t('faq_index_a3_p1')}</p>
          <p className="text-zinc-600 dark:text-zinc-300">{t('faq_index_a3_p2')}</p>
        </div>
      ),
    },
    {
      qKey: 'faq_index_q_4',
      a: (
        <div className="space-y-2">
          <p>{t('faq_index_a4_p1')}</p>
          <ul className="list-disc pl-5 text-sm text-zinc-700 dark:text-zinc-200 space-y-1">
            <li>
              <Link href="/faq/phantom" className="link-accent">
                {t('faq_index_a4_link_phantom')}
              </Link>
            </li>
            <li>
              <Link href="/faq/solflare" className="link-accent">
                {t('faq_index_a4_link_solflare')}
              </Link>
            </li>
          </ul>
        </div>
      ),
    },
    {
      qKey: 'faq_index_q_5',
      a: (
        <div className="space-y-2">
          <p>
            <b>{t('faq_index_a5_bold')}</b> {t('faq_index_a5_p1_rest')}
          </p>
        </div>
      ),
    },
    {
      qKey: 'faq_index_q_6',
      a: (
        <div className="space-y-2">
          <p>{t('faq_index_a6_p1')}</p>
          <ul className="list-disc pl-5 text-sm text-zinc-700 dark:text-zinc-200 space-y-1">
            <li>{t('faq_index_a6_b1')}</li>
            <li>{t('faq_index_a6_b2')}</li>
            <li>{t('faq_index_a6_b3')}</li>
            <li>{t('faq_index_a6_b4')}</li>
          </ul>
        </div>
      ),
    },
    {
      qKey: 'faq_index_q_7',
      a: (
        <div className="space-y-2">
          <p>
            {t('faq_index_a7_p1_pre')}{' '}
            <Link href="/channels" className="link-accent">
              {t('faq_index_channels_link_text')}
            </Link>
            .
          </p>
        </div>
      ),
    },
    {
      qKey: 'faq_index_q_8',
      a: (
        <div className="space-y-2">
          <p>{t('faq_index_a8_p1')}</p>
        </div>
      ),
    },
    {
      qKey: 'faq_index_q_9',
      a: (
        <div className="space-y-2">
          <ul className="list-disc pl-5 text-sm text-zinc-700 dark:text-zinc-200 space-y-1">
            <li>{t('faq_index_a9_b1')}</li>
            <li>{t('faq_index_a9_b2')}</li>
            <li>{t('faq_index_a9_b3')}</li>
          </ul>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
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

      <section className="space-y-3">
        {faqs.map((item, i) => (
          <FaqAccordionItem key={item.qKey} index={i + 1} q={t(item.qKey)}>
            {item.a}
          </FaqAccordionItem>
        ))}
      </section>
    </div>
  );
}
