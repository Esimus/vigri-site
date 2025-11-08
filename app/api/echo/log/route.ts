// app/api/echo/log/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// GET /api/echo/log?userId=...&limit=20&cursor=...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100);
  const cursor = searchParams.get('cursor'); // EchoLog.id

  if (!userId) {
    return NextResponse.json({ ok: false, error: 'missing_userId' }, { status: 400 });
  }

  const rows = await prisma.echoLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      kind: true,
      action: true,
      amountUe: true,
      bucket: true,
      sourceId: true,
      refUserId: true,
      meta: true,
      createdAt: true,
    },
  });

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(r => ({
    ...r,
    amount: r.amountUe / 1_000_000, // echo
  }));

  return NextResponse.json({
    ok: true,
    items,
    nextCursor: hasMore ? rows[limit]!.id : null,
  });
}
