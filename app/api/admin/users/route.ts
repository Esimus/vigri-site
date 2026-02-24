// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import type { KycStatus, UserRole, UserProfile } from "@prisma/client";

type ProfileForCompletion = Pick<
  UserProfile,
  | "firstName"
  | "lastName"
  | "birthDate"
  | "countryResidence"
  | "countryCitizenship"
  | "countryTax"
  | "addressCity"
  | "language"
>;

export const runtime = "nodejs";

const ALLOWED_ROLES: UserRole[] = ["admin", "support", "kyc_reviewer"];

function parseLimit(req: NextRequest): number {
  const url = new URL(req.url);
  const raw = url.searchParams.get("limit");
  const n = raw ? Number(raw) : 100;
  if (!Number.isFinite(n) || n <= 0) return 100;
  return Math.min(500, Math.floor(n));
}

function parseKycStatus(value: string | null): KycStatus | null {
  if (!value) return null;
  const v = value.trim();
  if (v === "none" || v === "pending" || v === "approved" || v === "rejected") return v;
  return null;
}

function isProfileCompleted(p: ProfileForCompletion | null): boolean {
  if (!p) return false;
  return Boolean(
    p.firstName &&
      p.lastName &&
      p.birthDate &&
      p.countryResidence &&
      p.countryCitizenship &&
      p.countryTax &&
      p.addressCity &&
      p.language,
  );
}

export async function GET(req: NextRequest) {
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

  const url = new URL(req.url);
  const qRaw = url.searchParams.get("q");
  const q = typeof qRaw === "string" ? qRaw.trim() : "";
  const status = parseKycStatus(url.searchParams.get("status"));
  const limit = parseLimit(req);

  const where: Record<string, unknown> = {};
  if (status) where.kycStatus = status;
  if (q) {
    where.email = { contains: q, mode: "insensitive" };
  }

  const [users, grouped] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        email: true,
        emailVerified: true,
        createdAt: true,
        role: true,
        kycStatus: true,
        kycCountryZone: true,
        kycUpdatedAt: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            birthDate: true,
            countryResidence: true,
            countryCitizenship: true,
            countryTax: true,
            addressCity: true,
            language: true,
            isikukood: true,
          },
        },
      },
    }),
    prisma.user.groupBy({
      by: ["kycStatus"],
      _count: { _all: true },
    }),
  ]);

  const totals: Record<KycStatus, number> = {
    none: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  for (const row of grouped) {
    totals[row.kycStatus] = row._count._all;
  }

  return NextResponse.json({
    ok: true,
    limit,
    totals,
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt.toISOString(),
      role: u.role,
      kycStatus: u.kycStatus,
      kycCountryZone: u.kycCountryZone,
      kycUpdatedAt: u.kycUpdatedAt ? u.kycUpdatedAt.toISOString() : null,
      hasProfile: Boolean(u.profile),
      profileCompleted: isProfileCompleted(u.profile),
      profileName: u.profile ? `${u.profile.firstName} ${u.profile.lastName}`.trim() : null,
      countryResidence: u.profile?.countryResidence ?? null,
      isikukood: u.profile?.isikukood ?? null,
    })),
  });
}