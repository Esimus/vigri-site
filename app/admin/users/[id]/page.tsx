// app/admin/users/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
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

export default async function AdminUserDetailsPage({ params }: Props) {
  const { id } = await params;

  const u = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      createdAt: true,
      role: true,
      balanceEcho: true,
      kycStatus: true,
      kycCountryZone: true,
      kycUpdatedAt: true,
      kycNote: true,
      profile: true,
      kycData: true,
    },
  });

  if (!u) notFound();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">User profile</h1>
        <Link href="/admin/users" className="text-sm text-emerald-400 hover:underline">
          ← Back to Users
        </Link>
      </div>

      <div className="mb-4 text-xs text-slate-400">
        User ID: <span className="font-mono">{u.id}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-800 p-4">
          <h2 className="text-sm font-semibold mb-3">Account</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Email</dt>
              <dd className="font-mono text-[13px]">{u.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Email verified</dt>
              <dd>{u.emailVerified ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Role</dt>
              <dd>{u.role}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Created</dt>
              <dd>{formatDateTimeFromIso(u.createdAt.toISOString())}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">balanceEcho</dt>
              <dd className="font-mono text-[13px]">{u.balanceEcho}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-slate-800 p-4">
          <h2 className="text-sm font-semibold mb-3">KYC</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Status</dt>
              <dd>{u.kycStatus}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Zone</dt>
              <dd>{u.kycCountryZone ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Updated</dt>
              <dd>{formatDateTimeFromIso(u.kycUpdatedAt ? u.kycUpdatedAt.toISOString() : null)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Note</dt>
              <dd className="text-right">{u.kycNote ?? "—"}</dd>
            </div>
          </dl>

          <div className="mt-4 text-xs text-slate-500">
            Next step: approve/reject, reset, document preview, and admin edits.
          </div>
        </section>

        <section className="rounded-lg border border-slate-800 p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold mb-3">Profile</h2>

          {!u.profile ? (
            <div className="text-sm text-slate-500">No profile yet.</div>
          ) : (
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <div>
                <span className="text-slate-400">Name:</span> {u.profile.firstName}{" "}
                {u.profile.middleName ?? ""} {u.profile.lastName}
              </div>
              <div>
                <span className="text-slate-400">Birth date:</span>{" "}
                {u.profile.birthDate ? u.profile.birthDate.toISOString().slice(0, 10) : "—"}
              </div>
              <div>
                <span className="text-slate-400">Phone:</span> {u.profile.phone ?? "—"}
              </div>
              <div>
                <span className="text-slate-400">Language:</span> {u.profile.language ?? "—"}
              </div>
              <div>
                <span className="text-slate-400">Residence:</span> {u.profile.countryResidence ?? "—"}
              </div>
              <div>
                <span className="text-slate-400">Citizenship:</span> {u.profile.countryCitizenship ?? "—"}
              </div>
              <div>
                <span className="text-slate-400">Tax:</span> {u.profile.countryTax ?? "—"}
              </div>
              <div>
                <span className="text-slate-400">City:</span> {u.profile.addressCity ?? "—"}
              </div>
              <div>
                <span className="text-slate-400">Street:</span> {u.profile.addressStreet ?? "—"}
              </div>
              <div>
                <span className="text-slate-400">Postal:</span> {u.profile.addressPostal ?? "—"}
              </div>
              <div>
                <span className="text-slate-400">EE ID (isikukood):</span> {u.profile.isikukood ?? "—"}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}