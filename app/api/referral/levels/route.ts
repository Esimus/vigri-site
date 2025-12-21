// app/api/referral/levels/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type Err = { ok: false; error: string };
type LevelUser = { id: string; email: string | null; createdAt: string };
type Ok = {
  ok: true;
  userId: string;
  L1: { count: number; users: LevelUser[] };
  L2: { count: number; users: LevelUser[] };
  L3: { count: number; users: LevelUser[] };
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json<Err>({ ok: false, error: 'missing_userId' }, { status: 400 });
    }

    // L1: прямые рефералы
    const l1UsersRaw = await prisma.user.findMany({
      where: { referrerId: userId },
      select: { id: true, email: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
    const l1Ids = l1UsersRaw.map(u => u.id);

    // L2
    const l2UsersRaw = l1Ids.length
      ? await prisma.user.findMany({
          where: { referrerId: { in: l1Ids } },
          select: { id: true, email: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 25,
        })
      : [];

    const l2Ids = l2UsersRaw.map(u => u.id);

    // L3
    const l3UsersRaw = l2Ids.length
      ? await prisma.user.findMany({
          where: { referrerId: { in: l2Ids } },
          select: { id: true, email: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 25,
        })
      : [];

    // Точные количества (без лимитов)
    const [l1Count, l2Count, l3Count] = await Promise.all([
      prisma.user.count({ where: { referrerId: userId } }),
      l1Ids.length ? prisma.user.count({ where: { referrerId: { in: l1Ids } } }) : Promise.resolve(0),
      l2Ids.length ? prisma.user.count({ where: { referrerId: { in: l2Ids } } }) : Promise.resolve(0),
    ]);

    const norm = (xs: { id: string; email: string | null; createdAt: Date }[]): LevelUser[] =>
      xs.map(x => ({ id: x.id, email: x.email, createdAt: x.createdAt.toISOString() }));

    const res: Ok = {
      ok: true,
      userId,
      L1: { count: l1Count, users: norm(l1UsersRaw) },
      L2: { count: l2Count, users: norm(l2UsersRaw) },
      L3: { count: l3Count, users: norm(l3UsersRaw) },
    };

    return NextResponse.json(res);
  } catch (e) {
    // чтобы точно не было «пустого» ответа
    const msg = e instanceof Error ? e.message : 'unknown_error';
    return NextResponse.json<Err>({ ok: false, error: `internal:${msg}` }, { status: 500 });
  }
}
