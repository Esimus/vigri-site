'use client';

import { useId, useRef, useState } from 'react';
import useSWR from 'swr';
import { z } from 'zod';
import { useI18n } from '@/hooks/useI18n';

const count = z.number().int().nonnegative();
const percent = z.number().min(0).max(100);
const sol = z.string().regex(/^\d+(?:\.\d{1,9})?$/)
  .refine((value) => Number.isFinite(Number(value)));

const progressSchema = z.object({
  ok: z.literal(true),
  network: z.literal('mainnet'),
  checkedAt: z.iso.datetime(),
  stale: z.boolean(),
  collection: z.object({
    total: count,
    issued: count,
    paidMints: count,
    adminMints: count,
    percent,
  }),
  funding: z.object({
    raisedSol: sol,
    targetSol: sol,
    grossReceiptsSol: sol,
    excludedTestSol: sol,
    excludedTestPurchases: count,
    percent,
  }),
});

async function fetchProgress(url: string) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('NFT progress unavailable');
  const body: unknown = await response.json();
  return progressSchema.parse(body);
}

export default function NftProgress() {
  const { t, lang } = useI18n();
  const detailsId = useId();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { data, error, isValidating, mutate } = useSWR<
    z.infer<typeof progressSchema>, Error
  >('/api/nft/progress', fetchProgress, {
    refreshInterval: 60_000,
    dedupingInterval: 60_000,
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const fmt = new Intl.NumberFormat(lang, { maximumFractionDigits: 9 });
  const formatPercent = (value: number) => new Intl.NumberFormat(lang,
    value > 0 && value < 0.01
      ? { maximumSignificantDigits: 2 }
      : { maximumFractionDigits: 2 },
  ).format(value);
  const formatSol = (value: string) => `${fmt.format(Number(value))} SOL`;
  const metrics = data ? [
    {
      key: 'funding',
      value: formatSol(data.funding.raisedSol),
      limit: formatSol(data.funding.targetSol),
      percent: data.funding.percent,
      positive: Number(data.funding.raisedSol) > 0,
    },
    {
      key: 'issued',
      value: `${fmt.format(data.collection.issued)} NFT`,
      limit: `${fmt.format(data.collection.total)} NFT`,
      percent: data.collection.percent,
      positive: data.collection.issued > 0,
    },
  ] : [];

  return (
    <section className="@container card min-w-0 rounded-2xl p-3 sm:p-4" aria-label={t('nft_progress_title')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight">
          {t('nft_progress_title')}
        </h2>
        <button
          type="button"
          className="min-h-8 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          disabled={isValidating}
          aria-label={t(isValidating ? 'nft_progress_refreshing' : 'nft_progress_refresh')}
          title={t(isValidating ? 'nft_progress_refreshing' : 'nft_progress_refresh')}
          onClick={() => { void mutate(); }}
        >
          <span className="text-lg leading-none sm:hidden" aria-hidden="true">↻</span>
          <span className="hidden sm:inline">
            {t(isValidating ? 'nft_progress_refreshing' : 'nft_progress_refresh')}
          </span>
        </button>
      </div>

      {!data ? (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300" role="status">
          {t(error ? 'nft_progress_error' : 'nft_progress_loading')}
        </p>
      ) : (
        <>
          {(data.stale || error) && (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-300" role="status">
              {t('nft_progress_stale')}
            </p>
          )}

          <div className="mt-2 grid min-w-0 gap-3 @min-[36rem]:grid-cols-2 @min-[36rem]:gap-6">
            {metrics.map((metric) => (
              <div key={metric.key} className="min-w-0">
                <h3 className="text-xs font-medium">
                  <button type="button"
                    className="flex min-h-7 w-full items-center justify-between gap-2 rounded text-left hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-500 dark:hover:text-blue-400"
                    aria-expanded={detailsOpen} aria-controls={detailsId}
                    onClick={() => { detailsRef.current?.toggleAttribute('open'); }}>
                    {t(`nft_progress_${metric.key}_label`)}
                    <span aria-hidden="true">{detailsOpen ? '▴' : '▾'}</span>
                  </button>
                </h3>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 tabular-nums">
                  <span className="text-xl font-semibold tracking-tight">{metric.value}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t(metric.key === 'funding' ? 'nft_progress_reference' : 'nft_progress_of')} {metric.limit}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div
                    className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
                    role="progressbar"
                    aria-label={t(`nft_progress_${metric.key}_label`)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={metric.percent}
                    aria-valuetext={`${metric.value} ${t('nft_progress_of')} ${metric.limit}`}
                  >
                    <div className="h-full bg-blue-600 dark:bg-blue-400" style={{ width: `${metric.percent}%` }} />
                  </div>
                  <span className="shrink-0 text-[11px] tabular-nums text-zinc-600 dark:text-zinc-300">
                    {metric.percent === 0 && metric.positive
                      ? `<${fmt.format(0.000001)}`
                      : formatPercent(metric.percent)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-zinc-200 pt-2 text-[11px] dark:border-zinc-700">
            <details ref={detailsRef} id={detailsId} className="min-w-0 open:w-full"
              onToggle={(event) => setDetailsOpen(event.currentTarget.open)}>
              <summary className="min-h-7 w-fit cursor-pointer py-1 font-medium">
                {t('nft_progress_details')}
              </summary>
              <div className="mt-2 grid gap-2 @min-[36rem]:grid-cols-2">
                {metrics.map((metric) => (
                  <p key={metric.key} className="leading-5 text-zinc-500 dark:text-zinc-400">
                    {t(`nft_progress_${metric.key}_note`)}
                  </p>
                ))}
              </div>
              <dl className="mt-3 grid gap-x-6 gap-y-2 text-xs @min-[36rem]:grid-cols-2">
                {[
                  ['gross', formatSol(data.funding.grossReceiptsSol)],
                  ['excluded', formatSol(data.funding.excludedTestSol)],
                  ['paid', fmt.format(data.collection.paidMints)],
                  ['admin', fmt.format(data.collection.adminMints)],
                  ['tests', fmt.format(data.funding.excludedTestPurchases)],
                ].map(([key, value]) => (
                  <div key={key} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <dt className="text-zinc-600 dark:text-zinc-300">{t(`nft_progress_${key}`)}</dt>
                    <dd className="shrink-0 font-medium tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 leading-5 text-zinc-500 dark:text-zinc-400">
                {t('nft_progress_method')}
              </p>
            </details>
            <p className="text-zinc-500 dark:text-zinc-400">
              {t('nft_progress_checked')}{' '}
              <time dateTime={data.checkedAt}>
                {new Intl.DateTimeFormat(lang, {
                  dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC',
                }).format(new Date(data.checkedAt))} UTC
              </time>
            </p>
          </div>
        </>
      )}
    </section>
  );
}