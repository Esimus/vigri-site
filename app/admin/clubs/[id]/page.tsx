// app/admin/clubs/[id]/page.tsx
"use client";

import Link from "next/link";
import React from "react";
import { useParams } from "next/navigation";

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

type ApiGetOk = {
  ok: true;
  item: ApiClub;
};

type ApiPatchOk = {
  ok: true;
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

export default function AdminClubEditPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploadingKind, setUploadingKind] = React.useState<"logo" | "photo" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [createdAt, setCreatedAt] = React.useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
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
  const [pilotBadge, setPilotBadge] = React.useState("");
  const [verifiedInPerson, setVerifiedInPerson] = React.useState(false);
  const [nftCount, setNftCount] = React.useState("0");
  const [vigriAllocation, setVigriAllocation] = React.useState("0");
  const [sortOrder, setSortOrder] = React.useState("0");
  const [internalNote, setInternalNote] = React.useState("");

  const load = React.useCallback(async () => {
    if (!id) {
      setError("Invalid club id");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/pilot-clubs/${id}`, {
        cache: "no-store",
      });

      const json = (await res.json()) as ApiGetOk | ApiError;

      if (!json.ok) {
        setError(json.error || "Failed to load club");
        setLoading(false);
        return;
      }

      const club = json.item;

      setCreatedAt(club.createdAt);
      setUpdatedAt(club.updatedAt);

      setName(club.name);
      setSlug(club.slug ?? "");
      setStatus(club.status);
      setCategory(club.category ?? "");
      setCity(club.city ?? "");
      setCountry(club.country ?? "");
      setWebsite(club.website ?? "");
      setInstagram(club.instagram ?? "");
      setEmail(club.email ?? "");
      setQuote(club.quote ?? "");
      setLogoUrl(club.logoUrl ?? "");
      setLogoAlt(club.logoAlt ?? "");
      setPilotPhotoUrl(club.pilotPhotoUrl ?? "");
      setPilotPhotoAlt(club.pilotPhotoAlt ?? "");
      setPilotPhotoCaption(club.pilotPhotoCaption ?? "");
      setPilotBadge(club.pilotBadge ?? "");
      setVerifiedInPerson(club.verifiedInPerson);
      setNftCount(String(club.nftCount));
      setVigriAllocation(String(club.vigriAllocation));
      setSortOrder(String(club.sortOrder));
      setInternalNote(club.internalNote ?? "");
    } catch {
      setError("Failed to load club");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function uploadImage(kind: "logo" | "photo", file: File) {
    setError(null);
    setSuccess(null);
    setUploadingKind(kind);

    try {
      const form = new FormData();
      form.set("file", file);

      const res = await fetch(`/api/admin/pilot-clubs/upload?kind=${kind}`, {
        method: "POST",
        body: form,
      });

      const json = (await res.json()) as
        | { ok: true; url: string }
        | { ok: false; error?: string };

      if (!json.ok) {
        setError(json.error || "Upload failed");
        return;
      }

      if (kind === "logo") {
        setLogoUrl(json.url);
      } else {
        setPilotPhotoUrl(json.url);
      }

      setSuccess(kind === "logo" ? "Logo uploaded" : "Photo uploaded");
    } catch {
      setError("Upload failed");
    } finally {
      setUploadingKind(null);
    }
  }

  const canSubmit =
    id.length > 0 && name.trim().length > 1 && !saving && !loading && !uploadingKind;

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const body = {
        name: name.trim(),
        slug: slug.trim() || "",
        status,
        category: category || null,
        city: city.trim(),
        country: country.trim(),
        website: website.trim(),
        instagram: instagram.trim(),
        email: email.trim(),
        quote: quote.trim(),
        logoUrl: logoUrl.trim(),
        logoAlt: logoAlt.trim(),
        pilotPhotoUrl: pilotPhotoUrl.trim(),
        pilotPhotoAlt: pilotPhotoAlt.trim(),
        pilotPhotoCaption: pilotPhotoCaption.trim(),
        pilotBadge: pilotBadge.trim(),
        verifiedInPerson,
        nftCount: Number(nftCount) || 0,
        vigriAllocation: Number(vigriAllocation) || 0,
        sortOrder: Number(sortOrder) || 0,
        internalNote: internalNote.trim(),
      };

      const res = await fetch(`/api/admin/pilot-clubs/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = (await res.json()) as ApiPatchOk | ApiError;

      if (!json.ok) {
        setError(json.error || "Failed to save club");
      } else {
        setSuccess("Club saved");
        await load();
      }
    } catch {
      setError("Failed to save club");
    } finally {
      setSaving(false);
    }
  };

  if (!id) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Edit club</h1>
        <div className="text-sm text-red-600 dark:text-red-400">Invalid club id.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold mb-2">Edit club</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Update the public club card and support data.
          </p>
        </div>

        <Link
          href="/admin/clubs"
          className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
        >
          Back to clubs
        </Link>
      </div>

      <div className="card p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs font-medium text-zinc-700">ID</div>
            <div className="mt-1 font-mono text-[12px] break-all">{id}</div>
          </div>

          <div>
            <div className="text-xs font-medium text-zinc-700">Created</div>
            <div className="mt-1">{formatDateTimeFromIso(createdAt)}</div>
          </div>

          <div>
            <div className="text-xs font-medium text-zinc-700">Updated</div>
            <div className="mt-1">{formatDateTimeFromIso(updatedAt)}</div>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="card p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <div className="text-xs font-medium text-zinc-700">Name</div>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label className="space-y-1 text-sm">
            <div className="text-xs font-medium text-zinc-700">Slug</div>
            <input className="input" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </label>

          <label className="space-y-1 text-sm">
            <div className="text-xs font-medium text-zinc-700">Status</div>
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value as ClubStatus)}
            >
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

          <label className="space-y-2 text-sm">
            <div className="text-xs font-medium text-zinc-700">Logo URL</div>
            <input className="input" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const input = e.currentTarget;
                const file = input.files?.[0];
                if (file) void uploadImage("logo", file);
                input.value = "";
              }}
              disabled={saving || loading || uploadingKind !== null}
              className="block w-full text-xs text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-xs file:font-medium file:text-zinc-800 hover:file:bg-zinc-200"
            />
            {uploadingKind === "logo" ? (
              <div className="text-xs text-zinc-500">Uploading logo…</div>
            ) : null}
          </label>

          <label className="space-y-1 text-sm">
            <div className="text-xs font-medium text-zinc-700">Logo alt</div>
            <input className="input" value={logoAlt} onChange={(e) => setLogoAlt(e.target.value)} />
          </label>

          <label className="space-y-2 text-sm">
            <div className="text-xs font-medium text-zinc-700">Pilot photo URL</div>
            <input
              className="input"
              value={pilotPhotoUrl}
              onChange={(e) => setPilotPhotoUrl(e.target.value)}
            />
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const input = e.currentTarget;
                const file = input.files?.[0];
                if (file) void uploadImage("photo", file);
                input.value = "";
              }}
              disabled={saving || loading || uploadingKind !== null}
              className="block w-full text-xs text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-xs file:font-medium file:text-zinc-800 hover:file:bg-zinc-200"
            />
            {uploadingKind === "photo" ? (
              <div className="text-xs text-zinc-500">Uploading photo…</div>
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
            <textarea
              className="input min-h-[110px]"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
            />
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

        {loading && <div className="text-sm text-slate-600 dark:text-slate-400">Loading…</div>}
        {error && <div className="text-sm text-red-600 dark:text-red-400">Error: {error}</div>}
        {success && <div className="text-sm text-emerald-700 dark:text-emerald-300">{success}</div>}

        <button
          type="submit"
          className="rounded-md bg-emerald-500 px-3 py-1 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          disabled={!canSubmit}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}