// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardOverview from '../../components/DashboardOverview';
import { api } from '@/lib/api';

type NftListItem = { ownedQty?: number };

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasNft, setHasNft] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const r = await api.nft.list();
        const owned =
          r.ok && Array.isArray(r.items)
            ? r.items.some((x: NftListItem) => (x.ownedQty ?? 0) > 0)
            : false;

        if (!alive) return;
        setHasNft(owned);

        // Redirect to /dashboard/nft only right after successful login (one-shot flag).
        let justLoggedIn = false;
        try {
          justLoggedIn = sessionStorage.getItem('vigri_postlogin') === '1';
        } catch {
          /* ignore */
        }

        if (!owned && justLoggedIn) {
          try {
            sessionStorage.removeItem('vigri_postlogin');
          } catch {
            /* ignore */
          }
          router.replace('/dashboard/nft');
          return;
        }

        // Otherwise, show Overview even if user has no NFTs.
        setReady(true);
      } catch {
        if (!alive) return;
        // On error, still allow Overview to render (no forced redirect).
        setReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  if (hasNft === null || (!hasNft && !ready)) {
    return <div className="p-6 text-sm opacity-70">Loading…</div>;
  }

  return <DashboardOverview />;
}
