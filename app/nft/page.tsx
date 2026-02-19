// app/nft/page.tsx
'use client';

import PublicHeader from '@/components/layout/PublicHeader';
import NftList from '@/components/NftList';
import { useI18n } from '@/hooks/useI18n';

export default function NftPublicPage() {
  const { t } = useI18n();

  return (
    <>
      <PublicHeader />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="space-y-4">
          <h1 className="text-2xl md:text-3xl font-semibold">
            {t('nft_public_title')}
          </h1>

          <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-300">
            {t('nft_public_intro')}
          </p>

          <NftList mode="public" />
        </div>
      </main>
    </>
  );
}
