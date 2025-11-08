// app/api/referral/stats/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json<Err>({ ok: false, error: 'missing_userId' }, { status: 400 });
  }

  // В схеме нет поля `name`, берём только email + связи referrer/referrals
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      referrer: { select: { id: true, email: true } },
      referrals: {
        select: { id: true, email: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!me) {
    return NextResponse.json<Err>({ ok: false, error: 'user_not_found' }, { status: 404 });
  }

  const data: Ok<{
    user: { id: string; name: string | null; email: string | null };
    inviter: { id: string; name: string | null; email: string | null } | null;
    referrals: Array<{ id: string; name: string | null; email: string | null; createdAt: string }>;
    count: number;
  }> = {
    ok: true,
    user: { id: me.id, name: null, email: me.email ?? null },
    inviter: me.referrer
      ? { id: me.referrer.id, name: null, email: me.referrer.email ?? null }
      : null,
    referrals: me.referrals.map((r) => ({
      id: r.id,
      name: null,
      email: r.email ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    count: me.referrals.length,
  };

  return NextResponse.json(data);
}
