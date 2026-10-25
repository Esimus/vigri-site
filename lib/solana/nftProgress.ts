import { unstable_cache } from 'next/cache';
import { address, signature } from '@solana/kit';
import { fetchGlobalConfigDecoded } from './vigriPresaleAccounts';
import { getPresaleProgramId, getSolanaConnection } from './vigriPresale';
import {
  NFT_PROGRESS_VERSION,
  parseNftTransaction,
  summarizeNftProgress,
  type TransactionAudit,
} from './nftProgressCore';

export const NFT_PROGRESS_CACHE_SECONDS = 60;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

let rpcRetryAt = 0;

async function readRpc<T>(request: () => Promise<T>): Promise<T> {
  if (rpcRetryAt - Date.now() > 60_000) {
    throw new Error('RPC rate limit cooldown is active');
  }

  for (let attempt = 0; ; attempt += 1) {
    await sleep(Math.max(1500, rpcRetryAt - Date.now()));

    try {
      return await request();
    } catch (error: unknown) {
      const context: Record<string, unknown> =
        typeof error === 'object' && error !== null &&
        'context' in error && typeof error.context === 'object' &&
        error.context !== null
          ? error.context as Record<string, unknown>
          : {};

      const limited = context.statusCode === 429 || context.code === 429 ||
        (error instanceof Error && /HTTP error \(429\)/.test(error.message));

      if (!limited) throw error;

      const header = context.headers instanceof Headers
        ? context.headers.get('retry-after')
        : null;
      const seconds = header !== null && /^\d+$/.test(header.trim())
        ? Number(header) * 1000
        : NaN;
      const dateDelay = header === null ? NaN : Date.parse(header) - Date.now();
      const serverDelay = Number.isFinite(seconds)
        ? seconds
        : Number.isFinite(dateDelay) ? Math.max(0, dateDelay) : 0;
      const delay = Math.max(5000 * 2 ** attempt, serverDelay);

      rpcRetryAt = Date.now() + delay;
      if (attempt >= 3 || delay > 60_000) throw error;

      console.warn(`[nft/progress] RPC 429; retry ${attempt + 1}/3 in ${Math.ceil(delay / 1000)}s`);
    }
  }
}

const getCachedTransaction = unstable_cache(
  async (
    sig: string,
    program: string,
    pda: string,
    treasury: string,
  ): Promise<TransactionAudit> => {
    // Cache verified finalized results only.

    const rpc = getSolanaConnection('mainnet');

    const tx = await readRpc(() => rpc.getTransaction(signature(sig), {
      commitment: 'finalized',
      encoding: 'jsonParsed',
      maxSupportedTransactionVersion: 0,
    }).send({ abortSignal: AbortSignal.timeout(20_000) }));

    if (!tx) throw new Error('NFT transaction unavailable');

    return parseNftTransaction(tx, { program, pda, treasury });
  },
  ['vigri-nft-transaction', NFT_PROGRESS_VERSION],
  { revalidate: false },
);

async function loadSnapshot(program: string) {
  const rpc = getSolanaConnection('mainnet');
  const first = await readRpc(() => fetchGlobalConfigDecoded(rpc));

  if (!first) throw new Error('NFT configuration unavailable');

  const pda = first.pda;
  const treasury = first.account.admin;

  const owner = await readRpc(() => rpc.getAccountInfo(address(pda), {
    commitment: 'finalized',
    encoding: 'base64',
  }).send({ abortSignal: AbortSignal.timeout(20_000) }));

  if (!owner.value || String(owner.value.owner) !== program) {
    throw new Error('Unexpected configuration owner');
  }

  const signatures = new Set<string>();
  const cursors = new Set<string>();
  let before: string | undefined;

  for (;;) {
    const page = await readRpc(() => rpc.getSignaturesForAddress(address(pda), {
      commitment: 'finalized',
      limit: 1000,
      ...(before ? { before: signature(before) } : {}),
    }).send({ abortSignal: AbortSignal.timeout(20_000) }));

    for (const row of page) {
      if (row.err === null) signatures.add(String(row.signature));
    }

    if (page.length < 1000) break;

    const lastRow = page[page.length - 1];
    if (!lastRow) throw new Error('Transaction history page is empty');
    const last = String(lastRow.signature);

    if (cursors.has(last)) {
      throw new Error('Transaction history pagination stalled');
    }

    cursors.add(last);
    before = last;
  }

  const transactions: {
    signature: string;
    audit: TransactionAudit;
  }[] = [];

  for (const sig of [...signatures].reverse()) {
    const audit = await getCachedTransaction(sig, program, pda, treasury);
    transactions.push({ signature: sig, audit });
  }

  const latest = await readRpc(() => fetchGlobalConfigDecoded(rpc));

  if (
    !latest ||
    latest.pda !== pda ||
    latest.account.admin !== treasury
  ) {
    throw new Error('NFT configuration changed during verification');
  }

  const totals = summarizeNftProgress(latest.account.tiers, transactions);

  return {
    network: 'mainnet' as const,
    checkedAt: new Date().toISOString(),
    program,
    pda,
    treasury,
    ...totals,
  };
}

type Snapshot = Awaited<ReturnType<typeof loadSnapshot>>;

type CacheEntry = {
  data?: Snapshot;
  pending?: Promise<Snapshot>;
  retryAfter: number;
};

// Keep this outside unstable_cache to preserve the transaction cache.
const snapshots = new Map<string, CacheEntry>();

export async function getNftProgress() {
  const program = String(getPresaleProgramId('mainnet'));

  const entry: CacheEntry = snapshots.get(program) ?? { retryAfter: 0 };
  snapshots.set(program, entry);

  if (
    entry.data &&
    Date.now() - Date.parse(entry.data.checkedAt) <
      NFT_PROGRESS_CACHE_SECONDS * 1000
  ) {
    return { ...entry.data, stale: false };
  }

  if (Date.now() < entry.retryAfter) {
    if (entry.data) return { ...entry.data, stale: true };

    throw new Error('NFT progress refresh cooling down');
  }

  if (!entry.pending) {
    entry.pending = loadSnapshot(program)
      .then((data) => {
        entry.data = data;
        entry.retryAfter = 0;
        return data;
      })
      .catch((error: unknown) => {
        entry.retryAfter = Math.max(Date.now() + 10_000, rpcRetryAt);
        throw error;
      })
      .finally(() => {
        entry.pending = undefined;
      });
  }

  try {
    return { ...await entry.pending, stale: false };
  } catch (error: unknown) {
    if (entry.data) return { ...entry.data, stale: true };

    throw error;
  }
}