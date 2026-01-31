// components/DashboardNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/hooks/useI18n';

const mainItems = [
  { href: '/dashboard', key: 'dashboard.nav.overview' },
  { href: '/dashboard/assets', key: 'dashboard.nav.assets' },
  { href: '/dashboard/nft', key: 'dashboard.nav.nft' },
  { href: '/dashboard/rewards', key: 'dashboard.nav.rewards' },
  { href: '/dashboard/profile', key: 'dashboard.nav.profile' },
];

const contactItem = { href: '/contact', key: 'dashboard.nav.contact' };

const faqRoot = '/dashboard/faq';
const faqItems = [
  { href: '/dashboard/faq/solflare', key: 'faq_solflare_page_title' },
  { href: '/dashboard/faq/phantom', key: 'faq_phantom_page_title' },
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
      {mainItems.map((item) => {
        const active = isActive(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            data-active={active ? 'true' : undefined}
            className={[
              'block rounded-lg px-3 py-2 text-sm border',
              active ? 'bg-brand-100 text-brand border-brand-200' : 'hover:bg-brand-100/60',
            ].join(' ')}
          >
            {t(item.key)}
          </Link>
        );
      })}

      {/* Bottom contact link */}
      <div className="pt-3 mt-3 border-t border-zinc-200 dark:border-zinc-800">
        {(() => {
          const faqActive = isActive(faqRoot, pathname);
          const contactActive = isActive(contactItem.href, pathname);

          return (
            <>
              <details open={faqActive} className="mb-2">
                <summary
                  className={[
                    'cursor-pointer select-none',
                    'block rounded-lg px-3 py-2 text-sm border',
                    faqActive ? 'bg-brand-100 text-brand border-brand-200' : 'hover:bg-brand-100/60',
                  ].join(' ')}
                >
                  <span className="flex items-center justify-between">
                    <span>{t('faq_menu_title')}</span>
                    <span aria-hidden="true" className="text-xs opacity-70">
                      ▾
                    </span>
                  </span>
                </summary>

                <div className="mt-1 space-y-1 pl-2">
                  {faqItems.map((f) => {
                    const itemActive = isActive(f.href, pathname);
                    return (
                      <Link
                        key={f.href}
                        href={f.href}
                        aria-current={itemActive ? 'page' : undefined}
                        data-active={itemActive ? 'true' : undefined}
                        className={[
                          'block rounded-lg px-3 py-2 text-sm border',
                          itemActive
                            ? 'bg-brand-100 text-brand border-brand-200'
                            : 'hover:bg-brand-100/60',
                        ].join(' ')}
                      >
                        {t(f.key)}
                      </Link>
                    );
                  })}
                </div>
              </details>

              <Link
                href={contactItem.href}
                aria-current={contactActive ? 'page' : undefined}
                data-active={contactActive ? 'true' : undefined}
                className={[
                  'block rounded-lg px-3 py-2 text-sm border',
                  contactActive ? 'bg-brand-100 text-brand border-brand-200' : 'hover:bg-brand-100/60',
                ].join(' ')}
              >
                {t(contactItem.key)}
              </Link>
            </>
          );
        })()}
      </div>
    </nav>
  );
}
