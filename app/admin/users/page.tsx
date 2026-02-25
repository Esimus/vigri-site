// app/admin/users/page.tsx
"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type KycStatus = "none" | "pending" | "approved" | "rejected";

type ApiUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string; // ISO
  role: string;
  kycStatus: KycStatus;
  kycCountryZone: string | null;
  kycUpdatedAt: string | null; // ISO | null
  hasProfile: boolean;
  profileCompleted: boolean;
  profileName: string | null;
  countryResidence: string | null;
  isikukood: string | null;

  // new columns (will show "—" until API sends them)
  balanceEcho?: number;
  addressCity?: string | null;
  walletShort?: string | null;
};

type ApiOk = {
  ok: true;
  limit: number;
  totals: Record<KycStatus, number>;
  users: ApiUser[];
};

type ApiError = {
  ok: false;
  error?: string;
};

type ApiResponse = ApiOk | ApiError;

function formatDateTimeFromIso(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function statusBadge(status: KycStatus) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border";
  switch (status) {
    case "approved":
      return `${base} border-emerald-700/60 text-emerald-300 bg-emerald-900/20`;
    case "pending":
      return `${base} border-amber-700/60 text-amber-300 bg-amber-900/20`;
    case "rejected":
      return `${base} border-red-700/60 text-red-300 bg-red-900/20`;
    case "none":
    default:
      return `${base} border-slate-700/60 text-slate-300 bg-slate-900/20`;
  }
}

