// app/api/admin/kyc/decision/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import type { UserRole, KycStatus } from "@prisma/client";

export const runtime = "nodejs";

const ALLOWED_ROLES: UserRole[] = ["admin", "kyc_reviewer"];

function getString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function parseStatus(v: unknown): KycStatus | null {
  if (v === "none" || v === "pending" || v === "approved" || v === "rejected") return v;
  return null;
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

  const body = (bodyUnknown ?? {}) as Record<string, unknown>;
  const userId = getString(body.userId);
  const nextStatus = parseStatus(body.status);
  const note = typeof body.note === "string" ? body.note.trim() : null;

  if (!userId) return NextResponse.json({ ok: false, error: "userId_required" }, { status: 400 });
  if (!nextStatus) return NextResponse.json({ ok: false, error: "status_invalid" }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, kycStatus: true, kycUpdatedAt: true, kycNote: true },
  });

  if (!target) return NextResponse.json({ ok: false, error: "NotFound" }, { status: 404 });

  const ua = req.headers.get("user-agent") || null;

  const action =
    nextStatus === "approved"
      ? "kyc.approve"
      : nextStatus === "rejected"
        ? "kyc.reject"
        : "kyc.set_status";

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        kycStatus: nextStatus,
        kycUpdatedAt: new Date(),
        kycNote: note && note.length ? note : null,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        actorId: user.id,
        action,
        targetType: "user",
        targetId: userId,
        meta: {
          prevStatus: target.kycStatus,
          nextStatus,
          prevNote: target.kycNote ?? null,
          nextNote: note && note.length ? note : null,
        },
        userAgent: ua,
      },
    });
  });

  return NextResponse.json({ ok: true });
}