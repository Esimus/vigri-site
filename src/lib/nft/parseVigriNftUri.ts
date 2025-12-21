// src/lib/nft/parseVigriNftUri.ts
export type VigriTierSlug = 'tree-steel' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'ws';
export type VigriTierCode = 'TR' | 'FE' | 'CU' | 'AG' | 'AU' | 'PT' | 'WS';

export type ParsedVigriNftUri = {
  tierSlug: VigriTierSlug;
  tierCode: VigriTierCode;
  serial: number;        // 1..N
  designKey: number;
  collectorId: string;
};

const TIER_CODES = new Set<VigriTierCode>(['TR', 'FE', 'CU', 'AG', 'AU', 'PT', 'WS']);

function stripQueryAndHash(s: string): string {
  const q = s.indexOf('?');
  const h = s.indexOf('#');
  const cut = Math.min(q === -1 ? s.length : q, h === -1 ? s.length : h);
  return s.slice(0, cut);
}

function getPath(uri: string): string | null {
  const raw = uri.trim();
  if (!raw) return null;

  // Absolute URL
  if (/^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw).pathname;
    } catch {
      return null;
    }
  }

  // Relative path
  return stripQueryAndHash(raw);
}

function parseSerial6FromFilename(filename: string): string | null {
  if (!filename.endsWith('.json')) return null;
  const base = filename.slice(0, -'.json'.length);
  if (!/^\d{6}$/.test(base)) return null;
  return base;
}

function computeDesignKey(tierSlug: VigriTierSlug, tierCode: VigriTierCode, serial: number): number | null {
  if (tierSlug === 'tree-steel') {
    if (tierCode === 'TR') return 1;
    if (tierCode === 'FE') return 2;
    return null;
  }

  if (tierSlug === 'bronze') return 1;

  if (tierSlug === 'silver') {
    return ((serial - 1) % 10) + 1;
  }

  if (tierSlug === 'gold' || tierSlug === 'platinum' || tierSlug === 'ws') {
    return serial;
  }

  return null;
}

function buildCollectorId(tierSlug: VigriTierSlug, tierCode: VigriTierCode, serial: number, designKey: number): string {
  const serial4 = String(serial).padStart(4, '0');
  const width = (tierSlug === 'gold' || tierSlug === 'platinum' || tierSlug === 'ws') ? 3 : 2;
  const designPadded = String(designKey).padStart(width, '0');
  return `${tierCode}-MMXXVI-${serial4}-${designPadded}`;
}

/**
 * Parses Vigri NFT metadata URI into deterministic fields.
 * Returns null if URI format is not recognized or inconsistent.
 */
export function parseVigriNftUri(uri: string): ParsedVigriNftUri | null {
  const path = getPath(uri);
  if (!path) return null;

  const normalized = path.startsWith('/') ? path : `/${path}`;
  const parts = normalized.split('/'); // keeps leading '' for '/...'

  // Expected: ['', 'metadata', 'nft', ...]
  if (parts.length < 6) return null;
  if (parts[1] !== 'metadata' || parts[2] !== 'nft') return null;

  const tierSlugRaw = parts[3] as VigriTierSlug;
  if (!['tree-steel', 'bronze', 'silver', 'gold', 'platinum', 'ws'].includes(tierSlugRaw)) return null;

  if (tierSlugRaw === 'silver') {
    // ['', 'metadata', 'nft', 'silver', 'AG', 'v03', '000058.json']
    if (parts.length < 7) return null;

    const tierCodeRaw = parts[4] as VigriTierCode;
    if (!TIER_CODES.has(tierCodeRaw)) return null;

    const variant = parts[5];
    if (!variant) return null;
    if (!/^v\d{2}$/.test(variant)) return null;

    const p6 = parts[6];
    if (!p6) return null;
    const serial6 = parseSerial6FromFilename(p6);
    if (!serial6) return null;

    const serial = parseInt(serial6, 10);
    if (!Number.isFinite(serial) || serial < 1) return null;

    const designKey = computeDesignKey(tierSlugRaw, tierCodeRaw, serial);
    if (!designKey) return null;

    // Strict consistency check: variant must match computed designKey
    const expectedVariant = `v${String(designKey).padStart(2, '0')}`;
    if (variant !== expectedVariant) return null;

    const collectorId = buildCollectorId(tierSlugRaw, tierCodeRaw, serial, designKey);
    return { tierSlug: tierSlugRaw, tierCode: tierCodeRaw, serial, designKey, collectorId };
  }

  // Non-silver:
  // ['', 'metadata', 'nft', 'tree-steel', 'TR', '000001.json']
  if (parts.length < 6) return null;

  const tierCodeRaw = parts[4] as VigriTierCode;
  if (!TIER_CODES.has(tierCodeRaw)) return null;

  const p5 = parts[5];
  if (!p5) return null;
  const serial6 = parseSerial6FromFilename(p5);
  if (!serial6) return null;

  const serial = parseInt(serial6, 10);
  if (!Number.isFinite(serial) || serial < 1) return null;

  const designKey = computeDesignKey(tierSlugRaw, tierCodeRaw, serial);
  if (!designKey) return null;

  const collectorId = buildCollectorId(tierSlugRaw, tierCodeRaw, serial, designKey);
  return { tierSlug: tierSlugRaw, tierCode: tierCodeRaw, serial, designKey, collectorId };
}
