// app/admin/support/page.tsx
"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Kind = "club_pilot" | "ambassador" | "faq_question" | "other";
type Status = "new" | "in_review" | "done" | "spam" | "archived";

type ApiItem = {
  id: string;
  kind: Kind;
  status: Status;
  createdAt: string; // ISO
  updatedAt: string; // ISO

  contactName: string | null;
  email: string | null;
  phone: string | null;
  telegram: string | null;
  preferredLang: string | null;

  country: string | null;
  city: string | null;

  subject: string | null;
  message: string | null;
  payload: unknown;

  sourcePath: string | null;
  internalNote: string | null;
};

type ApiOk = {
  ok: true;
  limit: number;
  kinds: Kind[];
  status: Status | "all";
  q: string;
  totals: Record<Status, number>;
  items: ApiItem[];
};

type ApiError = { ok: false; error?: string };
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

function pillClass(active: boolean) {
  const base = "rounded-full px-3 py-1 text-xs border transition-colors";
  if (active) {
    return (
      base +
      " border-emerald-300 bg-emerald-50 text-emerald-800" +
      " dark:border-emerald-500/60 dark:bg-emerald-900/20 dark:text-emerald-200"
    );
  }
  return (
    base +
    " border-slate-300 text-slate-700 hover:bg-slate-100" +
    " dark:border-slate-700/60 dark:text-slate-200 dark:hover:bg-slate-900/30"
  );
}

function statusBadge(status: Status) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border";

  switch (status) {
    case "done":
      return `${base} border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-900/20 dark:text-emerald-300`;
    case "in_review":
      return `${base} border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-300`;
    case "spam":
      return `${base} border-red-300 bg-red-50 text-red-800 dark:border-red-700/60 dark:bg-red-900/20 dark:text-red-300`;
    case "archived":
      return `${base} border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700/60 dark:bg-slate-900/20 dark:text-slate-300`;
    case "new":
    default:
      return `${base} border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-700/60 dark:bg-sky-900/20 dark:text-sky-300`;
  }
}

function kindLabel(kind: Kind) {
  switch (kind) {
    case "club_pilot":
      return "Club pilot";
    case "ambassador":
      return "Ambassador";
    case "faq_question":
      return "FAQ";
    case "other":
    default:
      return "Other";
  }
}

