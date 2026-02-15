// components/layout/PublicHeader.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/hooks/useI18n';
import { LanguageSwitcher, ProfileMenu } from '@/components/nav';
import { NotificationsBell } from '@/components/notifications';
import VigriLogo from '@/components/VigriLogo';

export default function PublicHeader() {
  const { lang, setLang, t } = useI18n();
  const [me, setMe] = useState<{ email: string } | null>(null);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [isLegalGroupOpen, setIsLegalGroupOpen] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [isFaqGroupOpen, setIsFaqGroupOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const legalRef = useRef<HTMLDivElement | null>(null);
  const faqRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/me', { cache: 'no-store' });
        const j = await r.json();
        if (r.ok && j?.ok) setMe(j.user);
        else setMe(null);
      } catch {
        setMe(null);
      }
    })();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (legalRef.current && legalRef.current.contains(target)) return;
      if (faqRef.current && faqRef.current.contains(target)) return;

      setIsLegalOpen(false);
      setIsFaqOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const homeLabelRaw = t('nav_home');
  const homeLabel = homeLabelRaw === 'nav_home' ? 'Home' : homeLabelRaw;

  const safeT = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  const desktopNavItemBase =
    'text-sm font-medium transition-colors text-zinc-700 hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-white';

  return (
    <>
      {/* Sticky header */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-zinc-200 dark:bg-card/80">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-11 w-11 overflow-hidden rounded-2xl ring-1 ring-zinc-200 bg-white">
              <VigriLogo className="shrink-0 size-11" />
            </div>
            <div>
              <div className="font-semibold tracking-tight">VIGRI</div>
              <div className="text-xs text-zinc-500">Solana Utility Token</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/channels" className={desktopNavItemBase}>
              {t('nav_channels')}
            </Link>
            <Link href="/clubs" className={desktopNavItemBase}>
              {safeT('nav_clubs', 'For clubs')}
            </Link>

            {/* FAQ dropdown (desktop) */}
            <div ref={faqRef} className="relative">
              <button
                type="button"
                className={desktopNavItemBase + ' inline-flex items-center gap-1'}
                onClick={() => setIsFaqOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={isFaqOpen ? 'true' : 'false'}
              >
                {t('nav_faq')}
                <span aria-hidden className="text-[10px]">▾</span>
              </button>

              {isFaqOpen && (
                <div
                  className="absolute left-0 mt-2 w-64 rounded-xl border border-zinc-200 bg-white shadow-lg py-2 text-sm"
                  role="menu"
                  onMouseLeave={() => setIsFaqOpen(false)}
                >
                  <Link
                    href="/faq"
                    className="block px-3 py-2 hover:bg-zinc-100"
                    onClick={() => setIsFaqOpen(false)}
                    role="menuitem"
                  >
                    {safeT('nav_faq_qna', 'Q&A')}
                  </Link>
                  <Link
                    href="/docs"
                    className="block px-3 py-2 hover:bg-zinc-100"
                    onClick={() => setIsFaqOpen(false)}
                    role="menuitem"
                  >
                    {safeT('nav_faq_docs', 'Materials & documents')}
                  </Link>
                  <Link
                    href="/faq/solflare"
                    className="block px-3 py-2 hover:bg-zinc-100"
                    onClick={() => setIsFaqOpen(false)}
                    role="menuitem"
                  >
                    {safeT('nav_faq_solflare', 'Solflare guide')}
                  </Link>
                  <Link
                    href="/faq/phantom"
                    className="block px-3 py-2 hover:bg-zinc-100"
                    onClick={() => setIsFaqOpen(false)}
                    role="menuitem"
                  >
                    {safeT('nav_faq_phantom', 'Phantom guide')}
                  </Link>
                </div>
              )}
            </div>

            {/* Legal dropdown (desktop) */}
            <div ref={legalRef} className="relative">
              <button
                type="button"
                className={desktopNavItemBase + ' inline-flex items-center gap-1'}
                onClick={() => setIsLegalOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={isLegalOpen ? 'true' : 'false'}
              >
                {t('nav_legal')}
                <span aria-hidden className="text-[10px]">▾</span>
              </button>

              {isLegalOpen && (
                <div
                  className="absolute left-0 mt-2 w-56 rounded-xl border border-zinc-200 bg-white shadow-lg py-2 text-sm"
                  role="menu"
                  onMouseLeave={() => setIsLegalOpen(false)}
                >
                  <Link
                    href="/contact"
                    className="block px-3 py-2 hover:bg-zinc-100"
                    onClick={() => setIsLegalOpen(false)}
                    role="menuitem"
                  >
                    {t('footer_contact')}
                  </Link>
                  <Link
                    href="/compliance"
                    className="block px-3 py-2 hover:bg-zinc-100"
                    onClick={() => setIsLegalOpen(false)}
                    role="menuitem"
                  >
                    {t('footer_compliance')}
                  </Link>
                  <Link
                    href="/privacy"
                    className="block px-3 py-2 hover:bg-zinc-100"
                    onClick={() => setIsLegalOpen(false)}
                    role="menuitem"
                  >
                    {t('footer_privacy')}
                  </Link>
                  <Link
                    href="/terms"
                    className="block px-3 py-2 hover:bg-zinc-100"
                    onClick={() => setIsLegalOpen(false)}
                    role="menuitem"
                  >
                    {t('footer_terms')}
                  </Link>
                </div>
              )}
            </div>

            <Link href="/#contract" className="btn btn-primary">
              {t('nav_contract')}
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {me ? (
              <div className="flex items-center gap-2">
                <ProfileMenu />
                <NotificationsBell />
                <LanguageSwitcher lang={lang} onChange={setLang} />

                <Link
                  href="/dashboard"
                  className="
                    btn btn-primary
                    flex items-center justify-center gap-1.5
                    h-8 w-8 p-0 rounded-2xl
                    sm:w-auto sm:px-3
                    whitespace-nowrap
                  "
                  aria-label={t('common.go_dashboard') || 'Go to Dashboard'}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="8" height="8" rx="2" />
                    <rect x="13" y="3" width="8" height="5" rx="2" />
                    <rect x="13" y="10" width="8" height="11" rx="2" />
                    <rect x="3" y="13" width="8" height="8" rx="2" />
                  </svg>

                  <span className="hidden sm:inline text-xs font-medium">
                    {t('common.go_dashboard') || 'Go to Dashboard'}
                  </span>
                </Link>
              </div>
            ) : (
              <>
                <LanguageSwitcher lang={lang} onChange={setLang} />
                <Link href="/?auth=login" className="btn btn-outline">
                  {t('common.sign_in') || 'Sign in'}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile burger */}
      <button
        type="button"
        className={[
          'fixed left-4 top-20 z-40 md:hidden',
          'btn btn-outline rounded-full h-9 w-9 p-0 flex items-center justify-center',
          'transition-opacity duration-150',
          scrolled ? 'opacity-60' : 'opacity-90',
        ].join(' ')}
        onClick={() => setIsNavOpen(true)}
        aria-label="Toggle navigation"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile sidebar */}
      {isNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            className="absolute inset-0 bg-black/30"
            aria-label="Close navigation"
            onClick={() => setIsNavOpen(false)}
          />

          <div className="relative h-full w-64 bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
              <span className="text-sm font-medium">Menu</span>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setIsNavOpen(false)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <nav className="px-4 py-3 space-y-2 text-sm">
              <Link
                href="/"
                className="block rounded-lg px-3 py-2 hover:bg-zinc-100"
                onClick={() => setIsNavOpen(false)}
              >
                {homeLabel}
              </Link>

              <Link
                href="/channels"
                className="block rounded-lg px-3 py-2 hover:bg-zinc-100"
                onClick={() => setIsNavOpen(false)}
              >
                {t('nav_channels')}
              </Link>
              <Link
                href="/clubs"
                className="block rounded-lg px-3 py-2 hover:bg-zinc-100"
                onClick={() => setIsNavOpen(false)}
              >
                {safeT('nav_clubs', 'For clubs')}
              </Link>

              {/* FAQ group (mobile) */}
              <div className="pt-2 mt-2 border-t border-zinc-200/70">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-zinc-100"
                  onClick={() => setIsFaqGroupOpen((v) => !v)}
                  aria-expanded={isFaqGroupOpen ? 'true' : 'false'}
                >
                  <span>{t('nav_faq')}</span>
                  <span className="text-xs" aria-hidden>
                    {isFaqGroupOpen ? '▴' : '▾'}
                  </span>
                </button>

                {isFaqGroupOpen && (
                  <div className="mt-1 space-y-1 pl-3">
                    <Link
                      href="/faq"
                      className="block rounded-lg px-3 py-2 text-sm hover:bg-zinc-100"
                      onClick={() => setIsNavOpen(false)}
                    >
                      {safeT('nav_faq_qna', 'Q&A')}
                    </Link>
                    <Link
                      href="/docs"
                      className="block rounded-lg px-3 py-2 text-sm hover:bg-zinc-100"
                      onClick={() => setIsNavOpen(false)}
                    >
                      {safeT('nav_faq_docs', 'Materials & documents')}
                    </Link>
                    <Link
                      href="/faq/solflare"
                      className="block rounded-lg px-3 py-2 text-sm hover:bg-zinc-100"
                      onClick={() => setIsNavOpen(false)}
                    >
                      {safeT('nav_faq_solflare', 'Solflare guide')}
                    </Link>
                    <Link
                      href="/faq/phantom"
                      className="block rounded-lg px-3 py-2 text-sm hover:bg-zinc-100"
                      onClick={() => setIsNavOpen(false)}
                    >
                      {safeT('nav_faq_phantom', 'Phantom guide')}
                    </Link>
                  </div>
                )}
              </div>

              {/* Legal group (mobile) */}
              <div className="pt-2 mt-2 border-t border-zinc-200/70">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-zinc-100"
                  onClick={() => setIsLegalGroupOpen((v) => !v)}
                  aria-expanded={isLegalGroupOpen ? 'true' : 'false'}
                >
                  <span>{t('nav_legal')}</span>
                  <span className="text-xs" aria-hidden>
                    {isLegalGroupOpen ? '▴' : '▾'}
                  </span>
                </button>

                {isLegalGroupOpen && (
                  <div className="mt-1 space-y-1 pl-3">
                    <Link
                      href="/contact"
                      className="block rounded-lg px-3 py-2 text-sm hover:bg-zinc-100"
                      onClick={() => setIsNavOpen(false)}
                    >
                      {t('footer_contact')}
                    </Link>
                    <Link
                      href="/compliance"
                      className="block rounded-lg px-3 py-2 text-sm hover:bg-zinc-100"
                      onClick={() => setIsNavOpen(false)}
                    >
                      {t('footer_compliance')}
                    </Link>
                    <Link
                      href="/privacy"
                      className="block rounded-lg px-3 py-2 text-sm hover:bg-zinc-100"
                      onClick={() => setIsNavOpen(false)}
                    >
                      {t('footer_privacy')}
                    </Link>
                    <Link
                      href="/terms"
                      className="block rounded-lg px-3 py-2 text-sm hover:bg-zinc-100"
                      onClick={() => setIsNavOpen(false)}
                    >
                      {t('footer_terms')}
                    </Link>
                  </div>
                )}
              </div>

              <Link
                href="/#contract"
                className="block rounded-lg px-3 py-2 hover:bg-zinc-100"
                onClick={() => setIsNavOpen(false)}
              >
                {t('nav_contract')}
              </Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
