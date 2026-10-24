import { createHash } from 'node:crypto';

export type MintRecord = {
  kind: 'paid' | 'admin';
  tier: number;
  mint: string;
  payer: string | null;
  paidLamports: string;
};

export type TransactionAudit = {
  controls: string[];
  mints: MintRecord[];
};

export type AuditScope = {
  program: string;
  pda: string;
  treasury: string;
};

// Change this when transaction verification rules change.
export const NFT_PROGRESS_VERSION = 'v1';

const TOKEN = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const SYSTEM = '11111111111111111111111111111111';
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const CONTROLS = [
  'initialize',
  'recover_config',
  'update_collection_mint',
  'update_config',
];

const NAMES = new Map(
  [...CONTROLS, 'mint_nft', 'admin_mint'].map((name) => [
    createHash('sha256').update(`global:${name}`).digest('hex').slice(0, 16),
    name,
  ] as const),
);

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected object');
  }
  return value as Record<string, unknown>;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('Expected array');
  return value;
}

function string(value: unknown): string {
  if (typeof value !== 'string' || !value) throw new Error('Expected string');
  return value;
}

function integer(value: unknown): bigint {
  if (typeof value === 'bigint' && value >= BigInt(0)) return value;

  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    return BigInt(value);
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) return BigInt(value);

  throw new Error('Invalid unsigned integer');
}

function decode58(value: string): Buffer {
  let n = BigInt(0);

  for (const char of value) {
    const digit = ALPHABET.indexOf(char);
    if (digit < 0) throw new Error('Invalid base58');
    n = n * BigInt(58) + BigInt(digit);
  }

  const hex = n.toString(16);
  const bytes = n === BigInt(0)
    ? Buffer.alloc(0)
    : Buffer.from(hex.padStart(Math.ceil(hex.length / 2) * 2, '0'), 'hex');

  return Buffer.concat([
    Buffer.alloc(value.match(/^1*/)?.[0].length ?? 0),
    bytes,
  ]);
}

export function parseNftTransaction(
  value: unknown,
  scope: AuditScope,
): TransactionAudit {
  const tx = object(value);
  const meta = object(tx.meta);

  if (meta.err !== null) {
    throw new Error('Transaction unsuccessful or metadata incomplete');
  }

  const instructions = array(
    object(object(tx.transaction).message).instructions,
  ).map(object);

  const groups = meta.innerInstructions == null
    ? null
    : array(meta.innerInstructions).map(object);

  const inner = new Map<number, Record<string, unknown>[]>();

  for (const group of groups ?? []) {
    const children = array(group.instructions).map(object);

    if (children.some((ix) => ix.programId === scope.program)) {
      throw new Error('Nested VIGRI call requires review');
    }

    inner.set(Number(integer(group.index)), children);
  }

  const result: TransactionAudit = { controls: [], mints: [] };

  for (const [index, ix] of instructions.entries()) {
    if (ix.programId !== scope.program) continue;

    const accounts = array(ix.accounts).map(string);

    if (!accounts.includes(scope.pda)) {
      throw new Error('Unexpected configuration account');
    }

    const raw = decode58(string(ix.data));
    const name = NAMES.get(raw.subarray(0, 8).toString('hex'));

    if (!name) throw new Error('Unknown VIGRI instruction');

    if (CONTROLS.includes(name)) {
      result.controls.push(name);
      continue;
    }

    const tier = raw[8];
    if (groups === null || raw.length < 9 || tier === undefined || tier > 5) {
      throw new Error('Incomplete mint data');
    }

    const initialized = new Map<string, string>();
    const minted: Record<string, unknown>[] = [];
    const payments: { payer: string; amount: bigint }[] = [];

    for (const child of inner.get(index) ?? []) {
      if (child.programId !== TOKEN && child.programId !== SYSTEM) continue;

      const parsed = object(child.parsed);
      const kind = parsed.type;

      if (
        child.programId === TOKEN &&
        ['initializeMint', 'initializeMint2', 'mintTo'].includes(String(kind))
      ) {
        const info = object(parsed.info);

        if (kind === 'mintTo') {
          if (integer(info.amount) === BigInt(1)) minted.push(info);
        } else if (integer(info.decimals) === BigInt(0)) {
          initialized.set(string(info.mint), string(info.mintAuthority));
        }
      }

      if (child.programId === SYSTEM && kind === 'transfer') {
        const info = object(parsed.info);

        if (info.destination === scope.treasury) {
          const payer = string(info.source);

          if (!accounts.includes(payer)) {
            throw new Error('Payment source missing from instruction');
          }

          payments.push({ payer, amount: integer(info.lamports) });
        }
      }
    }

    const candidates = minted.filter((m) =>
      initialized.has(string(m.mint)) &&
      initialized.get(string(m.mint)) === m.mintAuthority,
    );

    if (candidates.length !== 1) {
      throw new Error('Expected exactly one newly initialized NFT');
    }

    const candidate = candidates[0];
    if (!candidate) throw new Error('NFT mint candidate is missing');
    const mint = string(candidate.mint);

    if (!accounts.includes(mint)) {
      throw new Error('Mint account not found in instruction');
    }

    const balances = array(meta.postTokenBalances).map(object).filter((b) => {
      if (b.mint !== mint) return false;

      const amount = object(b.uiTokenAmount);

      return (
        integer(amount.amount) === BigInt(1) &&
        integer(amount.decimals) === BigInt(0)
      );
    });

    if (balances.length !== 1) {
      throw new Error('NFT post-balance not confirmed');
    }

    const paid = name === 'mint_nft';

    if (paid && payments.length === 0) {
      throw new Error('Payment to treasury not found');
    }

    if (!paid && payments.length !== 0) {
      throw new Error('Unexpected payment in admin mint');
    }

    if (new Set(payments.map((p) => p.payer)).size > 1) {
      throw new Error('Multiple payment sources require review');
    }

    result.mints.push({
      kind: paid ? 'paid' : 'admin',
      tier,
      mint,
      payer: payments[0]?.payer ?? null,
      paidLamports: payments
        .reduce((sum, p) => sum + p.amount, BigInt(0))
        .toString(),
    });
  }

  return result;
}

