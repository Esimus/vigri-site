// app/api/presale/latest-blockhash/route.ts
import { NextResponse } from 'next/server';
import { getSolanaConnection } from '@/lib/solana/vigriPresale';

export async function GET() {
  try {
    const connection = getSolanaConnection();
    const response = await connection
      .getLatestBlockhash({ commitment: 'finalized' })
      .send();

    return NextResponse.json(
      {
        ok: true,
        blockhash: response.value.blockhash,
        lastValidBlockHeight: response.value.lastValidBlockHeight.toString(),
        cluster: 'mainnet',
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error('[presale/latest-blockhash] GET error:', error);

    const message =
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : String(error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to fetch latest blockhash',
        details: message,
        cluster: 'mainnet',
      },
      { status: 500 },
    );
  }
}
