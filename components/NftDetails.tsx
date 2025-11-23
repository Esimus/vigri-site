// components/NftDetails.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useI18n } from '@/hooks/useI18n';
import PillCarousel from '@/components/ui/PillCarousel';
import { NFT_CATALOG, NFT_NAV, NftMeta } from '@/constants/nftCatalog';
import SalesBar from '@/components/ui/SalesBar';

type Design = { id: string; label: string; rarity?: number };
type Item = {
  id: string;
  name: string;
  blurb: string;
  eurPrice: number;
  vigriPrice: number;
  kycRequired?: boolean;
  limited?: number;
  minted?: number;
  vesting?: string | null;
  ownedQty?: number;
  invited?: boolean;
  designs?: Design[];
  ownedDesigns?: Record<string, number>;
  tier: 'tree' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'ws';
  discountPct: number;
  activationType: 'flex' | 'fixed' | 'none';
  fixedClaimPct?: number;
  fixedDiscountPct?: number;
  userActivation?: 'claim100' | 'split50' | 'discount100' | 'fixed' | null;
  upgrades?: { rare: number; ultra: number };
  expiresAt?: string | null;
  onchain?: {
    tierId: number;
    priceSol: number;
    supplyTotal: number;
    supplyMinted: number;
  };
};

type Rights = {
  id: string;
  discountPctEffective: number;
  claimBudgetEur: number;
  claimUsedEur: number;
  claimAvailVigri: number;
  discountBudgetEur: number;
  discountUsedEur: number;
  discountAvailEur: number;
  expiresAt: string | null;
};

type NftListResp = { ok: true; items: Item[] };
type RightsResp = { ok: true; items: Rights[]; tgePriceEur?: number };
type ClaimResp = { ok: true; vigriClaimed: number };
type DiscountResp = { ok: true; vigriBought: number; unitEur: number };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
function isNftListResp(v: unknown): v is NftListResp {
  return isObject(v) && v.ok === true && Array.isArray(v.items);
}
function isRightsResp(v: unknown): v is RightsResp {
  return isObject(v) && v.ok === true && Array.isArray(v.items);
}
function isClaimResp(v: unknown): v is ClaimResp {
  return isObject(v) && v.ok === true && typeof v.vigriClaimed === 'number';
}
function isDiscountResp(v: unknown): v is DiscountResp {
  return (
    isObject(v) &&
    v.ok === true &&
    typeof v.vigriBought === 'number' &&
    typeof v.unitEur === 'number'
  );
}

// Fallback PNG name from /public/images/nft/
function pngNameFor(id: string): string {
  switch (id) {
    case 'nft-tree-steel':  return '1_mb_wood_stell.png';
    case 'nft-bronze':      return '2_mb_bronze.png';
    case 'nft-silver':      return '3_mb_silver.png';
    case 'nft-gold':        return '4_mb_gold.png';
    case 'nft-platinum':    return '5_mb_platinum.png';
    case 'nft-ws-20':       return '6_mb_ws.png';
    default:                return '6_mb_ws.png';
  }
}

type BuyPayload = {
  id: string;
  qty: number;
  designId?: string;
  activation?: 'claim100' | 'split50' | 'discount100';
};

