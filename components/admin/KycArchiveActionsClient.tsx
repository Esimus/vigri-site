// components/admin/KycArchiveActionsClient.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";

export function KycArchiveActionsClient(props: { archiveId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  const restore = async () => {
    const ok = window.confirm("Restore this archived KYC snapshot back to current KYC?");
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch("/api/admin/kyc/archive/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archiveId: props.archiveId }),
      });

      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) {
        alert(`Restore failed: ${json?.error || res.statusText}`);
        return;
      }

      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    const ok = window.confirm("Delete this archived snapshot? This cannot be undone.");
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch("/api/admin/kyc/archive/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archiveId: props.archiveId }),
      });

      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) {
        alert(`Delete failed: ${json?.error || res.statusText}`);
        return;
      }

      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="rounded-md border border-slate-300 px-2 py-1 text-[11px] hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-900/30"
        onClick={restore}
        disabled={busy}
      >
        Restore
      </button>

      <button
        type="button"
        className="rounded-md border border-red-300 px-2 py-1 text-[11px] text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-700/60 dark:text-red-300 dark:hover:bg-red-900/20"
        onClick={del}
        disabled={busy}
      >
        Delete
      </button>
    </div>
  );
}