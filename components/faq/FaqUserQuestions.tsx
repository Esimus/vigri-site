// components/faq/FaqUserQuestions.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useI18n } from '@/hooks/useI18n';
import { FaqAccordionItem } from '@/components/faq/FaqAccordionItem';

type UserFaq = {
  qKey: string;
  aKey?: string;
  render?: () => React.ReactNode;
};

function buildMailto(payload: { name: string; email: string; message: string }) {
  const subject = 'VIGRI: Question from FAQ';
  const body = [
    'Question:',
    payload.message.trim(),
    '',
    '---',
    `Name: ${payload.name.trim() || '-'}`,
    `Email: ${payload.email.trim() || '-'}`,
    `Page: ${typeof window !== 'undefined' ? window.location.href : '-'}`,
  ].join('\n');

  return `mailto:support@vigri.ee?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    body,
  )}`;
}

export function FaqUserQuestions() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const items: UserFaq[] = [
    { qKey: 'faq_users_q_1', aKey: 'faq_users_a_1' },
    { qKey: 'faq_users_q_2', aKey: 'faq_users_a_2' },
    { qKey: 'faq_users_q_3', aKey: 'faq_users_a_3' },
    { qKey: 'faq_users_q_4', aKey: 'faq_users_a_4' },
    { qKey: 'faq_users_q_5', aKey: 'faq_users_a_5' },
    { qKey: 'faq_users_q_6', aKey: 'faq_users_a_6' },
    {
      qKey: 'faq_users_q_7',
      render: () => (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Image
              src="/logos/lumiros-logo.webp"
              alt={t('faq_users_a7_main_logo_alt')}
              width={48}
              height={48}
              className="h-12 w-12 rounded-full bg-zinc-900/10 p-1 dark:bg-white/10"
            />
            <p className="text-sm text-zinc-700 dark:text-zinc-200">
              {t('faq_users_a_7_p1')}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Image
              src="/logos/lumiros-logo_chat.webp"
              alt={t('faq_users_a7_chat_logo_alt')}
              width={48}
              height={48}
              className="h-12 w-12 rounded-full bg-zinc-900/10 p-1 dark:bg-white/10"
            />
            <p className="text-sm text-zinc-700 dark:text-zinc-200">
              {t('faq_users_a_7_p2')}
            </p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <h2 className="text-lg font-semibold">{t('faq_users_title')}</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          {t('faq_users_intro')}
        </p>

        <div className="mt-4 rounded-2xl border border-zinc-200/70 bg-zinc-50/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-white/5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {t('faq_users_ask_btn')}
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-300">
                {t('faq_users_message_hint')}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className={[
                'inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm',
                'cursor-pointer transition',
                'focus:outline-none focus:ring-2 focus:ring-zinc-400/20',
                'border-zinc-300 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950/30 dark:hover:bg-white/10',
              ].join(' ')}
            >
              <span className="mr-2" aria-hidden="true">
                {open ? '×' : '+'}
              </span>
              {t('faq_users_ask_btn')}
            </button>
          </div>

          {open && (
            <form
              className="mt-4 grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const name = String(fd.get('name') || '');
                const email = String(fd.get('email') || '');
                const message = String(fd.get('message') || '');

                if (!message.trim()) return;

                window.location.href = buildMailto({ name, email, message });
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm text-zinc-700 dark:text-zinc-200">
                    {t('faq_users_name_label')}
                  </label>
                  <input
                    name="name"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/20 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-100"
                    placeholder={t('faq_users_name_placeholder')}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-zinc-700 dark:text-zinc-200">
                    {t('faq_users_email_label')}
                  </label>
                  <input
                    name="email"
                    type="email"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/20 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-100"
                    placeholder={t('faq_users_email_placeholder')}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm text-zinc-700 dark:text-zinc-200">
                  {t('faq_users_message_label')}
                </label>
                <textarea
                  name="message"
                  rows={5}
                  required
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/20 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-100"
                  placeholder={t('faq_users_message_placeholder')}
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:opacity-95 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-zinc-400/30 dark:bg-white dark:text-zinc-900"
              >
                {t('faq_users_send_btn')}
              </button>
            </form>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card p-4 text-sm text-zinc-600 dark:text-zinc-300">
          {t('faq_users_empty')}
        </div>
      ) : (
        <section className="space-y-3">
          {items.map((it, idx) => (
            <FaqAccordionItem key={it.qKey} index={idx + 1} question={t(it.qKey)}>
              {it.render ? it.render() : t(it.aKey!)}
            </FaqAccordionItem>
          ))}
        </section>
      )}
    </div>
  );
}
