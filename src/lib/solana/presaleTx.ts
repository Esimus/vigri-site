// src/lib/solana/presaleTx.ts
import {
  Connection,
  ParsedTransactionWithMeta,
  TokenBalance,
} from '@solana/web3.js';

export type SolanaCluster = 'devnet' | 'mainnet';

type SolanaTx = ParsedTransactionWithMeta;
type GetTxConfig = Parameters<Connection['getParsedTransaction']>[1];

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
  const rpcUrl = getRpcUrl(cluster);
  const connection = new Connection(rpcUrl, { commitment: 'confirmed' });

  const config: GetTxConfig = {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  };

  const tx = (await connection.getParsedTransaction(
    signature,
    config,
  )) as SolanaTx | null;

  if (!tx) return null;

  const mintFromBalances = tryMintFromTokenBalances(tx);
  if (mintFromBalances) return mintFromBalances;

  return null;
}
