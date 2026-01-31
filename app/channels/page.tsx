// app/channels/page.tsx
'use client';

import { useI18n } from '@/hooks/useI18n';
import { CONFIG } from '@/lib/config';
import PublicHeader from '@/components/layout/PublicHeader';

const SITE_URL = 'https://vigri.ee';
const LU_TELEGRAM_URL = 'https://t.me/LumirosEcosystem';
const TENSOR_URL = 'https://www.tensor.trade/trade/vigri_presale_collection';

export default function ChannelsPage() {
  const { t } = useI18n();

  return (
    <>
      <PublicHeader />

      <main className="page-bg min-h-screen">
        <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
          {/* Page header */}
          <header>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {t('channels_badge')}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
              {t('channels_title')}
            </h1>
            <p className="mt-3 text-sm text-zinc-600 max-w-2xl">
              {t('channels_intro')}
            </p>
          </header>

          {/* Channels list */}
          <section className="space-y-4">
            <ChannelCard
              index={1}
              title={t('channels_website_title')}
              href={SITE_URL}
              hrefLabel={SITE_URL}
              description={t('channels_website_desc')}
            />
            <ChannelCard
              index={2}
              title={t('channels_x_title')}
              href={CONFIG.X_URL}
              hrefLabel={CONFIG.X_URL}
              description={t('channels_x_desc')}
            />
            <ChannelCard
              index={3}
              title={t('channels_vigri_telegram_title')}
              href={CONFIG.TELEGRAM_URL}
              hrefLabel={CONFIG.TELEGRAM_URL}
              description={t('channels_vigri_telegram_desc')}
            />
            <ChannelCard
              index={4}
              title={t('channels_lumiros_telegram_title')}
              href={LU_TELEGRAM_URL}
              hrefLabel={LU_TELEGRAM_URL}
              description={t('channels_lumiros_telegram_desc')}
            />
            <ChannelCard
              index={5}
              title={t('channels_discord_title')}
              href={CONFIG.DISCORD_URL}
              hrefLabel={CONFIG.DISCORD_URL}
              description={t('channels_discord_desc')}
            />
            <ChannelCard
              index={6}
              title={t('channels_marketplaces_title')}
              href={TENSOR_URL}
              hrefLabel={TENSOR_URL}
              description={t('channels_marketplaces_desc')}
            />
            <ChannelCard
              index={7}
              title={t('channels_other_title')}
              description={t('channels_other_desc')}
            />
          </section>
        </div>
      </main>
    </>
  );
}

type ChannelCardProps = {
  index: number;
  title: string;
  description: string;
  href?: string;
  hrefLabel?: string;
};

function ChannelCard({ index, title, description, href, hrefLabel }: ChannelCardProps) {
  return (
    <article className="card p-4 sm:p-5">
      <div className="flex gap-3">
        {/* Number pill */}
        <div className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand">
          {index}
        </div>

        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-800">{title}</h2>
          {href && (
            <div className="mt-1">
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono underline underline-offset-2 break-all"
              >
                {hrefLabel ?? href}
              </a>
            </div>
          )}
          <p className="mt-2 text-sm text-zinc-600">{description}</p>
        </div>
      </div>
    </article>
  );
}
