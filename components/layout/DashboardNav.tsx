// components/DashboardNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/hooks/useI18n';

const items = [
  { href: '/dashboard',         key: 'dashboard.nav.overview' },
  { href: '/dashboard/assets',  key: 'dashboard.nav.assets'   },
  { href: '/dashboard/nft',     key: 'dashboard.nav.nft'      },
  { href: '/dashboard/rewards', key: 'dashboard.nav.rewards'  },
  { href: '/dashboard/profile', key: 'dashboard.nav.profile'  },
];

const normalize = (p: string) => p.replace(/\/+$/, '');
const isActive = (href: string, pathname: string) => {
  const p = normalize(pathname);
  const h = normalize(href);
  if (h === '/dashboard') return p === '/dashboard';
  return p === h || p.startsWith(h + '/');
};

export default function DashboardNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className="space-y-1 sidebar-nav">
      {items.map((item) => {
        const active = isActive(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            data-active={active ? 'true' : undefined}
            className={[
              'block rounded-lg px-3 py-2 text-sm border',
              active
                ? 'bg-brand-100 text-brand border-brand-200'
                : 'hover:bg-brand-100/60'
            ].join(' ')}
          >
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
