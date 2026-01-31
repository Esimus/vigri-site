// app/faq/solflare/page.tsx
'use client';

import PublicHeader from '@/components/layout/PublicHeader';
import { SolflareGuide } from '@/components/faq/SolflareGuide';

export default function SolflareFaqPublicPage() {
  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <SolflareGuide />
      </main>
    </>
  );
}
