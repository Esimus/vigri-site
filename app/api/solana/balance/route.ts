// app/api/solana/balance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { address } from '@solana/kit';
import { getSolanaConnection } from '@/lib/solana/vigriPresale';

function getErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }

  return String(error);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { ok: false, error: 'Missing wallet address', cluster: 'mainnet' },
        { status: 400 },
      );
    }

    const walletAddress = address(wallet);
    const connection = getSolanaConnection();

    const balance = await connection
      .getBalance(walletAddress, { commitment: 'confirmed' })
      .send();

    return NextResponse.json(
      {
        ok: true,
        wallet: walletAddress,
        lamports: balance.value.toString(),
        sol: Number(balance.value) / 1_000_000_000,
        cluster: 'mainnet',
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error('[solana/balance] GET error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to fetch SOL balance',
        details: getErrorMessage(error),
        cluster: 'mainnet',
      },
      { status: 500 },
    );
  }
}