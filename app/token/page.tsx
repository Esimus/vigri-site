'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PublicHeader from '@/components/layout/PublicHeader';
import TokenParameters from '@/components/TokenParameters';
import { useI18n } from '@/hooks/useI18n';
import { CONFIG, clusterLabel, explorerQS } from '@/lib/config';

const references = [
  {
    id: 'mint',
    label: 'token_page_mint',
    value: CONFIG.CONTRACT_ADDRESS,
    href: 'https://solscan.io/token/' + CONFIG.CONTRACT_ADDRESS + explorerQS,
  },
  {
    id: 'program',
    label: 'token_page_program',
    value: CONFIG.PROGRAM_ID,
    href: 'https://explorer.solana.com/address/' + CONFIG.PROGRAM_ID + explorerQS,
  },
  {
    id: 'metadata',
    label: 'token_page_metadata',
    value: CONFIG.ARWEAVE_URI,
    href: CONFIG.ARWEAVE_URI,
  },
];

export default function TokenPage() {
  const { t } = useI18n();
  const [feedback, setFeedback] = useState<{ label: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 3000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback({ label, ok: true });
    } catch {
      setFeedback({ label, ok: false });
    }
  }

  return (
    <>
      <PublicHeader />

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <h1 className="pl-12 text-2xl font-semibold tracking-tight lg:pl-0">
              {t('token_page_title')}
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {t('token_page_intro')}
            </p>
          </div>

          <section className="card p-4" aria-labelledby="token-status">
            <h2 id="token-status" className="text-sm font-semibold">
              {t('token_page_status_title')}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {t('token_page_status_text')}
            </p>
          </section>
        </div>

        <TokenParameters t={t} />

        <section className="card min-w-0" aria-labelledby="token-details">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <h2 id="token-details" className="text-base font-semibold">
              {t('token_page_details_title')}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t('tokenomics_network')}: Solana · {clusterLabel}
            </p>
          </div>

          <dl className="divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-700 dark:border-zinc-700">
            {references.map((item) => (
              <div
                key={item.id}
                className="grid gap-2 px-4 py-3 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4"
              >
                <dt className="text-xs font-medium">{t(item.label)}</dt>
                <dd className="min-w-0 break-all font-mono text-xs leading-5 text-zinc-600 dark:text-zinc-300">
                  {item.value}
                </dd>
                <dd className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-outline px-2.5 py-1.5 text-xs"
                    aria-label={t('token_page_copy') + ': ' + t(item.label)}
                    onClick={() => void copy(item.value, item.label)}
                  >
                    {t('token_page_copy')}
                  </button>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1.5 text-xs link-accent"
                    aria-label={t('token_page_open') + ': ' + t(item.label)}
                  >
                    {t('token_page_open')} <span aria-hidden="true">↗</span>
                  </a>
                </dd>
              </div>
            ))}
          </dl>

          <p role="status" className="min-h-8 px-4 py-1.5 text-xs text-zinc-600 dark:text-zinc-300">
            {feedback
              ? t(feedback.label) + ': ' + t(feedback.ok ? 'token_page_copied' : 'token_page_copy_error')
              : ''}
          </p>
        </section>

        <div className="flex flex-wrap gap-2">
          <Link href="/litepaper" className="btn btn-outline px-3 py-1.5 text-[13px]">
            {t('read_litepaper')}
          </Link>
          <Link href="/docs" className="btn btn-outline px-3 py-1.5 text-[13px]">
            {t('token_page_docs')}
          </Link>
          <a
            href="/tokenlist.json"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline px-3 py-1.5 text-[13px]"
          >
            {t('footer_token_json')}
          </a>
        </div>
      </main>
    </>
  );
}
