// app/api/presale/global-config/route.ts
import { NextResponse } from 'next/server';
import { getSolanaConnection } from '@/lib/solana/vigriPresale';
import { fetchGlobalConfigDecoded } from '@/lib/solana/vigriPresaleAccounts';

interface RawTier {
  id: number;
  supply_total: number;
  supply_minted: number;
  admin_minted: number;
  kyc_required: boolean;
  invite_only: boolean;
  transferable: boolean;
  price_lamports: unknown;
}

interface GlobalConfigWithTiers {
  tiers?: RawTier[];
  admin?: string;
  // keep index signature from GlobalConfigAccount
  [key: string]: unknown;
}

function decodePriceLamports(value: unknown): number {
  if (typeof value === 'string') {
    if (!value) return 0;

    // hex-like string
    if (/^[0-9a-f]+$/i.test(value)) {
      return parseInt(value, 16);
    }

    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);

  // BN-like: has toNumber()
  if (
    typeof value === 'object' &&
    value !== null &&
    'toNumber' in value &&
    typeof (value as { toNumber: () => unknown }).toNumber === 'function'
  ) {
    const raw = (value as { toNumber: () => unknown }).toNumber();
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'bigint') return Number(raw);
    if (typeof raw === 'string') {
      const parsed = parseInt(raw, 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
  }

  // Possible {_hex: '0x...'} shape
  if (
    typeof value === 'object' &&
    value !== null &&
    '_hex' in value &&
    typeof (value as { _hex?: unknown })._hex === 'string'
  ) {
    const hex = (value as { _hex: string })._hex;
    const cleaned = hex.replace(/^0x/i, '');
    const parsed = parseInt(cleaned, 16);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  // Generic toString fallback
  if (typeof value === 'object' && value !== null) {
    const s = String(value);
    if (/^[0-9a-f]+$/i.test(s)) {
      const parsed = parseInt(s, 16);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    const parsed = parseInt(s, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }

  return 0;
}

function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clusterParam = (searchParams.get('cluster') || '').toLowerCase();
    const cluster = clusterParam === 'mainnet' ? 'mainnet' : 'devnet';

    const connection = getSolanaConnection(cluster);
    const decoded = await fetchGlobalConfigDecoded(connection, cluster);

    if (!decoded) {
      return NextResponse.json(
        {
          exists: false,
          message: 'GlobalConfig account not found',
        },
        { status: 404 },
      );
    }

    const cfg = decoded.account as GlobalConfigWithTiers;
    const tiersArray: RawTier[] = Array.isArray(cfg.tiers) ? cfg.tiers : [];

    const tiers = tiersArray.map((tier) => {
      const lamports = decodePriceLamports(tier.price_lamports);

      return {
        id: tier.id,
        supplyTotal: tier.supply_total,
        supplyMinted: tier.supply_minted,
        adminMinted: tier.admin_minted,
        kycRequired: tier.kyc_required,
        inviteOnly: tier.invite_only,
        transferable: tier.transferable,
        priceLamports: lamports,
        priceSol: lamportsToSol(lamports),
      };
    });

    return NextResponse.json(
      {
        exists: true,
        pda: decoded.pda,
        admin: cfg.admin ?? null,
        treasury: cfg.admin ?? null,
        tiers,
        cluster,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error('[presale/global-config] GET error:', error);

    const message =
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : String(error);

    return NextResponse.json(
      {
        error: 'Failed to fetch GlobalConfig',
        details: message,
      },
      { status: 500 },
    );
  }
}
