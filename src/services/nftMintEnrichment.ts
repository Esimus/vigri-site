// src/services/nftMintEnrichment.ts
import { prisma } from '@/lib/prisma';
import { SolanaCluster, getMintFromPresaleTx } from '../lib/solana/presaleTx';
import { getMetadataUriForMint } from '../lib/solana/metaplexMetadata';

// mainnet-only
export type NftMintNetwork = 'mainnet';

export interface NftMintEventMinimal {
  txSignature: string;
  network: NftMintNetwork;
  tierId: number;
  designChoice: number | null;
}

export interface NftOnchainEnrichmentResult {
  mint: string;
  metadataUri: string;
  tierCode: string;
  serial: number;
  designKey: number;
  collectorId: string;
}

function mapNetworkToCluster(): SolanaCluster {
  return 'mainnet';
}

function tierCodeFromTierId(tierId: number, designChoice?: number | null): string {
  if (tierId === 0) {
    // Tree / Steel: 1 = TR, 2 = FE
    return designChoice === 2 ? 'FE' : 'TR';
  }

  switch (tierId) {
    case 1: return 'CU'; // Bronze
    case 2: return 'AG'; // Silver
    case 3: return 'AU'; // Gold
    case 4: return 'PT'; // Platinum
    case 5: return 'WS'; // WS-20
    default: return 'UNK';
  }
}

function computeDesignKeyFromTier(
  tierId: number,
  serial: number,
  designChoice?: number | null,
): number | null {
  if (tierId === 0) {
    // Tree / Steel: designChoice is 1 or 2
    if (designChoice === 1 || designChoice === 2) return designChoice;
    return null;
  }

  if (tierId === 1) {
    // Bronze: single design
    return 1;
  }

  if (tierId === 2) {
    // Silver: 1..10 cycling
    return ((serial - 1) % 10) + 1;
  }

  if (tierId === 3 || tierId === 4 || tierId === 5) {
    // Gold / Platinum / WS-20: designKey = serial
    return serial;
  }

  return null;
}

function buildCollectorId(
  tierCode: string,
  serial: number,
  designKey: number,
  tierId: number,
): string {
  const yearCode = 'MMXXVI';
  const serial4 = serial.toString().padStart(4, '0');
  const designPad = (tierId === 3 || tierId === 4 || tierId === 5) ? 3 : 2;
  const designStr = designKey.toString().padStart(designPad, '0');

  return `${tierCode}-${yearCode}-${serial4}-${designStr}`;
}

/**
 * Pure on-chain orchestration without touching the database:
 *  txSignature + network (+ tierId/designChoice) → mint → metadata.uri → derived fields.
 */
export async function computeOnchainNftEnrichment(
  input: NftMintEventMinimal,
): Promise<NftOnchainEnrichmentResult | null> {
  const cluster: SolanaCluster = mapNetworkToCluster();

  const mint = await getMintFromPresaleTx(input.txSignature, cluster);
  if (!mint) {
    console.error('ENRICH_NO_MINT', {
      txSignature: input.txSignature,
      cluster,
    });
    return null;
  }

  const uri = await getMetadataUriForMint(mint, cluster);
  if (!uri) {
    console.error('ENRICH_NO_URI', {
      txSignature: input.txSignature,
      cluster,
      mint,
    });
    return null;
  }

  // Parse serial from the URI: last digits before ".json"
  const m = uri.match(/(\d+)\.json(?:\?.*)?$/);
  const serialStr = m?.[1];

  if (!m || !serialStr) {
    console.error('ENRICH_BAD_URI', {
      txSignature: input.txSignature,
      cluster,
      mint,
      uri,
    });
    return null;
  }

  const serial = parseInt(serialStr, 10);
  if (!Number.isFinite(serial) || serial <= 0) {
    console.error('ENRICH_BAD_SERIAL', {
      txSignature: input.txSignature,
      uri,
      serialRaw: serialStr,
    });
    return null;
  }

  const tierId = input.tierId;
  const designChoice = input.designChoice;

  const designKey = computeDesignKeyFromTier(tierId, serial, designChoice);
  if (designKey == null) {
    console.error('ENRICH_BAD_DESIGN_KEY', {
      txSignature: input.txSignature,
      tierId,
      serial,
      designChoice,
    });
    return null;
  }

  const tierCode = tierCodeFromTierId(tierId, designChoice);
  const collectorId = buildCollectorId(tierCode, serial, designKey, tierId);

  return {
    mint,
    metadataUri: uri,
    tierCode,
    serial,
    designKey,
    collectorId,
  };
}

/**
 * Softly normalize event.network coming from DB into our NftMintNetwork union.
 */
function normalizeEventNetwork(network: string): NftMintNetwork | null {
  const v = (network ?? '').trim().toLowerCase();
  if (v === 'mainnet' || v === 'mainnet-beta') return 'mainnet';
  return null;
}

/**
 * Enrich a single NftMintEvent record by id.
 * Idempotent: already populated fields are not overwritten.
 *
 * @returns true if the record was successfully enriched and updated;
 *          false if nothing was changed (event not found / wrong network / on-chain data missing).
 */
export async function enrichNftMintEvent(eventId: string): Promise<boolean> {
  const event = await prisma.nftMintEvent.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return false;
  }

  // If all target fields are already populated, do nothing (idempotency).
  if (
    event.tierCode &&
    event.serial !== null &&
    event.designKey !== null &&
    event.collectorId
  ) {
    return false;
  }

  const network = normalizeEventNetwork(String(event.network));
  if (!network) {
    // Unknown network – we skip this record.
    return false;
  }

  if (typeof event.tierId !== 'number') {
    // We need tierId to derive codes and keys; skip if missing.
    return false;
  }

  const enrichment = await computeOnchainNftEnrichment({
    txSignature: event.txSignature,
    network,
    tierId: event.tierId,
    designChoice: typeof event.designChoice === 'number' ? event.designChoice : null,
  });

  if (!enrichment) {
    // Could not derive on-chain data (mint / uri / parsing failed).
    return false;
  }

  const updateData: {
    tierCode?: string | null;
    serial?: number | null;
    designKey?: number | null;
    collectorId?: string | null;
  } = {};

  if (!event.tierCode) {
    updateData.tierCode = enrichment.tierCode;
  }
  if (event.serial === null) {
    updateData.serial = enrichment.serial;
  }
  if (event.designKey === null) {
    updateData.designKey = enrichment.designKey;
  }
  if (!event.collectorId) {
    updateData.collectorId = enrichment.collectorId;
  }

  // If there is actually nothing to update, bail out.
  if (
    updateData.tierCode === undefined &&
    updateData.serial === undefined &&
    updateData.designKey === undefined &&
    updateData.collectorId === undefined
  ) {
    return false;
  }

  await prisma.nftMintEvent.update({
    where: { id: event.id },
    data: updateData,
  });

  return true;
}

/**
 * Process a batch of "incomplete" mint events (collectorId IS NULL),
 * up to the provided limit.
 *
 * @returns number of records that were actually updated.
 */
export async function enrichPendingNftMintEvents(limit: number): Promise<number> {
  if (limit <= 0) return 0;

  const events = await prisma.nftMintEvent.findMany({
    where: {
      collectorId: null,
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: limit,
  });

  let updatedCount = 0;

  for (const event of events) {
    const ok = await enrichNftMintEvent(event.id);
    if (ok) updatedCount += 1;
  }

  return updatedCount;
}
