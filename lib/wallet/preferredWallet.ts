// lib/wallet/preferredWallet.ts
export type PreferredWalletKind = 'phantom' | 'solflare';

const PREFERRED_WALLET_KEY = 'vigri_preferred_wallet';

export function getPreferredWalletKind(): PreferredWalletKind | null {
  if (typeof window === 'undefined') return null;

  try {
    const value = window.localStorage.getItem(PREFERRED_WALLET_KEY);
    return value === 'phantom' || value === 'solflare' ? value : null;
  } catch {
    return null;
  }
}

export function setPreferredWalletKind(kind: PreferredWalletKind): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(PREFERRED_WALLET_KEY, kind);
  } catch {
    // Ignore storage errors.
  }
}

export function clearPreferredWalletKind(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(PREFERRED_WALLET_KEY);
  } catch {
    // Ignore storage errors.
  }
}