function pillClass(active: boolean) {
  return (
    "rounded-full px-3 py-1 text-xs border " +
    (active
      ? "border-emerald-500/60 text-emerald-200 bg-emerald-900/20"
      : "border-slate-700/60 text-slate-200 hover:bg-slate-900/30")
  );
}

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<KycStatus | "all">("all");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<ApiOk | null>(null);

  // URL -> state + load
  React.useEffect(() => {
    const urlQ = (searchParams.get("q") || "").trim();
    const urlStatus = (searchParams.get("status") || "").trim() as KycStatus;

    setQ(urlQ);

    if (
      urlStatus === "none" ||
      urlStatus === "pending" ||
      urlStatus === "approved" ||
      urlStatus === "rejected"
    ) {
      setStatus(urlStatus);
    } else {
      setStatus("all");
    }

    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("limit", "200");

        if (urlQ) params.set("q", urlQ);
        if (
          urlStatus === "none" ||
          urlStatus === "pending" ||
          urlStatus === "approved" ||
          urlStatus === "rejected"
        ) {
          params.set("status", urlStatus);
        }

        const res = await fetch(`/api/admin/users?${params.toString()}`, {
          signal: controller.signal,
        });

        const json: ApiResponse = await res.json();
        if (!json.ok) {
          setData(null);
          setError(json.error || "Failed to load users");
        } else {
          setData(json);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setData(null);
        setError("Failed to load users");
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [searchParams]);

  const applyParams = (next: { q?: string; status?: KycStatus | "all" }) => {
    const params = new URLSearchParams(searchParams.toString());

    const nextQ = typeof next.q === "string" ? next.q.trim() : q.trim();
    const nextStatus = next.status ?? status;

    if (nextQ) params.set("q", nextQ);
    else params.delete("q");

    if (nextStatus === "all") params.delete("status");
    else params.set("status", nextStatus);

    router.push(`/admin/users?${params.toString()}`);
  };

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    applyParams({ q, status });
  };

  const totals = data?.totals ?? {
    none: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  const totalAll = totals.none + totals.pending + totals.approved + totals.rejected;
  const users = data?.users ?? [];

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Users</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={pillClass(status === "all")}
          onClick={() => applyParams({ status: "all" })}
        >
          All ({totalAll})
        </button>
        <button
          type="button"
          className={pillClass(status === "none")}
          onClick={() => applyParams({ status: "none" })}
        >
          None ({totals.none})
        </button>
        <button
          type="button"
          className={pillClass(status === "pending")}
          onClick={() => applyParams({ status: "pending" })}
        >
          Pending ({totals.pending})
        </button>
        <button
          type="button"
          className={pillClass(status === "approved")}
          onClick={() => applyParams({ status: "approved" })}
        >
          Approved ({totals.approved})
        </button>
        <button
          type="button"
          className={pillClass(status === "rejected")}
          onClick={() => applyParams({ status: "rejected" })}
        >
          Rejected ({totals.rejected})
        </button>
      </div>

      <form onSubmit={onSubmit} className="mb-4 flex flex-wrap items-end gap-3 text-sm">
        <div className="flex flex-col">
          <label htmlFor="q" className="mb-1 text-xs text-slate-400">
            Search by email
          </label>
          <input
            id="q"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input font-mono"
            placeholder="e.g. info@adet.ee"
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-emerald-500 px-3 py-1 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          disabled={loading}
        >
          Apply
        </button>

        <button
          type="button"
          onClick={() => router.push("/admin/users")}
          className="rounded-md border border-slate-600 px-3 py-1 text-sm hover:bg-slate-800"
          disabled={loading}
        >
          Reset
        </button>

        {loading && <div className="text-xs text-slate-400">Loading…</div>}
        {error && <div className="text-xs text-red-400">Error: {error}</div>}
      </form>

      <div className="border border-slate-800 rounded-lg overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-900/60">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">#</th>
              <th className="px-3 py-2 text-left font-semibold">Created</th>
              <th className="px-3 py-2 text-left font-semibold">Email</th>
              <th className="px-3 py-2 text-left font-semibold">Role</th>
              <th className="px-3 py-2 text-left font-semibold">Email verified</th>
              <th className="px-3 py-2 text-left font-semibold">KYC</th>
              <th className="px-3 py-2 text-left font-semibold">KYC updated</th>
              <th className="px-3 py-2 text-left font-semibold">Profile</th>
              <th className="px-3 py-2 text-left font-semibold">Residence</th>
              <th className="px-3 py-2 text-left font-semibold">City</th>
              <th className="px-3 py-2 text-left font-semibold">balanceEcho</th>
              <th className="px-3 py-2 text-left font-semibold">Wallet</th>
              <th className="px-3 py-2 text-left font-semibold">EE ID</th>
              <th className="px-3 py-2 text-left font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-center text-slate-500" colSpan={14}>
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u, idx) => (
                <tr key={u.id} className="border-t border-slate-800">
                  <td className="px-3 py-2 whitespace-nowrap text-slate-400">
                    {idx + 1}
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatDateTimeFromIso(u.createdAt)}
                  </td>

                  <td className="px-3 py-2">
                    <div className="font-mono text-[11px]">{u.email}</div>
                    {u.profileName && (
                      <div className="text-[11px] text-slate-400">
                        {u.profileName}
                      </div>
                    )}
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap">{u.role}</td>

                  <td className="px-3 py-2 whitespace-nowrap">
                    {u.emailVerified ? "Yes" : "No"}
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={statusBadge(u.kycStatus)}>{u.kycStatus}</span>
                    {u.kycCountryZone && (
                      <span className="ml-2 text-[11px] text-slate-400">
                        zone: {u.kycCountryZone}
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatDateTimeFromIso(u.kycUpdatedAt)}
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap">
                    {u.profileCompleted ? "Completed" : u.hasProfile ? "Started" : "—"}
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap">
                    {u.countryResidence ?? "—"}
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap">
                    {u.addressCity ?? "—"}
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px]">
                    {typeof u.balanceEcho === "number" ? u.balanceEcho : "—"}
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px]">
                    {u.walletShort ?? "—"}
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px]">
                    {u.isikukood ?? "—"}
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="inline-flex rounded-md border border-slate-600 px-2 py-1 text-[11px] hover:bg-slate-800"
                    >
                      Edit profile
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Showing up to 200 latest users (newest first).
      </div>
    </div>
  );
}