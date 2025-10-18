'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/hooks/useI18n';

type Position = { symbol: string; name: string; amount: number; priceEUR: number; valueEUR: number };
type GetResp = { ok: boolean; positions: Position[]; totalValueEUR: number; history: any[] };
type PostResp = GetResp & { error?: string };

export default function AssetsPage() {
  const { t } = useI18n();
  const [data, setData] = useState<GetResp | null>(null);
  const [buyAmount, setBuyAmount] = useState<number>(1000);
  const [msg, setMsg] = useState<string | null>(null);
  const ACTIVITY_KEYS: Record<string, string> = {
  buy_vigri: 'activity.buy_vigri',
  sell_vigri: 'activity.sell_vigri',
  deposit:   'activity.deposit',
  withdraw:  'activity.withdraw',
  buy_nft:   'activity.buy_nft',
  reward:    'activity.reward',
};

const ACTIVITY_ICONS: Record<string, string> = {
  buy_vigri: '🟢',
  sell_vigri:'🔴',
  deposit:   '⬇️',
  withdraw:  '⬆️',
  buy_nft:   '🧾',
  reward:    '🎁',
};

const activityLabel = (type: string) => {
  const key = ACTIVITY_KEYS[type] ?? 'activity.unknown';
  const v = t(key);
  return v === key ? type : v; // fallback to raw type if no key
};
const activityIcon = (type: string) => ACTIVITY_ICONS[type] ?? '•';


  const cf = useMemo(() => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }), []);

  const load = async () => {
    const r = await fetch('/api/assets', { cache: 'no-store' });
    const j: GetResp = await r.json();
    if (r.ok && j.ok) setData(j);
  };
  useEffect(() => { load(); }, []);

  const buy = async () => {
    setMsg(null);
    const r = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'buy_vigri', amount: buyAmount }),
    });
    const j: PostResp = await r.json();
    if (!r.ok || !j.ok) { setMsg(j.error || t('assets.msg.fail')); return; }
    setData(j);
    setMsg(t('assets.msg.ok'));
  };

  const reset = async () => {
    const r = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' }),
    });
    const j: PostResp = await r.json();
    if (r.ok && j.ok) setData(j);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{t('assets.title')}</h1>
        <button className="rounded-xl border px-3 py-1 text-sm" onClick={reset}>
          {t('assets.reset')}
        </button>
      </div>

      {/* Buy block */}
      <div className="rounded-xl border p-4 space-y-3">
        <div className="text-sm font-medium">{t('assets.buy.title')}</div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs mb-1">{t('assets.buy.amount')}</label>
            <input
              type="number"
              min={1}
              step={1}
              className="border rounded-md p-2 w-32 text-sm"
              value={buyAmount}
              onChange={(e) => setBuyAmount(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
            />
          </div>
          <button
            className="rounded-xl px-3 py-2 text-sm bg-brand-100 border border-brand-200 text-brand hover:bg-brand-200 whitespace-nowrap"
            onClick={buy}
          >
            {t('assets.buy.btn')}
          </button>
          {msg && <div className="text-sm">{msg}</div>}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="text-left px-4 py-2 w-40">{t('assets.symbol')}</th>
              <th className="text-left px-4 py-2">{t('assets.amount')}</th>
              <th className="text-left px-4 py-2">{t('assets.price')}</th>
              <th className="text-left px-4 py-2">{t('assets.value')}</th>
            </tr>
          </thead>
          <tbody>
            {data?.positions?.map((p) => (
              <tr key={p.symbol} className="border-t">
                <td className="px-4 py-2">
                  <div className="font-medium">{p.symbol}</div>
                  <div className="text-xs opacity-70">{p.name}</div>
                </td>
                <td className="px-4 py-2">{p.amount.toLocaleString()}</td>
                <td className="px-4 py-2">{cf.format(p.priceEUR)}</td>
                <td className="px-4 py-2">{cf.format(p.valueEUR)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-zinc-50">
              <td className="px-4 py-2 text-right font-medium" colSpan={3}>{t('assets.total')}</td>
              <td className="px-4 py-2 font-semibold">{cf.format(data?.totalValueEUR || 0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* History */}
      <div className="rounded-xl border p-4">
        <div className="text-sm font-medium mb-2">{t('assets.history')}</div>
        {data?.history?.length ? (
          <ul className="text-sm space-y-1">
            {data.history.slice(0, 10).map((h: any) => (
              <li key={h.id} className="flex items-center justify-between">
                <span>{new Date(h.ts).toLocaleString()}</span>
                <span className="opacity-70">
                  <span aria-hidden className="mr-1">{activityIcon(h.type)}</span>
                    {activityLabel(h.type)}
                  </span>
                <span className="font-mono">{h.symbol} {h.amount > 0 ? '+' : ''}{h.amount}</span>
                <span className="opacity-70">{cf.format(h.eurPrice)}/u</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm opacity-70">{t('overview.no_activity')}</div>
        )}
      </div>
    </div>
  );
}
