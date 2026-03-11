// app/api/admin/pilot-clubs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import type { PilotClubCategory, PilotClubStatus, UserRole } from "@/generated/prisma";

export const runtime = "nodejs";

const ALLOWED_ROLES: UserRole[] = ["admin", "support", "kyc_reviewer"];

const CategorySchema = z.enum(["sport", "dance", "music", "art"]);
const StatusSchema = z.enum(["draft", "published", "archived"]);

const CreatePilotClubSchema = z.object({
  name: z.string().trim().min(1).max(160),
  status: StatusSchema.optional(),
  category: CategorySchema.optional(),

  city: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),

  website: z.string().trim().max(500).optional(),
  instagram: z.string().trim().max(500).optional(),
  email: z.string().trim().email().max(254).optional(),

  quote: z.string().trim().max(4000).optional(),

  logoUrl: z.string().trim().max(1000).optional(),
  logoAlt: z.string().trim().max(200).optional(),

  pilotPhotoUrl: z.string().trim().max(1000).optional(),
  pilotPhotoAlt: z.string().trim().max(200).optional(),
  pilotPhotoCaption: z.string().trim().max(200).optional(),

  pilotBadge: z.string().trim().max(120).optional(),
  verifiedInPerson: z.boolean().optional(),

  nftCount: z.number().int().min(0).optional(),
  vigriAllocation: z.number().int().min(0).optional(),

  internalNote: z.string().trim().max(4000).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

function parseLimit(req: NextRequest): number {
  const url = new URL(req.url);
  const raw = url.searchParams.get("limit");
  const n = raw ? Number(raw) : 200;
  if (!Number.isFinite(n) || n <= 0) return 200;
  return Math.min(500, Math.floor(n));
}

function normalizeString(value: string | undefined): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v ? v : null;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function requireAdminRole() {
  const user = await getAuthUser();
  if (!user) return { ok: false as const, status: 401 };

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (!dbUser || !ALLOWED_ROLES.includes(dbUser.role)) {
    return { ok: false as const, status: 403 };
  }

  return { ok: true as const };
}

export async function GET(req: NextRequest) {
  const guard = await requireAdminRole();
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, error: guard.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: guard.status },
    );
  }

  const limit = parseLimit(req);

  const rows = await prisma.pilotClub.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: limit,
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

  return NextResponse.json({
    ok: true,
    items: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminRole();
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, error: guard.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: guard.status },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreatePilotClubSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const data = parsed.data;

  const baseSlug = slugify(data.name);
  const slug = baseSlug || null;

  const created = await prisma.pilotClub.create({
    data: {
      name: data.name.trim(),
      slug,
      status: (data.status ?? "draft") as PilotClubStatus,
      category: (data.category ?? undefined) as PilotClubCategory | undefined,

      city: normalizeString(data.city),
      country: normalizeString(data.country),

      website: normalizeString(data.website),
      instagram: normalizeString(data.instagram),
      email: normalizeString(data.email),

      quote: normalizeString(data.quote),

      logoUrl: normalizeString(data.logoUrl),
      logoAlt: normalizeString(data.logoAlt),

      pilotPhotoUrl: normalizeString(data.pilotPhotoUrl),
      pilotPhotoAlt: normalizeString(data.pilotPhotoAlt),
      pilotPhotoCaption: normalizeString(data.pilotPhotoCaption),

      pilotBadge: normalizeString(data.pilotBadge),
      verifiedInPerson: data.verifiedInPerson ?? false,

      nftCount: data.nftCount ?? 0,
      vigriAllocation: data.vigriAllocation ?? 0,

      internalNote: normalizeString(data.internalNote),
      sortOrder: data.sortOrder ?? 0,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}