import NftDetails from '@/components/NftDetails';

export default function NftDetailsPage({ params }: { params: { id: string } }) {
  return <NftDetails id={params.id} />;
}
