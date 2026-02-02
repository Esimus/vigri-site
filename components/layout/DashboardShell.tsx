// components/DashboardShell.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { LanguageSwitcher } from '@/components/nav';
import DashboardKycBanner from '@/components/DashboardKycBanner';
import { DashboardNav } from '@/components/layout';
import { useI18n } from '@/hooks/useI18n';
import { usePathname } from 'next/navigation';
import { CONFIG } from '@/lib/config';
import Link from 'next/link';
import ProfileMenu from '@/components/nav/ProfileMenu';
import { NotificationsBell } from '@/components/notifications';
import VigriLogo from '@/components/VigriLogo';

const Sep = () => <span aria-hidden className="mx-1 select-none">—</span>;

// Utility: get tabbable elements inside a container
function getFocusable(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[role="button"]',
  ].join(',');
  return Array.from(container.querySelectorAll<HTMLElement>(selectors)).filter(
    (el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden')
  );
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { lang, setLang, t } = useI18n();
  const pathname = usePathname();

  // Mounted flag to avoid hydration mismatches on mobile-only UI
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  // --- mobile sidebar state ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Refs for focus management
  const sidebarRef = useRef<HTMLElement | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Toggle via custom event + close on Escape
  useEffect(() => {
    const onToggle = () => setIsSidebarOpen((v) => !v);
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSidebarOpen(false);
    };
    window.addEventListener('vigri:sidebar-toggle', onToggle as EventListener);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('vigri:sidebar-toggle', onToggle as EventListener);
      window.removeEventListener('keydown', onEsc);
    };
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    const id = setTimeout(() => {
      setIsSidebarOpen(false);
    }, 0);
    return () => clearTimeout(id);
  }, [pathname]);

  // Prevent page scroll when mobile sidebar is open
  useEffect(() => {
    const el = document.documentElement;
    if (isSidebarOpen) {
      el.classList.add('overflow-hidden', 'touch-none');
    } else {
      el.classList.remove('overflow-hidden', 'touch-none');
    }
    return () => el.classList.remove('overflow-hidden', 'touch-none');
  }, [isSidebarOpen]);

  // Focus trap: focus inside sidebar when opened; restore when closed
  useEffect(() => {
    if (isSidebarOpen) {
      // Save the element that had focus (prefer hamburger)
      restoreFocusRef.current =
        (hamburgerRef.current as HTMLElement) ||
        (document.activeElement as HTMLElement) ||
        null;

      // Move focus to first focusable in sidebar (or the close button in header)
      const focusables = getFocusable(sidebarRef.current);
      const target = focusables[0] || sidebarRef.current;
      // Slight delay to allow portal/layout paint
      setTimeout(() => target?.focus?.(), 0);
    } else {
      // Restore focus back to the hamburger (or previous focused)
      const to = (hamburgerRef.current as HTMLElement) || restoreFocusRef.current;
      to?.focus?.();
    }
  }, [isSidebarOpen]);

  // Focus trap key handling (Tab/Shift+Tab loop)
  useEffect(() => {
    if (!isSidebarOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = getFocusable(sidebarRef.current);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement as HTMLElement | null;

      // Shift+Tab on first => jump to last
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last?.focus?.();
        return;
      }
      // Tab on last => jump to first
      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first?.focus?.();
        return;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isSidebarOpen]);

  function sectionKey(p: string) {
    if (p === '/dashboard') return 'dashboard.nav.overview';
    if (p.startsWith('/dashboard/assets')) return 'dashboard.nav.assets';
    if (p.startsWith('/dashboard/nft')) return 'dashboard.nav.nft';
    if (p.startsWith('/dashboard/rewards')) return 'dashboard.nav.rewards';
    if (p.startsWith('/dashboard/profile')) return 'dashboard.nav.profile';
    return 'dashboard.nav.overview';
  }
  function sectionHref(p: string) {
    if (p.startsWith('/dashboard/assets')) return '/dashboard/assets';
    if (p.startsWith('/dashboard/nft')) return '/dashboard/nft';
    if (p.startsWith('/dashboard/rewards')) return '/dashboard/rewards';
    if (p.startsWith('/dashboard/profile')) return '/dashboard/profile';
    return '/dashboard';
  }

  const sectionLabel = t(sectionKey(pathname));
  const topHref = sectionHref(pathname);

  const segs = pathname.split('/').filter(Boolean);
  const lastSegRaw = segs.length > 2 ? segs[segs.length - 1] : undefined;
  const lastSeg = lastSegRaw ? decodeURIComponent(lastSegRaw) : null;
  const pretty = (s: string) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const deepLabel = lastSeg ? pretty(lastSeg) : null;
  const hasDeep = !!deepLabel && pathname !== topHref;

  const tr = (k: string, fb: string) => {
    const v = t(k);
    return v === k ? fb : v;
  };
  const homeLabel = tr('common.home', tr('nav.home', 'Home'));

  const dashboardLabel = t('dashboard.header.title').replace(/^VIGRI\s+—\s+/i, '').trim();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Brand */}
            <Link href="/" className="flex items-center gap-3">
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl ring-1 ring-zinc-200 bg-white">
                <VigriLogo className="shrink-0 size-11" /> {/* 44px */}
              </div>
              <div className="leading-tight">
                <div className="font-semibold tracking-tight">VIGRI</div>
                <div className="text-[11px] md:text-xs text-zinc-500">
                  Solana Utility Token
                </div>
              </div>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Profile menu (avatar + hamburger) */}
              <ProfileMenu />

              {/* Notifications bell */}
              <NotificationsBell />

              {/* Actions */}
              <LanguageSwitcher lang={lang} onChange={setLang} />

              {/* Telegram: icon-only on mobile, text button on sm+ */}
              <Link
                href={CONFIG.TELEGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline px-2.5 sm:px-4"
                aria-label={t('btn_telegram')}
                title={t('btn_telegram')}
              >
                <span className="inline-flex sm:hidden text-[#229ED9]" aria-hidden="true">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M22.05 2.02a1.5 1.5 0 0 0-1.62-.24L2.6 9.27a1.5 1.5 0 0 0 .15 2.83l4.74 1.58 1.72 5.66a1.5 1.5 0 0 0 2.48.67l2.76-2.64 4.93 3.63a1.5 1.5 0 0 0 2.36-.9l2.27-15.97a1.5 1.5 0 0 0-.96-1.11ZM9.2 13.25l10.36-7.05-8.3 8.4-.3 3.14-1.52-4.98-3.1-1.03 12.86-5.03-10 6.55Z" />
                  </svg>
                </span>
                <span className="hidden sm:inline">{t('btn_telegram')}</span>
              </Link>

              {/* Trade: hide entirely on mobile */}
              <button
                type="button"
                className="hidden sm:inline-flex btn btn-primary rounded-2xl opacity-60 cursor-not-allowed"
                disabled
              >
                {t('btn_trade')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumbs + mobile hamburger */}
      <div className="mx-auto max-w-6xl px-4 pt-2 grid grid-cols-1 md:grid-cols-[220px_1fr] md:gap-x-10">
        <div className="hidden md:block" />
        <div className="md:col-start-2 -mb-3 md:pl-3 flex items-center gap-2" suppressHydrationWarning>
          {/* Render the mobile hamburger only after mount to avoid SSR/client mismatch */}
          {mounted && (
            <button
              ref={hamburgerRef}
              type="button"
              className="md:hidden inline-flex items-center justify-center rounded-lg border px-2.5 py-2 text-xs hover:bg-brand-100/60"
              aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
              aria-controls="dashboard-sidebar"
              aria-expanded={isSidebarOpen ? 'true' : 'false'}
              onClick={() => window.dispatchEvent(new CustomEvent('vigri:sidebar-toggle'))}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}

          <nav className="text-[12px] leading-5 text-zinc-600">
            <Link href="/" className="font-medium hover:underline">
              {homeLabel}
            </Link>
            <Sep />
            <Link href="/dashboard" className="text-zinc-500 hover:underline">
              {dashboardLabel}
            </Link>
            {hasDeep ? (
              <>
                <Sep />
                <Link href={topHref} className="text-zinc-500 hover:underline">
                  {sectionLabel}
                </Link>
                <Sep />
                <span className="font-medium">{deepLabel}</span>
              </>
            ) : (
              <>
                <Sep />
                <span className="font-medium">{sectionLabel}</span>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Main layout (desktop sidebar stays) */}
      <div className="mx-auto max-w-6xl p-6 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        {/* Desktop sidebar */}
        <aside id="dashboard-sidebar" className="hidden md:block sidebar-nav">
          <DashboardNav />
        </aside>

        <main className="space-y-4">
          <DashboardKycBanner />
          {children}
        </main>
      </div>

      {/* Mobile overlay: always mounted for fade animation; removed from tab order when hidden */}
      <button
        aria-label="Close menu overlay"
        aria-hidden={isSidebarOpen ? 'false' : 'true'}
        tabIndex={isSidebarOpen ? 0 : -1}
        className={[
          'fixed inset-0 z-[60] md:hidden bg-black/20 backdrop-blur-[1px]',
          'transition-opacity motion-safe:duration-200 motion-reduce:duration-0',
          isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Mobile off-canvas sidebar with slide animation and focus trap */}
      <aside
        ref={sidebarRef}
        className={[
          'md:hidden fixed inset-y-0 left-0 z-[70] w-64 bg-white shadow-lg ring-1 ring-zinc-200 outline-none',
          'transform ease-out',
          'motion-safe:transition-transform motion-safe:duration-200',
          'motion-reduce:transition-none',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        tabIndex={-1} // ensure the container itself can receive focus if needed
      >
        <div className="h-14 flex items-center justify-between px-3 border-b">
          <span className="text-sm font-medium">Menu</span>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border px-2 py-1.5 text-xs hover:bg-zinc-100"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close menu"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="p-3 sidebar-nav">
          <DashboardNav />
        </div>
      </aside>
    </div>
  );
}
