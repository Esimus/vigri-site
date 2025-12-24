// app/api/referral/invitee-meta/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type Resp =
  | { ok: true; createdAt: string; emailVerified: boolean; emailVerifiedAt: string | null }
  | { ok: false; error: string };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    const out: Resp = { ok: false, error: 'missing_userId' };
    return NextResponse.json(out, { status: 400 });
  }

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      createdAt: true,
      emailVerified: true,
      verifyTokens: {
        where: { consumedAt: { not: null } },
        orderBy: { consumedAt: 'desc' },
        take: 1,
        select: { consumedAt: true },
      },
    },
  });

  if (!u) {
    const out: Resp = { ok: false, error: 'user_not_found' };
    return NextResponse.json(out, { status: 404 });
  }

  const emailVerifiedAt =
    u.emailVerified && u.verifyTokens.length > 0 && u.verifyTokens[0]?.consumedAt
      ? u.verifyTokens[0].consumedAt.toISOString()
      : null;

  const out: Resp = {
    ok: true,
    createdAt: u.createdAt.toISOString(),
    emailVerified: u.emailVerified,
    emailVerifiedAt,
  };

  return NextResponse.json(out);
}
