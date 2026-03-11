// app/api/admin/kyc/archive/restore/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import type { UserRole, KycStatus } from "@/generated/prisma";

export const runtime = "nodejs";

const ALLOWED_ROLES: UserRole[] = ["admin", "kyc_reviewer"];

function getString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function normalizeStatus(s: KycStatus | null | undefined): KycStatus {
  return s === "pending" || s === "approved" || s === "rejected" || s === "none" ? s : "none";
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (!dbUser || !ALLOWED_ROLES.includes(dbUser.role)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let bodyUnknown: unknown = {};
  try {
    bodyUnknown = await req.json();
  } catch {
    // ignore
  }

  const archiveId = getString((bodyUnknown as { archiveId?: unknown } | null)?.archiveId);
  if (!archiveId) {
    return NextResponse.json({ ok: false, error: "archiveId_required" }, { status: 400 });
  }

  const ua = req.headers.get("user-agent") || null;

  const result = await prisma.$transaction(async (tx) => {
    const a = await tx.kycDataArchive.findUnique({
      where: { id: archiveId },
      select: {
        id: true,
        userId: true,
        createdAt: true,
        reason: true,
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
    });

    if (!a) return { ok: false as const, status: 404 as const, error: "NotFound" as const };

    // Restore snapshot back into current KycData
    await tx.kycData.upsert({
      where: { userId: a.userId },
      create: {
        userId: a.userId,
        pepDeclared: a.pepDeclared,
        pepDetails: a.pepDetails,
        consent: a.consent,
        passportNumber: a.passportNumber,
        passportCountry: a.passportCountry,
        passportIssuedAt: a.passportIssuedAt,
        passportExpiresAt: a.passportExpiresAt,
        passportIssuer: a.passportIssuer,
        documentImage: a.documentImage,
      },
      update: {
        pepDeclared: a.pepDeclared,
        pepDetails: a.pepDetails,
        consent: a.consent,
        passportNumber: a.passportNumber,
        passportCountry: a.passportCountry,
        passportIssuedAt: a.passportIssuedAt,
        passportExpiresAt: a.passportExpiresAt,
        passportIssuer: a.passportIssuer,
        documentImage: a.documentImage,
      },
    });

    await tx.user.update({
      where: { id: a.userId },
      data: {
        kycStatus: normalizeStatus(a.prevKycStatus),
        kycCountryZone: a.prevKycCountryZone ?? null,
        kycUpdatedAt: a.prevKycUpdatedAt ?? null,
        kycNote: a.prevKycNote ?? null,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        actorId: user.id,
        action: "kyc.archive.restore",
        targetType: "kyc_archive",
        targetId: a.id,
        meta: {
          archiveId: a.id,
          userId: a.userId,
          archivedAt: a.createdAt.toISOString(),
          reason: a.reason ?? null,
        },
        userAgent: ua,
      },
    });

    return { ok: true as const, status: 200 as const };
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}