// app/api/auth/verify/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token')?.trim();
    if (!token) {
      return NextResponse.redirect(new URL('/?verify=invalid', req.url));
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');

    // find valid, unconsumed token
    const record = await prisma.verifyEmailToken.findUnique({
      where: { tokenHash },
    });

    const now = new Date();

    if (!record || record.consumedAt || record.expiresAt <= now) {
      return NextResponse.redirect(new URL('/?verify=invalid', req.url));
    }

    // mark user verified and consume the token
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true },
      }),
      prisma.verifyEmailToken.update({
        where: { tokenHash },
        data: { consumedAt: now },
      }),
      prisma.verifyEmailToken.deleteMany({
        where: { userId: record.userId, consumedAt: null, tokenHash: { not: tokenHash } },
      }),
    ]);

    // redirect to home (or dashboard) with a flag
    return NextResponse.redirect(new URL('/?verify=ok', req.url));
  } catch (e) {
    console.error('verify error', e);
    return NextResponse.redirect(new URL('/?verify=invalid', req.url));
  }
}
