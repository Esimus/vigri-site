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

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, kycStatus: true, kycUpdatedAt: true },
  });

  if (!target) {
    return NextResponse.json({ ok: false, error: "NotFound" }, { status: 404 });
  }

  const ua = req.headers.get("user-agent") || null;

  await prisma.$transaction(async (tx) => {
    // Clear ONLY passport/document fields (keep base KYC like pep/consent)
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
          prevStatus: target.kycStatus,
          prevKycUpdatedAt: target.kycUpdatedAt ? target.kycUpdatedAt.toISOString() : null,
          cleared: ["passportNumber", "passportCountry", "passportIssuedAt", "passportExpiresAt", "passportIssuer", "documentImage"],
        },
        userAgent: ua,
      },
    });
  });

  return NextResponse.json({ ok: true });
}