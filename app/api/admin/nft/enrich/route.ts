// app/api/admin/nft/enrich/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { enrichPendingNftMintEvents } from '../../../../../src/services/nftMintEnrichment';

function parseLimitFromRequest(req: NextRequest): number {
  const url = new URL(req.url);
  const raw = url.searchParams.get('limit');
  if (!raw) return 20;

  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 20;
  if (n > 500) return 500;

  return Math.floor(n);
}

/**
 * Admin endpoint to enrich NftMintEvent records with on-chain metadata.
 *
 * Method: POST
 * Query:
 *   - limit: optional, number of events to process (default 20, max 500).
 */
export async function POST(req: NextRequest) {
  const limit = parseLimitFromRequest(req);

  try {
    const updated = await enrichPendingNftMintEvents(limit);

    return NextResponse.json(
      {
        ok: true,
        limit,
        updated,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('ENRICH FAILED', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'ENRICH_FAILED',
      },
      { status: 500 },
    );
  }
}
