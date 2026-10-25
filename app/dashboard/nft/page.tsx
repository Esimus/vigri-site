// app/dashboard/nft/page.tsx
'use client';

import NftList from '@/components/NftList';
import NftProgress from '@/components/NftProgress';
import NftIntro from '@/components/NftIntro';
import MyNftsStrip from '@/components/MyNftsStrip';
import { WalletBannerMain } from '@/components/wallet';

export default function NftPage() {
  
  return (
    <div className="min-w-0 space-y-3">
      {/* Wallet */}
      <WalletBannerMain />

      {/* NFT intro */}
      <div className="flex items-start justify-between gap-3">
        <NftIntro />
      </div>

      <NftProgress />

      {/* My NFTs + list */}
      <MyNftsStrip />
      <NftList />
    </div>
  );
}
