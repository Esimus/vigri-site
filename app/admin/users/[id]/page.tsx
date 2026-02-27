// app/admin/users/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UserKycActionsClient } from "@/components/admin/UserKycActionsClient";
import { KycArchiveActionsClient } from "@/components/admin/KycArchiveActionsClient";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

function formatDateTime(d: Date | null) {
  if (!d) return "—";
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
      kycData: {
        select: {
          pepDeclared: true,
          pepDetails: true,
          consent: true,
          passportNumber: true,
          passportCountry: true,
          passportIssuedAt: true,
          passportExpiresAt: true,
          passportIssuer: true,
          documentImage: true,
        },
      },

      kycArchives: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          createdAt: true,
          reason: true,
          archivedBy: { select: { email: true } },

          prevKycStatus: true,
          prevKycCountryZone: true,
          prevKycUpdatedAt: true,
          prevKycNote: true,

          pepDeclared: true,
          pepDetails: true,
          consent: true,

          passportNumber: true,
          passportCountry: true,
          passportIssuedAt: true,
          passportExpiresAt: true,
          passportIssuer: true,

          documentImage: true,
        },
      },
    },
  });

  if (!u) notFound();

  const doc = u.kycData?.documentImage ?? null;
  const hasImage = typeof doc === "string" && doc.startsWith("data:image");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">User profile</h1>
        <Link
          href="/admin/users"
          className="text-sm text-emerald-600 hover:underline dark:text-emerald-400"
        >
          ← Back to Users
        </Link>
      </div>

      <div className="mb-4 text-xs text-slate-600 dark:text-slate-400">
        User ID: <span className="font-mono">{u.id}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Row 1: Account */}
        <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="text-sm font-semibold mb-3">Account</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-400">Email</dt>
              <dd className="font-mono text-[13px]">{u.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-400">Email verified</dt>
              <dd>{u.emailVerified ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-400">Role</dt>
              <dd>{u.role}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-400">Created</dt>
              <dd>{formatDateTime(u.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-400">balanceEcho</dt>
              <dd className="font-mono text-[13px]">{u.balanceEcho}</dd>
            </div>
          </dl>
        </section>

        {/* Row 1: Profile */}
        <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="text-sm font-semibold mb-3">Profile</h2>

          {!u.profile ? (
            <div className="text-sm text-slate-600 dark:text-slate-400">
              No profile yet.
            </div>
          ) : (
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <div className="md:col-span-2">
                <span className="text-slate-600 dark:text-slate-400">Name:</span>{" "}
                {u.profile.firstName} {u.profile.middleName ?? ""} {u.profile.lastName}
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">Birth date:</span>{" "}
                {u.profile.birthDate ? u.profile.birthDate.toISOString().slice(0, 10) : "—"}
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">Phone:</span>{" "}
                {u.profile.phone ?? "—"}
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">Language:</span>{" "}
                {u.profile.language ?? "—"}
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">Residence:</span>{" "}
                {u.profile.countryResidence ?? "—"}
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">Citizenship:</span>{" "}
                {u.profile.countryCitizenship ?? "—"}
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">Tax:</span>{" "}
                {u.profile.countryTax ?? "—"}
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">City:</span>{" "}
                {u.profile.addressCity ?? "—"}
              </div>
              <div className="md:col-span-2">
                <span className="text-slate-600 dark:text-slate-400">Street:</span>{" "}
                {u.profile.addressStreet ?? "—"}
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">Postal:</span>{" "}
                {u.profile.addressPostal ?? "—"}
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">EE ID (isikukood):</span>{" "}
                {u.profile.isikukood ?? "—"}
              </div>
            </div>
          )}
        </section>

        {/* Row 2: KYC data */}
        <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="text-sm font-semibold mb-3">KYC data</h2>

          {!u.kycData ? (
            <div className="text-sm text-slate-600 dark:text-slate-400">
              No KYC data yet.
            </div>
          ) : (
            <>
              <div className="grid gap-2 text-sm md:grid-cols-2">
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Consent:</span>{" "}
                  {u.kycData.consent ? "Yes" : "No"}
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">PEP declared:</span>{" "}
                  {u.kycData.pepDeclared === null || u.kycData.pepDeclared === undefined
                    ? "—"
                    : u.kycData.pepDeclared
                      ? "Yes"
                      : "No"}
                </div>
                <div className="md:col-span-2">
                  <span className="text-slate-600 dark:text-slate-400">PEP details:</span>{" "}
                  {u.kycData.pepDetails ?? "—"}
                </div>

                <div>
                  <span className="text-slate-600 dark:text-slate-400">Passport number:</span>{" "}
                  <span className="font-mono">{u.kycData.passportNumber ?? "—"}</span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Passport country:</span>{" "}
                  {u.kycData.passportCountry ?? "—"}
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Issued at:</span>{" "}
                  {u.kycData.passportIssuedAt ? u.kycData.passportIssuedAt.toISOString().slice(0, 10) : "—"}
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Expires at:</span>{" "}
                  {u.kycData.passportExpiresAt ? u.kycData.passportExpiresAt.toISOString().slice(0, 10) : "—"}
                </div>
                <div className="md:col-span-2">
                  <span className="text-slate-600 dark:text-slate-400">Issuer:</span>{" "}
                  {u.kycData.passportIssuer ?? "—"}
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                  Document image
                </div>
                {!hasImage ? (
                  <div className="text-sm text-slate-600 dark:text-slate-400">—</div>
                ) : (
                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800 bg-white dark:bg-slate-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={doc as string}
                      alt="KYC document"
                      className="w-full max-h-[520px] object-contain rounded-md"
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {/* Row 2: KYC */}
        <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="text-sm font-semibold mb-3">KYC</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-400">Status</dt>
              <dd>{u.kycStatus}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-400">Zone</dt>
              <dd>{u.kycCountryZone ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-400">Updated</dt>
              <dd>{formatDateTime(u.kycUpdatedAt)}</dd>
            </div>
          </dl>

          <UserKycActionsClient userId={u.id} initialStatus={u.kycStatus} initialNote={u.kycNote ?? null} />
        </section>

        {/* Archive */}
        <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-800 lg:col-span-2">
          <h2 className="text-sm font-semibold mb-3">
            KYC archive{" "}
            <span className="text-xs text-slate-600 dark:text-slate-400">
              ({u.kycArchives.length})
            </span>
          </h2>

          {u.kycArchives.length === 0 ? (
            <div className="text-sm text-slate-600 dark:text-slate-400">
              No archived snapshots yet.
            </div>
          ) : (
            <div className="space-y-3">
              {u.kycArchives.map((a) => {
                const aDoc = a.documentImage ?? null;
                const aHasImage = typeof aDoc === "string" && aDoc.startsWith("data:image");

                return (
                  <details
                    key={a.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-950/30"
                  >
                    <summary className="cursor-pointer select-none px-3 py-2 text-sm">
                      <span className="font-mono">{formatDateTime(a.createdAt)}</span>
                      <span className="ml-3 text-slate-600 dark:text-slate-400">
                        reason: {a.reason ?? "—"}
                      </span>
                      <span className="ml-3 text-slate-600 dark:text-slate-400">
                        by: {a.archivedBy?.email ?? "system"}
                      </span>
                      <span className="ml-3 text-slate-600 dark:text-slate-400">
                        prev: {a.prevKycStatus ?? "—"}
                      </span>
                    </summary>

                    <div className="px-3 pb-3 pt-2">
                      <div className="mb-3">
                        <KycArchiveActionsClient archiveId={a.id} />
                      </div>
                      <div className="grid gap-2 text-sm md:grid-cols-2">
                        <div>
                          <span className="text-slate-600 dark:text-slate-400">Prev zone:</span>{" "}
                          {a.prevKycCountryZone ?? "—"}
                        </div>
                        <div>
                          <span className="text-slate-600 dark:text-slate-400">Prev updated:</span>{" "}
                          {formatDateTime(a.prevKycUpdatedAt ?? null)}
                        </div>
                        <div className="md:col-span-2">
                          <span className="text-slate-600 dark:text-slate-400">Prev note:</span>{" "}
                          {a.prevKycNote ?? "—"}
                        </div>

                        <div>
                          <span className="text-slate-600 dark:text-slate-400">Consent:</span>{" "}
                          {a.consent ? "Yes" : "No"}
                        </div>
                        <div>
                          <span className="text-slate-600 dark:text-slate-400">PEP declared:</span>{" "}
                          {a.pepDeclared === null || a.pepDeclared === undefined
                            ? "—"
                            : a.pepDeclared
                              ? "Yes"
                              : "No"}
                        </div>
                        <div className="md:col-span-2">
                          <span className="text-slate-600 dark:text-slate-400">PEP details:</span>{" "}
                          {a.pepDetails ?? "—"}
                        </div>

                        <div>
                          <span className="text-slate-600 dark:text-slate-400">Passport number:</span>{" "}
                          <span className="font-mono">{a.passportNumber ?? "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 dark:text-slate-400">Passport country:</span>{" "}
                          {a.passportCountry ?? "—"}
                        </div>
                        <div>
                          <span className="text-slate-600 dark:text-slate-400">Issued at:</span>{" "}
                          {a.passportIssuedAt ? a.passportIssuedAt.toISOString().slice(0, 10) : "—"}
                        </div>
                        <div>
                          <span className="text-slate-600 dark:text-slate-400">Expires at:</span>{" "}
                          {a.passportExpiresAt ? a.passportExpiresAt.toISOString().slice(0, 10) : "—"}
                        </div>
                        <div className="md:col-span-2">
                          <span className="text-slate-600 dark:text-slate-400">Issuer:</span>{" "}
                          {a.passportIssuer ?? "—"}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                          Archived document image
                        </div>
                        {!aHasImage ? (
                          <div className="text-sm text-slate-600 dark:text-slate-400">—</div>
                        ) : (
                          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800 bg-white dark:bg-slate-950">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={aDoc as string}
                              alt="Archived KYC document"
                              className="w-full max-h-[520px] object-contain rounded-md"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}