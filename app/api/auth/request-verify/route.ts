// app/api/auth/request-verify/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/mail';
import { createHash, randomBytes } from 'crypto';
import { SESSION_COOKIE } from '@/lib/session';

export const runtime = 'nodejs';

// tiny cookie parser (no deps)
function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const parts = header.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.split('=');
    if (k && k.trim() === name) return decodeURIComponent(rest.join('=').trim());
  }
  return null;
}

export async function POST(req: Request) {
  try {
    let userId: string | null = null;
    let userEmail: string | null = null;

    // 1) try session
    const cookieHeader = req.headers.get('cookie');
    const sid = readCookie(cookieHeader, SESSION_COOKIE);
    if (sid) {
      const session = await prisma.session.findUnique({
        where: { id: sid },
        include: { user: true },
      });
      if (session?.user) {
        userId = session.user.id;
        userEmail = session.user.email;
      }
    }

    // 2) fallback: email from body (no enumeration; always return ok)
    if (!userId) {
      const body = await req.json().catch(() => ({} as any));
      const email = (body?.email ?? '').trim().toLowerCase();
      if (email) {
        const u = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, emailVerified: true },
        });
        if (u) {
          if (u.emailVerified) {
            // Already verified — short-circuit to OK
            return NextResponse.json({ ok: true, already: true });
          }
          userId = u.id;
          userEmail = u.email;
        }
      }
    }

    // If we still don't know the user — reply OK (no leak)
    if (!userId || !userEmail) {
      return NextResponse.json({ ok: true });
    }

    // Clean previous pending tokens (optional safety)
    await prisma.verifyEmailToken.deleteMany({
      where: { userId, consumedAt: null },
    });

    // Generate token and store sha256 hash
    const raw = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await prisma.verifyEmailToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    const base = process.env.APP_URL ?? new URL(req.url).origin;
    const link = `${base}/api/auth/verify?token=${encodeURIComponent(raw)}`;

    await sendMail({
      to: userEmail,
      subject: 'Verify your email',
      text: `Verify your email: ${link}`,
      html: `
        <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.6">
          <h2>Verify your email</h2>
          <p>Click the button to verify your email for VIGRI.</p>
          <p>
            <a href="${link}" style="display:inline-block;background:#1f6feb;color:#fff;
              padding:10px 16px;border-radius:10px;text-decoration:none">
              Verify email
            </a>
          </p>
          <p>If the button doesn't work, copy and paste this URL:</p>
          <p><a href="${link}">${link}</a></p>
          <p>This link expires in 24 hours.</p>
        </div>`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('request-verify error', e);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
