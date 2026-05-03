// hooks/useSolflareWallet.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { setPreferredWalletKind } from '@/lib/wallet/preferredWallet';
const CLUSTER = 'mainnet' as const;

const DISCONNECT_FLAG_KEY = 'vigri_solflare_disconnected';

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

type SolflareProvider = {
  isSolflare?: boolean;
  publicKey?: WalletPublicKey;
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: WalletPublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
};

function getSolflareProvider(): SolflareProvider | null {
  if (typeof window === 'undefined') return null;
  const anyWindow = window as unknown as { solflare?: SolflareProvider };
  return anyWindow.solflare ?? null;
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
  cluster: string;
};

export function useSolflareWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<WalletPublicKey | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async (pubkey: WalletPublicKey) => {
    try {
      const res = await fetch(
        `/api/solana/balance?wallet=${encodeURIComponent(pubkey.toBase58())}`,
        { cache: 'no-store' },
      );

      const data: unknown = await res.json().catch(() => ({}));

      if (
        res.ok &&
        typeof data === 'object' &&
        data !== null &&
        'sol' in data &&
        typeof (data as { sol?: unknown }).sol === 'number'
      ) {
        setBalance((data as { sol: number }).sol);
        return;
      }

      setBalance(null);
    } catch (err) {
      console.error('Failed to load SOL balance', err);
      setBalance(null);
    }
  }, []);

  const connect = useCallback(async () => {
    setError(null);

    const provider = getSolflareProvider();
    if (!provider) {
      setError('Solflare wallet not found');
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
      setPreferredWalletKind('solflare');
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

    const provider = getSolflareProvider();
    if (!provider) {
      setError('Solflare wallet not found');
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
    const provider = getSolflareProvider();
    if (!provider) return;

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
      const pubkey = first as WalletPublicKey;
      updateFromPubkey(pubkey);
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
    cluster: CLUSTER,
  };
}