export type ProgressTier = {
  id: number;
  supply_total: number;
  supply_minted: number;
  admin_minted: number;
  price_lamports: bigint;
};

type AuditedTransaction = {
  signature: string;
  audit: TransactionAudit;
};

const TEST_PAYER = '7n1iafDgWfRo1z9wYi1t2c9RxirREbQndpd1oAYuoYyT';

// Exclude these verified tests only, not all purchases from this wallet.
const TEST_PURCHASES = new Map<string, { mint: string; lamports: string }>([
  [
    '5WMEr685mCAo6wsX8YD7BHY4PLaSuzcv2f2ot7LS4WnCPbHYHvsu8YRPpARHhX5uuaysiLcFLH7r7XmKtTYuer8c',
    {
      mint: '8DcqwXJQG4mGeHoRQEx1zuLoUe1S5e3esXieifEApamM',
      lamports: '500000000',
    },
  ],
  [
    '5UsWAvHDnc6sUUDyFuRSLRGxTu8F946xyMBvVfgamXPwcaFT997fKAGrwNmd6TBBLDXKXQAPjfWL4dqRcjABVUMR',
    {
      mint: 'Ac5kks5fr4HSSt9ajL9jwCrJin1rtkKdFFg22mv44t7U',
      lamports: '500000000',
    },
  ],
  [
    '2AQgiRxq9RR1zUYf7Tbi3oGr8Vit1YXxcdSukwRZa65VMRhhn8sRrhFTg5Ad2SR1S8baUirJnWCi1WL5rNQrC4HU',
    {
      mint: 'DfF8ZLxa5vos9f5LfaU2QoucYKx1wpJJwxoebUZavyek',
      lamports: '500000000',
    },
  ],
  [
    '4QFYsR3nuTbWdXJhmzT66aYs2ANGzMaBNyBiXXQQCHzFCycCCb86e3DrFnBqop9xmtezEvguNREBPGhZAVco3mwK',
    {
      mint: '7RSRkgJsZcbfG1iLcT8UASpo7wrHX8LeiknLwCaBz6Ka',
      lamports: '2000000000',
    },
  ],
]);

