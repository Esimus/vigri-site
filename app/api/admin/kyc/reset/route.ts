// app/api/admin/kyc/reset/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import type { UserRole, KycStatus } from "@prisma/client";

export const runtime = "nodejs";

const ALLOWED_ROLES: UserRole[] = ["admin", "kyc_reviewer"];

function getString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

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

  const userId = getString((bodyUnknown as { userId?: unknown } | null)?.userId);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "userId_required" }, { status: 400 });
  }

  const ua = req.headers.get("user-agent") || null;

  const result = await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        kycStatus: true,
        kycCountryZone: true,
        kycUpdatedAt: true,
        kycNote: true,
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
      },
    });

    if (!target) {
      return { ok: false as const, status: 404 as const, error: "NotFound" as const };
    }

    const hasSomethingToArchive =
      Boolean(target.kycData) ||
      target.kycStatus !== "none" ||
      target.kycUpdatedAt !== null ||
      (target.kycNote ?? "").trim().length > 0;

    let archiveId: string | null = null;

    if (hasSomethingToArchive) {
      const archived = await tx.kycDataArchive.create({
        data: {
          userId,
          archivedById: user.id,
          reason: "reset",

          prevKycStatus: target.kycStatus,
          prevKycCountryZone: target.kycCountryZone,
          prevKycUpdatedAt: target.kycUpdatedAt,
          prevKycNote: (target.kycNote ?? "").trim() ? target.kycNote : null,

          pepDeclared: target.kycData?.pepDeclared ?? null,
          pepDetails: target.kycData?.pepDetails ?? null,
          consent: target.kycData?.consent ?? null,

          passportNumber: target.kycData?.passportNumber ?? null,
          passportCountry: target.kycData?.passportCountry ?? null,
          passportIssuedAt: target.kycData?.passportIssuedAt ?? null,
          passportExpiresAt: target.kycData?.passportExpiresAt ?? null,
          passportIssuer: target.kycData?.passportIssuer ?? null,

          documentImage: target.kycData?.documentImage ?? null,
        },
        select: { id: true },
      });

      archiveId = archived.id;
    }

    // Clear ONLY passport/document fields (base KYC stays)
    await tx.kycData.updateMany({
      where: { userId },
      data: {
        passportNumber: null,
        passportCountry: null,
        passportIssuedAt: null,
        passportExpiresAt: null,
        passportIssuer: null,
        documentImage: null,
      },
    });

    const nextStatus: KycStatus = "none";

    await tx.user.update({
      where: { id: userId },
      data: {
        kycStatus: nextStatus,
        kycCountryZone: null,
        kycUpdatedAt: new Date(),
      },
    });

    await tx.adminAuditLog.create({
      data: {
        actorId: user.id,
        action: "kyc.reset",
        targetType: "user",
        targetId: userId,
        meta: {
          archiveId,
          cleared: [
            "passportNumber",
            "passportCountry",
            "passportIssuedAt",
            "passportExpiresAt",
            "passportIssuer",
            "documentImage",
          ],
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