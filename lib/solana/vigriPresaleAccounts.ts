// lib/solana/vigriPresaleAccounts.ts
import type { SolanaRpc } from './vigriPresale';
import { address } from '@solana/kit';
import { getSolanaConnection, getGlobalConfigPda } from './vigriPresale';
import { Buffer } from 'buffer';

export interface TierConfigAccount {
  id: number;
  supply_total: number;
  supply_minted: number;
  admin_minted: number;
  price_lamports: bigint;
  kyc_required: boolean;
  invite_only: boolean;
  transferable: boolean;
}

export interface GlobalConfigAccount {
  admin: string;
  collection_mint: string;
  payment_mint: string;
  is_sales_paused: boolean;
  tiers: TierConfigAccount[];
}

function readPubkey(data: Buffer, offset: number): { value: string; offset: number } {
  const bytes = data.subarray(offset, offset + 32);
  return { value: address(bytes.toString('hex')), offset: offset + 32 };
}

function readU8(data: Buffer, offset: number): { value: number; offset: number } {
  return { value: data.readUInt8(offset), offset: offset + 1 };
}

function readU16(data: Buffer, offset: number): { value: number; offset: number } {
  return { value: data.readUInt16LE(offset), offset: offset + 2 };
}

function readU64(data: Buffer, offset: number): { value: bigint; offset: number } {
  return { value: data.readBigUInt64LE(offset), offset: offset + 8 };
}

function readBool(data: Buffer, offset: number): { value: boolean; offset: number } {
  return { value: data.readUInt8(offset) !== 0, offset: offset + 1 };
}

function decodeGlobalConfig(data: Buffer): GlobalConfigAccount {
  let offset = 8; // Anchor account discriminator

  const admin = readPubkey(data, offset);
  offset = admin.offset;

  const collectionMint = readPubkey(data, offset);
  offset = collectionMint.offset;

  const paymentMint = readPubkey(data, offset);
  offset = paymentMint.offset;

  const isSalesPaused = readBool(data, offset);
  offset = isSalesPaused.offset;

  const tiers: TierConfigAccount[] = [];

  for (let i = 0; i < 6; i += 1) {
    const id = readU8(data, offset);
    offset = id.offset;

    const supplyTotal = readU16(data, offset);
    offset = supplyTotal.offset;

    const supplyMinted = readU16(data, offset);
    offset = supplyMinted.offset;

    const adminMinted = readU16(data, offset);
    offset = adminMinted.offset;

    const priceLamports = readU64(data, offset);
    offset = priceLamports.offset;

    const kycRequired = readBool(data, offset);
    offset = kycRequired.offset;

    const inviteOnly = readBool(data, offset);
    offset = inviteOnly.offset;

    const transferable = readBool(data, offset);
    offset = transferable.offset;

    offset += 8; // reserved

    tiers.push({
      id: id.value,
      supply_total: supplyTotal.value,
      supply_minted: supplyMinted.value,
      admin_minted: adminMinted.value,
      price_lamports: priceLamports.value,
      kyc_required: kycRequired.value,
      invite_only: inviteOnly.value,
      transferable: transferable.value,
    });
  }

  return {
    admin: admin.value,
    collection_mint: collectionMint.value,
    payment_mint: paymentMint.value,
    is_sales_paused: isSalesPaused.value,
    tiers,
  };
}

export async function fetchGlobalConfigDecoded(
  connection?: SolanaRpc,
): Promise<{ pda: string; account: GlobalConfigAccount } | null> {
  const conn = connection ?? getSolanaConnection();
  const pda = await getGlobalConfigPda();

  const accountInfo = await conn.getAccountInfo(pda, {
    commitment: 'confirmed',
    encoding: 'base64',
  }).send();
  if (!accountInfo.value) {
    return null;
  }

  const accountData = accountInfo.value.data[0];

  if (!accountData) {
    return null;
  }

  const decoded = decodeGlobalConfig(Buffer.from(accountData, 'base64'));

  return {
    pda,
    account: decoded,
  };
}