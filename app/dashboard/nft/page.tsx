// app/dashboard/nft/page.tsx
import NftList from '@/components/NftList';
import NftIntro from '@/components/NftIntro';
import MyNftsStrip from '@/components/MyNftsStrip';

export default function NftPage() {
  return (
    <div className="space-y-4">
      {/* Removed H1 "NFT" to reduce noise */}
      <NftIntro />
      <MyNftsStrip />
      <NftList />
    </div>
  );
}
