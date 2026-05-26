// app/api/presale/simulate-transaction/route.ts
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

function toJsonSafe(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(toJsonSafe);
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        toJsonSafe(entry),
      ]),
    );
  }

  return value;
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

    const simulation = await connection
      .simulateTransaction(wireTransaction, {
        encoding: 'base64',
        replaceRecentBlockhash: false,
        sigVerify: false,
      })
      .send();

    return NextResponse.json(
      {
        ok: true,
        cluster: 'mainnet',
        value: toJsonSafe(simulation.value),
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error('[presale/simulate-transaction] POST error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to simulate transaction',
        details: getErrorMessage(error),
        cluster: 'mainnet',
      },
      { status: 500 },
    );
  }
}