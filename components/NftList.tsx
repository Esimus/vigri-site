'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';
import Link from 'next/link';

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
  invited?: boolean; // для Founding-20
};

export default function NftList() {
  const { t } = useI18n();
  const [items, setItems] = useState<Item[]>([]);
  const [qty, setQty]   = useState<Record<string, number>>({});
  const [msg, setMsg]   = useState<string | null>(null);

  const load = async () => {
    const r = await api.nft.list();
    if (r.ok) {
      setItems(r.items as Item[]);
      const q: Record<string, number> = {};
      (r.items as Item[]).forEach(i => { q[i.id] = 1; });
      setQty(q);
    }
  };

  useEffect(() => { load(); }, []);

  const buy = async (id: string) => {
    setMsg(null);
    const isFounding = id === 'nft-founding-20';
    const amount = isFounding ? 1 : (qty[id] ?? 1);
    try {
      const r = await api.nft.buy(id, amount);
      if (!r.ok) { setMsg(r.error || t('nft.msg.failed')); return; }
      setItems(prev => prev.map(i => i.id === id ? { ...i, ownedQty: (r as any).qty } : i));
      setMsg(t('nft.msg.done'));
    } catch (e: any) {
      setMsg(e?.message || t('nft.msg.failed'));
    }
  };

  const cf = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {msg ? <div className="text-sm">{msg}</div> : <div />}
        <div className="flex items-center gap-2">
          {/* dev-кнопки — можно убрать позже */}
          <button className="rounded-xl border px-3 py-1 text-xs" onClick={async()=>{await api.nft.invite(true); await load();}}>
            {t('nft.dev.invite_grant')}
          </button>
          <button className="rounded-xl border px-3 py-1 text-xs" onClick={async()=>{await api.nft.invite(false); await load();}}>
            {t('nft.dev.invite_revoke')}
          </button>
          <form action="/api/nft/reset" method="POST">
            <button className="rounded-xl border px-3 py-1 text-xs">{t('nft.reset')}</button>
          </form>
        </div>
      </div>

      <div className="space-y-4">
        {items.map(i => {
          const isFounding = i.id === 'nft-founding-20';
          const owned = (i.ownedQty || 0) > 0;

          return (
            <div key={i.id} className="border rounded-2xl p-4 grid grid-cols-1 md:grid-cols-[minmax(220px,320px)_1fr] gap-4">
              {/* Левая колонка: превью 3:4 */}
              <div className="w-full">
                <div className="relative w-full" style={{ aspectRatio: '3 / 4' }}>
                  <div className="absolute inset-0 rounded-xl border flex items-center justify-center text-sm opacity-70">
                    3:4 Preview
                  </div>
                </div>
              </div>

              {/* Правая колонка: контент */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">{i.name}</div>
                    <div className="text-sm opacity-70">{i.blurb}</div>
                  </div>
                  {owned && <div className="text-xs shrink-0">{t('nft.owned')}: <b>{i.ownedQty}</b></div>}
                </div>

                {/* Цена / статусы */}
                {i.eurPrice > 0 ? (
                  <div className="text-sm">
                    {t('nft.price')}: <b>{cf.format(i.eurPrice)}</b> (~{i.vigriPrice.toLocaleString()} VIGRI)
                  </div>
                ) : (
                  <div className="text-sm opacity-70">{t('nft.invite_only')}</div>
                )}
                <div className="flex flex-wrap gap-3 text-xs opacity-70">
                  {i.vesting && <span>{t('nft.vesting')}: {i.vesting}</span>}
                  {i.kycRequired && <span>{t('nft.kyc')}</span>}
                  {i.limited && <span>{t('nft.limited')}: {i.limited}</span>}
                </div>

                {/* Управление покупкой */}
                {!isFounding && (
                  <div className="flex items-end gap-2">
                    <div>
                      <label className="block text-xs mb-1">{t('nft.qty')}</label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        className="border rounded-md p-2 w-24 text-sm"
                        value={qty[i.id] ?? 1}
                        onChange={(e) => setQty(q => ({ ...q, [i.id]: Math.max(1, Math.floor(Number(e.target.value) || 1)) }))}
                      />
                    </div>
                    <button className="rounded-xl border px-3 py-2 text-sm bg-brand-100 border-brand-200 text-brand hover:bg-brand-200 disabled:opacity-50" onClick={() => buy(i.id)}>
                      {t('nft.buy')}
                    </button>
                  </div>
                )}

                {/* Founding-20: без Qty, активна только по инвайту */}
                {isFounding && (
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-xl border px-3 py-2 text-sm bg-brand-100 border-brand-200 text-brand hover:bg-brand-200 disabled:opacity-50"
                      onClick={() => buy(i.id)}
                      disabled={owned || !i.invited}
                    >
                      {owned ? t('nft.owned_btn') : (i.invited ? t('nft.claim') : t('nft.invite_only'))}
                    </button>
                  </div>
                )}

                {<Link href={`/dashboard/nft/${i.id}`} className="text-sm underline">
                  {t('nft.details')}
                </Link>}
                {/* <Link href={`/dashboard/nft/${i.id}`} className="text-sm underline">{t('nft.details')}</Link> */}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
