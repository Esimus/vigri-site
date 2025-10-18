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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const email = (body?.email ?? '').trim().toLowerCase();

    // Не раскрываем существование пользователя: всегда возвращаем ok
    const user = email
      ? await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true },
        })
      : null;

    if (user) {
      // сгенерировать одноразовый токен
      const raw = randomBytes(32).toString('hex');
      const tokenHash = sha256hex(raw);
      const expiresAt = new Date(Date.now() + TTL_MS);

      // помечаем старые незавершённые токены как использованные (опционально)
      await prisma.resetPasswordToken
        .updateMany({
          where: { userId: user.id, consumedAt: null },
          data: { consumedAt: new Date() },
        })
        .catch(() => {});

      // сохранить новый токен
      await prisma.resetPasswordToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });

      // ССЫЛКА ТЕПЕРЬ В МОДАЛКУ: /?auth=reset&token=...
      const base = originFrom(req);
      const resetUrl = `${base}/?auth=reset&token=${raw}`;

      // отправка письма (dev: лог в консоль, prod: см. lib/mail.ts)
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
    // намеренно не раскрываем детали
    return NextResponse.json({ ok: true });
  }
}
