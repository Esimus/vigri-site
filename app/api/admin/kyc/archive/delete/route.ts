// app/api/admin/kyc/archive/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import type { UserRole } from "@prisma/client";

export const runtime = "nodejs";

// Deletion is more sensitive: admin only
const ALLOWED_ROLES: UserRole[] = ["admin"];

function getString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
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
      select: { id: true, userId: true, createdAt: true, reason: true },
    });

    if (!a) return { ok: false as const, status: 404 as const, error: "NotFound" as const };

    await tx.kycDataArchive.delete({ where: { id: archiveId } });

    await tx.adminAuditLog.create({
      data: {
        actorId: user.id,
        action: "kyc.archive.delete",
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