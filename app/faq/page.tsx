'use client';

import PublicHeader from '@/components/layout/PublicHeader';
import { FaqIndex } from '@/components/faq/FaqIndex';

export default function FaqPublicPage() {
  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <FaqIndex />
      </main>
    </>
  );
}
