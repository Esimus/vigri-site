// app/metadata/nft/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';

const YEAR_CODE = 'MMXXVI';

type TierKey = 'tree-steel' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'ws';
type TierCode = 'TR' | 'FE' | 'CU' | 'AG' | 'AU' | 'PT' | 'WS';

function resolveTier(tierSlug: string, code: string): TierKey | null {
  const c = code.toUpperCase();
  switch (tierSlug) {
    case 'tree-steel':
      return c === 'TR' || c === 'FE' ? 'tree-steel' : null;
    case 'bronze':
      return c === 'CU' ? 'bronze' : null;
    case 'silver':
      return c === 'AG' ? 'silver' : null;
    case 'gold':
      return c === 'AU' ? 'gold' : null;
    case 'platinum':
      return c === 'PT' ? 'platinum' : null;
    case 'ws':
      return c === 'WS' ? 'ws' : null;
    default:
      return null;
  }
}

function resolveDesignKey(tier: TierKey, code: TierCode, serial: number): number {
  switch (tier) {
    case 'tree-steel':
      return code === 'TR' ? 1 : 2;
    case 'bronze':
      return 1;
    case 'silver':
      return ((serial - 1) % 10) + 1;
    case 'gold':
    case 'platinum':
    case 'ws':
      return serial;
  }
}

function padDesignKey(tier: TierKey, designKey: number): string {
  if (tier === 'gold' || tier === 'platinum' || tier === 'ws') {
    return designKey.toString().padStart(3, '0');
  }
  return designKey.toString().padStart(2, '0');
}

function tierDisplayName(tier: TierKey): string {
  switch (tier) {
    case 'tree-steel':
      return 'Tree/Steel';
    case 'bronze':
      return 'Bronze';
    case 'silver':
      return 'Silver';
    case 'gold':
      return 'Gold';
    case 'platinum':
      return 'Platinum';
    case 'ws':
      return 'WS-20';
  }
}

function imageForTier(tier: TierKey): string {
  switch (tier) {
    case 'tree-steel':
      return 'https://vigri.ee/images/nft/1_mb_wood_stell.png';
    case 'bronze':
      return 'https://vigri.ee/images/nft/2_mb_bronze.png';
    case 'silver':
      return 'https://vigri.ee/images/nft/3_mb_silver.png';
    case 'gold':
      return 'https://vigri.ee/images/nft/4_mb_gold.png';
    case 'platinum':
      return 'https://vigri.ee/images/nft/5_mb_platinum.png';
    case 'ws':
      return 'https://vigri.ee/images/nft/6_mb_ws.png';
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const p = await params;
  const path = Array.isArray(p?.path) ? p.path : [];

  // Expected: [tierSlug, code, "000058.json"]
  if (path.length !== 3) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const tierSlugRaw = path[0];
  const codeRaw = path[1];
  const serialFile = path[2];

  if (typeof tierSlugRaw !== 'string' || typeof codeRaw !== 'string' || typeof serialFile !== 'string') {
    return NextResponse.json({ error: 'Invalid path parts' }, { status: 400 });
  }

  const code = codeRaw.toUpperCase() as TierCode;
  const serialStr = serialFile.replace(/\.json$/i, '');
  const serial = Number.parseInt(serialStr, 10);

  if (!Number.isFinite(serial) || serial <= 0) {
    return NextResponse.json({ error: 'Invalid serial' }, { status: 400 });
  }

  const tier = resolveTier(tierSlugRaw, code);
  if (!tier) {
    return NextResponse.json({ error: 'Unknown tier' }, { status: 404 });
  }

  const padSerial6 = (n: number) => n.toString().padStart(6, '0');

  const designKey = resolveDesignKey(tier, code, serial);
  const serial6 = padSerial6(serial);
  const designKeyPadded = padDesignKey(tier, designKey);

  const collectorId = `${code}-${YEAR_CODE}-${serial6}-${designKeyPadded}`;
  const image = imageForTier(tier);
  const tierName = tierDisplayName(tier);

  const json = {
    name: `VIGRI ${tierName} NFT #${serial} - Mystery Box`,
    symbol: 'VIGRINFT',
    description: `VIGRI presale NFT tier: ${tierName}. Collector ID ${collectorId}. This NFT is a digital proof of participation in the VIGRI presale and may provide access to project benefits according to the terms published on vigri.ee. Artwork and full metadata will be revealed in Q2 2026.`,
    seller_fee_basis_points: 250,
    image,
    external_url: 'https://vigri.ee',
    attributes: [
      { trait_type: 'Collection', value: 'VIGRI Presale' },

      { trait_type: 'CollectorID', value: collectorId },
      { trait_type: 'TierCode', value: code },
      { trait_type: 'Serial', value: serial },
      { trait_type: 'DesignKey', value: designKey },
      { trait_type: 'YearCode', value: YEAR_CODE },

      { trait_type: 'State', value: 'Mystery' },
      { trait_type: 'Network', value: 'Solana' },
    ],
    properties: {
      category: 'image',
      files: [{ uri: image, type: 'image/png' }],
    },
  };

  return new NextResponse(JSON.stringify(json), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60',
    },
  });
}
