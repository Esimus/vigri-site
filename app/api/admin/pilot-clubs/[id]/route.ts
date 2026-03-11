// app/api/admin/pilot-clubs/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import type { PilotClubCategory, PilotClubStatus, UserRole } from "@/generated/prisma";

export const runtime = "nodejs";

const ALLOWED_ROLES: UserRole[] = ["admin", "support", "kyc_reviewer"];

const CategorySchema = z.enum(["sport", "dance", "music", "art"]);
const StatusSchema = z.enum(["draft", "published", "archived"]);

const UpdatePilotClubSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  slug: z.string().trim().max(80).optional(),
  status: StatusSchema.optional(),
  category: CategorySchema.nullish(),

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

function normalizeString(value: string | null | undefined): string | null {
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminRole();
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, error: guard.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: guard.status },
    );
  }

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
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    item: {
      ...club,
      createdAt: club.createdAt.toISOString(),
      updatedAt: club.updatedAt.toISOString(),
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminRole();
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, error: guard.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: guard.status },
    );
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdatePilotClubSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const data = parsed.data;

  const update: {
    name?: string;
    slug?: string | null;
    status?: PilotClubStatus;
    category?: PilotClubCategory | null;
    city?: string | null;
    country?: string | null;
    website?: string | null;
    instagram?: string | null;
    email?: string | null;
    quote?: string | null;
    logoUrl?: string | null;
    logoAlt?: string | null;
    pilotPhotoUrl?: string | null;
    pilotPhotoAlt?: string | null;
    pilotPhotoCaption?: string | null;
    pilotBadge?: string | null;
    verifiedInPerson?: boolean;
    nftCount?: number;
    vigriAllocation?: number;
    internalNote?: string | null;
    sortOrder?: number;
  } = {};

  if (typeof data.name !== "undefined") update.name = data.name.trim();
  if (typeof data.slug !== "undefined") {
    const normalized = data.slug.trim();
    update.slug = normalized ? slugify(normalized) : null;
  }
  if (typeof data.status !== "undefined") update.status = data.status as PilotClubStatus;
  if (typeof data.category !== "undefined") {
    update.category = data.category ? (data.category as PilotClubCategory) : null;
  }

  if (typeof data.city !== "undefined") update.city = normalizeString(data.city);
  if (typeof data.country !== "undefined") update.country = normalizeString(data.country);

  if (typeof data.website !== "undefined") update.website = normalizeString(data.website);
  if (typeof data.instagram !== "undefined") update.instagram = normalizeString(data.instagram);
  if (typeof data.email !== "undefined") update.email = normalizeString(data.email);

  if (typeof data.quote !== "undefined") update.quote = normalizeString(data.quote);

  if (typeof data.logoUrl !== "undefined") update.logoUrl = normalizeString(data.logoUrl);
  if (typeof data.logoAlt !== "undefined") update.logoAlt = normalizeString(data.logoAlt);

  if (typeof data.pilotPhotoUrl !== "undefined") {
    update.pilotPhotoUrl = normalizeString(data.pilotPhotoUrl);
  }
  if (typeof data.pilotPhotoAlt !== "undefined") {
    update.pilotPhotoAlt = normalizeString(data.pilotPhotoAlt);
  }
  if (typeof data.pilotPhotoCaption !== "undefined") {
    update.pilotPhotoCaption = normalizeString(data.pilotPhotoCaption);
  }

  if (typeof data.pilotBadge !== "undefined") update.pilotBadge = normalizeString(data.pilotBadge);
  if (typeof data.verifiedInPerson !== "undefined") {
    update.verifiedInPerson = data.verifiedInPerson;
  }

  if (typeof data.nftCount !== "undefined") update.nftCount = data.nftCount;
  if (typeof data.vigriAllocation !== "undefined") update.vigriAllocation = data.vigriAllocation;

  if (typeof data.internalNote !== "undefined") {
    update.internalNote = normalizeString(data.internalNote);
  }
  if (typeof data.sortOrder !== "undefined") update.sortOrder = data.sortOrder;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 400 });
  }

  try {
    await prisma.pilotClub.update({
      where: { id },
      data: update,
      select: { id: true },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to update club" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}