function counterAt(counts: readonly number[], tier: number): number {
  const count = counts[tier];
  if (count === undefined) throw new Error('Missing tier counter');
  return count;
}

function sol(value: bigint): string {
  const fraction = (value % BigInt(1_000_000_000))
    .toString()
    .padStart(9, '0')
    .replace(/0+$/, '');

  return `${value / BigInt(1_000_000_000)}${fraction ? `.${fraction}` : ''}`;
}

function percent(value: bigint, total: bigint): number | null {
  return total > BigInt(0)
    ? Number(value * BigInt(100_000_000) / total) / 1_000_000
    : null;
}

export function summarizeNftProgress(
  tiers: readonly ProgressTier[],
  transactions: readonly AuditedTransaction[],
) {
  if (tiers.length !== 6 || new Set(tiers.map((t) => t.id)).size !== 6) {
    throw new Error('Invalid tier list');
  }

  const paid = Array<number>(6).fill(0);
  const admin = Array<number>(6).fill(0);
  const seen = new Set<string>();
  const signatures = new Set<string>();
  const excluded = new Set<string>();

  let initializations = 0;
  let gross = BigInt(0);
  let testPayments = BigInt(0);

  for (const tx of transactions) {
    if (signatures.has(tx.signature)) {
      throw new Error('Duplicate transaction');
    }

    signatures.add(tx.signature);
    initializations += tx.audit.controls
      .filter((name) => name === 'initialize').length;

    const test = TEST_PURCHASES.get(tx.signature);

    if (test && tx.audit.mints.length !== 1) {
      throw new Error('Test transaction does not match audit');
    }

    for (const mint of tx.audit.mints) {
      if (
        !Number.isInteger(mint.tier) ||
        mint.tier < 0 ||
        mint.tier > 5 ||
        seen.has(mint.mint)
      ) {
        throw new Error('Duplicate mint or invalid tier');
      }

      seen.add(mint.mint);
      const amount = integer(mint.paidLamports);

      if (mint.kind === 'admin') {
        if (amount !== BigInt(0) || test) {
          throw new Error('Unexpected admin payment');
        }

        admin[mint.tier] = counterAt(admin, mint.tier) + 1;
      } else {
        paid[mint.tier] = counterAt(paid, mint.tier) + 1;
        gross += amount;
      }

      if (test) {
        if (
          mint.kind !== 'paid' ||
          mint.mint !== test.mint ||
          mint.payer !== TEST_PAYER ||
          amount !== BigInt(test.lamports)
        ) {
          throw new Error('Test payment differs from verified audit');
        }

        excluded.add(tx.signature);
        testPayments += amount;
      }
    }
  }

  if (initializations !== 1 || excluded.size !== TEST_PURCHASES.size) {
    throw new Error('Incomplete transaction history');
  }

  let total = 0;
  let target = BigInt(0);

  for (const tier of tiers) {
    if (!Number.isInteger(tier.id) || tier.id < 0 || tier.id > 5) {
      throw new Error('Invalid tier ID');
    }

    const supply = integer(tier.supply_total);
    const issued = integer(tier.supply_minted);
    const gifted = integer(tier.admin_minted);

    if (
      issued > supply ||
      gifted > issued ||
      issued !== BigInt(counterAt(paid, tier.id) + counterAt(admin, tier.id)) ||
      gifted !== BigInt(counterAt(admin, tier.id))
    ) {
      throw new Error(`NFT counters differ from history for tier ${tier.id}`);
    }

    total += tier.supply_total;
    target += supply * integer(tier.price_lamports);
  }

  const raised = gross - testPayments;

  return {
    collection: {
      total,
      issued: seen.size,
      paidMints: paid.reduce((sum, n) => sum + n, 0),
      adminMints: admin.reduce((sum, n) => sum + n, 0),
      percent: percent(BigInt(seen.size), BigInt(total)),
    },
    funding: {
      raisedSol: sol(raised),
      grossReceiptsSol: sol(gross),
      excludedTestSol: sol(testPayments),
      raisedLamports: raised.toString(),
      targetLamports: target.toString(),
      targetSol: sol(target),
      percent: percent(raised, target),
      excludedTestPurchases: excluded.size,
    },
  };
}