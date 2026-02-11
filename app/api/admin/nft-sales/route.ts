// app/api/admin/nft-sales/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const s = value.trim();
  if (!s) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  // allow only admin / support
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (!dbUser || (dbUser.role !== "admin" && dbUser.role !== "support")) {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 },
    );
  }

  const { searchParams } = req.nextUrl;
  const startStr = searchParams.get("start");
  const endStr = searchParams.get("end");

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  const defaultStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const defaultEndExclusive = new Date(
    Date.UTC(year, month + 1, 1, 0, 0, 0, 0),
  );

  let start = parseDate(startStr);
  let endInclusive = parseDate(endStr);

  if (!start || !endInclusive || start > endInclusive) {
    start = defaultStart;
    endInclusive = new Date(defaultEndExclusive.getTime() - 1);
  }

  const endExclusive = new Date(
    endInclusive.getTime() + 24 * 60 * 60 * 1000,
  );

  const allEvents = await prisma.nftMintEvent.findMany({
    where: {
      network: "mainnet",
      paidSol: { gt: 0 },
    },
    select: { paidSol: true },
  });

  const totalAllTimeSol = allEvents.reduce(
    (sum, ev) => sum + ev.paidSol,
    0,
  );

  const events = await prisma.nftMintEvent.findMany({
    where: {
      network: "mainnet",
      paidSol: { gt: 0 },
      createdAt: {
        gte: start,
        lt: endExclusive,
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      tierId: true,
      tierCode: true,
      quantity: true,
      paidSol: true,
      wallet: true,
      txSignature: true,
    },
  });

  const totalRangeSol = events.reduce(
    (sum, ev) => sum + ev.paidSol,
    0,
  );

  return NextResponse.json({
    ok: true,
    totalAllTimeSol,
    totalRangeSol,
    events: events.map((ev) => ({
      id: ev.id,
      createdAt: ev.createdAt.toISOString(),
      tierId: ev.tierId,
      tierCode: ev.tierCode,
      quantity: ev.quantity ?? 1,
      paidSol: ev.paidSol,
      wallet: ev.wallet,
      txSignature: ev.txSignature,
    })),
  });
}
