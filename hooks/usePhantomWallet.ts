// hooks/usePhantomWallet.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { createSolanaRpc, address as solanaAddress } from '@solana/kit';
import { CONFIG, SOLANA_RPC_URL } from '@/lib/config';

// Single source of truth
const rpc = createSolanaRpc(SOLANA_RPC_URL);

const DISCONNECT_FLAG_KEY = 'vigri_phantom_disconnected';

function setManualDisconnectFlag(value: boolean) {
  if (typeof window === 'undefined') return;
  try {
    if (value) {
      window.localStorage.setItem(DISCONNECT_FLAG_KEY, '1');
    } else {
      window.localStorage.removeItem(DISCONNECT_FLAG_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

function hasManualDisconnectFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DISCONNECT_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

type WalletPublicKey = {
  toBase58: () => string;
};

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: WalletPublicKey;
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: WalletPublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
};

function getPhantomProvider(): PhantomProvider | null {
  if (typeof window === 'undefined') return null;
  const anyWindow = window as unknown as { solana?: PhantomProvider };
  return anyWindow.solana ?? null;
}

type WalletState = {
  connected: boolean;
  address: string | null;
  publicKey: WalletPublicKey | null;
  balance: number | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  connection: typeof rpc;
  cluster: string;
};

export function usePhantomWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<WalletPublicKey | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async (pubkey: WalletPublicKey) => {
    try {
      const lamports = await rpc
        .getBalance(solanaAddress(pubkey.toBase58()), { commitment: 'confirmed' })
        .send();

      setBalance(Number(lamports.value) / 1_000_000_000);
    } catch (err) {
      console.error('Failed to load SOL balance', err);
      setBalance(null);
    }
  }, []);

  const connect = useCallback(async () => {
    setError(null);

    const provider = getPhantomProvider();
    if (!provider || !provider.isPhantom) {
      setError('Phantom wallet not found');
      return;
    }

    try {
      setConnecting(true);
      const res = await provider.connect({ onlyIfTrusted: false });
      const pubkey: WalletPublicKey = res.publicKey;
      const addr = pubkey.toBase58();

      setPublicKey(pubkey);
      setAddress(addr);
      setManualDisconnectFlag(false);

      await fetchBalance(pubkey);
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      if (e.code !== 4001) {
        setError(e.message ?? 'Failed to connect wallet');
      }
    } finally {
      setConnecting(false);
    }
  }, [fetchBalance]);

  const disconnect = useCallback(async () => {
    setError(null);

    const provider = getPhantomProvider();
    if (!provider || !provider.isPhantom) {
      setError('Phantom wallet not found');
      return;
    }

    try {
      await provider.disconnect();
    } catch {
      // ignore
    } finally {
      setAddress(null);
      setBalance(null);
      setPublicKey(null);
      setManualDisconnectFlag(true);
    }
  }, []);

  useEffect(() => {
    const provider = getPhantomProvider();
    if (!provider || !provider.isPhantom) return;

    const updateFromPubkey = (pubkey: WalletPublicKey) => {
      const addr = pubkey.toBase58();
      setPublicKey(pubkey);
      setAddress(addr);
      setManualDisconnectFlag(false);
      fetchBalance(pubkey);
    };

    const handleConnect = (...args: unknown[]) => {
      const first = args[0];
      if (!first) return;
      updateFromPubkey(first as WalletPublicKey);
    };

    const handleDisconnect = () => {
      setPublicKey(null);
      setAddress(null);
      setBalance(null);
    };

    const handleAccountChanged = (...args: unknown[]) => {
      const first = args[0];
      const pubkey = (first ?? null) as WalletPublicKey | null;

      if (!pubkey) {
        handleDisconnect();
      } else {
        updateFromPubkey(pubkey);
      }
    };

    // Session restore: if user did NOT manually disconnect and provider already has publicKey
    if (!hasManualDisconnectFlag()) {
      const existingPubkey = provider.publicKey ?? null;
      if (existingPubkey) {
        updateFromPubkey(existingPubkey);
      }
    }

    provider.on?.('connect', handleConnect);
    provider.on?.('disconnect', handleDisconnect);
    provider.on?.('accountChanged', handleAccountChanged);

    // Restore session after reload if user did not manually disconnect
    const manuallyDisconnected = hasManualDisconnectFlag();
    if (!manuallyDisconnected && provider.publicKey) {
      updateFromPubkey(provider.publicKey);
    }

    return () => {
      provider.off?.('connect', handleConnect);
      provider.off?.('disconnect', handleDisconnect);
      provider.off?.('accountChanged', handleAccountChanged);
    };
  }, [fetchBalance]);

  return {
    connected: !!address,
    address,
    publicKey,
    balance,
    connecting,
    error,
    connect,
    disconnect,
    connection: rpc,
    cluster: CONFIG.CLUSTER,
  };
}
