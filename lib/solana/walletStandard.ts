// lib/solana/walletStandard.ts
import { getWallets } from '@wallet-standard/app';
import {
  getBase58Decoder,
  getBase64EncodedWireTransaction,
  getTransactionCodec,
  type Address,
  type Base64EncodedWireTransaction,
  type Transaction,
} from '@solana/kit';

const SOLANA_MAINNET_CHAIN = 'solana:mainnet';
const SOLANA_SIGN_TRANSACTION_FEATURE = 'solana:signTransaction';
const SOLANA_SIGN_AND_SEND_TRANSACTION_FEATURE = 'solana:signAndSendTransaction';

type WalletKind = 'phantom' | 'solflare';

type StandardWalletAccountLike = {
  readonly address: string;
  readonly chains: readonly string[];
  readonly features: readonly string[];
};

type StandardWalletLike = {
  readonly name: string;
  readonly chains: readonly string[];
  readonly accounts: readonly StandardWalletAccountLike[];
  readonly features: Record<string, unknown>;
};

type SignTransactionInput = {
  readonly account: StandardWalletAccountLike;
  readonly transaction: Uint8Array;
  readonly chain?: string;
  readonly options?: {
    readonly preflightCommitment?: 'processed' | 'confirmed' | 'finalized';
    readonly minContextSlot?: number;
  };
};

type SignTransactionOutput = {
  readonly signedTransaction: Uint8Array;
};

type SignAndSendTransactionInput = {
  readonly account: StandardWalletAccountLike;
  readonly transaction: Uint8Array;
  readonly chain: string;
  readonly options?: {
    readonly preflightCommitment?: 'processed' | 'confirmed' | 'finalized';
    readonly skipPreflight?: boolean;
    readonly maxRetries?: number;
    readonly minContextSlot?: number;
  };
};

type SignAndSendTransactionOutput = {
  readonly signature: Uint8Array;
};

type SolanaSignAndSendTransactionFeatureLike = {
  readonly signAndSendTransaction: (
    ...inputs: readonly SignAndSendTransactionInput[]
  ) => Promise<readonly SignAndSendTransactionOutput[]>;
};

type SolanaSignTransactionFeatureLike = {
  readonly signTransaction: (
    ...inputs: readonly SignTransactionInput[]
  ) => Promise<readonly SignTransactionOutput[]>;
};

function walletNameForKind(walletKind: WalletKind): string {
  return walletKind === 'phantom' ? 'Phantom' : 'Solflare';
}

function isSignTransactionFeature(
  value: unknown,
): value is SolanaSignTransactionFeatureLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'signTransaction' in value &&
    typeof (value as { signTransaction?: unknown }).signTransaction === 'function'
  );
}

function isSignAndSendTransactionFeature(
  value: unknown,
): value is SolanaSignAndSendTransactionFeatureLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'signAndSendTransaction' in value &&
    typeof (value as { signAndSendTransaction?: unknown }).signAndSendTransaction === 'function'
  );
}

function isUint8Array(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array;
}

async function getRegisteredWallets(): Promise<readonly StandardWalletLike[]> {
  const registry = getWallets();

  let wallets = registry.get() as readonly StandardWalletLike[];
  if (wallets.length > 0) {
    return wallets;
  }

  await new Promise((resolve) => setTimeout(resolve, 300));

  wallets = registry.get() as readonly StandardWalletLike[];
  return wallets;
}

export async function signTransactionWithWalletStandard(params: {
  walletKind: WalletKind;
  payerAddress: Address;
  transaction: Transaction;
}): Promise<Base64EncodedWireTransaction> {
  const payerAddressString = String(params.payerAddress);
  const expectedWalletName = walletNameForKind(params.walletKind);
  const wallets = await getRegisteredWallets();

  for (const wallet of wallets) {
    if (wallet.name !== expectedWalletName) continue;
    if (!wallet.chains.includes(SOLANA_MAINNET_CHAIN)) continue;

    const feature = wallet.features[SOLANA_SIGN_TRANSACTION_FEATURE];
    if (!isSignTransactionFeature(feature)) continue;

    const account = wallet.accounts.find(
      (candidate) =>
        candidate.address === payerAddressString &&
        candidate.chains.includes(SOLANA_MAINNET_CHAIN) &&
        candidate.features.includes(SOLANA_SIGN_TRANSACTION_FEATURE),
    );

    if (!account) continue;

    const transactionCodec = getTransactionCodec();
    const transactionBytes = transactionCodec.encode(params.transaction) as Uint8Array;

    const [result] = await feature.signTransaction({
      account,
      chain: SOLANA_MAINNET_CHAIN,
      transaction: transactionBytes,
      options: {
        preflightCommitment: 'confirmed',
      },
    });

    if (!result || !isUint8Array(result.signedTransaction)) {
      throw new Error('Wallet did not return a signed transaction');
    }

    const signedTransaction = transactionCodec.decode(result.signedTransaction);

    return getBase64EncodedWireTransaction(signedTransaction);
  }

  throw new Error(
    `${expectedWalletName} does not expose Wallet Standard transaction signing for the connected account`,
  );
}

export async function signAndSendTransactionWithWalletStandard(params: {
  walletKind: WalletKind;
  payerAddress: Address;
  transaction: Transaction;
}): Promise<string> {
  const payerAddressString = String(params.payerAddress);
  const expectedWalletName = walletNameForKind(params.walletKind);
  const wallets = await getRegisteredWallets();

  for (const wallet of wallets) {
    if (wallet.name !== expectedWalletName) continue;
    if (!wallet.chains.includes(SOLANA_MAINNET_CHAIN)) continue;

    const feature = wallet.features[SOLANA_SIGN_AND_SEND_TRANSACTION_FEATURE];
    if (!isSignAndSendTransactionFeature(feature)) continue;

    const account = wallet.accounts.find(
      (candidate) =>
        candidate.address === payerAddressString &&
        candidate.chains.includes(SOLANA_MAINNET_CHAIN) &&
        candidate.features.includes(SOLANA_SIGN_AND_SEND_TRANSACTION_FEATURE),
    );

    if (!account) continue;

    const transactionCodec = getTransactionCodec();
    const transactionBytes = transactionCodec.encode(params.transaction) as Uint8Array;

    const [result] = await feature.signAndSendTransaction({
      account,
      chain: SOLANA_MAINNET_CHAIN,
      transaction: transactionBytes,
      options: {
        preflightCommitment: 'confirmed',
        skipPreflight: false,
        maxRetries: 3,
      },
    });

    if (!result || !isUint8Array(result.signature)) {
      throw new Error('Wallet did not return a transaction signature');
    }

    return getBase58Decoder().decode(result.signature);
  }

  throw new Error(
    `${expectedWalletName} does not expose Wallet Standard sign-and-send transaction for the connected account`,
  );
}