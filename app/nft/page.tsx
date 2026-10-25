// app/nft/page.tsx
'use client';

import PublicHeader from '@/components/layout/PublicHeader';
import NftList from '@/components/NftList';
import NftProgress from '@/components/NftProgress';
import { useI18n } from '@/hooks/useI18n';

export default function NftPublicPage() {
  const { t } = useI18n();

  return (
    <>
      <PublicHeader />

      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-6 pt-3 lg:pt-5">
        <div className="min-w-0 space-y-3">
          <h1 className="min-h-9 pl-12 text-xl leading-9 font-semibold tracking-tight lg:pl-0 lg:text-2xl">
            {t('nft_public_title')}
          </h1>

          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            {t('nft_public_intro')}
          </p>

          <NftProgress />

          <NftList mode="public" />
        </div>
      </main>
    </>
  );
}
