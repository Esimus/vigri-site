// app/admin/clubs/[id]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

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

export default async function AdminClubEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const club = await prisma.pilotClub.findUnique({
    where: { id },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      status: true,
      sortOrder: true,
      name: true,
      slug: true,
      category: true,
      city: true,
      country: true,
      website: true,
      instagram: true,
      email: true,
      quote: true,
      logoUrl: true,
      logoAlt: true,
      pilotPhotoUrl: true,
      pilotPhotoAlt: true,
      pilotPhotoCaption: true,
      pilotBadge: true,
      verifiedInPerson: true,
      nftCount: true,
      vigriAllocation: true,
      internalNote: true,
    },
  });

  if (!club) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold mb-2">Edit club</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Club editing form will be added here next.
        </p>
      </div>

      <div className="card p-4 sm:p-5">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">ID</dt>
            <dd className="font-mono text-[12px] break-all">{club.id}</dd>
          </div>

          <div>
            <dt className="text-slate-500">Status</dt>
            <dd>{club.status}</dd>
          </div>

          <div>
            <dt className="text-slate-500">Created</dt>
            <dd>{formatDateTimeFromIso(club.createdAt.toISOString())}</dd>
          </div>

          <div>
            <dt className="text-slate-500">Updated</dt>
            <dd>{formatDateTimeFromIso(club.updatedAt.toISOString())}</dd>
          </div>

          <div>
            <dt className="text-slate-500">Name</dt>
            <dd>{club.name}</dd>
          </div>

          <div>
            <dt className="text-slate-500">Slug</dt>
            <dd>{club.slug ?? "—"}</dd>
          </div>

          <div>
            <dt className="text-slate-500">Category</dt>
            <dd>{club.category ?? "—"}</dd>
          </div>

          <div>
            <dt className="text-slate-500">Sort order</dt>
            <dd>{club.sortOrder}</dd>
          </div>

          <div>
            <dt className="text-slate-500">City</dt>
            <dd>{club.city ?? "—"}</dd>
          </div>

          <div>
            <dt className="text-slate-500">Country</dt>
            <dd>{club.country ?? "—"}</dd>
          </div>

          <div>
            <dt className="text-slate-500">Website</dt>
            <dd>{club.website ?? "—"}</dd>
          </div>

          <div>
            <dt className="text-slate-500">Instagram</dt>
            <dd>{club.instagram ?? "—"}</dd>
          </div>

          <div>
            <dt className="text-slate-500">Email</dt>
            <dd>{club.email ?? "—"}</dd>
          </div>

          <div>
            <dt className="text-slate-500">Pilot badge</dt>
            <dd>{club.pilotBadge ?? "—"}</dd>
          </div>

          <div>
            <dt className="text-slate-500">Verified in person</dt>
            <dd>{club.verifiedInPerson ? "Yes" : "No"}</dd>
          </div>

          <div>
            <dt className="text-slate-500">Assigned NFTs</dt>
            <dd>{club.nftCount}</dd>
          </div>

          <div>
            <dt className="text-slate-500">Assigned VIGRI</dt>
            <dd>{club.vigriAllocation.toLocaleString()}</dd>
          </div>

          <div className="sm:col-span-2">
            <dt className="text-slate-500">Quote</dt>
            <dd>{club.quote ?? "—"}</dd>
          </div>

          <div className="sm:col-span-2">
            <dt className="text-slate-500">Logo URL</dt>
            <dd className="break-all">{club.logoUrl ?? "—"}</dd>
          </div>

          <div className="sm:col-span-2">
            <dt className="text-slate-500">Pilot photo URL</dt>
            <dd className="break-all">{club.pilotPhotoUrl ?? "—"}</dd>
          </div>

          <div className="sm:col-span-2">
            <dt className="text-slate-500">Internal note</dt>
            <dd>{club.internalNote ?? "—"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}