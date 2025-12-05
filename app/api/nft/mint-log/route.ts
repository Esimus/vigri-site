// app/api/nft/mint-log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as {
      wallet?: string;
      tierId?: number;
      quantity?: number;
      txSignature?: string;
      network?: string;
      paidSol?: number;
    } | null;

    if (!body) {
      return NextResponse.json(
        { ok: false, error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const { wallet, tierId, quantity, txSignature, network, paidSol } = body;

    if (!wallet || typeof wallet !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'wallet is required' },
        { status: 400 },
      );
    }
    if (typeof tierId !== 'number') {
      return NextResponse.json(
        { ok: false, error: 'tierId must be a number' },
        { status: 400 },
      );
    }
    if (!txSignature || typeof txSignature !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'txSignature is required' },
        { status: 400 },
      );
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const net = network || 'devnet';
    const paid =
      typeof paidSol === 'number' && paidSol > 0 ? paidSol : 0;

    const event = await prisma.nftMintEvent.create({
    data: {
        // userId can be added later from the session; skipped for now
        wallet,
        tierId,
        quantity: qty,
        txSignature,
        network: net,
        paidSol: paid,
      },
    });

    return NextResponse.json({ ok: true, eventId: event.id });
  } catch (err) {
    console.error('mint-log error', err);
    return NextResponse.json(
      { ok: false, error: 'Internal error' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const wallet = searchParams.get('wallet');
  const net = searchParams.get('network') ?? 'devnet';

  if (!wallet) {
    return NextResponse.json(
      { ok: false, error: 'Missing wallet' },
      { status: 400 },
    );
  }

  try {
    const events = await prisma.nftMintEvent.findMany({
      where: {
        wallet,
        network: net,
      },
      orderBy: {
        id: 'desc', // fresh on top
      },
      take: 100, // protective limit
    });

    return NextResponse.json({ ok: true, items: events });
    } catch (err: unknown) {
        console.error('mint-log error', err);
        return NextResponse.json(
            { ok: false, error: 'Internal error' },
            { status: 500 },
        );
    }
}
