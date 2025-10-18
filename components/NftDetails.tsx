'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'founding';
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
type RightsResp = { ok: boolean; items: Rights[]; tgePriceEur: number };

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
    // 1) Данные NFT
    const r = await fetch('/api/nft', { cache: 'no-store' });
    const j = await r.json();
    if (r.ok && j.ok) {
      const found = (j.items as Item[]).find((i: Item) => i.id === id) || null;
      setItem(found);
      if (found?.designs?.length && found.id !== 'nft-founding-20') {
        setDesign(found.designs[0].id);
      }
      if (found?.userActivation && found.userActivation !== 'fixed') {
        setAct(found.userActivation);
      }
    }
    // 2) Права
    const rr = await fetch('/api/nft/rights', { cache: 'no-store' });
    const rj: RightsResp = await rr.json();
    if (rr.ok && rj.ok) {
      const mine = rj.items.find((x) => x.id === id) || null;
      setRights(mine);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isFounding = item?.tier === 'founding';
  const isBronzeOrSilver = item?.tier === 'bronze' || item?.tier === 'silver';
  const owned = (item?.ownedQty || 0) > 0;
  const cf = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }),
    []
  );

  // Покупка NFT (mock)
  const buy = async () => {
    if (!item) return;
    const payload: any = { id: item.id, qty: isFounding ? 1 : qty };
    if (design) payload.designId = design;
    if (isBronzeOrSilver) payload.activation = act;

    const r = await fetch('/api/nft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) return;
    await loadAll();
  };

  // --- Claim (mock)
  const doClaimAll = async () => {
    setClaimMsg(null);
    const r = await fetch('/api/nft/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) {
      setClaimMsg(j?.error || t('nft.msg.failed'));
      return;
    }
    setClaimMsg(`${t('nft.claim.ok')} +${Math.round(j.vigriClaimed).toLocaleString()} VIGRI`);
    await loadAll();
  };

  // --- Discount (mock)
  const doDiscount = async () => {
    setDiscMsg(null);
    const r = await fetch('/api/nft/discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, eurAmount: discEur }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) {
      setDiscMsg(j?.error || t('nft.msg.failed'));
      return;
    }
    setDiscMsg(
      `${t('nft.discount.ok')} +${Math.round(j.vigriBought).toLocaleString()} VIGRI @ ${cf.format(
        j.unitEur
      )}`
    );
    await loadAll();
  };

  // Таймер (дни до истечения скидки)
  const daysLeft = useMemo(() => {
    if (!rights?.expiresAt) return null;
    const diff = new Date(rights.expiresAt).getTime() - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (24 * 60 * 60 * 1000));
  }, [rights?.expiresAt]);

  if (!item) {
    return (
      <div className="space-y-2">
        <Link href="/dashboard/nft" className="underline text-sm">
          {t('nft.details.back')}
        </Link>
        <div className="text-sm opacity-70">Not found.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link href="/dashboard/nft" className="underline text-sm">
        {t('nft.details.back')}
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(260px,420px)_1fr] gap-6">
        {/* Левая колонка: превью + миниатюры */}
        <div className="space-y-3">
          <div className="relative w-full" style={{ aspectRatio: '3 / 4' }}>
            <div className="absolute inset-0 rounded-xl border flex items-center justify-center text-sm opacity-70">
              3:4 Preview
            </div>
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
                    disabled={isFounding || item.tier === 'bronze'}
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

        {/* Правая колонка: описание + покупка + права */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-semibold">{item.name}</h1>
            <p className="text-sm opacity-70">{item.blurb}</p>
          </div>

          {/* Покупка/минт (мок) */}
          {!isFounding && (
            <div className="flex flex-wrap items-end gap-3">
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
                <label className="block text-xs mb-1">{t('nft.qty')}</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="border rounded-md p-2 w-24 text-sm"
                  value={qty}
                  onChange={(e) =>
                    setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))
                  }
                />
              </div>
              <button
                className="rounded-xl px-3 py-2 text-sm bg-brand-100 border border-brand-200 text-brand hover:bg-brand-200 whitespace-nowrap"
                onClick={buy}
              >
                {t('nft.buy')}
              </button>
            </div>
          )}

          {isFounding && (
            <button
              className="rounded-xl px-3 py-2 text-sm bg-brand-100 border border-brand-200 text-brand hover:bg-brand-200 disabled:opacity-50"
              disabled={!item.invited || owned}
            >
              {owned ? t('nft.owned_btn') : item.invited ? t('nft.claim') : t('nft.invite_only')}
            </button>
          )}

          {/* ---- Права: Claim / Discount ---- */}
          {rights && (
            <div className="rounded-xl border p-4 md:p-5 space-y-4">
              <div className="text-sm font-medium">{t('nft.rights.title')}</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Claim */}
                <div className="space-y-2">
                  <div className="text-sm">
                    {t('nft.rights.claim_avail')}:{' '}
                    <b>{Math.floor(rights.claimAvailVigri).toLocaleString()} VIGRI</b>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      className="rounded-xl px-3 py-2 text-sm border bg-brand-100 border-brand-200 text-brand hover:bg-brand-200 whitespace-nowrap w-full sm:w-auto"
                      onClick={doClaimAll}
                    >
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
                      {cf.format(
                        Math.max(0, rights.discountBudgetEur - rights.discountUsedEur)
                      )}
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
                      <label className="block text-xs mb-1">
                        {t('nft.rights.discount_enter_eur')}
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="1"
                        className="border rounded-md p-2 w-36 sm:w-40 text-sm"
                        value={discEur}
                        onChange={(e) => setDiscEur(Math.max(0, Number(e.target.value) || 0))}
                      />
                    </div>

                    <button
                      className="rounded-xl px-3 py-2 text-sm border bg-brand-100 border-brand-200 text-brand hover:bg-brand-200 whitespace-nowrap w-full sm:w-auto"
                      onClick={doDiscount}
                    >
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
