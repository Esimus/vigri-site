/**
 * constants/amlAnnexA.ts
 *
 * Annex A (v0): country zoning + profile allow-list builder.
 * Keep this file small and deterministic.
 *
 * - constants/countries.ts (COUNTRIES) is the full ISO 3166-1 alpha-2 reference list.
 * - buildProfileCountryOptions() returns the Profile UI list (filtered + ordered).
 * - If a country is not classified (green/grey/red), it must NOT appear in Profile options.
 *
 * GREEN baseline: EEA + UK + CH
 * (EEA = EU + IS + LI + NO)
 */

import type { Country } from '@/constants/countries';

export type AmlZone = 'green' | 'grey' | 'red' | 'unknown';

// Prefer to show these first in the profile dropdown (in this exact order).
export const PROFILE_TOP_COUNTRY_CODES = [
  'EE', 'RU', 'LT', 'KG', 'GE',
  'LV', 'FI', 'SE', 'NO', 'DK', 'DE',
] as const;

/**
 * GREEN = “EEA + UK + CH”
 * - EU (27) + IS/LI/NO
 * - plus GB (United Kingdom) and CH (Switzerland)
 *
 * Keep it explicit (no magic generators) to avoid surprises.
 */
const GREEN_CODES = new Set<string>([
  // EU
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  // EEA (non-EU)
  'IS', 'LI', 'NO',
  // UK + CH
  'GB', 'CH',
]);

/**
 * GREY (v0): allowed, but higher risk (always full KYC / limits).
 * Keep this list short and only where we are confident.
 */
const GREY_CODES = new Set<string>([
  'RU', 'US', 'KZ', 'KG', 'GE',
]);

/**
 * RED (v0): blocked / not serviced.
 * Keep this list short and only where we are confident.
 */
const RED_CODES = new Set<string>([
  'BY', 'UA',
]);

export function resolveAmlZone(code: string | null | undefined): AmlZone {
  if (!code) return 'unknown';
  const c = code.toUpperCase().trim();
  if (!c) return 'unknown';

  if (RED_CODES.has(c)) return 'red';
  if (GREY_CODES.has(c)) return 'grey';
  if (GREEN_CODES.has(c)) return 'green';

  return 'unknown';
}

export function isProfileCountryAllowed(code: string | null | undefined): boolean {
  const z = resolveAmlZone(code);
  return z === 'green' || z === 'grey';
}

/**
 * Build dropdown options for profile:
 * - show PROFILE_TOP_COUNTRY_CODES first (if present + allowed)
 * - then append the rest in the original ISO list order (COUNTRIES order),
 *   filtered by allowlist (green/grey only), excluding duplicates.
 */
export function buildProfileCountryOptions(all: Country[]): Country[] {
  const byCode = new Map<string, Country>();
  for (const c of all) byCode.set(c.code.toUpperCase(), c);

  const out: Country[] = [];
  const seen = new Set<string>();

  for (const code of PROFILE_TOP_COUNTRY_CODES) {
    const item = byCode.get(code);
    if (!item) continue;
    const key = item.code.toUpperCase();
    if (seen.has(key)) continue;
    if (!isProfileCountryAllowed(key)) continue;
    out.push(item);
    seen.add(key);
  }

  for (const item of all) {
    const key = item.code.toUpperCase();
    if (seen.has(key)) continue;
    if (!isProfileCountryAllowed(key)) continue;
    out.push(item);
    seen.add(key);
  }

  return out;
}