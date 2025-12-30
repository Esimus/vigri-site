// src/lib/solana/metaplexMetadata.ts
import { Connection, PublicKey } from '@solana/web3.js';
import {
  getMetadataAccountDataSerializer,
  type MetadataAccountData,
} from '@metaplex-foundation/mpl-token-metadata';
import type { SolanaCluster } from './presaleTx';
import { SOLANA_RPC_URL } from '@/lib/config';

const METAPLEX_METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
);

function deriveMetadataPda(mint: PublicKey): PublicKey {
  const seeds = [
    Buffer.from('metadata'),
    METAPLEX_METADATA_PROGRAM_ID.toBuffer(),
    mint.toBuffer(),
  ];

  const [pda] = PublicKey.findProgramAddressSync(
    seeds,
    METAPLEX_METADATA_PROGRAM_ID,
  );
  return pda;
}

function normalizeUri(raw: string | undefined | null): string {
  if (!raw) return '';
  // trim trailing NUL bytes and whitespace
  return raw.replace(/\0+$/g, '').trim();
}

/**
 * Load Metaplex metadata for a given mint and return the URI (if any).
 */
export async function getMetadataUriForMint(
  mintAddress: string,
  cluster: SolanaCluster,
): Promise<string | null> {
  // Mainnet-only in production: block devnet usage explicitly.
  if (process.env.NODE_ENV === 'production' && cluster === 'devnet') {
    console.error('MPL_METADATA_DEVNET_BLOCKED_IN_PROD', { mint: mintAddress });
    return null;
  }

  let mint: PublicKey;
  try {
    mint = new PublicKey(mintAddress);
  } catch (error) {
    console.error('MPL_METADATA_INVALID_MINT', {
      mintAddress,
      cluster,
      error: (error as Error).message,
    });
    return null;
  }

  // Single source of truth for RPC across the app.
  const connection = new Connection(SOLANA_RPC_URL, { commitment: 'confirmed' });

  const metadataPda = deriveMetadataPda(mint);

  const accountInfo = await connection.getAccountInfo(metadataPda);
  if (!accountInfo) {
    console.error('MPL_METADATA_ACCOUNT_NOT_FOUND', {
      mint: mintAddress,
      cluster,
      metadataPda: metadataPda.toBase58(),
    });
    return null;
  }

  const serializer = getMetadataAccountDataSerializer();

  let decoded: MetadataAccountData;
  try {
    const [value] = serializer.deserialize(accountInfo.data);
    decoded = value;
  } catch (error) {
    console.error('MPL_METADATA_DESERIALIZE_FAILED', {
      mint: mintAddress,
      cluster,
      metadataPda: metadataPda.toBase58(),
      error: (error as Error).message,
    });
    return null;
  }

  const uri = normalizeUri(decoded.uri);

  if (!uri) {
    console.error('MPL_METADATA_EMPTY_URI', {
      mint: mintAddress,
      cluster,
      metadataPda: metadataPda.toBase58(),
    });
    return null;
  }

  return uri;
}
