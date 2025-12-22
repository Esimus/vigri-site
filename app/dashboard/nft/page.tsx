// app/dashboard/nft/page.tsx
'use client';

import NftList from '@/components/NftList';
import NftIntro from '@/components/NftIntro';
import MyNftsStrip from '@/components/MyNftsStrip';
import { WalletBannerMain } from '@/components/wallet';

export default function NftPage() {
  
  return (
    <div className="space-y-4">
      {/* Wallet */}
      <WalletBannerMain />

      {/* NFT intro */}
      <div className="flex items-start justify-between gap-3">
        <NftIntro />
      </div>

      {/* My NFTs + list */}
      <MyNftsStrip />
      <NftList />
    </div>
  );
}
