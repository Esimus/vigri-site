// app/api/auth/reset/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';
import { hashPassword } from '@/lib/crypto';

export const runtime = 'nodejs';

function sha256hex(s: string) {
  return createHash('sha256').update(s).digest('hex');
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export async function POST(req: Request) {
  try {
    let bodyUnknown: unknown = {};
    try {
      bodyUnknown = await req.json();
    } catch {
      // ignore malformed JSON
    }
    const body = isObject(bodyUnknown) ? bodyUnknown : {};
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const password = typeof body.password === 'string' ? body.password.trim() : '';

    if (!token || !password) {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ ok: false, error: 'weak_password' }, { status: 400 });
    }

    const tokenHash = sha256hex(token);
    const rec = await prisma.resetPasswordToken.findUnique({
      where: { tokenHash },
      select: { userId: true, expiresAt: true, consumedAt: true },
    });

    const now = new Date();
    if (!rec || rec.consumedAt || rec.expiresAt <= now) {
      return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 400 });
    }

    const keyId = `password:${rec.userId}`;
    const hashed = await hashPassword(password);

    await prisma.$transaction([
      prisma.key.upsert({
        where: { id: keyId },
        create: { id: keyId, userId: rec.userId, hashedPassword: hashed, primary: true },
        update: { hashedPassword: hashed },
      }),
      prisma.resetPasswordToken.update({
        where: { tokenHash },
        data: { consumedAt: now },
      }),
      prisma.session.deleteMany({ where: { userId: rec.userId } }), // logout everywhere
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('reset error', e);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
