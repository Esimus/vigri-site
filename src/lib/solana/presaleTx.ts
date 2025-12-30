// src/lib/solana/presaleTx.ts
import { Connection, ParsedTransactionWithMeta, TokenBalance } from '@solana/web3.js';
import { SOLANA_RPC_URL } from '@/lib/config';

export type SolanaCluster = 'devnet' | 'mainnet';

type SolanaTx = ParsedTransactionWithMeta;
type GetTxConfig = Parameters<Connection['getParsedTransaction']>[1];

/**
 * Try to determine the minted token mint by comparing pre/post token balances.
 * We assume:
 *  - The presale mint transaction mints exactly one new token
 *  - That token is the one present in postTokenBalances and absent in preTokenBalances
 *  - If multiple candidates exist, we prefer NFT-like (decimals=0, amount=1)
 */
function tryMintFromTokenBalances(tx: SolanaTx | null): string | null {
  const pre: TokenBalance[] = tx?.meta?.preTokenBalances ?? [];
  const post: TokenBalance[] = tx?.meta?.postTokenBalances ?? [];
  if (!Array.isArray(post) || post.length === 0) return null;

  const preMints = new Set<string>();
  for (const b of pre) {
    if (b.mint) preMints.add(String(b.mint));
  }

  const candidates: TokenBalance[] = [];
  for (const b of post) {
    const mint = b.mint ? String(b.mint) : null;
    if (!mint) continue;
    if (!preMints.has(mint)) candidates.push(b);
  }

  if (candidates.length === 0) return null;

  if (candidates.length === 1) {
    const [only] = candidates;
    if (!only?.mint) return null;
    return String(only.mint);
  }

  // If multiple, prefer NFT-like: decimals=0 and amount=1
  const nftLike = candidates.filter((b) => {
    const ui = b.uiTokenAmount;
    return ui?.decimals === 0 && ui?.amount === '1';
  });

  if (nftLike.length === 1) {
    const [only] = nftLike;
    if (!only?.mint) return null;
    return String(only.mint);
  }

  return null;
}

/**
 * Extracts the NFT mint address from a mint transaction on a given cluster.
 * We do not try to validate the program id here; we trust that the txSignature
 * in NftMintEvent refers to a successful mint.
 */
export async function getMintFromPresaleTx(
  signature: string,
  cluster: SolanaCluster,
): Promise<string | null> {
  // Mainnet-only in production: block devnet usage explicitly.
  if (process.env.NODE_ENV === 'production' && cluster === 'devnet') {
    console.error('PRESALE_TX_DEVNET_BLOCKED_IN_PROD', { signature });
    return null;
  }

  // Single source of truth for RPC across the app.
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

  const config: GetTxConfig = {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  };

  const tx = (await connection.getParsedTransaction(signature, config)) as SolanaTx | null;
  if (!tx) return null;

  return tryMintFromTokenBalances(tx);
}
