// app/dashboard/assets/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { usePhantomWallet } from '@/hooks/usePhantomWallet';

type Position = {
  symbol: string;
  name: string;
  amount: number;
  priceEUR: number;
  valueEUR: number;
};

type HistoryEntry = {
  id: string;
  ts: number;
  type: string;
  symbol: string;
  amount: number;
  unitPriceSol: number;
  txSignature?: string;
};

type NftPortfolioItem = {
  tierId: string;          // e.g. "tree_steel", "bronze", ...
  label: string;           // human-readable name for UI, e.g. "Tree / Steel"
  count: number;           // how many NFTs of this tier the user owns
  paidSol: number;         // total SOL spent for this tier (all NFTs)
  currentPriceSol: number; // current price of 1 NFT of this tier in SOL
  currentValueSol: number; // current portfolio value for this tier in SOL
};

type GetResp = {
  ok: boolean;
  positions: Position[];
  totalValueEUR: number;
  nftPortfolio: NftPortfolioItem[];
  history: HistoryEntry[];
};

function summarizeNftPortfolio(items?: NftPortfolioItem[]) {
  if (!items || !items.length) {
    return { count: 0, valueSol: 0 };
  }

  return items.reduce(
    (acc, item) => ({
      count: acc.count + item.count,
      valueSol: acc.valueSol + item.currentValueSol,
    }),
    { count: 0, valueSol: 0 }
  );
}

