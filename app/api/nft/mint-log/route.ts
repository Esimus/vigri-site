// app/api/nft/mint-log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE } from '@/lib/session';
import { creditEcho } from '@/lib/echo';

export const runtime = 'nodejs';

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const parts = header.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.split('=');
    if (k && k.trim() === name) {
      return decodeURIComponent(rest.join('=').trim());
    }
  }
  return null;
}

async function resolveSessionUserId(req: NextRequest): Promise<string | null> {
  const cookieHeader = req.headers.get('cookie');
  const sid = readCookie(cookieHeader, SESSION_COOKIE);
  if (!sid) return null;

  const session = await prisma.session
    .findUnique({
      where: { id: sid },
      select: { userId: true, idleExpires: true },
    })
    .catch(() => null);

  if (!session) return null;

  const now = BigInt(Date.now());
  if (session.idleExpires <= now) return null;

  return session.userId;
}

function getEchoSelfForTier(tierId: number): number {
  switch (tierId) {
    case 0: // Tree / Steel
      return 10;
    case 1: // Bronze
      return 40;
    case 2: // Silver
      return 200;
    case 3: // Gold
      return 800;
    case 4: // Platinum
      return 1600;
    default:
      return 0;
  }
}

async function awardEchoForMint(params: {
  buyerUserId: string | null;
  tierId: number;
  quantity: number;
  txSignature: string;
  network: string;
}) {
  const { buyerUserId, tierId, quantity, txSignature, network } = params;

  if (!buyerUserId) return;
  if (!Number.isFinite(tierId) || quantity <= 0) return;

  const echoSelf = getEchoSelfForTier(tierId);
  if (echoSelf <= 0) return;

  const buyerEchoTotal = echoSelf * quantity;
  if (buyerEchoTotal <= 0) return;

  const me = await prisma.user.findUnique({
    where: { id: buyerUserId },
    select: { id: true, referrerId: true },
  });
  if (!me) return;

  const l1 = me.referrerId ?? null;

  const l2User = l1
    ? await prisma.user.findUnique({
        where: { id: l1 },
        select: { referrerId: true },
      })
    : null;
  const l2 = l2User?.referrerId ?? null;

  const l3User = l2
    ? await prisma.user.findUnique({
        where: { id: l2 },
        select: { referrerId: true },
      })
    : null;
  const l3 = l3User?.referrerId ?? null;

  const sourceId = `mint:${txSignature}`;
  const metaBase = { network, tierId, quantity };

  try {
    await creditEcho(prisma, {
      userId: buyerUserId,
      kind: 'purchase',
      action: 'purchase.nft.self',
      amount: buyerEchoTotal,
      sourceId,
      dedupeKey: `mint:self:${txSignature}`,
      meta: metaBase,
    });
  } catch (e) {
    console.error('echo award (buyer) failed', e);
  }

  const awardLevel = async (levelUserId: string | null, lvl: 1 | 2 | 3) => {
    if (!levelUserId) return;

    let pct: number;
    if (lvl === 1) pct = 0.30;
    else if (lvl === 2) pct = 0.10;
    else pct = 0.05;

    let amount = Math.floor(buyerEchoTotal * pct);

    if (lvl === 3 && amount < 1) amount = 1;
    if (amount <= 0) return;

    const action =
      lvl === 1 ? 'referral.purchase.l1' : lvl === 2 ? 'referral.purchase.l2' : 'referral.purchase.l3';

    try {
      await creditEcho(prisma, {
        userId: levelUserId,
        kind: 'referral',
        action,
        amount,
        sourceId,
        dedupeKey: `mint:${txSignature}:l${lvl}`,
        meta: metaBase,
      });
    } catch (e) {
      console.error(`echo award (L${lvl}) failed`, e);
    }
  };

  await awardLevel(l1, 1);
  await awardLevel(l2, 2);
  await awardLevel(l3, 3);
}

export async function POST(req: NextRequest) {
  try {
    const sessionUserId = await resolveSessionUserId(req);

    const body = (await req.json().catch(() => null)) as
      | {
          wallet?: string;
          tierId?: number;
          quantity?: number;
          txSignature?: string;
          network?: string;
          paidSol?: number;
          designChoice?: number;
          withPhysical?: boolean;
        }
      | null;

    if (!body) {
      return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      wallet,
      tierId,
      quantity,
      txSignature,
      network,
      paidSol,
      designChoice,
      withPhysical,
    } = body;

    if (!wallet || typeof wallet !== 'string') {
      return NextResponse.json({ ok: false, error: 'wallet is required' }, { status: 400 });
    }
    if (typeof tierId !== 'number') {
      return NextResponse.json({ ok: false, error: 'tierId must be a number' }, { status: 400 });
    }
    if (!txSignature || typeof txSignature !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'txSignature is required' },
        { status: 400 },
      );
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const net = typeof network === 'string' && network.length > 0 ? network : 'devnet';
    const paid = typeof paidSol === 'number' && paidSol > 0 ? paidSol : 0;

    const designChoiceIn =
      typeof designChoice === 'number' && Number.isFinite(designChoice)
        ? designChoice
        : null;

    const withPhysicalIn = typeof withPhysical === 'boolean' ? withPhysical : null;

    let buyerFirstName: string | null = null;
    let buyerLastName: string | null = null;

    if (sessionUserId) {
      const user = await prisma.user
        .findUnique({
          where: { id: sessionUserId },
          include: { profile: true },
        })
        .catch(() => null);

      if (user?.profile) {
        buyerFirstName = user.profile.firstName || null;
        buyerLastName = user.profile.lastName || null;
      }
    }

    const event = await prisma.nftMintEvent.create({
      data: {
        userId: sessionUserId,
        wallet,
        tierId,
        quantity: qty,
        txSignature,
        network: net,
        paidSol: paid,
        buyerFirstName,
        buyerLastName,
        designChoice: tierId === 0 ? designChoiceIn : null,
        withPhysical: tierId === 2 ? withPhysicalIn : null,
        // tierCode / serial / designKey / collectorId will be filled later from on-chain data
      },
    });

    try {
      await awardEchoForMint({
        buyerUserId: sessionUserId,
        tierId,
        quantity: qty,
        txSignature,
        network: net,
      });
    } catch (e) {
      console.error('awardEchoForMint failed', e);
    }

    return NextResponse.json({ ok: true, eventId: event.id });
  } catch (err) {
    console.error('mint-log error', err);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const wallet = searchParams.get('wallet');
  const net = searchParams.get('network') ?? 'devnet';

  if (!wallet) {
    return NextResponse.json({ ok: false, error: 'Missing wallet' }, { status: 400 });
  }

  try {
    const events = await prisma.nftMintEvent.findMany({
      where: {
        wallet,
        network: net,
      },
      orderBy: {
        id: 'desc',
      },
      take: 100,
    });

    return NextResponse.json({ ok: true, items: events });
  } catch (err: unknown) {
    console.error('mint-log error', err);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
