// lib/solana/vigriPresale.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { CONFIG, SOLANA_RPC_URL } from '@/lib/config';

/**
 * On-chain configuration for Vigri NFT presale (mainnet-only).
 */

export type SolanaCluster = 'devnet' | 'mainnet';

// Mainnet ProgramId (source of truth fallback)
export const VIGRI_PRESALE_PROGRAM_ID_MAINNET = new PublicKey(
  'GmrUAwBvC3ijaM2L7kjddQFMWHevxRnArngf7jFx1yEk',
);

function assertMainnet(cluster: SolanaCluster) {
  if (cluster !== 'mainnet') {
    throw new Error('Devnet is disabled for Vigri. Set NEXT_PUBLIC_SOLANA_CLUSTER=mainnet.');
  }
}

export function getPresaleProgramId(cluster?: SolanaCluster): PublicKey {
  const cl = cluster ?? (CONFIG.CLUSTER as SolanaCluster);

  assertMainnet(cl);

  const s =
    process.env.NEXT_PUBLIC_VIGRI_PRESALE_PROGRAM_ID_MAINNET ||
    process.env.VIGRI_PRESALE_PROGRAM_ID_MAINNET ||
    '';

  if (s) return new PublicKey(s);

  return VIGRI_PRESALE_PROGRAM_ID_MAINNET;
}

// PDA seed for GlobalConfig
export const VIGRI_PRESALE_GLOBAL_CONFIG_SEED = 'vigri-presale-config';

// Create a Solana connection (mainnet-only)
export function getSolanaConnection(cluster?: SolanaCluster): Connection {
  const cl = cluster ?? (CONFIG.CLUSTER as SolanaCluster);
  assertMainnet(cl);

  // single source of truth for RPC
  return new Connection(SOLANA_RPC_URL, 'confirmed');
}

// Derive GlobalConfig PDA (mainnet-only)
export function getGlobalConfigPda(cluster?: SolanaCluster): PublicKey {
  const cl = cluster ?? (CONFIG.CLUSTER as SolanaCluster);
  assertMainnet(cl);

  const programId = getPresaleProgramId(cl);

  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(VIGRI_PRESALE_GLOBAL_CONFIG_SEED)],
    programId,
  );

  return pda;
}
