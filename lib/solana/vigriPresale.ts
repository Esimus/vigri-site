import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

/**
 * On-chain configuration for Vigri NFT presale (devnet).
 */

// Program ID from Anchor deployment (devnet)
export const VIGRI_PRESALE_PROGRAM_ID = new PublicKey(
  'GmrUAwBvC3ijaM2L7kjddQFMWHevxRnArngf7jFx1yEk',
);

// PDA seed for GlobalConfig
export const VIGRI_PRESALE_GLOBAL_CONFIG_SEED = 'global-config';

// Create a Solana connection (devnet for now)
export function getSolanaConnection(): Connection {
  const rpcUrl =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('devnet');

  return new Connection(rpcUrl, 'confirmed');
}

// Derive GlobalConfig PDA
export function getGlobalConfigPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(VIGRI_PRESALE_GLOBAL_CONFIG_SEED)],
    VIGRI_PRESALE_PROGRAM_ID,
  );

  return pda;
}
