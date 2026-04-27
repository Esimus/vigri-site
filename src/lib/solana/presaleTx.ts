// src/lib/solana/presaleTx.ts
import { createSolanaRpc, signature as solanaSignature } from '@solana/kit';
import { SOLANA_RPC_URL } from '@/lib/config';

export type SolanaCluster = 'devnet' | 'mainnet';

type UiTokenAmount = { amount?: string; decimals?: number };
type TokenBalance = { mint?: string; uiTokenAmount?: UiTokenAmount };
type SolanaTx = {
  meta?: {
    preTokenBalances?: TokenBalance[];
    postTokenBalances?: TokenBalance[];
  };
};

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

export async function getMintFromPresaleTx(
  signature: string,
  cluster: SolanaCluster,
): Promise<string | null> {
  if (process.env.NODE_ENV === 'production' && cluster === 'devnet') {
    console.error('PRESALE_TX_DEVNET_BLOCKED_IN_PROD', { signature });
    return null;
  }

  const rpc = createSolanaRpc(SOLANA_RPC_URL);

  const tx = await rpc
    .getTransaction(solanaSignature(signature), {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
      encoding: 'jsonParsed',
    })
    .send();

  if (!tx) return null;

  return tryMintFromTokenBalances(tx as unknown as SolanaTx);
}