export default function AssetsPage() {
  const { t } = useI18n();
  const [data, setData] = useState<GetResp | null>(null);
  const totals = summarizeNftPortfolio(data?.nftPortfolio);
  const { address } = usePhantomWallet();

  // Psychological trigger for future VIGRI purchase
  const [buyAmount, setBuyAmount] = useState<number>(1000);
  const [msg, setMsg] = useState<string | null>(null);

  const ACTIVITY_KEYS: Record<string, string> = {
    buy_vigri: 'activity.buy_vigri',
    sell_vigri: 'activity.sell_vigri',
    deposit: 'activity.deposit',
    withdraw: 'activity.withdraw',
    buy_nft: 'activity.buy_nft',
    reward: 'activity.reward',
  };

  const ACTIVITY_ICONS: Record<string, string> = {
    buy_vigri: '🟢',
    sell_vigri: '🔴',
    deposit: '⬇️',
    withdraw: '⬆️',
    buy_nft: '🧾',
    reward: '🎁',
  };

  const activityLabel = (type: string) => {
    const key = ACTIVITY_KEYS[type] ?? 'activity.unknown';
    const v = t(key);
    return v === key ? type : v; // fallback to raw type if no key
  };
  const activityIcon = (type: string) => ACTIVITY_ICONS[type] ?? '•';

  const cf = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
      }),
    []
  );

  const load = async (wallet: string) => {
    const params = new URLSearchParams({
      wallet,
      network: 'devnet',
    });

    const r = await fetch(`/api/assets?${params.toString()}`, {
      cache: 'no-store',
    });
    const j: GetResp = await r.json();
    if (r.ok && j.ok) setData(j);
  };

  useEffect(() => {
    if (!address) {
      setData(null);
      return;
    }
    void load(address);
  }, [address]);

  // Just show info message for now, no API calls
  const buy = () => {
    setMsg(
      t('assets.buy.comingSoon') ||
        'VIGRI token purchase on the platform will be available after TGE.'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{t('assets.title')}</h1>
      </div>

      {/* VIGRI purchase block with psychological trigger + "coming soon" */}
      <div className="card p-4 space-y-3">
        <div className="text-sm font-medium">
          {t('assets.buy.title')}
        </div>

        <p className="text-xs text-zinc-600">
          {t('assets.buy.subtitle')}
        </p>

        <div className="flex flex-wrap items-end gap-3 mt-2">
          <div>
            <label className="block text-xs mb-1">
              {t('assets.buy.amount')}
            </label>
            <input
              type="number"
              min={1}
              step={1}
              className="input w-32 text-sm"
              value={buyAmount}
              onChange={(e) =>
                setBuyAmount(
                  Math.max(1, Math.floor(Number(e.target.value) || 1))
                )
              }
            />
          </div>

          <button
            type="button"
            onClick={buy}
            className="btn btn-outline text-sm"
          >
            {t('assets.buy.btn')}
          </button>

          {msg && (
            <div className="text-xs text-zinc-600">
              {msg}
            </div>
          )}
        </div>
      </div>

      {/* NFT portfolio */}
      <div className="card overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <div className="text-sm font-medium">
            {t('assets.nft.title')}
          </div>
        </div>

        {data?.nftPortfolio && data.nftPortfolio.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="text-left px-4 py-2 w-40 text-xs font-medium text-zinc-600">
                      {t('assets.nft.type')}
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-zinc-600">
                      {t('assets.nft.count')}
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-zinc-600">
                      {t('assets.nft.paidSol')}
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-zinc-600">
                      {t('assets.nft.priceSol')}
                      <sup
                        className="ml-1 cursor-help opacity-70 text-[10px]"
                        title={
                          t('assets.nft.priceSol_hint') ??
                          'Price of one NFT of this tier at the current presale stage.'
                        }
                      >
                        ?
                      </sup>
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-zinc-600">
                      {t('assets.nft.valueSol')}
                      <sup
                        className="ml-1 cursor-help opacity-70 text-[10px]"
                        title={
                          t('assets.nft.valueSol_hint') ??
                          'Current value of all your NFTs of this tier: quantity × current price.'
                        }
                      >
                        ?
                      </sup>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data.nftPortfolio.map((item) => (
                    <tr key={item.tierId} className="border-t border-zinc-200">
                      <td className="px-4 py-2 text-zinc-700">
                        <div className="font-medium">{item.label}</div>
                      </td>
                      <td className="px-4 py-2 text-zinc-700">
                        {item.count.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-zinc-700">
                        {item.paidSol.toLocaleString('en-US', {
                          maximumFractionDigits: 4,
                        })}{' '}
                        SOL
                      </td>
                      <td className="px-4 py-2 text-zinc-700">
                        {item.currentPriceSol.toLocaleString('en-US', {
                          maximumFractionDigits: 4,
                        })}{' '}
                        SOL
                      </td>
                      <td className="px-4 py-2 text-zinc-700">
                        {item.currentValueSol.toLocaleString('en-US', {
                          maximumFractionDigits: 4,
                        })}{' '}
                        SOL
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr className="border-t border-zinc-200 bg-zinc-50">
                    <td className="px-4 py-2 text-sm font-medium">
                      {t('assets.total') ?? 'Total NFT portfolio:'}{' '}
                    </td>
                    <td className="px-4 py-2">{totals.count.toLocaleString()} NFT</td>
                    <td colSpan={2}></td>
                    <td className="px-4 py-2 text-sm font-semibold">
                      {totals.valueSol.toLocaleString('en-US', {
                        maximumFractionDigits: 4,
                      })}{' '}
                      SOL
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
        ) : (
          <p className="text-xs text-zinc-600">
            {t('assets.nft.empty')}
          </p>
        )}
      </div>

      {/* Token positions table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="text-left px-4 py-2 w-40 text-xs font-medium text-zinc-600">
                {t('assets.symbol')}
              </th>
              <th className="text-left px-4 py-2 text-xs font-medium text-zinc-600">
                {t('assets.amount')}
              </th>
              <th className="text-left px-4 py-2 text-xs font-medium text-zinc-600">
                {t('assets.price')}
              </th>
              <th className="text-left px-4 py-2 text-xs font-medium text-zinc-600">
                {t('assets.value')}
              </th>
            </tr>
          </thead>
          <tbody>
            {data?.positions?.map((p) => (
              <tr key={p.symbol} className="border-t border-zinc-200">
                <td className="px-4 py-2 text-zinc-700">
                  <div className="font-medium">{p.symbol}</div>
                  <div className="text-xs opacity-70">{p.name}</div>
                </td>
                <td className="px-4 py-2 text-zinc-700">
                  {p.amount.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-zinc-700">
                  {cf.format(p.priceEUR)}
                </td>
                <td className="px-4 py-2 text-zinc-700">
                  {cf.format(p.valueEUR)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-200 bg-zinc-50">
              <td
                className="px-4 py-2 text-right font-medium"
                colSpan={3}
              >
                {t('assets.total')}
              </td>
              <td className="px-4 py-2 font-semibold">
                {cf.format(data?.totalValueEUR || 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* History */}
      <div className="card p-4">
        <div className="text-sm font-medium mb-2">
          {t('assets.history')}
        </div>
        {data?.history?.length ? (
          <ul className="text-sm">
            {data.history.slice(0, 10).map((h) => (
              <li
                key={h.id}
                className="flex items-start justify-between gap-3 border-t first:border-t-0 border-zinc-200 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      aria-hidden
                      className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium"
                    >
                      {activityIcon(h.type)}{' '}
                      <span className="ml-1">
                        {activityLabel(h.type)}
                      </span>
                    </span>

                    <span className="truncate text-xs text-zinc-500">
                      {h.symbol}{' '}
                      {h.amount > 0 ? `+${h.amount}` : h.amount}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-500">
                    {new Date(h.ts).toLocaleString()}
                  </div>

                  {h.txSignature && (
                    <div className="mt-0.5 text-xs">
                      <a
                        href={`https://solscan.io/tx/${h.txSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline opacity-70 hover:opacity-100"
                      >
                        Tx on Solscan
                      </a>
                    </div>
                  )}
                </div>

                <div className="whitespace-nowrap text-sm font-mono text-emerald-500">
                  {h.unitPriceSol.toLocaleString('en-US', {
                    maximumFractionDigits: 4,
                  })}{' '}
                  SOL
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm opacity-70">
            {t('overview.no_activity')}
          </div>
        )}
      </div>
    </div>
  );
}
