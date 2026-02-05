// components/faq/FaqGeneral.tsx
'use client';

import Link from 'next/link';
import { useI18n } from '@/hooks/useI18n';
import { FaqAccordionItem } from '@/components/faq/FaqAccordionItem';

type FaqItem = { qKey: string; a: React.ReactNode };

export function FaqGeneral() {
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
    <section className="space-y-3">
      {faqs.map((item, i) => (
        <FaqAccordionItem key={item.qKey} index={i + 1} question={t(item.qKey)}>
          {item.a}
        </FaqAccordionItem>
      ))}
    </section>
  );
}
