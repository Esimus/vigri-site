// app/admin/clubs/page.tsx
"use client";

import Link from "next/link";
import React from "react";

type ClubStatus = "draft" | "published" | "archived";
type ClubCategory = "sport" | "dance" | "music" | "art";

type ApiClub = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: ClubStatus;
  sortOrder: number;
  name: string;
  slug: string | null;
  category: ClubCategory | null;
  city: string | null;
  country: string | null;
  website: string | null;
  instagram: string | null;
  email: string | null;
  quote: string | null;
  logoUrl: string | null;
  logoAlt: string | null;
  pilotPhotoUrl: string | null;
  pilotPhotoAlt: string | null;
  pilotPhotoCaption: string | null;
  pilotBadge: string | null;
  verifiedInPerson: boolean;
  nftCount: number;
  vigriAllocation: number;
  internalNote: string | null;
};

type ApiListOk = {
  ok: true;
  items: ApiClub[];
};

type ApiCreateOk = {
  ok: true;
  id: string;
};

type ApiError = {
  ok: false;
  error?: string;
};

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

function statusBadge(status: ClubStatus) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border";

  switch (status) {
    case "published":
      return `${base} border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-900/20 dark:text-emerald-300`;
    case "archived":
      return `${base} border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700/60 dark:bg-slate-900/20 dark:text-slate-300`;
    case "draft":
    default:
      return `${base} border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-300`;
  }
}

