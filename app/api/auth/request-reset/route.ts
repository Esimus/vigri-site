// app/api/auth/request-reset/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomBytes, createHash } from 'crypto';
import { sendResetEmail } from '@/lib/mail';

export const runtime = 'nodejs';

// token TTL: 1 hour
const TTL_MS = 60 * 60 * 1000;

function sha256hex(s: string) {
  return createHash('sha256').update(s).digest('hex');
}

function originFrom(req: Request): string {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
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
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    // Do not reveal user existence: always return ok
    const user = email
      ? await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true },
        })
      : null;

    if (user) {
      // generate one-time token
      const raw = randomBytes(32).toString('hex');
      const tokenHash = sha256hex(raw);
      const expiresAt = new Date(Date.now() + TTL_MS);

      // mark previous pending tokens as consumed (optional)
      await prisma.resetPasswordToken
        .updateMany({
          where: { userId: user.id, consumedAt: null },
          data: { consumedAt: new Date() },
        })
        .catch(() => {});

      // store new token
      await prisma.resetPasswordToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });

      // LINK NOW POINTS TO MODAL: /?auth=reset&token=...
      const base = originFrom(req);
      const resetUrl = `${base}/?auth=reset&token=${raw}`;

      // send email (dev: console log, prod: see lib/mail.ts)
      await sendResetEmail(user.email, resetUrl).catch((e: unknown) => {
        console.error('sendResetEmail error (request-reset):', e);
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log('[request-reset] URL:', resetUrl);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('request-reset error', e);
    // intentionally do not reveal details
    return NextResponse.json({ ok: true });
  }
}