function BuyPanelMobile(props: {
  item: Item | null;
  designs: Design[];
  design: string | null;
  setDesign: (id: string) => void;
  activationType: 'flex' | 'fixed' | 'none';
  act: 'claim100' | 'split50' | 'discount100';
  setAct: (a: 'claim100' | 'split50' | 'discount100') => void;
  qty: number;
  setQty: (n: number) => void;
  withPhysical: boolean;
  setWithPhysical: (v: boolean) => void;
  onBuy: () => void;
  t: ReturnType<typeof useI18n>['t'];
  solPrice: number | null;
}) {
  const {
    item, designs, design, setDesign,
    activationType, act, setAct,
    qty, setQty, withPhysical, setWithPhysical,
    onBuy, t,
    solPrice,
  } = props;

  if (!item) return null;

  const isTree = item.tier === 'tree';
  const isSilver = item.tier === 'silver';

  const hasSol = solPrice !== null && solPrice > 0;
  const hasEur = typeof item.eurPrice === 'number' && item.eurPrice > 0;

  return (
    <div className="card p-4 md:p-5 flex flex-wrap items-end gap-3">
      {/* Mobile: design selector only for Tree/Steel */}
      {isTree && designs.length > 0 && (
        <div className="text-sm">
          <div className="text-xs mb-1">{t('nft.design.select')}</div>
          <div className="flex flex-col gap-1">
            {designs.map((d) => (
              <label key={d.id} className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="nft-design-mobile"
                  checked={design === d.id}
                  onChange={() => setDesign(d.id)}
                />
                <span className="text-xs">{d.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Activation (flex) */}
      {activationType === 'flex' && (
        <div className="text-sm">
          <div className="text-xs mb-1">{t('nft.activation.title')}</div>
          <div className="flex flex-col gap-1">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="act" checked={act === 'claim100'} onChange={() => setAct('claim100')} />
              {t('nft.activation.claim100')}
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="act" checked={act === 'split50'} onChange={() => setAct('split50')} />
              {t('nft.activation.split50')}
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="act" checked={act === 'discount100'} onChange={() => setAct('discount100')} />
              {t('nft.activation.discount100')}
            </label>
          </div>
        </div>
      )}

      {/* Format (mobile): Silver only */}
      {isSilver && (
        <div className="text-sm">
          <div className="text-xs mb-1">{t('nft.physical.label')}</div>
          <div className="flex flex-col gap-1">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="physical-mobile"
                checked={withPhysical === true}
                onChange={() => setWithPhysical(true)}
              />
              <span className="text-xs">{t('nft.physical.with')}</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="physical-mobile"
                checked={withPhysical === false}
                onChange={() => setWithPhysical(false)}
              />
              <span className="text-xs">{t('nft.physical.without')}</span>
            </label>
          </div>
        </div>
      )}

      {/* Qty + buy */}
      <div>
        <label className="label">{t('nft.qty')}</label>
        <input
          type="number"
          min={1}
          step={1}
          className="input w-24 text-sm"
          value={qty}
          onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
        />
      </div>

      <div className="flex items-end gap-4">
        <div className="flex flex-col items-start">
          <div className="text-2xl font-semibold leading-none" style={{ color: 'var(--brand-400)' }}>
            {hasSol
              ? `${solPrice} SOL`
              : hasEur
              ? `${item.eurPrice.toFixed(0)}€`
              : ''}
          </div>
          {hasSol && hasEur && (
            <div className="text-xs opacity-70 mt-1">
              ≈ {item.eurPrice.toFixed(0)}€ (presale reference)
            </div>
          )}
          <button className="btn btn-outline mt-2" onClick={onBuy}>
            {t('nft.buy')}
          </button>
        </div>
      </div>
    </div>
  );
}

type DetailsMeta = Pick<
  NftMeta,
  'revealLabelKey' | 'revealValue' | 'supply' | 'kycRequired' | 'vesting' | 'priceEur' | 'priceAfter' | 'tier'
> & {
  limited?: string | number;
};

function LockIcon({ size = 15 }: { size?: number }) {
  return <span aria-hidden style={{ fontSize: size, lineHeight: 1 }} className="mr-0.5 align-middle">🔒</span>;
}
function KeyIcon() {
  return <span aria-hidden className="-ml-0.5 mr-1">🔑</span>;
}

function DetailsCard(props: {
  t: ReturnType<typeof useI18n>['t'];
  title: string;
  blurb: string;
  meta: DetailsMeta;
  featureLines: string[];
  solPrice: number | null;
  }) {
  const { t, title, blurb, meta, featureLines, solPrice } = props;
  const isWS = meta?.tier === 'ws';

  const hasSol = typeof solPrice === 'number' && solPrice > 0;
  const hasEurNow = typeof meta?.priceEur === 'number';

  return (
    <div className="card p-4 md:p-5 space-y-2">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm opacity-70">{blurb}</p>

      {/* Meta chips */}
      <div className="flex flex-wrap gap-2 text-xs opacity-90">
        {meta?.limited && (
          <span className="chip">
            {t('nft.limited')}: {meta.limited}
          </span>
        )}

        {meta?.kycRequired ? (
          <span className="chip inline-flex items-center gap-0.5">
            <LockIcon size={15} />
            {t('nft.kyc')}
          </span>
        ) : null}

        {isWS && (
          <span className="chip">
            <KeyIcon />
            {t('nft.badge.invite')}
          </span>
        )}

        {meta?.vesting && (
          <span className="chip">
            {t('nft.vesting')}: {t(meta.vesting)}
          </span>
        )}

        {/* Price */}
        {(hasSol || hasEurNow) && (
          <span className="chip">
            {t('nft.price.now')}:{' '}
            {hasSol
              ? `${solPrice} SOL`
              : `€${meta!.priceEur!.toFixed(2)}`}
          </span>
        )}

        {meta?.priceAfter && (
          <span className="chip">
            {t('nft.price.after')}{' '}
            {new Date(meta.priceAfter.date).toLocaleDateString()}:{' '}
            {hasSol
              ? `${solPrice! * 2} SOL`
              : `€${meta.priceAfter.priceEur.toFixed(2)}`}
          </span>
        )}
      </div>

      {/* Spec chips */}
      <div className="flex flex-wrap gap-2 text-xs opacity-90 mt-2">
        {meta?.revealLabelKey && meta?.revealValue && (
          <span className="chip">
            {t(meta.revealLabelKey)} {meta.revealValue}
          </span>
        )}
        {meta?.supply ? (
          <span className="chip">{t('nft.supply')}: {meta.supply.toLocaleString()}</span>
        ) : null}
      </div>

      {/* Feature list */}
      {featureLines.length ? (
        <ul className="list-disc pl-5 mt-2 text-[13px] opacity-90">
          {featureLines.map((f) => <li key={f}>{f}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

function ExplainerText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n\n').map((block, i) => {
        const lines = block.split('\n').filter(l => l !== '');
        const hasBullets = lines.some(l => l.trim().startsWith('•'));

        if (hasBullets) {
          const first = lines[0] ?? '';
          const hasHeading = first.trim().length > 0 && !first.trim().startsWith('•');
          const heading = hasHeading ? first : null;

          const items = lines
            .filter(l => l.trim().startsWith('•'))
            .map(l => l.replace(/^•\s?/, ''));

          return (
            <figure
              key={i}
              className="my-4 rounded-md bg-white/60 dark:bg-white/5 p-3 pl-4 shadow-sm ring-1 ring-black/5 dark:ring-white/10 border-l-4"
              style={{ borderLeftColor: 'var(--brand-400)' }}
            >
              {heading && (
                <figcaption className="text-sm font-medium mb-2 opacity-80">
                  {heading}
                </figcaption>
              )}
              <ul className="list-disc pl-5 text-sm leading-relaxed">
                {items.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </figure>
          );
        }

        return (
          <p key={i} className="my-2 whitespace-pre-line">
            {block}
          </p>
        );
      })}
    </>
  );
}

export default function NftDetails({ id }: { id: string }) {
  const { t } = useI18n();

  // Static catalog metadata for given id
  const meta = NFT_CATALOG[id];

  const [item, setItem] = useState<Item | null>(null);
  const [design, setDesign] = useState<string | null>(null);
  const [qty, setQty] = useState<number>(1);
  const [act, setAct] = useState<'claim100' | 'split50' | 'discount100'>('discount100');

  // Physical card selection (Silver)
  const [withPhysical, setWithPhysical] = useState<boolean>(false);

  const [rights, setRights] = useState<Rights | null>(null);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);
  const [discMsg, setDiscMsg] = useState<string | null>(null);
  const [discEur, setDiscEur] = useState<number>(0);

  // Summary for this id (from /api/nft/summary)
  type SummaryItem = { id: string; total: number; sold: number; left: number; pct: number };
  type SummaryResp = { ok?: boolean; items?: Array<SummaryItem> };
  const [sum, setSum] = useState<SummaryItem | null>(null);

  async function loadAll() {
    // 1) NFT list (mock API)
    const r = await fetch('/api/nft', { cache: 'no-store' });
    const j: unknown = await r.json().catch(() => ({}));
    if (r.ok && isNftListResp(j)) {
      const found = j.items.find((i) => i.id === id) || null;
      setItem(found);

      // Initial design for Tree on first render
      if (found?.id !== 'nft-ws-20') {
        const fromMeta = meta?.designs?.[0]?.id;
        const fromApi = found?.designs?.[0]?.id;
        const initial = fromMeta ?? fromApi ?? null;
        if (initial) setDesign(initial);
      }

      if (meta?.activationType === 'flex' && found?.userActivation && found.userActivation !== 'fixed') {
        setAct(found.userActivation);
      }
    }

    // 2) Rights
    try {
      const rr = await fetch('/api/nft/rights', { cache: 'no-store' });
      const raw: unknown = await rr.json().catch(() => ({}));
      if (rr.ok && isRightsResp(raw)) {
        const mine = raw.items.find((x) => x.id === id) || null;
        setRights(mine);
      } else {
        setRights(null);
      }
    } catch {
      setRights(null);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Load global summary for this item id
  useEffect(() => {
    let cancelled = false;
    async function loadSummary() {
      if (!id) { setSum(null); return; }
      try {
        const r = await fetch(`/api/nft/summary?ts=${Date.now()}`, { cache: 'no-store' });
        const j: SummaryResp = await r.json().catch(() => ({} as SummaryResp));
        if (!cancelled && r.ok && j?.items) {
          const found = j.items.find((it) => it.id === id) ?? null;
          setSum(found);
        }
      } catch { /* ignore */ }
    }
    void loadSummary();
    return () => { cancelled = true; };
  }, [id]);

  const isWS = item?.tier === 'ws';
  const cf = useMemo(
  () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }),
  []
  );
  const rawSol = item?.onchain?.priceSol;
  const solPrice = typeof rawSol === 'number' ? rawSol : null;
  const hasSol = solPrice !== null && solPrice > 0;

  const eurFromMeta =
    typeof meta?.priceEur === 'number' ? meta.priceEur : undefined;
  const hasEurMeta = typeof eurFromMeta === 'number';

  // Prefer localized keys from catalog; fall back to plain text or API
  const title = (meta?.nameKey ? t(meta.nameKey) : meta?.name) ?? item?.name ?? '';
  const blurb = (meta?.blurbKey ? t(meta.blurbKey) : meta?.blurb) ?? item?.blurb ?? '';
  const activationType = meta?.activationType ?? item?.activationType ?? 'none';
  const featureLines = (meta?.featureKeys?.map((k) => t(k)) ?? meta?.features) ?? [];
  const tier = (meta?.tier ?? item?.tier) as DetailsMeta['tier'];

  const navItems = useMemo(() => NFT_NAV, []);

  function tierParamFromItemTier(t: Item['tier'] | undefined): string {
    switch (t) {
      case 'tree': return 'Tree';
      case 'bronze': return 'Bronze';
      case 'silver': return 'Silver';
      case 'gold': return 'Gold';
      case 'platinum': return 'Platinum';
      case 'ws': return 'WS-20';
      default: return 'Base';
    }
  }

  // Purchase (mock)
  const buy = async () => {
    if (!item) return;

    const payload: BuyPayload = { id: item.id, qty: isWS ? 1 : qty };
    if (design) payload.designId = design;
    if (activationType === 'flex') payload.activation = act;

    // 1) Mock purchase
    const r = await fetch('/api/nft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const j: unknown = await r.json().catch(() => ({} as Record<string, unknown>));
    const ok = typeof j === 'object' && j !== null && (j as { ok?: boolean }).ok === true;
    if (!r.ok || !ok) return;

    // 2) Trigger rewards/referral (non-blocking)
    try {
      const meRes = await fetch('/api/me', { cache: 'no-store' });
      const meJson = await meRes.json().catch(() => ({} as { ok?: boolean; user?: { id?: string } }));
      const meId = meJson?.ok && meJson?.user?.id ? String(meJson.user.id) : null;

      const tierName = tierParamFromItemTier(item.tier);

      // price × qty
      const eurSingle = (meta?.priceEur ?? item?.eurPrice ?? 0);
      const eurTotal  = eurSingle * (isWS ? 1 : qty);

      const qsClaim = new URLSearchParams();
      qsClaim.set('tier', tierName);
      if (eurTotal > 0) qsClaim.set('eur', String(eurTotal));
      qsClaim.set('qty', String(isWS ? 1 : qty));     // <-- добавили qty
      if (meId) qsClaim.set('userId', meId);

      await fetch(`/api/nft/claim?${qsClaim.toString()}`, { method: 'POST' });
      } catch (err) {
      // swallow: rewards shouldn't block UI
      console.error('claim failed', err);
      } finally {
      // refresh global summary (force update SalesBar)
      await fetch(`/api/nft/summary?ts=${Date.now()}`, { cache: 'no-store' });
      }
    };

  // Claim (mock)
  const doClaimAll = async () => {
    setClaimMsg(null);
    const r = await fetch('/api/nft/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const j: unknown = await r.json().catch(() => ({}));
    if (!r.ok || !isClaimResp(j)) {
      const msg = isObject(j) && typeof j.error === 'string' ? j.error : t('nft.msg.failed');
      setClaimMsg(msg);
      return;
    }
    setClaimMsg(`${t('nft.claim.ok')} +${Math.round(j.vigriClaimed).toLocaleString()} VIGRI`);
    await loadAll();
  };

  // Discount (mock)
  const doDiscount = async () => {
    setDiscMsg(null);
    const r = await fetch('/api/nft/discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, eurAmount: discEur }),
    });
    const j: unknown = await r.json().catch(() => ({}));
    if (!r.ok || !isDiscountResp(j)) {
      const msg = isObject(j) && typeof j.error === 'string' ? j.error : t('nft.msg.failed');
      setDiscMsg(msg);
      return;
    }
    setDiscMsg(`${t('nft.discount.ok')} +${Math.round(j.vigriBought).toLocaleString()} VIGRI @ ${cf.format(j.unitEur)}`);
    await loadAll();
  };

  const daysLeft = useMemo(() => {
    if (!rights?.expiresAt) return null;
    const diff = new Date(rights.expiresAt).getTime() - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (24 * 60 * 60 * 1000));
  }, [rights?.expiresAt]);

  if (!item) {
    return (
      <div className="space-y-2">
        <Link href="/dashboard/nft" className="link-accent text-sm">
          {t('nft.details.back')}
        </Link>
        <div className="text-sm opacity-70">Not found.</div>
      </div>
    );
  }

  // Narrow meta for the right-side card
  const metaForDetails: DetailsMeta = {
    tier,
    revealLabelKey: meta?.revealLabelKey,
    revealValue: meta?.revealValue,
    supply: typeof meta?.supply === 'number' ? meta.supply : undefined,
    kycRequired: meta?.kycRequired,
    vesting: meta?.vesting ?? null,
    priceEur: typeof meta?.priceEur === 'number' ? meta.priceEur : undefined,
    priceAfter: meta?.priceAfter ?? null,
  };

  // ===== unified numbers for SalesBar on details page =====
  const onchainTotal = item.onchain?.supplyTotal;
  const onchainSold  = item.onchain?.supplyMinted;

  const totalForBar =
    typeof onchainTotal === 'number' && onchainTotal > 0
      ? onchainTotal
      : typeof sum?.total === 'number'
        ? sum.total
        : (typeof meta?.supply === 'number'
            ? meta.supply
            : item.limited);

  const soldFromSummary = typeof sum?.sold === 'number' ? sum.sold : 0;
  const soldLocal       = typeof item.minted === 'number' ? item.minted : 0;

  const soldForBar =
    typeof onchainSold === 'number' && onchainSold >= 0
      ? onchainSold
      : Math.max(soldFromSummary, soldLocal);

  const pctForBar =
    typeof totalForBar === 'number' && totalForBar > 0 && typeof soldForBar === 'number'
      ? Math.round((soldForBar / totalForBar) * 100)
      : 0;

  const progressColor =
    pctForBar > 70 ? '#EF4444' : pctForBar >= 30 ? '#F59E0B' : '#10B981';
  // ========================================================

  return (
    <div className="space-y-4">
      {/* Top nav carousel */}
      <PillCarousel
        back={{ id: 'all', label: t('nft.details.back'), href: '/dashboard/nft' }}
        items={navItems.map((it) => ({
          id: it.id,
          label: it.name,
          href: `/dashboard/nft/${it.id}`,
          active: it.id === id,
        }))}
      />

      {/* Mobile: image + buy */}
      <div className="lg:hidden grid grid-cols-[minmax(180px,52vw)_1fr] gap-4 items-start">
        <div
          className="relative w-full max-w-[240px] mx-0 md:mx-auto card p-0 overflow-hidden"
          style={{ aspectRatio: '3 / 4' }}
        >
          <Image
            src={`/images/nft/${meta?.image ?? pngNameFor(item.id)}`}
            alt={title}
            fill
            sizes="90vw"
            className="object-cover rounded-xl border"
            priority={false}
          />
        </div>

        <BuyPanelMobile
          item={item}
          designs={meta?.designs ?? item.designs ?? []}
          design={design}
          setDesign={(d) => setDesign(d)}
          activationType={activationType}
          act={act}
          setAct={(a) => setAct(a)}
          qty={qty}
          setQty={(n) => setQty(n)}
          withPhysical={withPhysical}
          setWithPhysical={setWithPhysical}
          onBuy={buy}
          t={t}
          solPrice={solPrice}
        />
      </div>

      {/* Mobile: availability bar */}
      {!isWS && (
        <div className="lg:hidden card p-3">
          <div className="text-xs opacity-70 mb-2">{t('nft.availability')}</div>
          <SalesBar
            t={t}
            limited={totalForBar}
            minted={soldForBar}
            progressColor={progressColor}
          />
        </div>
      )}

      {/* Mobile: features card */}
      <div className="block lg:hidden">
        <DetailsCard t={t} title={title} blurb={blurb} meta={metaForDetails} featureLines={featureLines} solPrice={solPrice} />
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:grid grid-cols-1 md:grid-cols-[minmax(160px,240px)_1fr] gap-6">
        {/* Left: preview + availability */}
        <div className="space-y-3">
          <div
            className="relative w-full max-w-[240px] mx-auto card p-0 overflow-hidden"
            style={{ aspectRatio: '3 / 4' }}
          >
            <Image
              src={`/images/nft/${meta?.image ?? pngNameFor(item.id)}`}
              alt={title}
              fill
              sizes="(max-width: 767px) 90vw, 420px"
              className="object-cover rounded-xl border"
              priority={false}
            />
          </div>

          {!isWS && (
            <div className="mt-3 card p-3">
              <div className="text-xs opacity-70 mb-2">{t('nft.availability')}</div>
              <SalesBar
                t={t}
                limited={totalForBar}
                minted={soldForBar}
                progressColor={progressColor}
              />
            </div>
          )}
        </div>

        {/* Right: description + actions + rights */}
        <div className="space-y-4">
          {/* Desktop features/specs */}
          <div className="hidden lg:block">
            <DetailsCard t={t} title={title} blurb={blurb} meta={metaForDetails} featureLines={featureLines} solPrice={solPrice} />
          </div>

          {/* Purchase (desktop only) */}
          {item.tier !== 'ws' && (
            <div className="card p-4 md:p-5 flex flex-wrap items-end gap-3 hidden lg:flex">
              {/* Desktop: design selector ONLY for Tree/Steel */}
              {item.tier === 'tree' && (meta?.designs ?? item.designs ?? []).length > 0 && (
                <div className="text-sm">
                  <div className="text-xs mb-1">{t('nft.design.select')}</div>
                  <div className="flex flex-col gap-1">
                    {(meta?.designs ?? item.designs ?? []).map((d) => (
                      <label key={d.id} className="inline-flex items-center gap-2">
                        <input
                          type="radio"
                          name="nft-design"
                          checked={design === d.id}
                          onChange={() => setDesign(d.id)}
                        />
                        <span className="text-xs">{d.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Desktop: physical format selector for Silver */}
              {meta?.tier === 'silver' ? (
                <div className="text-sm">
                  <div className="text-xs mb-1">{t('nft.physical.label')}</div>
                  <div className="flex flex-col gap-1">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="physical"
                        checked={withPhysical === true}
                        onChange={() => setWithPhysical(true)}
                      />
                      <span className="text-xs">{t('nft.physical.with')}</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="physical"
                        checked={withPhysical === false}
                        onChange={() => setWithPhysical(false)}
                      />
                      <span className="text-xs">{t('nft.physical.without')}</span>
                    </label>
                  </div>
                </div>
              ) : null}

              <div>
                <label className="label">{t('nft.qty')}</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="input w-24 text-sm"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                />
              </div>

              <div className="flex items-end gap-4">
                <div className="flex flex-col items-start">
                  <div
                    className="text-2xl font-semibold leading-none"
                    style={{ color: "var(--brand-400)" }}
                  >
                    {hasSol
                      ? `${solPrice} SOL`
                      : hasEurMeta && eurFromMeta !== undefined
                      ? `${eurFromMeta.toFixed(0)}€`
                      : ""}
                  </div>
                  {hasSol && hasEurMeta && eurFromMeta !== undefined && (
                    <div className="text-xs opacity-70 mt-1">
                      ≈ {eurFromMeta.toFixed(0)}€ (presale reference)
                    </div>
                  )}
                  <button className="btn btn-outline mt-2" onClick={buy}>
                    {t('nft.buy')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Rights */}
          {rights && (
            <div className="card p-4 md:p-5 space-y-4">
              <div className="text-sm font-medium">{t('nft.rights.title')}</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Claim */}
                <div className="space-y-2">
                  <div className="text-sm">
                    {t('nft.rights.claim_avail')}: <b>{Math.floor(rights.claimAvailVigri).toLocaleString()} VIGRI</b>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button className="btn btn-outline w-full sm:w-auto" onClick={doClaimAll}>
                      {t('nft.rights.claim_all')}
                    </button>
                    {claimMsg && <div className="text-xs">{claimMsg}</div>}
                  </div>
                </div>

                {/* Discount */}
                <div className="space-y-2">
                  <div className="text-sm">
                    {t('nft.rights.discount_avail')}:&nbsp;
                    <b>{cf.format(Math.max(0, rights.discountBudgetEur - rights.discountUsedEur))}</b>
                    &nbsp;· {t('nft.rights.discount_pct')}:&nbsp;
                    <b>{Math.round(rights.discountPctEffective * 100)}%</b>
                    {rights.expiresAt && (
                      <span className="ml-2 opacity-70">
                        ({t('nft.rights.expires_in')}: {daysLeft ?? '∞'} {t('nft.rights.days')})
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="label">{t('nft.rights.discount_enter_eur')}</label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className="input w-36 sm:w-40 text-sm"
                        value={discEur}
                        onChange={(e) => setDiscEur(Math.max(0, Number(e.target.value) || 0))}
                      />
                    </div>

                    <button className="btn btn-outline w-full sm:w-auto" onClick={doDiscount}>
                      {t('nft.rights.discount_buy')}
                    </button>

                    {discMsg && <div className="text-xs">{discMsg}</div>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Explainers */}
      {(meta?.explainers?.length ?? 0) > 0 && (
        <div className="card p-4 md:p-5 space-y-3">
          <div className="text-sm font-medium">{t('nft.explainers.title')}</div>
          <div className="space-y-3">
            {(meta?.explainers ?? []).map((ex: { titleKey: string; textKey: string }) => (
              <div key={ex.titleKey}>
                <div className="text-sm font-semibold">{t(ex.titleKey)}</div>
                <div className="text-sm opacity-80 mt-1">
                  <ExplainerText text={t(ex.textKey)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
