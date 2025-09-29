"use client";

import { useState, useEffect } from "react";
import { useI18n } from "../hooks/useI18n";
import { CONFIG, explorerQS, isMainnet, clusterLabel } from "../lib/config";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import Link from "next/link";
import Image from "next/image";

// Presale settings (edit anytime)
const PRESALE_END_ISO = "2025-11-15T18:00:00Z"; // дата/время окончания (UTC ISO)
const PRESALE_TARGET_EUR = 200_000;             // цель, €
let   PRESALE_CURRENT_EUR = 0;                  // текущие сборы, € (пока вручную)

export default function Home() {
  const [copied, setCopied] = useState<string>("");
  const { lang, setLang, t } = useI18n();

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 1800);
    } catch {}
  };

  return (
    <main className="page-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <a href="#home" className="flex items-center gap-3">
            <div className="h-11 w-11 overflow-hidden rounded-2xl ring-1 ring-zinc-200 bg-white">
              <Image
                src="/vigri-logo.png"
                alt="VIGRI logo"
                width={44}
                height={44}
                className="h-full w-full object-cover"
                priority
              />
            </div>
            <div>
              <div className="font-semibold tracking-tight">VIGRI</div>
              <div className="text-xs text-zinc-500">Solana Utility Token</div>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#utility" className="hover:text-black">{t("nav_why")}</a>
            <a href="#tokenomics" className="hover:text-black">{t("nav_tokenomics")}</a>
            <a href="#roadmap" className="hover:text-black">{t("nav_roadmap")}</a>
            <a href="#how" className="hover:text-black">{t("nav_how")}</a>
            <a href="#contract" className="btn btn-primary">{t("nav_contract")}</a>
          </nav>

          <div className="flex items-center gap-3">
            <LanguageSwitcher lang={lang} onChange={setLang} />
            <a href={CONFIG.TELEGRAM_URL} target="_blank" className="btn btn-outline">{t("btn_telegram")}</a>
            <a href={CONFIG.DEX_URL} target="_blank" className="btn btn-primary">{t("btn_trade")}</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        id="home"
        className="relative overflow-hidden"
        style={{
          backgroundImage:
            "radial-gradient(closest-side, var(--brand-200), transparent 80%), radial-gradient(closest-side, var(--brand-100), transparent 80%)",
          backgroundPosition: "right -6rem top -10rem, left -8rem bottom -7rem",
          backgroundSize: "28rem 28rem, 32rem 32rem",
          backgroundRepeat: "no-repeat, no-repeat",
        }}
      >
        <div className="relative z-10 mx-auto max-w-6xl px-4 pt-16 pb-10 md:pt-20 md:pb-12 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              {t("hero_title")}
            </h1>
            <p className="mt-5 text-lg text-zinc-600">
              {t("hero_subtitle")}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a href={CONFIG.DEX_URL} target="_blank" className="btn btn-primary rounded-2xl">{t("btn_buy_on_dex")}</a>
              <a href={CONFIG.TELEGRAM_URL} target="_blank" className="btn btn-outline rounded-2xl">{t("btn_community")}</a>
              <a href="#tokenomics" className="btn btn-outline rounded-2xl">{t("btn_tokenomics")}</a>
            </div>
            <div className="mt-6 text-xs text-zinc-500">
              {t("disclaimer")}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl border border-zinc-400 surface-accent shadow-md px-6 pb-6 pt-8">
              <PresaleWidget t={t} />
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
        <h2 className="text-2xl font-bold tracking-tight">{t("why_title")}</h2>
        <p className="mt-3 text-zinc-600 max-w-3xl">
          {t("why_intro")}
        </p>

        {/* Mobile figure (football) */}
        <div className="xl:hidden mt-6 flex justify-center">
          <Image
            src="/figure-football.png"
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
          src="/figure-football.png"
          alt=""
          width={360}
          height={360}
          priority={false}
          aria-hidden
          className="
            hidden xl:block
            pointer-events-none select-none
            absolute -top-10 right-12 translate-x-10
            drop-shadow-xl"
          sizes="(min-width:1280px) 360px, 0px"
        />

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { t: t("why_card_payments_title"),      d: t("why_card_payments_desc") },
            { t: t("why_card_passes_title"),        d: t("why_card_passes_desc") },
            { t: t("why_card_crowd_title"),         d: t("why_card_crowd_desc") },
            { t: t("why_card_merch_title"),         d: t("why_card_merch_desc") },
            { t: t("why_card_status_title"),        d: t("why_card_status_desc") },
            { t: t("why_card_clubpages_title"),     d: t("why_card_clubpages_desc") },
          ].map((x) => (
            <div key={x.t} className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="font-semibold">{x.t}</div>
              <div className="mt-1.5 text-sm text-zinc-600">{x.d}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-sm text-zinc-500">
          {t("why_social_fund")}
        </div>
      </section>

      {/* Why name + Tokenomics with right image column (compact spacing) */}
      <section className="mx-auto max-w-6xl px-4 pt-8 pb-8 md:pt-2 md:pb-2">
        {/* 2 колонки на xl: слева контент, справа — картинка */}
        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-6 items-start">
          {/* Левая колонка: карточка + токеномика */}
          <div className="space-y-6">
            {/* Why the name card */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
              <div className="text-sm font-semibold tracking-tight">{t("why_name_title")}</div>
              <p className="mt-2 text-sm text-zinc-600">
                {t("why_name_text")}
              </p>
              <div className="mt-2">
                <Link href="/story/vigri-1980" className="inline-flex items-center gap-1 text-xs font-normal link-accent">
                  {t("learn_more")} <span aria-hidden>→</span>
                </Link>
              </div>
            </div>

            {/* Tokenomics (2×2, tighter spacing) */}
            <div id="tokenomics" className="scroll-mt-24">
              <h2 className="text-2xl font-bold tracking-tight">{t("tokenomics_title")}</h2>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Stat label={t("tokenomics_network")} value="Solana (SPL)" />
                <Stat label={t("tokenomics_total_supply")} value="10,000,000,000 VIGRI" />
                <Stat label={t("tokenomics_tax")} value="2%" />
                <Stat label={t("tokenomics_program")} value="Fixed Program ID" />
              </div>

              <div className="mt-4 p-5 rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="text-sm text-zinc-600">
                  {t("tokenomics_note")}
                </div>
              </div>
            </div>
          </div>

          {/* Правая колонка: яхта (desktop sticky) */}
          <div className="relative hidden xl:block -mt-30">
            <div className="sticky top-8">
              <Image
                src="/figure-sailing.png"
                alt=""
                width={832}   // исходник с запасом под ретину
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
            src="/figure-sailing.png"
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
        <h2 className="text-2xl font-bold tracking-tight">{t("how_title")}</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            t("how_step1"),
            t("how_step2"),
            t("how_step3"),
            t("how_step4"),
          ].map((step, i) => (
            <li key={i} className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div
                className="inline-flex items-center rounded-full
                  px-2.5 py-[3px]
                  font-semibold uppercase tracking-wide
                  text-[#1e40af] bg-[#dbeafe] ring-1 ring-[#93c5fd]
                  text-[12px] lg:text-[12px]">
                  {t("step")} {i + 1}
              </div>
              <div className="mt-1 font-medium">{step}</div>
            </li>
          ))}
        </ol>
        <div className="mt-6">
          <a href={CONFIG.DEX_URL} target="_blank" className="btn btn-primary rounded-2xl">
            {t("btn_buy_on_dex")}
          </a>
        </div>
      </section>

      {/* Contract & Links */}
      <section id="contract" className="mx-auto max-w-6xl px-4 section -mt-20 md:-mt-30 scroll-mt-24">
  {/* Mobile ballet image */}
  <div className="xl:hidden mb-4 flex justify-center">
    <Image
      src="/figure-ballet3.png"
      alt=""
      width={768}
      height={768}
      className="w-[18rem] sm:w-[22rem] h-auto drop-shadow-xl pointer-events-none select-none"
      sizes="(min-width:640px) 22rem, 18rem"
    />
  </div>

  <div className="xl:grid xl:grid-cols-[32rem_minmax(0,1fr)] xl:gap-8 items-start">
    {/* левая колонка: картинка (desktop sticky, без absolute) */}
    <div className="relative hidden xl:block mt-[6rem]">
      <div className="sticky top-[12rem]">
        <Image
          src="/figure-ballet3.png"
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

    {/* правая колонка: один столбик карточек */}
    <div className="xl:mt-8">
      <h2 className="text-2xl font-bold tracking-tight">{t("contract_links_title")}</h2>
      <div className="mt-5 grid gap-3">
        <CardCompact
          title={t("mint_title")}
          value={CONFIG.CONTRACT_ADDRESS}
          onCopy={() => copy(CONFIG.CONTRACT_ADDRESS, "Mint copied")}
          copied={copied === "Mint copied"}
        />
        <CardCompact
          title={t("program_id_title")}
          value={CONFIG.PROGRAM_ID}
          onCopy={() => copy(CONFIG.PROGRAM_ID, "ProgramID copied")}
          copied={copied === "ProgramID copied"}
        />
        <CardCompact
          title={t("arweave_title")}
          value={CONFIG.ARWEAVE_URI}
          onCopy={() => copy(CONFIG.ARWEAVE_URI, "URI copied")}
          copied={copied === "URI copied"}
        />
        <LinksCompact explorerQS={explorerQS} t={t} />
      </div>
    </div>
  </div>
</section>

      {/* Roadmap */}
      <section id="roadmap" className="mx-auto max-w-6xl px-4 section -mt-6 md:-mt-10 scroll-mt-24">
        <h2 className="text-2xl font-bold tracking-tight">{t("roadmap_title")}</h2>
        <div className="mt-6 grid gap-4">
          {[
            { k: t("roadmap_i1_k"), v: t("roadmap_i1_v"), p: 0.4 },
            { k: t("roadmap_i2_k"), v: t("roadmap_i2_v"), p: 0.1 },
            { k: t("roadmap_i3_k"), v: t("roadmap_i3_v"), p: 0 },
            { k: t("roadmap_i4_k"), v: t("roadmap_i4_v"), p: 0 },
          ].map((x) => (
            <div key={x.k} className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-sm flex items-start gap-4">
              <ProgressDot value={x.p} />
              <div>
                <div className="text-xs text-zinc-500">{x.k}</div>
                <div className="font-medium">{x.v}</div>
              </div>
            </div>
          ))}
          <div className="mt-4 text-xs text-zinc-500">{t("roadmap_disclaimer")}</div>
          <div className="mt-2 text-xs text-zinc-500">{t("roadmap_airdrop_note")}</div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-10 grid md:grid-cols-2 gap-8">
          <div>
            <div className="font-semibold">VIGRI • Lumiros</div>
            <div className="mt-2 text-sm text-zinc-600 max-w-md">
              {t("footer_note")}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="font-medium mb-1">{t("footer_social")}</div>
              <ul className="space-y-1">
                <li><a className="hover:underline" href={CONFIG.TELEGRAM_URL} target="_blank" rel="noreferrer">Telegram</a></li>
                <li><a className="hover:underline" href={CONFIG.X_URL} target="_blank" rel="noreferrer">X (Twitter)</a></li>
                <li><a className="hover:underline" href={CONFIG.GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a></li>
              </ul>
            </div>

            <div>
              <div className="font-medium mb-1">{t("footer_documents")}</div>
              <ul className="space-y-1">
                <li><a className="hover:underline" href="#" target="_blank" rel="noreferrer">{t("footer_litepaper_cs")}</a></li>
                <li><a className="hover:underline" href="#" target="_blank" rel="noreferrer">{t("footer_tokenlist_cs")}</a></li>
              </ul>
            </div>

            <div>
              <div className="font-medium mb-1">{t("footer_legal")}</div>
              <ul className="space-y-1">
                <li><a className="hover:underline" href="#" rel="noreferrer">{t("footer_privacy")}</a></li>
                <li><a className="hover:underline" href="#" rel="noreferrer">{t("footer_terms")}</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="py-6 text-center text-xs text-zinc-500">
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

function Card({
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
  return (
    <div className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="text-xs text-zinc-500">{title}</div>
      <div className="mt-1 font-mono text-sm break-all select-all">{value}</div>
      <div className="mt-3">
        <button onClick={onCopy} className="btn btn-outline text-xs">
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function Links({ explorerQS }: { explorerQS: string }) {
  return (
    <div className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="text-xs text-zinc-500">Links</div>
      <ul className="mt-2 text-sm space-y-1">
        <li>
          <a
            className="hover:underline"
            href={`https://solscan.io/token/${CONFIG.CONTRACT_ADDRESS}${explorerQS}`}
            target="_blank"
          >
            Solscan (token)
          </a>
        </li>
        <li>
          <a
            className="hover:underline"
            href={`https://explorer.solana.com/address/${CONFIG.PROGRAM_ID}${explorerQS}`}
            target="_blank"
          >
            Solana Explorer (Program)
          </a>
        </li>
        <li>
          <a className="hover:underline" href={CONFIG.ARWEAVE_URI} target="_blank">
            Arweave Metadata
          </a>
        </li>
      </ul>
    </div>
  );
}

function ProgressDot({ value }: { value?: number }) {
  if (value == null) {
    return (
      <div
        className="h-8 w-8 shrink-0 rounded-full border border-zinc-300 grid place-items-center"
        aria-hidden="true"
      >
        <span className="text-zinc-400">•</span>
      </div>
    );
  }
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  const deg = (pct / 100) * 360;
  return (
    <div
      className="relative h-8 w-8 shrink-0 rounded-full"
      style={{ background: `conic-gradient(var(--brand-600) ${deg}deg, #e5e7eb ${deg}deg)` }}
      aria-label={`Progress ${pct}%`}
      title={`${pct}% complete`}
    >
      <div className="absolute inset-1 rounded-full bg-white border border-zinc-300" />
    </div>
  );
}

function PresaleWidget({ t }: { t: (k: string) => string }) {
  const end = new Date(PRESALE_END_ISO);
  const endStr = end.toUTCString().slice(5, 16); // e.g. "15 Nov 2025"

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const secondsLeft =
    now ? Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000)) : null;

  const days    = secondsLeft != null ? Math.floor(secondsLeft / 86400) : null;
  const hours   = secondsLeft != null ? Math.floor((secondsLeft % 86400) / 3600) : null;
  const minutes = secondsLeft != null ? Math.floor((secondsLeft % 3600) / 60) : null;
  const seconds = secondsLeft != null ? secondsLeft % 60 : null;

  const pad = (n: number | null) => (n == null ? "--" : String(n).padStart(2, "0"));

  const fmt = new Intl.NumberFormat("en", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const pct = Math.max(0, Math.min(100, Math.round((PRESALE_CURRENT_EUR / PRESALE_TARGET_EUR) * 100)));

  return (
    <div className="h-full w-full rounded-2xl bg-transparent">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="text-base md:text-lg font-semibold uppercase tracking-wide">{t("presale_title")}</div>
        <div className="text-xs md:text-sm text-zinc-500">{t("live_until")} {endStr}</div>
      </div>

      {/* chips row */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="chip">{t("accepted")}: SOL • USDC</span>
        <span className="chip">{t("target")}: {fmt.format(PRESALE_TARGET_EUR)}</span>
      </div>

      {/* countdown */}
      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        {[
          { v: pad(days),    l: t("label_days") },
          { v: pad(hours),   l: t("label_hours") },
          { v: pad(minutes), l: t("label_min") },
          { v: pad(seconds), l: t("label_sec") },
        ].map(({ v, l }) => (
          <div
            key={l}
            className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm shadow-sm py-3"
          >
            <div className="text-2xl md:text-3xl font-bold tabular-nums">{v}</div>
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">{l}</div>
          </div>
        ))}
      </div>

      {/* progress */}
      <div className="mt-5">
        <div className="flex items-baseline justify-between text-sm">
          <div className="font-medium">{fmt.format(PRESALE_CURRENT_EUR)} {t("raised")}</div>
          <div className="text-zinc-500">{pct}% {t("of")} {fmt.format(PRESALE_TARGET_EUR)}</div>
        </div>
        <div className="mt-2 progress-track">
          <div className="progress-fill brand-gradient" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* actions */}
      <div className="mt-5 flex flex-wrap gap-2">
        <a href="/presale" className="btn btn-primary">{t("join_presale")}</a>
        <a href="/docs/litepaper" className="btn btn-outline">{t("read_litepaper")}</a>
      </div>

      <div className="mt-3 text-[11px] text-zinc-500">{t("numbers_note")}</div>
    </div>
  );
}

function IconCopy({ className = "" }: { className?: string }) {
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
      <div className="mt-1 font-mono text-[14px] leading-tight break-all pr-8 select-all">
        {value}
      </div>

      <button
        onClick={onCopy}
        title={copied ? t("copied_tooltip") : t("copy_tooltip")}
        aria-label={copied ? t("copied_tooltip") : t("copy_tooltip")}
        className={`absolute top-3.5 right-3.5 grid place-items-center rounded-md p-1.5
                    hover:bg-zinc-100 active:scale-[0.98] transition
                    ${copied ? "text-blue-700" : "text-zinc-500"}`}
      >
        <IconCopy />
      </button>
    </div>
  );
}

function LinksCompact({
  explorerQS,
  t,
}: {
  explorerQS: string;
  t: (k: string) => string;
}) {
  return (
    <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="text-[16px] leading-none text-zinc-500">{t("links_title")}</div>
      <ul className="mt-1.5 text-[14px] leading-snug space-y-0.5">
        <li>
          <a
            className="hover:underline"
            href={`https://solscan.io/token/${CONFIG.CONTRACT_ADDRESS}${explorerQS}`}
            target="_blank"
          >
            {t("link_solscan_token")}
          </a>
        </li>
        <li>
          <a
            className="hover:underline"
            href={`https://explorer.solana.com/address/${CONFIG.PROGRAM_ID}${explorerQS}`}
            target="_blank"
          >
            {t("link_explorer_program")}
          </a>
        </li>
        <li>
          <a className="hover:underline" href={CONFIG.ARWEAVE_URI} target="_blank">
            {t("arweave_title")}
          </a>
        </li>
      </ul>
    </div>
  );
}

