'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function PresaleWidget({
  t,
  me,
  openAuth,
}: {
  t: (k: string) => string;
  me: { email: string } | null;
  openAuth: (mode: 'login' | 'signup') => void;
}) {
  // ---- Dynamic presale totals (computed from /api/nft) ----
  const [targetSol, setTargetSol] = useState<number>(0);
  const [currentSol, setCurrentSol] = useState<number>(0);
  const [saleTotalNft, setSaleTotalNft] = useState<number>(0);
  const [saleMintedNft, setSaleMintedNft] = useState<number>(0);
  const [promoOpen, setPromoOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/nft', { cache: 'no-store' });
        const j = await r.json();
        if (r.ok && j?.ok && Array.isArray(j.items)) {
          let target = 0;
          let current = 0;

          let saleTotal = 0;
          let saleMinted = 0;

          for (const it of j.items) {
            const onchain = it.onchain;
            if (!onchain) continue;

            const price = typeof onchain.priceSol === 'number' ? onchain.priceSol : 0;
            const supplyTotal = typeof onchain.supplyTotal === 'number' ? onchain.supplyTotal : 0;
            const supplyMintedTier =
              typeof onchain.supplyMinted === 'number' ? onchain.supplyMinted : 0;

            // Skip invite-only / zero-price tiers (e.g., WS-20)
            const forSale = price > 0 && supplyTotal > 0;
            if (!forSale) continue;

            const sold = Math.min(supplyMintedTier, supplyTotal);

            target += price * supplyTotal;
            current += price * sold;

            saleTotal += supplyTotal;
            saleMinted += sold;
          }

          setTargetSol(target);
          setCurrentSol(current);
          setSaleTotalNft(saleTotal);
          setSaleMintedNft(saleMinted);
        } else {
          setTargetSol(0);
          setCurrentSol(0);
          setSaleTotalNft(0);
          setSaleMintedNft(0);
        }
      } catch {
        setTargetSol(0);
        setCurrentSol(0);
        setSaleTotalNft(0);
        setSaleMintedNft(0);
      }
    })();
  }, []);

  const fmtSol = new Intl.NumberFormat('en', {
    maximumFractionDigits: 0,
  });

  const fmtInt = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  });
  const saleAvailableNft = Math.max(0, saleTotalNft - saleMintedNft);

  const pct =
    targetSol > 0
      ? Math.max(0, Math.min(100, Math.round((currentSol / targetSol) * 100)))
      : 0;

  return (
    <div className="h-full w-full rounded-2xl bg-transparent">
      <div className="flex items-start justify-between gap-4">
        <div className="text-base md:text-lg font-semibold uppercase tracking-wide">
          {t('presale_title')}
        </div>

        <div className="text-right text-xs md:text-sm text-zinc-500 leading-tight">
          <div>{t('presale_on_sale')}</div>
          <div>
            {fmtInt.format(saleAvailableNft)} {t('of')} {fmtInt.format(saleTotalNft)} NFT
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="chip">{t('presale_main_chip')}</span>
        <span className="chip">
          {t('target')}: {fmtSol.format(targetSol)} SOL
        </span>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-3">
        {[
          { src: '/images/nft/1_mb_wood_stell.webp', alt: 'Tree / Steel' },
          { src: '/images/nft/2_mb_bronze.webp', alt: 'Bronze' },
          { src: '/images/nft/3_mb_silver.webp', alt: 'Silver' },
          { src: '/images/nft/4_mb_gold.webp', alt: 'Gold' },
          { src: '/images/nft/5_mb_platinum.webp', alt: 'Platinum' },
        ].map((x) => (
          <div key={x.src} className="relative">
            <Image
              src={x.src}
              alt={x.alt}
              width={320}
              height={320}
              className="w-full h-auto rounded-2xl shadow-sm ring-[0.5px] ring-black/10 dark:ring-white/20 bg-white/80 dark:bg-white/20 p-1"
              sizes="(min-width: 640px) 120px, 20vw"
              priority={false}
            />
          </div>
        ))}
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between text-sm">
          <div className="font-medium">
            {fmtSol.format(currentSol)} SOL {t('raised')}
          </div>
          <div className="text-zinc-500">
            {pct}% {t('of')} {fmtSol.format(targetSol)} SOL
          </div>
        </div>
        <div className="mt-2 progress-track">
          <div className="progress-fill brand-gradient" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setPromoOpen((v) => !v)}
          className="inline-flex items-center justify-center w-14 h-8 p-0 rounded-md border border-brand-200 bg-white text-orange-500 text-[18px] font-bold shadow hover:bg-brand-50"
          aria-label={t('presale_promo_details_title')}
        >
          <span className="leading-none mr-[1px]">i</span>
          <span className="text-[14px] leading-none">▾</span>
        </button>
        <span className="text-blue-400">{t('presale_promo_note')}</span>
      </div>

      {promoOpen && (
        <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] text-zinc-700">
          <div className="font-semibold mb-1">{t('presale_promo_details_title')}</div>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>{t('presale_promo_details_1')}</li>
            <li>{t('presale_promo_details_2')}</li>
            <li>{t('presale_promo_details_3')}</li>
            <li>{t('presale_promo_details_4')}</li>
            <li>{t('presale_promo_details_5')}</li>
          </ul>
          <div className="mt-2">{t('presale_promo_details_footer')}</div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {me ? (
          <Link href="/dashboard/nft" className="btn btn-primary">
            {t('join_presale')}
          </Link>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => openAuth('signup')}>
            {t('join_presale')}
          </button>
        )}

        <Link href="/litepaper" className="btn btn-outline">
          {t('read_litepaper')}
        </Link>
      </div>

      <div className="mt-3 text-[11px] text-zinc-500">{t('numbers_note')}</div>
    </div>
  );
}
