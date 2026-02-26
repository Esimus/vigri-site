// components/admin/UserKycActionsClient.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";

type KycStatus = "none" | "pending" | "approved" | "rejected";

export function UserKycActionsClient(props: {
  userId: string;
  initialStatus: KycStatus;
  initialNote: string | null;
}) {
  const router = useRouter();
  const [note, setNote] = React.useState(props.initialNote ?? "");
  const [busy, setBusy] = React.useState(false);

  const postDecision = async (status: KycStatus) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/kyc/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: props.userId, status, note }),
      });

      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) {
        alert(`KYC update failed: ${json?.error || res.statusText}`);
        return;
      }

      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const resetKyc = async () => {
    const ok = window.confirm("Reset KYC for this user? (passport fields + document image will be cleared)");
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch("/api/admin/kyc/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: props.userId }),
      });

      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) {
        alert(`Reset failed: ${json?.error || res.statusText}`);
        return;
      }

      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <div>
        <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">KYC note</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
          placeholder="Internal note for reviewer"
          disabled={busy}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md bg-emerald-500 px-3 py-1 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          onClick={() => postDecision("approved")}
          disabled={busy}
        >
          Approve
        </button>

        <button
          type="button"
          className="rounded-md bg-amber-400 px-3 py-1 text-sm font-medium text-slate-950 hover:bg-amber-300 disabled:opacity-60"
          onClick={() => postDecision("rejected")}
          disabled={busy}
        >
          Reject
        </button>

        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-900/30"
          onClick={() => postDecision("pending")}
          disabled={busy}
        >
          Set pending
        </button>

        <button
          type="button"
          className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-700/60 dark:text-red-300 dark:hover:bg-red-900/20"
          onClick={resetKyc}
          disabled={busy}
        >
          Reset KYC
        </button>
      </div>
    </div>
  );
}