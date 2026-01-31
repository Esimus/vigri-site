// app/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../hooks/useI18n';
import { CONFIG, explorerQS, isMainnet, clusterLabel } from '../lib/config';
import Link from 'next/link';
import Image from 'next/image';
import BeyondDigital from '@/components/BeyondDigital';
import HashDropdown from '@/components/HashDropdown';
import AuthModal from '@/components/AuthModal';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import VerifyBanner from '@/components/VerifyBanner';
import PublicHeader from '@/components/layout/PublicHeader';
import { ProgressDot } from '@/components/ui/ProgressDot';
import PresaleWidget from '@/components/home/PresaleWidget';

export default function Home() {
  const { t } = useI18n();
  const [copied, setCopied] = useState<string>('');
  const [me, setMe] = useState<{ email: string } | null>(null);
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

  // verification banner state
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyNote, setVerifyNote] = useState<string | null>(null);

  const tf = (k: string, fb: string) => {
    const v = t(k);
    return v === k ? fb : v;
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 1800);
    } catch {}
  };

  // resend verification email
  async function resendVerify() {
    setVerifyNote(null);
    setVerifyLoading(true);
    try {
      await fetch('/api/auth/request-verify', { method: 'POST' });
      setVerifyNote(tf('auth.resend_ok', 'Email sent again.'));
    } catch {
      setVerifyNote(tf('auth.resend_err', 'Could not send the email. Try again later.'));
    } finally {
      setVerifyLoading(false);
    }
  }

  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const verify = (sp.get('verify') as 'sent' | 'ok' | 'invalid' | null) ?? null;

  const closeVerify = useCallback(() => {
    const q = new URLSearchParams(sp.toString());
    q.delete('verify');
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  }, [pathname, router, sp]);

  useEffect(() => {
    if (verify === 'sent' || verify === 'ok') {
      const id = setTimeout(() => {
        closeVerify();
      }, 12000);
      return () => clearTimeout(id);
    }
  }, [verify, closeVerify]);

  const openAuth = (mode: 'login' | 'signup') => {
    const q = new URLSearchParams(sp?.toString() || '');
    q.set('auth', mode);
    router.push(`${pathname}?${q.toString()}`, { scroll: false });
  };

  return (
    <main>
      {verify && (
        <VerifyBanner
          verify={verify}
          tf={tf}
          loading={verifyLoading}
          note={verifyNote}
          onResend={resendVerify}
          onClose={closeVerify}
        />
      )}

      {/* Header */}
      <PublicHeader />

      <AuthModal />

      {/* Floating auth strip under header (global, no layout shift) */}
      <div className="relative z-20">
        <div className="mx-auto max-w-6xl px-4">
          {/* zero-height wrapper so this doesn't push content */}
          <div className="relative h-0">
            <div className="absolute right-4 md:right-0 top-2 md:top-4 flex items-center gap-2 floating-auth px-2 py-1">
              <a
                href={CONFIG.TELEGRAM_URL}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm hover:bg-zinc-100"
              >
                {t('btn_telegram')}
              </a>

              <button
                type="button"
                className="btn btn-primary rounded-2xl opacity-60 cursor-not-allowed"
                disabled
              >
                {t('btn_trade')} <span aria-hidden>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section id="home" className="relative overflow-hidden -mt-6 md:-mt-8 hero-blobs">
        <div className="relative z-10 mx-auto max-w-6xl px-4 pt-16 pb-10 md:pt-20 md:pb-12 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              {t('hero_title')}
            </h1>
            <p className="mt-5 text-lg text-zinc-600">{t('hero_subtitle')}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn btn-primary rounded-2xl opacity-60 cursor-not-allowed"
                disabled
              >
                {t('btn_buy_on_dex')}
              </button>
              <a href={CONFIG.TELEGRAM_URL} target="_blank" className="btn btn-outline rounded-2xl">
                {t('btn_community')}
              </a>
              <a href="#tokenomics" className="btn btn-outline rounded-2xl">
                {t('btn_tokenomics')}
              </a>
            </div>
            <div className="mt-6 text-xs text-zinc-500">{t('disclaimer')}</div>
          </div>

          <div className="relative">
            {/* Auth CTA above presale card */}
            <div className="rounded-3xl border border-zinc-400 surface-accent shadow-md px-6 pb-6 pt-8">
              <PresaleWidget t={t} me={me} openAuth={openAuth} />
            </div>
            {!isMainnet && (
              <div className="absolute -bottom-4 -left-4 rotate-2 badge-primary">
                {clusterLabel} / test page
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Utility */}
      <section id="utility" className="relative mx-auto max-w-6xl px-4 section">
        <h2 className="text-2xl font-bold tracking-tight">{t('why_title')}</h2>
        <p className="mt-3 text-zinc-600 max-w-3xl">{t('why_intro')}</p>

        {/* Mobile figure (football) */}
        <div className="xl:hidden mt-6 flex justify-center">
          <Image
            src="/images/figures/figure-football.png"
            alt=""
            width={360}
            height={360}
            className="w-[13rem] sm:w-[16rem] h-auto drop-shadow-md pointer-events-none select-none"
            sizes="(min-width:640px) 16rem, 13rem"
            priority={false}
          />
        </div>

        {/* Decorative figure (desktop only) */}
        <Image
          src="/images/figures/figure-football.png"
          alt=""
          width={360}
          height={360}
          priority={false}
          aria-hidden
          className="hidden xl:block pointer-events-none select-none absolute -top-10 right-12 translate-x-10 drop-shadow-xl"
          sizes="(min-width:1280px) 360px, 0px"
        />

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { t: t('why_card_payments_title'), d: t('why_card_payments_desc') },
            { t: t('why_card_passes_title'), d: t('why_card_passes_desc') },
            { t: t('why_card_crowd_title'), d: t('why_card_crowd_desc') },
            { t: t('why_card_merch_title'), d: t('why_card_merch_desc') },
            { t: t('why_card_status_title'), d: t('why_card_status_desc') },
            { t: t('why_card_clubpages_title'), d: t('why_card_clubpages_desc') },
          ].map((x) => (
            <div key={x.t} className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="font-semibold">{x.t}</div>
              <div className="mt-1.5 text-sm text-zinc-600">{x.d}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-sm text-zinc-500">{t('why_social_fund')}</div>
      </section>

      {/* Why name + Tokenomics with right image column (compact spacing) */}
      <section className="mx-auto max-w-6xl px-4 pt-8 pb-8 md:pt-2 md:pb-2">
        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-6 items-start">
          <div className="space-y-6">
            {/* Why the name card */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
              <div className="text-sm font-semibold tracking-tight">{t('why_name_title')}</div>
              <p className="mt-2 text-sm text-zinc-600">{t('why_name_text')}</p>
              <div className="mt-2">
                <Link href="/story/vigri-1980" className="inline-flex items-center gap-1 text-xs font-normal link-accent">
                  {t('learn_more')} <span aria-hidden>→</span>
                </Link>
              </div>
            </div>

            {/* Tokenomics */}
            <div id="tokenomics" className="scroll-mt-24">
              <h2 className="text-2xl font-bold tracking-tight">{t('tokenomics_title')}</h2>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Stat label={t('tokenomics_network')} value="Solana (SPL)" />
                <Stat label={t('tokenomics_total_supply')} value="10,000,000,000 VIGRI" />
                <Stat label={t('tokenomics_tax')} value="2%" />
                <Stat label={t('tokenomics_program')} value="Fixed Program ID" />
              </div>

              <div className="mt-4 p-5 rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="text-sm text-zinc-600">{t('tokenomics_note')}</div>
              </div>
            </div>
          </div>

          {/* Right column image (desktop sticky) */}
          <div className="relative hidden xl:block -mt-30">
            <div className="sticky top-8">
              <Image
                src="/images/figures/figure-sailing.png"
                alt=""
                width={832}
                height={832}
                aria-hidden
                priority={false}
                className="absolute right-0 top-0 w-[28rem] max-w-none h-auto -translate-y-2 drop-shadow-xl pointer-events-none select-none"
                sizes="(min-width:1280px) 28rem, 0px"
              />
            </div>
          </div>
        </div>

        {/* Mobile yacht */}
        <div className="xl:hidden mt-6 flex justify-center">
          <Image
            src="/images/figures/figure-sailing.png"
            alt=""
            width={832}
            height={832}
            className="w-[18rem] sm:w-[22rem] h-auto drop-shadow-md pointer-events-none select-none"
            sizes="(min-width:640px) 22rem, 18rem"
            priority={false}
          />
        </div>
      </section>

      {/* How to buy */}
      <section id="how" className="mx-auto max-w-6xl px-4 section">
        <h2 className="text-2xl font-bold tracking-tight">{t('how_title')}</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[t('how_step1'), t('how_step2'), t('how_step3'), t('how_step4')].map((step, i) => (
            <li key={i} className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="inline-flex items-center rounded-full px-2.5 py-[3px] font-semibold uppercase tracking-wide text-[#1e40af] bg-[#dbeafe] ring-1 ring-[#93c5fd] text-[12px] lg:text-[12px]">
                {t('step')} {i + 1}
              </div>
              <div className="mt-1 font-medium">{step}</div>
            </li>
          ))}
        </ol>
        <div className="mt-6">
          <button
            type="button"
            className="btn btn-primary rounded-2xl opacity-60 cursor-not-allowed"
            disabled
          >
            {t('btn_buy_on_dex')}
          </button>
        </div>
      </section>

      {/* Contract & Links */}
      <section id="contract" className="mx-auto max-w-6xl px-4 section -mt-20 md:-mt-30 scroll-mt-24">
        {/* Mobile ballet image */}
        <div className="xl:hidden mb-4 flex justify-center">
          <Image
            src="/images/figures/figure-ballet3.png"
            alt=""
            width={768}
            height={768}
            className="w-[18rem] sm:w-[22rem] h-auto drop-shadow-xl pointer-events-none select-none"
            sizes="(min-width:640px) 22rem, 18rem"
          />
        </div>

        <div className="xl:grid xl:grid-cols-[32rem_minmax(0,1fr)] xl:gap-8 items-start">
          {/* left image (desktop sticky) */}
          <div className="relative hidden xl:block mt-[6rem]">
            <div className="sticky top-[12rem]">
              <Image
                src="/images/figures/figure-ballet3.png"
                alt=""
                width={1024}
                height={1024}
                aria-hidden
                priority={false}
                className="w-[32rem] lg:w-[34rem] h-auto drop-shadow-xl pointer-events-none select-none translate-y-2"
                sizes="(min-width:1536px) 34rem, 32rem"
              />
            </div>
          </div>

          {/* right cards */}
          <div className="xl:mt-8">
            <h2 className="text-2xl font-bold tracking-tight">{t('contract_links_title')}</h2>
            <div className="mt-5 grid gap-3">
              <CardCompact
                title={t('mint_title')}
                value={CONFIG.CONTRACT_ADDRESS}
                onCopy={() => copy(CONFIG.CONTRACT_ADDRESS, 'Mint copied')}
                copied={copied === 'Mint copied'}
              />
              <CardCompact
                title={t('program_id_title')}
                value={CONFIG.PROGRAM_ID}
                onCopy={() => copy(CONFIG.PROGRAM_ID, 'ProgramID copied')}
                copied={copied === 'ProgramID copied'}
              />
              <CardCompact
                title={t('arweave_title')}
                value={CONFIG.ARWEAVE_URI}
                onCopy={() => copy(CONFIG.ARWEAVE_URI, 'URI copied')}
                copied={copied === 'URI copied'}
              />
              <LinksCompact explorerQS={explorerQS} t={t} />
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section id="roadmap" className="mx-auto max-w-6xl px-4 section -mt-6 md:-mt-10 scroll-mt-24">
        <h2 className="text-2xl font-bold tracking-tight">{t('roadmap_title')}</h2>
        <div className="mt-6 grid gap-4">
          {[
            { k: t('roadmap_i1_k'), v: t('roadmap_i1_v'), p: 1.0 },
            { k: t('roadmap_i2_k'), v: t('roadmap_i2_v'), p: 1.0 },
            { k: t('roadmap_i3_k'), v: t('roadmap_i3_v'), p: 0.2 },
            { k: t('roadmap_i4_k'), v: t('roadmap_i4_v'), p: 0 },
            { k: t('roadmap_i5_k'), v: t('roadmap_i5_v'), p: 0 },
          ].map((x) => (
            <div key={x.k} className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-sm flex items-start gap-4">
              <ProgressDot value={x.p} />
              <div>
                <div className="text-xs text-zinc-500">{x.k}</div>
                <div className="font-medium">{x.v}</div>
              </div>
            </div>
          ))}
          <div className="mt-4 text-xs text-zinc-500">{t('roadmap_disclaimer')}</div>
          <div className="mt-2 text-xs text-zinc-500">{t('roadmap_airdrop_note')}</div>
        </div>
      </section>

      {/* Beyond digital */}
      <section className="mx-auto max-w-6xl px-4 pt-4 pb-6 md:pt-2 md:pb-4">
        <BeyondDigital t={t} />
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-10 grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-8">
          <div>
            <div className="font-semibold">VIGRI • Lumiros</div>
            <div className="mt-2 text-sm text-zinc-600 max-w-md">{t('footer_note')}</div>
          </div>

          <div className="md:pl-6">
            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
              <div className="min-w-0">
                <div className="font-semibold text-zinc-900 mb-1">{t('footer_social')}</div>
                <ul className="space-y-1">
                  <li>
                    <a className="hover:underline" href={CONFIG.TELEGRAM_URL} target="_blank" rel="noreferrer">
                      Telegram
                    </a>
                  </li>
                  <li>
                    <a className="hover:underline" href={CONFIG.X_URL} target="_blank" rel="noreferrer">
                      X (Twitter)
                    </a>
                  </li>
                  <li>
                    <a className="hover:underline" href={CONFIG.DISCORD_URL} target="_blank" rel="noreferrer">
                      Discord
                    </a>
                  </li>
                  <li>
                    <a className="hover:underline" href={CONFIG.GITHUB_URL} target="_blank" rel="noreferrer">
                      GitHub
                    </a>
                  </li>
                </ul>
              </div>

              <div className="min-w-0">
                <div className="font-semibold text-zinc-900 mb-1">{t('footer_documents')}</div>
                <ul className="space-y-1">
                  <li>
                    <a className="hover:underline" href="/litepaper" rel="noreferrer">
                      {t('footer_litepaper_cs')}
                    </a>
                  </li>
                  <li>
                    <a className="hover:underline" href="/tokenlist.json" target="_blank" rel="noreferrer">
                      {t('footer_token_json')}
                    </a>
                  </li>
                  <li>
                    <HashDropdown hash="d0e8ca1434f61daee9627a7141e0a66ee95e012e9a6c7620326b6a9936a3728b" />
                  </li>
                </ul>
              </div>

              <div className="min-w-0">
                <div className="font-semibold text-zinc-900 mb-1">{t('footer_legal')}</div>
                <ul className="space-y-1">
                  <li>
                    <a className="hover:underline" href="/privacy" rel="noreferrer">
                      {t('footer_privacy')}
                    </a>
                  </li>
                  <li>
                    <a className="hover:underline" href="/terms" rel="noreferrer">
                      {t('footer_terms')}
                    </a>
                  </li>
                  <li>
                    <a className="hover:underline" href="/compliance" rel="noreferrer">
                      {t('footer_compliance')}
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="py-4 text-center text-xs text-zinc-500">
          © {new Date().getFullYear()} Lumiros. All rights reserved.
        </div>
      </footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function IconCopy({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CardCompact({
  title,
  value,
  onCopy,
  copied,
}: {
  title: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  const { t } = useI18n();

  return (
    <div className="relative p-4 rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="text-[16px] leading-none text-zinc-500">{title}</div>
      <div className="mt-1 font-mono text-[14px] leading-tight break-all pr-8 select-all">{value}</div>

      <button
        onClick={onCopy}
        title={copied ? t('copied_tooltip') : t('copy_tooltip')}
        aria-label={copied ? t('copied_tooltip') : t('copy_tooltip')}
        className={`absolute top-3.5 right-3.5 grid place-items-center rounded-md p-1.5 hover:bg-zinc-100 active:scale-[0.98] transition ${
          copied ? 'text-blue-700' : 'text-zinc-500'
        }`}
      >
        <IconCopy />
      </button>
    </div>
  );
}

function LinksCompact({ explorerQS, t }: { explorerQS: string; t: (k: string) => string }) {
  return (
    <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="text-[16px] leading-none text-zinc-500">{t('links_title')}</div>
      <ul className="mt-1.5 text-[14px] leading-snug space-y-0.5">
        <li>
          <a
            className="hover:underline"
            href={`https://solscan.io/token/${CONFIG.CONTRACT_ADDRESS}${explorerQS}`}
            target="_blank"
          >
            {t('link_solscan_token')}
          </a>
        </li>
        <li>
          <a
            className="hover:underline"
            href={`https://explorer.solana.com/address/${CONFIG.PROGRAM_ID}${explorerQS}`}
            target="_blank"
          >
            {t('link_explorer_program')}
          </a>
        </li>
        <li>
          <a className="hover:underline" href={CONFIG.ARWEAVE_URI} target="_blank">
            {t('arweave_title')}
          </a>
        </li>
      </ul>
    </div>
  );
}
