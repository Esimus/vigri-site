// hooks/usePhantomWallet.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Simple cluster → RPC mapping for dev/test/main
const CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet';

const RPC_URL =
  CLUSTER === 'mainnet'
    ? 'https://api.mainnet-beta.solana.com'
    : CLUSTER === 'testnet'
      ? 'https://api.testnet.solana.com'
      : 'https://api.devnet.solana.com';

const connection = new Connection(RPC_URL, 'confirmed');

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: PublicKey;
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
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
  publicKey: PublicKey | null;
  balance: number | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  connection: Connection;
  cluster: string;
};

export function usePhantomWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async (pubkey: PublicKey) => {
    try {
      const lamports = await connection.getBalance(pubkey);
      setBalance(lamports / LAMPORTS_PER_SOL);
    } catch (err) {
      console.error('Failed to load SOL balance', err);
    }
  }, []);

  const connect = useCallback(async () => {
    setError(null);

    const provider = getPhantomProvider();
    if (!provider) return;

    if (!provider || !provider.isPhantom) {
      setError('Phantom wallet not found');
      return;
    }

    try {
      setConnecting(true);
      const res = await provider.connect();
      const pubkey: PublicKey = res.publicKey;
      const addr = pubkey.toBase58();
      setPublicKey(pubkey);
      setAddress(addr);
      await fetchBalance(pubkey);
    } catch (err: unknown) {
      // 4001 = user rejected
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
    if (!provider) return;

    try {
      await provider.disconnect();
    } catch {
      // ignore
    } finally {
      setAddress(null);
      setBalance(null);
      setPublicKey(null);
    }
  }, []);

  useEffect(() => {
    const provider = getPhantomProvider();
    if (!provider) return;

    const updateFromPubkey = (pubkey: PublicKey) => {
  const addr = pubkey.toBase58();
  setPublicKey(pubkey);
  setAddress(addr);
  fetchBalance(pubkey);
};

    const handleConnect = (...args: unknown[]) => {
      const first = args[0];
      if (!first) return;
      const pubkey = first as PublicKey;
      updateFromPubkey(pubkey);
    };

    const handleDisconnect = () => {
      setPublicKey(null);
      setAddress(null);
      setBalance(null);
    };

    const handleAccountChanged = (...args: unknown[]) => {
      const first = args[0];
      const pubkey = (first ?? null) as PublicKey | null;

      if (!pubkey) {
        handleDisconnect();
      } else {
        updateFromPubkey(pubkey);
      }
    };

    provider.on?.('connect', handleConnect);
    provider.on?.('disconnect', handleDisconnect);
    provider.on?.('accountChanged', handleAccountChanged);

    // Try to auto-connect trusted session once
    provider.connect?.({ onlyIfTrusted: true }).catch(() => {});

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
    connection,
    cluster: CLUSTER,
  };
}