export default function AdminClubsPage() {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [uploadingKind, setUploadingKind] = React.useState<"logo" | "photo" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<ApiClub[]>([]);

  const [name, setName] = React.useState("");
  const [status, setStatus] = React.useState<ClubStatus>("draft");
  const [category, setCategory] = React.useState<ClubCategory | "">("");
  const [city, setCity] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [instagram, setInstagram] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [quote, setQuote] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [logoAlt, setLogoAlt] = React.useState("");
  const [pilotPhotoUrl, setPilotPhotoUrl] = React.useState("");
  const [pilotPhotoAlt, setPilotPhotoAlt] = React.useState("");
  const [pilotPhotoCaption, setPilotPhotoCaption] = React.useState("");
  const [pilotBadge, setPilotBadge] = React.useState("Pilot club");
  const [verifiedInPerson, setVerifiedInPerson] = React.useState(false);
  const [nftCount, setNftCount] = React.useState("0");
  const [vigriAllocation, setVigriAllocation] = React.useState("0");
  const [sortOrder, setSortOrder] = React.useState("0");
  const [internalNote, setInternalNote] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/pilot-clubs?limit=200", { cache: "no-store" });
      const json = (await res.json()) as ApiListOk | ApiError;

      if (!json.ok) {
        setItems([]);
        setError(json.error || "Failed to load clubs");
      } else {
        setItems(json.items);
      }
    } catch {
      setItems([]);
      setError("Failed to load clubs");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const canSubmit = name.trim().length > 1 && !saving && !uploadingKind;

  const uploadImage = async (kind: "logo" | "photo", file: File) => {
  setUploadingKind(kind);
  setError(null);
  setSuccess(null);

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);

    const res = await fetch("/api/admin/pilot-clubs/upload", {
      method: "POST",
      body: formData,
    });

    const json = (await res.json()) as { ok: true; url: string } | ApiError;

    if (!json.ok) {
      setError(json.error || "Failed to upload image");
      return;
    }

    if (kind === "logo") {
      setLogoUrl(json.url);
    } else {
      setPilotPhotoUrl(json.url);
    }
  } catch {
    setError("Failed to upload image");
  } finally {
    setUploadingKind(null);
  }
};

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const body = {
        name: name.trim(),
        status,
        category: category || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        website: website.trim() || undefined,
        instagram: instagram.trim() || undefined,
        email: email.trim() || undefined,
        quote: quote.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
        logoAlt: logoAlt.trim() || undefined,
        pilotPhotoUrl: pilotPhotoUrl.trim() || undefined,
        pilotPhotoAlt: pilotPhotoAlt.trim() || undefined,
        pilotPhotoCaption: pilotPhotoCaption.trim() || undefined,
        pilotBadge: pilotBadge.trim() || undefined,
        verifiedInPerson,
        nftCount: Number(nftCount) || 0,
        vigriAllocation: Number(vigriAllocation) || 0,
        sortOrder: Number(sortOrder) || 0,
        internalNote: internalNote.trim() || undefined,
      };

      const res = await fetch("/api/admin/pilot-clubs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = (await res.json()) as ApiCreateOk | ApiError;

      if (!json.ok) {
        setError(json.error || "Failed to create club");
      } else {
        setSuccess("Club created");
        setName("");
        setStatus("draft");
        setCategory("");
        setCity("");
        setCountry("");
        setWebsite("");
        setInstagram("");
        setEmail("");
        setQuote("");
        setLogoUrl("");
        setLogoAlt("");
        setPilotPhotoUrl("");
        setPilotPhotoAlt("");
        setPilotPhotoCaption("");
        setPilotBadge("Pilot club");
        setVerifiedInPerson(false);
        setNftCount("0");
        setVigriAllocation("0");
        setSortOrder("0");
        setInternalNote("");
        await load();
      }
    } catch {
      setError("Failed to create club");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold mb-2">Pilot clubs</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Create and manage public club cards for the VIGRI pilot.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-800">Add club</h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <div className="text-xs font-medium text-zinc-700">Name</div>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label className="space-y-1 text-sm">
            <div className="text-xs font-medium text-zinc-700">Status</div>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as ClubStatus)}>
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <div className="text-xs font-medium text-zinc-700">Category</div>
            <select
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value as ClubCategory | "")}
            >
              <option value="">—</option>
              <option value="sport">sport</option>
              <option value="dance">dance</option>
              <option value="music">music</option>
              <option value="art">art</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <div className="text-xs font-medium text-zinc-700">Sort order</div>
            <input className="input" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </label>

          <label className="space-y-1 text-sm">
            <div className="text-xs font-medium text-zinc-700">City</div>
            <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
          </label>

          <label className="space-y-1 text-sm">
            <div className="text-xs font-medium text-zinc-700">Country</div>
            <input className="input" value={country} onChange={(e) => setCountry(e.target.value)} />
          </label>

          <label className="space-y-1 text-sm">
            <div className="text-xs font-medium text-zinc-700">Website</div>
            <input className="input" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>

          <label className="space-y-1 text-sm">
            <div className="text-xs font-medium text-zinc-700">Instagram</div>
            <input className="input" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
          </label>

          <label className="space-y-1 text-sm">
            <div className="text-xs font-medium text-zinc-700">Email</div>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label className="space-y-1 text-sm">
            <div className="text-xs font-medium text-zinc-700">Pilot badge</div>
            <input className="input" value={pilotBadge} onChange={(e) => setPilotBadge(e.target.value)} />
          </label>

          <label className="space-y-1 text-sm">
            <div className="text-xs font-medium text-zinc-700">Logo URL</div>
            <input className="input" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
            <input
              type="file"
              accept="image/*"
              className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-400 dark:file:border-slate-600 dark:file:bg-slate-800 dark:file:text-slate-200 dark:hover:file:bg-slate-700 disabled:opacity-60"
              onChange={async (e) => {
                const input = e.currentTarget;
                const file = input.files?.[0];
                if (!file) return;
                await uploadImage("logo", file);
                input.value = "";
              }}
              disabled={uploadingKind !== null}
            />
            {uploadingKind === "logo" ? (
              <div className="text-xs text-slate-500">Uploading logo…</div>
            ) : null}
          </label>

          <label className="space-y-1 text-sm">
            <div className="text-xs font-medium text-zinc-700">Logo alt</div>
            <input className="input" value={logoAlt} onChange={(e) => setLogoAlt(e.target.value)} />
          </label>

          <label className="space-y-1 text-sm">
            <div className="text-xs font-medium text-zinc-700">Pilot photo URL</div>
            <input
              className="input"
              value={pilotPhotoUrl}
              onChange={(e) => setPilotPhotoUrl(e.target.value)}
            />
            <input
              type="file"
              accept="image/*"
              className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-400 dark:file:border-slate-600 dark:file:bg-slate-800 dark:file:text-slate-200 dark:hover:file:bg-slate-700 disabled:opacity-60"
              onChange={async (e) => {
                const input = e.currentTarget;
                const file = input.files?.[0];
                if (!file) return;
                await uploadImage("photo", file);
                input.value = "";
              }}
              disabled={uploadingKind !== null}
            />
            {uploadingKind === "photo" ? (
              <div className="text-xs text-slate-500">Uploading photo…</div>
            ) : null}
          </label>

          <label className="space-y-1 text-sm">
            <div className="text-xs font-medium text-zinc-700">Pilot photo alt</div>
            <input
              className="input"
              value={pilotPhotoAlt}
              onChange={(e) => setPilotPhotoAlt(e.target.value)}
            />
          </label>

          <label className="space-y-1 text-sm sm:col-span-2">
            <div className="text-xs font-medium text-zinc-700">Pilot photo caption</div>
            <input
              className="input"
              value={pilotPhotoCaption}
              onChange={(e) => setPilotPhotoCaption(e.target.value)}
            />
          </label>

          <label className="space-y-1 text-sm">
            <div className="text-xs font-medium text-zinc-700">Assigned NFTs</div>
            <input className="input" value={nftCount} onChange={(e) => setNftCount(e.target.value)} />
          </label>

          <label className="space-y-1 text-sm">
            <div className="text-xs font-medium text-zinc-700">Assigned VIGRI</div>
            <input
              className="input"
              value={vigriAllocation}
              onChange={(e) => setVigriAllocation(e.target.value)}
            />
          </label>

          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={verifiedInPerson}
              onChange={(e) => setVerifiedInPerson(e.target.checked)}
            />
            <span>Verified in person</span>
          </label>

          <label className="space-y-1 text-sm sm:col-span-2">
            <div className="text-xs font-medium text-zinc-700">Quote</div>
            <textarea className="input min-h-[110px]" value={quote} onChange={(e) => setQuote(e.target.value)} />
          </label>

          <label className="space-y-1 text-sm sm:col-span-2">
            <div className="text-xs font-medium text-zinc-700">Internal note</div>
            <textarea
              className="input min-h-[110px]"
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
            />
          </label>
        </div>

        {error && <div className="text-sm text-red-600 dark:text-red-400">Error: {error}</div>}
        {success && <div className="text-sm text-emerald-700 dark:text-emerald-300">{success}</div>}

        <button
          type="submit"
          className="rounded-md bg-emerald-500 px-3 py-1 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          disabled={!canSubmit}
        >
          {saving ? "Saving…" : "Create club"}
        </button>
      </form>

      <div className="card p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-800">Existing clubs</h2>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
            onClick={() => void load()}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-slate-600 dark:text-slate-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-slate-600 dark:text-slate-400">No clubs yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900/60">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Created</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                  <th className="px-3 py-2 text-left font-semibold">Name</th>
                  <th className="px-3 py-2 text-left font-semibold">Category</th>
                  <th className="px-3 py-2 text-left font-semibold">Location</th>
                  <th className="px-3 py-2 text-left font-semibold">Support</th>
                  <th className="px-3 py-2 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((club) => (
                  <tr key={club.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateTimeFromIso(club.createdAt)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={statusBadge(club.status)}>{club.status}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{club.name}</div>
                      <div className="text-[11px] text-slate-500">{club.slug ?? "—"}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{club.category ?? "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {[club.city, club.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      NFTs: {club.nftCount} · VIGRI: {club.vigriAllocation.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Link
                        href={`/admin/clubs/${club.id}`}
                        className="inline-flex rounded-md border border-slate-300 px-2 py-1 text-[11px] hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}