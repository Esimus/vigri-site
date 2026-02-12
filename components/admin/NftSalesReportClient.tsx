// components/admin/NftSalesReportClient.tsx
"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";

type NftEvent = {
  id: string;
  createdAt: string; // ISO string
  tierId: number;
  tierCode: string | null;
  quantity: number;
  paidSol: number;
  wallet: string;
  txSignature: string;
};

type ApiOk = {
  ok: true;
  totalAllTimeSol: number;
  totalRangeSol: number;
  events: NftEvent[];
};

type ApiError = {
  ok: false;
  error?: string;
};

type ApiResponse = ApiOk | ApiError;

const TIER_LABELS: Record<number, string> = {
  0: "Tree/Steel",
  1: "Bronze",
  2: "Silver",
  3: "Gold",
  4: "Platinum",
  5: "WS-20",
};

function formatTier(tierId: number, tierCode: string | null) {
  if (TIER_LABELS[tierId] !== undefined) return TIER_LABELS[tierId];
  if (tierCode) return tierCode;
  return `Tier ${tierId}`;
}

function formatDateLabelFromString(value: string) {
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return value;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}.${month}.${year}`;
}

// dd.MM.yyyy HH:mm for table (local time)
function formatDateTimeFromIso(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function computeDefaultRange() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const nextMonth = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
  const end = new Date(nextMonth.getTime() - 24 * 60 * 60 * 1000);

  const toInput = (d: Date) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  return { start: toInput(start), end: toInput(end) };
}

export default function NftSalesReportClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<ApiOk | null>(null);
  const [initialized, setInitialized] = React.useState(false);

  // Sync URL -> state and fetch data
  React.useEffect(() => {
    const urlStart = searchParams.get("start");
    const urlEnd = searchParams.get("end");

    if (!urlStart || !urlEnd) {
      if (initialized) return;
      const def = computeDefaultRange();
      const params = new URLSearchParams(searchParams.toString());
      params.set("start", def.start);
      params.set("end", def.end);
      router.replace(`/admin/reports?${params.toString()}`, { scroll: false });
      setStart(def.start);
      setEnd(def.end);
      setInitialized(true);
      return;
    }

    setStart(urlStart);
    setEnd(urlEnd);
    setInitialized(true);

    const controller = new AbortController();

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const startParam = urlStart as string;
            const endParam = urlEnd as string;

            const res = await fetch(
            `/api/admin/nft-sales?start=${encodeURIComponent(
                startParam,
            )}&end=${encodeURIComponent(endParam)}`,
            { signal: controller.signal },
            );
            
        const json: ApiResponse = await res.json();
        if (!json.ok) {
          setError(json.error || "Failed to load data");
          setData(null);
        } else {
          setData(json);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          return;
        }
        setError("Failed to load data");
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    load();

    return () => controller.abort();
  }, [searchParams, router, initialized]);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!start || !end) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("start", start);
    params.set("end", end);
    router.push(`/admin/reports?${params.toString()}`);
  };

  const onReset = () => {
    const def = computeDefaultRange();
    const params = new URLSearchParams(searchParams.toString());
    params.set("start", def.start);
    params.set("end", def.end);
    router.push(`/admin/reports?${params.toString()}`);
  };

  const periodLabel =
    start && end
      ? `${formatDateLabelFromString(start)} – ${formatDateLabelFromString(
          end,
        )}`
      : "";

  const totalAllTimeSol = data?.totalAllTimeSol ?? 0;
  const totalRangeSol = data?.totalRangeSol ?? 0;
  const events = data?.events ?? [];

  return (
    <>
      <p className="text-sm text-slate-400 mb-2">
        Source of truth: NftMintEvent records on mainnet with paidSol &gt; 0.
      </p>

      <form
        onSubmit={onSubmit}
        className="mb-4 flex flex-wrap items-end gap-3 text-sm"
      >
        <div className="flex flex-col">
          <label htmlFor="start" className="mb-1 text-xs text-slate-400">
            Start date
          </label>
          <input
            id="start"
            name="start"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="input font-mono"
            placeholder="YYYY-MM-DD"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="end" className="mb-1 text-xs text-slate-400">
            End date
          </label>
          <input
            id="end"
            name="end"
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="input font-mono"
            placeholder="YYYY-MM-DD"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-emerald-500 px-3 py-1 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          disabled={!start || !end || loading}
        >
          Apply
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-slate-600 px-3 py-1 text-sm hover:bg-slate-800"
        >
          Reset
        </button>
        <div className="text-xs text-slate-500">
          Current period:{" "}
          <span className="font-mono">
            {periodLabel || "not selected"}
          </span>
        </div>
      </form>

      {loading && (
        <div className="mb-2 text-xs text-slate-400">Loading data…</div>
      )}
      {error && (
        <div className="mb-2 text-xs text-red-400">
          Error loading data: {error}
        </div>
      )}

      <div className="mb-2 text-sm">
        <span className="font-medium">Total SOL for period: </span>
        {totalRangeSol.toFixed(4)} SOL
      </div>
      <div className="mb-4 text-xs text-slate-500">
        All time total: {totalAllTimeSol.toFixed(4)} SOL
      </div>

      <div className="border border-slate-800 rounded-lg overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-900/60">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Date</th>
              <th className="px-3 py-2 text-left font-semibold">Tier</th>
              <th className="px-3 py-2 text-right font-semibold">Quantity</th>
              <th className="px-3 py-2 text-right font-semibold">Paid SOL</th>
              <th className="px-3 py-2 text-left font-semibold">Buyer wallet</th>
              <th className="px-3 py-2 text-left font-semibold">Tx</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-center text-slate-500" colSpan={6}>
                  No NFT sales recorded for this period.
                </td>
              </tr>
            ) : (
              events.map((ev) => (
                <tr key={ev.id} className="border-t border-slate-800">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatDateTimeFromIso(ev.createdAt)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatTier(ev.tierId, ev.tierCode)}
                  </td>
                  <td className="px-3 py-2 text-right">{ev.quantity}</td>
                  <td className="px-3 py-2 text-right">
                    {ev.paidSol.toFixed(4)}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px]">
                    {ev.wallet}
                  </td>
                  <td className="px-3 py-2">
                    <a
                      href={`https://solscan.io/tx/${ev.txSignature}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 hover:underline text-[11px]"
                    >
                      {ev.txSignature.slice(0, 8)}…
                      {ev.txSignature.slice(-8)}
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
