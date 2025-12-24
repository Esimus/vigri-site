// app/api/referral/check-inviter-email/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type CheckUser = {
  id: string;
  email: string;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
};

type CheckResp =
  | { ok: true; exists: boolean; user: CheckUser | null }
  | { ok: false; error: string };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const emailRaw = (searchParams.get('email') ?? '').trim().toLowerCase();

  if (!emailRaw || !emailRaw.includes('@')) {
    const out: CheckResp = { ok: false, error: 'bad_email' };
    return NextResponse.json(out, { status: 400 });
  }

  const u = await prisma.user.findUnique({
    where: { email: emailRaw },
    select: {
      id: true,
      email: true,
      createdAt: true,
      profile: { select: { firstName: true, lastName: true } },
    },
  });

  const out: CheckResp = {
    ok: true,
    exists: !!u,
    user: u
      ? {
          id: u.id,
          email: u.email,
          createdAt: u.createdAt.toISOString(),
          firstName: u.profile?.firstName ?? null,
          lastName: u.profile?.lastName ?? null,
        }
      : null,
  };

  return NextResponse.json(out);
}
