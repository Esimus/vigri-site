// app/api/presale/send-transaction/route.ts
import { NextRequest, NextResponse } from 'next/server';
import type { Base64EncodedWireTransaction } from '@solana/kit';
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

function isBase64String(value: string): boolean {
  if (value.length === 0 || value.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json().catch(() => null);

    const transaction =
      typeof body === 'object' &&
      body !== null &&
      'transaction' in body &&
      typeof (body as { transaction?: unknown }).transaction === 'string'
        ? (body as { transaction: string }).transaction
        : null;

    if (!transaction) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing base64 transaction',
          cluster: 'mainnet',
        },
        { status: 400 },
      );
    }

        if (!isBase64String(transaction)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid base64 transaction',
          cluster: 'mainnet',
        },
        { status: 400 },
      );
    }

    const wireTransaction = transaction as Base64EncodedWireTransaction;

    const connection = getSolanaConnection();
    const signature = await connection
            .sendTransaction(wireTransaction, {
        encoding: 'base64',
        skipPreflight: false,
      })
      .send();

    return NextResponse.json(
      {
        ok: true,
        signature,
        cluster: 'mainnet',
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error('[presale/send-transaction] POST error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to send transaction',
        details: getErrorMessage(error),
        cluster: 'mainnet',
      },
      { status: 500 },
    );
  }
}