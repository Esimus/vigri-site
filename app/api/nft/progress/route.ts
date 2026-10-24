import { NextResponse } from 'next/server';
import { getNftProgress } from '@/lib/solana/nftProgress';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = await getNftProgress();

    return NextResponse.json(
      { ok: true, ...data },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error: unknown) {
    console.error(
      '[nft/progress] Verification failed:',
      error instanceof Error
        ? (error.stack ?? error.message).replace(/https?:\/\/[^\s"'<>]+/gi, '[URL]')
        : 'UnknownError',
    );

    return NextResponse.json(
      { ok: false, error: 'NFT progress temporarily unavailable' },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': '60',
        },
      },
    );
  }
}