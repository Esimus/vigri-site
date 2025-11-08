// app/api/echo/dev-credit/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { creditEcho, type EchoKind } from '@/lib/echo';

export const runtime = 'nodejs';

type DevCreditBody = {
  userId: string;
  kind: EchoKind;
  action: string;
  amount: number;
  sourceId?: string | null;
  refUserId?: string | null;
  meta?: Record<string, unknown>;
  dedupeKey?: string | null;
};

// DEV ONLY. Do NOT enable in production.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<DevCreditBody>;

  try {
    if (!body.userId || !body.kind || !body.action || typeof body.amount !== 'number') {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
    }

    const res = await creditEcho(prisma, {
      userId: body.userId,
      kind: body.kind,
      action: body.action,
      amount: body.amount,
      sourceId: body.sourceId ?? null,
      refUserId: body.refUserId ?? null,
      meta: body.meta ?? undefined,
      dedupeKey: body.dedupeKey ?? null,
    });
    return NextResponse.json({ ok: true, result: res });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'internal_error';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
