// lib/solana/vigriPresaleAccounts.ts
import { Connection } from '@solana/web3.js';
import { BorshCoder, Idl } from '@coral-xyz/anchor';
import { getSolanaConnection, getGlobalConfigPda } from './vigriPresale';
import idl from './idl/vigri_nft_presale_minter.json';

const VIGRI_PRESALE_IDL = idl as Idl;

// Generic shape for decoded GlobalConfig account.
// You can replace this with a strict interface later.
export interface GlobalConfigAccount {
  [key: string]: unknown;
}

// Try to locate the GlobalConfig account name in the IDL
const GLOBAL_CONFIG_ACCOUNT_NAME =
  VIGRI_PRESALE_IDL.accounts?.find(
    (acc) =>
      acc.name.toLowerCase().includes('global') &&
      acc.name.toLowerCase().includes('config'),
  )?.name ?? 'globalConfig';

export async function fetchGlobalConfigDecoded(
  connection?: Connection,
): Promise<{ pda: string; account: GlobalConfigAccount } | null> {
  const conn = connection ?? getSolanaConnection();
  const pda = getGlobalConfigPda();

  const accountInfo = await conn.getAccountInfo(pda);
  if (!accountInfo) {
    return null;
  }

  const coder = new BorshCoder(VIGRI_PRESALE_IDL);
  const decoded = coder.accounts.decode(
    GLOBAL_CONFIG_ACCOUNT_NAME,
    accountInfo.data,
  ) as unknown as GlobalConfigAccount;

  return {
    pda: pda.toBase58(),
    account: decoded,
  };
}
