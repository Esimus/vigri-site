// app/dashboard/nft/[id]/page.tsx
import NftDetails from '@/components/NftDetails';

export default async function NftDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NftDetails id={id} />;
}
