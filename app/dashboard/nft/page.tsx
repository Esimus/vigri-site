// app/dashboard/nft/page.tsx
import NftList from '@/components/NftList';
import NftIntro from '@/components/NftIntro';
import MyNftsStrip from '@/components/MyNftsStrip';

export default function NftPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        {/* Intro on the left, wallet connect on the right */}
        <NftIntro />
      </div>

      <MyNftsStrip />
      <NftList />
    </div>
  );
}