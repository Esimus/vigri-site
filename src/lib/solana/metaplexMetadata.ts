// src/lib/solana/metaplexMetadata.ts
import {
  address,
  createSolanaRpc,
  getAddressEncoder,
  getProgramDerivedAddress,
  type Address,
} from '@solana/kit';
import { getUtf8Encoder } from '@solana/codecs-strings';
import {
  getMetadataAccountDataSerializer,
  type MetadataAccountData,
} from '@metaplex-foundation/mpl-token-metadata';
import type { SolanaCluster } from './presaleTx';
import { SOLANA_RPC_URL } from '@/lib/config';

const METAPLEX_METADATA_PROGRAM_ID = address(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
);

async function deriveMetadataPda(mint: Address): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: METAPLEX_METADATA_PROGRAM_ID,
    seeds: [
      getUtf8Encoder().encode('metadata'),
      getAddressEncoder().encode(METAPLEX_METADATA_PROGRAM_ID),
      getAddressEncoder().encode(mint),
    ],
  });

  return pda;
}

function normalizeUri(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw.replace(/\0+$/g, '').trim();
}

export async function getMetadataUriForMint(
  mintAddress: string,
  cluster: SolanaCluster,
): Promise<string | null> {
  if (process.env.NODE_ENV === 'production' && cluster === 'devnet') {
    console.error('MPL_METADATA_DEVNET_BLOCKED_IN_PROD', { mint: mintAddress });
    return null;
  }

  let mint: Address;
  try {
    mint = address(mintAddress);
  } catch (error) {
    console.error('MPL_METADATA_INVALID_MINT', {
      mintAddress,
      cluster,
      error: (error as Error).message,
    });
    return null;
  }

  const rpc = createSolanaRpc(SOLANA_RPC_URL);
  const metadataPda = await deriveMetadataPda(mint);

  const accountInfo = await rpc.getAccountInfo(metadataPda, {
    commitment: 'confirmed',
    encoding: 'base64',
  }).send();

  if (!accountInfo.value) {
    console.error('MPL_METADATA_ACCOUNT_NOT_FOUND', {
      mint: mintAddress,
      cluster,
      metadataPda,
    });
    return null;
  }

  const accountData = accountInfo.value.data[0];
  if (!accountData) {
    console.error('MPL_METADATA_EMPTY_ACCOUNT_DATA', {
      mint: mintAddress,
      cluster,
      metadataPda,
    });
    return null;
  }

  const serializer = getMetadataAccountDataSerializer();

  let decoded: MetadataAccountData;
  try {
    const [value] = serializer.deserialize(Buffer.from(accountData, 'base64'));
    decoded = value;
  } catch (error) {
    console.error('MPL_METADATA_DESERIALIZE_FAILED', {
      mint: mintAddress,
      cluster,
      metadataPda,
      error: (error as Error).message,
    });
    return null;
  }

  const uri = normalizeUri(decoded.uri);

  if (!uri) {
    console.error('MPL_METADATA_EMPTY_URI', {
      mint: mintAddress,
      cluster,
      metadataPda,
    });
    return null;
  }

  return uri;
}