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

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof value === "bigint") return Number(value);

  // Prisma Decimal-like objects (or anything with toString)
  if (typeof value === "object" && value !== null && "toString" in value) {
    const n = Number(String((value as { toString(): string }).toString()));
    return Number.isFinite(n) ? n : 0;
  }

  return 0;
}

function toJsonScalar(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return value.toString();
  return String(value);
}

type AllTimeEvent = {
  paidSol: unknown;
};

type RangeEvent = {
  id: unknown;
  createdAt: Date;
  tierId: unknown;
  tierCode: string | null;
  quantity: number | null;
  paidSol: unknown;
  wallet: string | null;
  txSignature: string | null;
};

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
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
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

  const endExclusive = new Date(endInclusive.getTime() + 24 * 60 * 60 * 1000);

  const allEvents: AllTimeEvent[] = await prisma.nftMintEvent.findMany({
    where: {
      network: "mainnet",
      paidSol: { gt: 0 },
    },
    select: { paidSol: true },
  });

  const totalAllTimeSol = allEvents.reduce<number>(
    (sum: number, ev: AllTimeEvent) => sum + toNumber(ev.paidSol),
    0,
  );

  const events: RangeEvent[] = await prisma.nftMintEvent.findMany({
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

  const totalRangeSol = events.reduce<number>(
    (sum: number, ev: RangeEvent) => sum + toNumber(ev.paidSol),
    0,
  );

  return NextResponse.json({
    ok: true,
    totalAllTimeSol,
    totalRangeSol,
    events: events.map((ev: RangeEvent) => ({
      id: toJsonScalar(ev.id),
      createdAt: ev.createdAt.toISOString(),
      tierId: toJsonScalar(ev.tierId),
      tierCode: ev.tierCode,
      quantity: ev.quantity ?? 1,
      paidSol: toNumber(ev.paidSol),
      wallet: ev.wallet,
      txSignature: ev.txSignature,
    })),
  });
}