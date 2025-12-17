// lib/solana/vigriPresale.ts
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

/**
 * On-chain configuration for Vigri NFT presale (cluster-aware).
 */

export type SolanaCluster = 'devnet' | 'mainnet';

// Program IDs (devnet is known; mainnet comes from env)
export const VIGRI_PRESALE_PROGRAM_ID_DEVNET = new PublicKey(
  'GmrUAwBvC3ijaM2L7kjddQFMWHevxRnArngf7jFx1yEk',
);

export function getPresaleProgramId(cluster: SolanaCluster): PublicKey {
  if (cluster === 'devnet') return VIGRI_PRESALE_PROGRAM_ID_DEVNET;

  const s =
    process.env.NEXT_PUBLIC_VIGRI_PRESALE_PROGRAM_ID_MAINNET ||
    process.env.VIGRI_PRESALE_PROGRAM_ID_MAINNET ||
    '';

  if (!s) {
    throw new Error('Missing VIGRI_PRESALE_PROGRAM_ID_MAINNET env var');
  }
  return new PublicKey(s);
}

// PDA seed for GlobalConfig
export const VIGRI_PRESALE_GLOBAL_CONFIG_SEED = 'vigri-presale-config';

function defaultCluster(): SolanaCluster {
  const c =
    (process.env.NEXT_PUBLIC_SOLANA_CLUSTER ||
      process.env.SOLANA_CLUSTER ||
      'devnet') as string;

  return c === 'mainnet' || c === 'mainnet-beta' ? 'mainnet' : 'devnet';
}

// Create a Solana connection (cluster-aware)
export function getSolanaConnection(cluster?: SolanaCluster): Connection {
  const cl = cluster ?? defaultCluster();

  const rpcUrl =
    cl === 'mainnet'
      ? (process.env.NEXT_PUBLIC_SOLANA_RPC_URL_MAINNET ||
          process.env.SOLANA_RPC_URL_MAINNET ||
          clusterApiUrl('mainnet-beta'))
      : (process.env.NEXT_PUBLIC_SOLANA_RPC_URL_DEVNET ||
          process.env.SOLANA_RPC_URL_DEVNET ||
          process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
          clusterApiUrl('devnet'));

  return new Connection(rpcUrl, 'confirmed');
}

// Derive GlobalConfig PDA (cluster-aware)
export function getGlobalConfigPda(cluster?: SolanaCluster): PublicKey {
  const cl = cluster ?? defaultCluster();
  const programId = getPresaleProgramId(cl);

  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(VIGRI_PRESALE_GLOBAL_CONFIG_SEED)],
    programId,
  );

  return pda;
}