function previewText(s: string | null, max = 140) {
  if (!s) return "—";
  const t = s.trim();
  if (!t) return "—";
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function safeJsonPreview(v: unknown, max = 160) {
  if (v === null || typeof v === "undefined") return "—";
  try {
    const s = JSON.stringify(v);
    if (s.length <= max) return s;
    return `${s.slice(0, max)}…`;
  } catch {
    return "[unserializable]";
  }
}

type KindFilter = "all" | "club_pilot" | "ambassador";
type StatusFilter = "all" | Status;

export default function AdminSupportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = React.useState("");
  const [kind, setKind] = React.useState<KindFilter>("all");
  const [status, setStatus] = React.useState<StatusFilter>("all");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<ApiOk | null>(null);

  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [noteDraftById, setNoteDraftById] = React.useState<Record<string, string>>({});
  const [savingId, setSavingId] = React.useState<string | null>(null);

  const applyParams = (next: { q?: string; kind?: KindFilter; status?: StatusFilter }) => {
    const params = new URLSearchParams(searchParams.toString());

    const nextQ = typeof next.q === "string" ? next.q.trim() : q.trim();
    const nextKind = next.kind ?? kind;
    const nextStatus = next.status ?? status;

    if (nextQ) params.set("q", nextQ);
    else params.delete("q");

    if (nextKind === "all") params.delete("kind");
    else params.set("kind", nextKind);

    if (nextStatus === "all") params.delete("status");
    else params.set("status", nextStatus);

    router.push(`/admin/support?${params.toString()}`);
  };

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    applyParams({ q, kind, status });
  };

  const fetchData = React.useCallback(
    async (opts: { q: string; kind: KindFilter; status: StatusFilter }, signal: AbortSignal) => {
      const params = new URLSearchParams();
      params.set("limit", "200");

      const kinds: Kind[] =
        opts.kind === "all" ? ["club_pilot", "ambassador"] : [opts.kind];

      params.set("kinds", kinds.join(","));

      if (opts.q) params.set("q", opts.q);
      if (opts.status !== "all") params.set("status", opts.status);

      const res = await fetch(`/api/admin/support?${params.toString()}`, { signal });
      const json: ApiResponse = await res.json();

      if (!json.ok) {
        setData(null);
        setError(json.error || "Failed to load submissions");
      } else {
        setData(json);
      }
    },
    [],
  );

  React.useEffect(() => {
    const urlQ = (searchParams.get("q") || "").trim();
    const urlKind = (searchParams.get("kind") || "").trim() as KindFilter;
    const urlStatus = (searchParams.get("status") || "").trim() as StatusFilter;

    setQ(urlQ);
    setKind(urlKind === "club_pilot" || urlKind === "ambassador" ? urlKind : "all");
    setStatus(
      urlStatus === "new" ||
        urlStatus === "in_review" ||
        urlStatus === "done" ||
        urlStatus === "spam" ||
        urlStatus === "archived"
        ? urlStatus
        : "all",
    );

    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        await fetchData(
          {
            q: urlQ,
            kind: urlKind === "club_pilot" || urlKind === "ambassador" ? urlKind : "all",
            status:
              urlStatus === "new" ||
              urlStatus === "in_review" ||
              urlStatus === "done" ||
              urlStatus === "spam" ||
              urlStatus === "archived"
                ? urlStatus
                : "all",
          },
          controller.signal,
        );
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setData(null);
        setError("Failed to load submissions");
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [searchParams, fetchData]);

  const items = data?.items ?? [];
  const totals = data?.totals ?? { new: 0, in_review: 0, done: 0, spam: 0, archived: 0 };
  const totalAll = totals.new + totals.in_review + totals.done + totals.spam + totals.archived;

  const patch = async (id: string, body: { status?: Status; internalNote?: string | null }) => {
    setSavingId(id);
    try {
      const res = await fetch("/api/admin/support", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });

      const json: { ok: boolean; error?: string } = await res.json();
      if (!json.ok) throw new Error(json.error || "Update failed");

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((it) => {
            if (it.id !== id) return it;
            return {
              ...it,
              status: body.status ?? it.status,
              internalNote:
                typeof body.internalNote !== "undefined" ? body.internalNote : it.internalNote,
            };
          }),
        };
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Support</h1>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={pillClass(kind === "all")}
          onClick={() => applyParams({ kind: "all" })}
        >
          Clubs + Ambassadors
        </button>
        <button
          type="button"
          className={pillClass(kind === "club_pilot")}
          onClick={() => applyParams({ kind: "club_pilot" })}
        >
          Clubs
        </button>
        <button
          type="button"
          className={pillClass(kind === "ambassador")}
          onClick={() => applyParams({ kind: "ambassador" })}
        >
          Ambassadors
        </button>
      </div>

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
          className={pillClass(status === "new")}
          onClick={() => applyParams({ status: "new" })}
        >
          New ({totals.new})
        </button>
        <button
          type="button"
          className={pillClass(status === "in_review")}
          onClick={() => applyParams({ status: "in_review" })}
        >
          In review ({totals.in_review})
        </button>
        <button
          type="button"
          className={pillClass(status === "done")}
          onClick={() => applyParams({ status: "done" })}
        >
          Done ({totals.done})
        </button>
        <button
          type="button"
          className={pillClass(status === "spam")}
          onClick={() => applyParams({ status: "spam" })}
        >
          Spam ({totals.spam})
        </button>
        <button
          type="button"
          className={pillClass(status === "archived")}
          onClick={() => applyParams({ status: "archived" })}
        >
          Archived ({totals.archived})
        </button>
      </div>

      <form onSubmit={onSubmit} className="mb-4 flex flex-wrap items-end gap-3 text-sm">
        <div className="flex flex-col">
          <label htmlFor="q" className="mb-1 text-xs text-slate-600 dark:text-slate-400">
            Search
          </label>
          <input
            id="q"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input font-mono"
            placeholder="email / name / telegram / message…"
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
          onClick={() => router.push("/admin/support")}
          className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:hover:bg-slate-800"
          disabled={loading}
        >
          Reset
        </button>

        {loading && <div className="text-xs text-slate-600 dark:text-slate-400">Loading…</div>}
        {error && <div className="text-xs text-red-600 dark:text-red-400">Error: {error}</div>}
      </form>

      <div className="border border-slate-200 rounded-lg overflow-x-auto dark:border-slate-800">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-100 dark:bg-slate-900/60">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Created</th>
              <th className="px-3 py-2 text-left font-semibold">Kind</th>
              <th className="px-3 py-2 text-left font-semibold">Status</th>
              <th className="px-3 py-2 text-left font-semibold">Contact</th>
              <th className="px-3 py-2 text-left font-semibold">Location</th>
              <th className="px-3 py-2 text-left font-semibold">Subject</th>
              <th className="px-3 py-2 text-left font-semibold">Message / payload</th>
              <th className="px-3 py-2 text-left font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-center text-slate-500" colSpan={8}>
                  No submissions found.
                </td>
              </tr>
            ) : (
              items.map((it) => {
                const isExpanded = expandedId === it.id;
                const noteDraft = noteDraftById[it.id] ?? it.internalNote ?? "";

                return (
                  <React.Fragment key={it.id}>
                    <tr className="border-t border-slate-200 dark:border-slate-800 align-top">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatDateTimeFromIso(it.createdAt)}
                      </td>

                      <td className="px-3 py-2 whitespace-nowrap">{kindLabel(it.kind)}</td>

                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={statusBadge(it.status)}>{it.status}</span>
                      </td>

                      <td className="px-3 py-2">
                        <div>{it.contactName ?? "—"}</div>
                        <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {it.email ?? "—"}
                        </div>
                        {it.telegram && (
                          <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            tg: {it.telegram}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2 whitespace-nowrap">
                        {it.country ?? "—"}
                        {it.city ? `, ${it.city}` : ""}
                      </td>

                      <td className="px-3 py-2">{previewText(it.subject, 80)}</td>

                      <td className="px-3 py-2">
                        {it.message ? previewText(it.message, 180) : safeJsonPreview(it.payload, 180)}
                      </td>

                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-md border border-slate-300 px-2 py-1 text-[11px] hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800 disabled:opacity-60"
                            onClick={() => setExpandedId(isExpanded ? null : it.id)}
                            disabled={savingId === it.id}
                          >
                            {isExpanded ? "Close" : "Open"}
                          </button>

                          <button
                            type="button"
                            className="rounded-md border border-slate-300 px-2 py-1 text-[11px] hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800 disabled:opacity-60"
                            onClick={() => patch(it.id, { status: "in_review" })}
                            disabled={savingId === it.id}
                          >
                            In review
                          </button>

                          <button
                            type="button"
                            className="rounded-md border border-slate-300 px-2 py-1 text-[11px] hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800 disabled:opacity-60"
                            onClick={() => patch(it.id, { status: "done" })}
                            disabled={savingId === it.id}
                          >
                            Done
                          </button>

                          <button
                            type="button"
                            className="rounded-md border border-slate-300 px-2 py-1 text-[11px] hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800 disabled:opacity-60"
                            onClick={() => patch(it.id, { status: "spam" })}
                            disabled={savingId === it.id}
                          >
                            Spam
                          </button>

                          <button
                            type="button"
                            className="rounded-md border border-slate-300 px-2 py-1 text-[11px] hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800 disabled:opacity-60"
                            onClick={() => patch(it.id, { status: "archived" })}
                            disabled={savingId === it.id}
                          >
                            Archive
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="border-t border-slate-200 dark:border-slate-800">
                        <td className="px-3 py-3" colSpan={8}>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="text-xs">
                              <div className="font-semibold mb-1">Details</div>
                              <div className="text-slate-600 dark:text-slate-400">
                                Updated: {formatDateTimeFromIso(it.updatedAt)}
                              </div>
                              <div className="text-slate-600 dark:text-slate-400">
                                Source: {it.sourcePath ?? "—"}
                              </div>
                              <div className="mt-2">
                                <div className="font-semibold mb-1">Payload</div>
                                <pre className="whitespace-pre-wrap break-words rounded-md border border-slate-200 p-2 text-[11px] dark:border-slate-800">
                                  {safeJsonPreview(it.payload, 2000)}
                                </pre>
                              </div>
                            </div>

                            <div className="text-xs">
                              <div className="font-semibold mb-1">Internal note</div>
                              <textarea
                                className="w-full rounded-md border border-slate-300 bg-transparent p-2 text-[12px] outline-none focus:ring-2 focus:ring-emerald-400/40 dark:border-slate-700"
                                rows={6}
                                value={noteDraft}
                                onChange={(e) =>
                                  setNoteDraftById((prev) => ({
                                    ...prev,
                                    [it.id]: e.target.value,
                                  }))
                                }
                                placeholder="Notes for processing…"
                              />
                              <div className="mt-2 flex gap-2">
                                <button
                                  type="button"
                                  className="rounded-md bg-emerald-500 px-3 py-1 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                                  disabled={savingId === it.id}
                                  onClick={() =>
                                    patch(it.id, {
                                      internalNote: noteDraft.trim().length ? noteDraft.trim() : null,
                                      status: it.status === "new" ? "in_review" : undefined,
                                    })
                                  }
                                >
                                  Save note
                                </button>

                                <button
                                  type="button"
                                  className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:hover:bg-slate-800"
                                  disabled={savingId === it.id}
                                  onClick={() =>
                                    setNoteDraftById((prev) => ({
                                      ...prev,
                                      [it.id]: it.internalNote ?? "",
                                    }))
                                  }
                                >
                                  Reset
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-slate-600 dark:text-slate-500">
        Showing up to 200 latest submissions (newest first).
      </div>
    </div>
  );
}