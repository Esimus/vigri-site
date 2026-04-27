// lib/solana/vigriPresale.ts
import {
  address,
  createSolanaRpc,
  getProgramDerivedAddress,
  type Address,
} from '@solana/kit';
import { getUtf8Encoder } from '@solana/codecs-strings';
import { CONFIG, SOLANA_RPC_URL } from '@/lib/config';

/**
 * On-chain configuration for Vigri NFT presale (mainnet-only).
 */

export type SolanaCluster = 'devnet' | 'mainnet';

export type SolanaRpc = ReturnType<typeof createSolanaRpc>;

// Mainnet ProgramId (source of truth fallback)
export const VIGRI_PRESALE_PROGRAM_ID_MAINNET = address(
  'GmrUAwBvC3ijaM2L7kjddQFMWHevxRnArngf7jFx1yEk',
);

function assertMainnet(cluster: SolanaCluster) {
  if (cluster !== 'mainnet') {
    throw new Error('Devnet is disabled for Vigri. Set NEXT_PUBLIC_SOLANA_CLUSTER=mainnet.');
  }
}

export function getPresaleProgramId(cluster?: SolanaCluster): Address {
  const cl = cluster ?? (CONFIG.CLUSTER as SolanaCluster);

  assertMainnet(cl);

  const s =
    process.env.NEXT_PUBLIC_VIGRI_PRESALE_PROGRAM_ID_MAINNET ||
    process.env.VIGRI_PRESALE_PROGRAM_ID_MAINNET ||
    '';

  if (s) return address(s);

  return VIGRI_PRESALE_PROGRAM_ID_MAINNET;
}

// PDA seed for GlobalConfig
export const VIGRI_PRESALE_GLOBAL_CONFIG_SEED = 'vigri-presale-config';

// Create a Solana RPC client (mainnet-only)
export function getSolanaConnection(cluster?: SolanaCluster): SolanaRpc {
  const cl = cluster ?? (CONFIG.CLUSTER as SolanaCluster);
  assertMainnet(cl);

  return createSolanaRpc(SOLANA_RPC_URL);
}

// Derive GlobalConfig PDA (mainnet-only)
export async function getGlobalConfigPda(cluster?: SolanaCluster): Promise<Address> {
  const cl = cluster ?? (CONFIG.CLUSTER as SolanaCluster);
  assertMainnet(cl);

  const programId = getPresaleProgramId(cl);

  const [pda] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [getUtf8Encoder().encode(VIGRI_PRESALE_GLOBAL_CONFIG_SEED)],
  });

  return pda;
}