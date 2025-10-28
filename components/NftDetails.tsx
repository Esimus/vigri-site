// components/NftDetails.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useI18n } from '@/hooks/useI18n';

type Design = { id: string; label: string; rarity?: number };
type Item = {
  id: string;
  name: string;
  blurb: string;
  eurPrice: number;
  vigriPrice: number;
  kycRequired?: boolean;
  limited?: number;
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

// Maps NFT ids to preview PNG names from /public/images/nft/
function pngNameFor(id: string): string {
  switch (id) {
    case 'nft-tree-steel':
      return '1_mb_wood_stell.png';
    case 'nft-bronze':
      return '2_mb_bronze.png';
    case 'nft-silver':
      return '3_mb_silver.png';
    case 'nft-gold':
      return '4_mb_gold.png';
    case 'nft-platinum':
      return '5_mb_platinum.png';
    case 'nft-ws-20':
      return '6_mb_ws.png';
    default:
      return '6_mb_ws.png';
  }
}

type BuyPayload = {
  id: string;
  qty: number;
  designId?: string;
  activation?: 'claim100' | 'split50' | 'discount100';
};

export default function NftDetails({ id }: { id: string }) {
  const { t } = useI18n();

  const [item, setItem] = useState<Item | null>(null);
  const [design, setDesign] = useState<string | null>(null);
  const [qty, setQty] = useState<number>(1);
  const [act, setAct] = useState<'claim100' | 'split50' | 'discount100'>('discount100');

  const [rights, setRights] = useState<Rights | null>(null);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);
  const [discMsg, setDiscMsg] = useState<string | null>(null);
  const [discEur, setDiscEur] = useState<number>(0);

  async function loadAll() {
    // 1) NFT data
    const r = await fetch('/api/nft', { cache: 'no-store' });
    const j: unknown = await r.json().catch(() => ({}));
    if (r.ok && isNftListResp(j)) {
      const items = j.items;
      const found = items.find((i) => i.id === id) || null;
      setItem(found);
      if (found?.designs?.length && found.id !== 'nft-ws-20') {
        const firstId = found.designs[0]?.id ?? found.id;
        setDesign(firstId);
      }
      if (found?.userActivation && found.userActivation !== 'fixed') {
        setAct(found.userActivation);
      }
    }

    // 2) Rights — current endpoint returns { ok, items, ... }.
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

  const isWS = item?.tier === 'ws';
  const isBronzeOrSilver = item?.tier === 'bronze' || item?.tier === 'silver';
  const owned = (item?.ownedQty || 0) > 0;
  const cf = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }),
    []
  );

  // Purchase (mock)
  const buy = async () => {
    if (!item) return;
    const payload: BuyPayload = { id: item.id, qty: isWS ? 1 : qty };
    if (design) payload.designId = design;
    if (isBronzeOrSilver) payload.activation = act;

    const r = await fetch('/api/nft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j: unknown = await r.json().catch(() => ({}));
    if (!r.ok || !isObject(j) || j.ok !== true) return;
    await loadAll();
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
      const msg =
        isObject(j) && typeof j.error === 'string' ? j.error : t('nft.msg.failed');
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
      const msg =
        isObject(j) && typeof j.error === 'string' ? j.error : t('nft.msg.failed');
      setDiscMsg(msg);
      return;
    }
    setDiscMsg(
      `${t('nft.discount.ok')} +${Math.round(j.vigriBought).toLocaleString()} VIGRI @ ${cf.format(
        j.unitEur
      )}`
    );
    await loadAll();
  };

  // Timer (days to expiry)
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

  return (
    <div className="space-y-4">
      <Link href="/dashboard/nft" className="link-accent text-sm">
        {t('nft.details.back')}
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(260px,420px)_1fr] gap-6">
        {/* Left: preview + thumbnails */}
        <div className="space-y-3">
          <div className="relative w-full card p-0 overflow-hidden" style={{ aspectRatio: '3 / 4' }}>
            <Image
              src={`/images/nft/${pngNameFor(item.id)}`}
              alt={item.name}
              fill
              sizes="(max-width: 767px) 90vw, 420px"
              className="object-cover rounded-xl border"
              priority={false}
            />
          </div>

          {item.designs && item.designs.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {item.designs.map((d) => {
                const selected = d.id === design;
                const ownedCount = item.ownedDesigns?.[d.id] || 0;
                return (
                  <button
                    key={d.id}
                    type="button"
                    disabled={isWS || item.tier === 'bronze'}
                    onClick={() => setDesign(d.id)}
                    className={[
                      'relative w-full rounded-lg border text-[10px] opacity-80',
                      selected ? 'border-brand-200 ring-2 ring-brand-200' : '',
                      'hover:opacity-100',
                    ].join(' ')}
                    style={{ aspectRatio: '3 / 4' }}
                    title={d.label}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">Design</div>
                    <div className="absolute left-1 bottom-1 text-[10px]">{d.label}</div>
                    {ownedCount > 0 && (
                      <div className="absolute right-1 top-1 text-[10px] bg-black/70 text-white px-1 rounded">
                        ×{ownedCount}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: description + actions + rights */}
        <div className="space-y-4">
          <div className="card p-4 md:p-5 space-y-2">
            <h1 className="text-xl font-semibold">{item.name}</h1>
            <p className="text-sm opacity-70">{item.blurb}</p>

            {/* Meta chips */}
            <div className="flex flex-wrap gap-2 text-xs opacity-90">
              {item.limited && <span className="chip">{t('nft.limited')}: {item.limited}</span>}
              {item.kycRequired && <span className="chip">{t('nft.kyc')}</span>}
              {item.vesting && <span className="chip">{t('nft.vesting')}: {item.vesting}</span>}
            </div>
          </div>

          {/* Purchase (mock) */}
          {!isWS && (
            <div className="card p-4 md:p-5 flex flex-wrap items-end gap-3">
              {item.tier !== 'bronze' && (
                <div className="text-sm">
                  <div className="text-xs mb-1">{t('nft.design.select')}</div>
                  <div className="text-xs opacity-70">
                    {t('nft.design.selected')}: <b>{design}</b>
                  </div>
                </div>
              )}
              {item.activationType === 'flex' && (
                <div className="text-sm">
                  <div className="text-xs mb-1">{t('nft.activation.title')}</div>
                  <div className="flex flex-col gap-1">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="act"
                        checked={act === 'claim100'}
                        onChange={() => setAct('claim100')}
                      />{' '}
                      {t('nft.activation.claim100')}
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="act"
                        checked={act === 'split50'}
                        onChange={() => setAct('split50')}
                      />{' '}
                      {t('nft.activation.split50')}
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="act"
                        checked={act === 'discount100'}
                        onChange={() => setAct('discount100')}
                      />{' '}
                      {t('nft.activation.discount100')}
                    </label>
                  </div>
                </div>
              )}
              <div>
                <label className="label">{t('nft.qty')}</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="input w-24 text-sm"
                  value={qty}
                  onChange={(e) =>
                    setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))
                  }
                />
              </div>
              <button className="btn btn-outline" onClick={buy}>
                {t('nft.buy')}
              </button>
            </div>
          )}

          {isWS && (
            <div className="card p-4 md:p-5">
              <button
                className="btn btn-outline disabled:opacity-50"
                disabled={!item.invited || owned}
              >
                {owned ? t('nft.owned_btn') : item.invited ? t('nft.claim') : t('nft.invite_only')}
              </button>
            </div>
          )}

          {/* Rights block — show only if detailed rights exist */}
          {rights && (
            <div className="card p-4 md:p-5 space-y-4">
              <div className="text-sm font-medium">{t('nft.rights.title')}</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Claim */}
                <div className="space-y-2">
                  <div className="text-sm">
                    {t('nft.rights.claim_avail')}:{' '}
                    <b>{Math.floor(rights.claimAvailVigri).toLocaleString()} VIGRI</b>
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
                    <b>
                      {cf.format(Math.max(0, rights.discountBudgetEur - rights.discountUsedEur))}
                    </b>
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
    </div>
  );
}
