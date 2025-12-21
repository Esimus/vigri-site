'use client';

import Link from 'next/link';
import { useI18n } from '@/hooks/useI18n';

const Sep = () => <span aria-hidden className="mx-1 select-none">—</span>;

export default function PublicBreadcrumbs() {
  const { t } = useI18n();

  // same home label fallback logic as in DashboardShell
  const tr = (k: string, fb: string) => {
    const v = t(k);
    return v === k ? fb : v;
  };
  const homeLabel = tr('common.home', tr('nav.home', 'Home'));

  // short label for Center (avoid very long H1 here)
  const centerShort = tr('nav.center', 'Center');

  return (
    <div className="mx-auto max-w-6xl px-4 pt-2">
      <nav className="text-[12px] leading-5 text-zinc-600">
        <Link href="/" className="font-medium hover:underline">
          {homeLabel}
        </Link>
        <Sep />
        <span className="font-medium">{centerShort}</span>
      </nav>
    </div>
  );
}
