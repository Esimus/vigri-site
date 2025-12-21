// app/api/auth/signup/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/crypto';
import { sendMail } from '@/lib/mail';
import { randomBytes, createHash } from 'crypto';

export const runtime = 'nodejs';

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export async function POST(req: Request) {
  let bodyUnknown: unknown = {};
  try {
    bodyUnknown = await req.json();
  } catch {
    // ignore malformed JSON
  }
  const body = isObject(bodyUnknown) ? bodyUnknown : {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password.trim() : '';

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: 'weak_password' }, { status: 400 });
  }

  // unique email
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ ok: false, error: 'email_taken' }, { status: 409 });
  }

  // create user
  const user = await prisma.user.create({
    data: { email },
  });

  // store password hash
  const hashed = await hashPassword(password);
  await prisma.key.create({
    data: {
      id: `password:${user.id}`,
      userId: user.id,
      hashedPassword: hashed,
      primary: true,
    },
  });

  // issue verify token (24h) and send email
  await prisma.verifyEmailToken.deleteMany({ where: { userId: user.id, consumedAt: null } });

  const raw = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.verifyEmailToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const base = process.env.APP_URL ?? new URL(req.url).origin;
  const link = `${base}/api/auth/verify?token=${encodeURIComponent(raw)}`;

  await sendMail({
    to: user.email,
    subject: 'Verify your email',
    text: `Verify your email: ${link}`,
    html: `
      <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.6">
        <h2>Verify your email</h2>
        <p>Click the button to verify your email for VIGRI.</p>
        <p><a href="${link}" style="display:inline-block;background:#1f6feb;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none">Verify email</a></p>
        <p>If the button doesn't work, copy and paste this URL:</p>
        <p><a href="${link}">${link}</a></p>
        <p>This link expires in 24 hours.</p>
      </div>
    `,
  });

  // do NOT create a session here
  return NextResponse.json({
    ok: true,
    verifySent: true,
  });
}
