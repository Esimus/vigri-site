// src/lib/solana/metaplexMetadata.ts
import { Connection, PublicKey } from '@solana/web3.js';
import {
  getMetadataAccountDataSerializer,
  type MetadataAccountData,
} from '@metaplex-foundation/mpl-token-metadata';
import type { SolanaCluster } from './presaleTx';

const METAPLEX_METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
);

function getRpcUrl(cluster: SolanaCluster): string {
  const dev = process.env.SOLANA_RPC_DEVNET;
  const main = process.env.SOLANA_RPC_MAINNET;

  const url = cluster === 'devnet' ? dev : main;
  if (!url) {
    throw new Error(
      `Missing RPC URL for cluster=${cluster}. Set SOLANA_RPC_DEVNET / SOLANA_RPC_MAINNET.`,
    );
  }
  return url;
}

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

  const rpcUrl = getRpcUrl(cluster);
  const connection = new Connection(rpcUrl, { commitment: 'confirmed' });

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
