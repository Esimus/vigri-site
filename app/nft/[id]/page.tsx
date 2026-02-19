// app/nft/[id]/page.tsx
import type { Metadata } from 'next';
import PublicHeader from '@/components/layout/PublicHeader';
import NftDetails from '@/components/NftDetails';

export const metadata: Metadata = {
  title: 'VIGRI NFT details',
};

type PageProps = {
  // In Next.js 16 params is a Promise
  params: Promise<{ id: string }>;
};

export default async function NftDetailsPublicPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <NftDetails id={id} mode="public" />
      </main>
    </>
  );
}
