// app/api/pilot-clubs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function parseLimit(req: NextRequest): number {
  const url = new URL(req.url);
  const raw = url.searchParams.get("limit");
  const n = raw ? Number(raw) : 100;
  if (!Number.isFinite(n) || n <= 0) return 100;
  return Math.min(200, Math.floor(n));
}

export async function GET(req: NextRequest) {
  const limit = parseLimit(req);

  const rows = await prisma.pilotClub.findMany({
    where: { status: "published" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
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
    },
  });

  return NextResponse.json({
    ok: true,
    items: rows,
  });
}