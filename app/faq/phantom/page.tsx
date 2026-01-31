// app/faq/phantom/page.tsx
'use client';

import PublicHeader from '@/components/layout/PublicHeader';
import { PhantomFaqContent } from '@/components/faq/PhantomFaqContent';

export default function PhantomFaqPublicPage() {
  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <PhantomFaqContent />
      </main>
    </>
  );
}
