// Server component layout for /center (no 'use client')

import PublicHeader from '@/components/PublicHeader';
import PublicBreadcrumbs from '@/components/PublicBreadcrumbs';

export default function CenterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-bg min-h-screen">
      <PublicHeader />

      {/* Keep page content as-is (it already has its own max-width) */}
      {children}
    </div>
  );
}
