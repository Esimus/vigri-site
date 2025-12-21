// app/api/echo/balance/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// GET /api/echo/balance?userId=...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ ok: false, error: 'missing_userId' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { balanceEcho: true, participationScore: true },
  });
  if (!user) {
    return NextResponse.json({ ok: false, error: 'user_not_found' }, { status: 404 });
  }

  // stored in micro-echo (uecho)
  return NextResponse.json({
    ok: true,
    balanceEchoUe: user.balanceEcho,
    participationScoreUe: user.participationScore,
    balanceEcho: user.balanceEcho / 1_000_000,
    participationScore: user.participationScore / 1_000_000,
  });
}
