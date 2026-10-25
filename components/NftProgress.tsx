'use client';

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
  const { data, error, isValidating, mutate } = useSWR<
    z.infer<typeof progressSchema>, Error
  >('/api/nft/progress', fetchProgress, {
    refreshInterval: 60_000,
    dedupingInterval: 60_000,
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const fmt = new Intl.NumberFormat(lang, { maximumFractionDigits: 9 });
  const fmtPercent = new Intl.NumberFormat(lang, { maximumFractionDigits: 6 });
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
    <section className="card rounded-2xl p-4 sm:p-5" aria-label={t('nft_progress_title')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight">
          {t('nft_progress_title')}
        </h2>
        <button
          type="button"
          className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          disabled={isValidating}
          onClick={() => { void mutate(); }}
        >
          {t(isValidating ? 'nft_progress_refreshing' : 'nft_progress_refresh')}
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

          <div className="mt-4 grid gap-5 md:grid-cols-2 md:gap-8">
            {metrics.map((metric) => (
              <div key={metric.key} className="min-w-0">
                <h3 className="text-sm font-medium">
                  {t(`nft_progress_${metric.key}_label`)}
                </h3>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 tabular-nums">
                  <span className="text-2xl font-semibold tracking-tight">{metric.value}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t('nft_progress_of')} {metric.limit}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
                    role="progressbar"
                    aria-label={t(`nft_progress_${metric.key}_label`)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={metric.percent}
                    aria-valuetext={`${metric.value} ${t('nft_progress_of')} ${metric.limit}`}
                  >
                    <div className="h-full bg-blue-600 dark:bg-blue-400" style={{ width: `${metric.percent}%` }} />
                  </div>
                  <span className="text-xs tabular-nums text-zinc-600 dark:text-zinc-300">
                    {metric.percent === 0 && metric.positive
                      ? `<${fmtPercent.format(0.000001)}`
                      : fmtPercent.format(metric.percent)}%
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                  {t(`nft_progress_${metric.key}_note`)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-zinc-200 pt-3 text-xs dark:border-zinc-700">
            <details>
              <summary className="w-fit cursor-pointer font-medium">
                {t('nft_progress_details')}
              </summary>
              <dl className="mt-3 grid gap-x-8 gap-y-2 md:grid-cols-2">
                {[
                  ['gross', formatSol(data.funding.grossReceiptsSol)],
                  ['excluded', formatSol(data.funding.excludedTestSol)],
                  ['paid', fmt.format(data.collection.paidMints)],
                  ['admin', fmt.format(data.collection.adminMints)],
                  ['tests', fmt.format(data.funding.excludedTestPurchases)],
                ].map(([key, value]) => (
                  <div key={key} className="flex items-baseline justify-between gap-3">
                    <dt className="text-zinc-600 dark:text-zinc-300">{t(`nft_progress_${key}`)}</dt>
                    <dd className="shrink-0 font-medium tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 leading-5 text-zinc-500 dark:text-zinc-400">
                {t('nft_progress_method')}
              </p>
            </details>
            <p className="mt-3 text-zinc-500 dark:text-zinc-400">
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