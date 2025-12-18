// src/lib/kyc/getKycUiState.ts

export type CountryZone = 'green' | 'grey' | 'red' | null;

export type KycStatus = 'none' | 'pending' | 'approved' | 'rejected';

export type KycBadgeState = {
  blockedByAml: boolean;
  kycNeeded: boolean;
  showKycBadge: boolean;
};

/**
 * Normalize any unknown KYC value into a strict KycStatus.
 */
export function normalizeKycStatus(v: unknown): KycStatus {
  if (typeof v === 'string') {
    const s = v.toLowerCase();
    if (s === 'approved') return 'approved';
    if (s === 'pending') return 'pending';
    if (s === 'rejected') return 'rejected';
  }
  return 'none';
}

/**
 * Type guard for CountryZone values.
 */
export function isCountryZone(v: unknown): v is CountryZone {
  return v === 'green' || v === 'grey' || v === 'red' || v === null;
}

/**
 * Classify NFT tier group by its id (used on list cards).
 * low  -> Tree/Steel, Bronze
 * silver -> Silver tier (special EE/EE/EE rule)
 * high -> Gold, Platinum, WS-20
 */
export type TierGroup = 'low' | 'silver' | 'high' | 'unknown';

export function classifyTierFromNftId(id: string): TierGroup {
  switch (id) {
    case 'nft-tree-steel':
    case 'nft-bronze':
      return 'low';
    case 'nft-silver':
      return 'silver';
    case 'nft-gold':
    case 'nft-platinum':
    case 'nft-ws-20':
      return 'high';
    default:
      return 'unknown';
  }
}

/**
 * Compute AML/KYC badge state for NFT list cards.
 * This matches the business rules we use on the details page:
 *
 * - Red zone: hard AML block for all tiers.
 * - Grey zone: KYC required for all tiers.
 * - Green zone:
 *   - low tier (Tree/Bronze): no KYC.
 *   - high tiers: KYC required.
 *   - Silver + EE/EE/EE: no KYC needed (special case).
 * - Unknown zone: fall back to catalog-level kycRequired flag.
 */
export function getKycBadgeStateForNftList(opts: {
  nftId: string;
  zone: CountryZone;
  isEe: boolean;
  kycStatus: KycStatus;
  kycRequired?: boolean;
}): KycBadgeState {
  const { nftId, zone, isEe, kycStatus, kycRequired } = opts;

  const tierGroup = classifyTierFromNftId(nftId);
  const blockedByAml = zone === 'red';

  let kycNeeded = false;

  if (!blockedByAml) {
    if (zone === 'grey') {
      // Grey zone: KYC for all tiers
      kycNeeded = true;
    } else if (zone === 'green') {
      if (tierGroup === 'low') {
        // Green + low tier: no KYC
        kycNeeded = false;
      } else if (tierGroup === 'silver') {
        // Silver + EE/EE/EE: special exemption (profile only)
        kycNeeded = !isEe;
      } else if (tierGroup === 'high') {
        // Green + high tiers: KYC required
        kycNeeded = true;
      }
    } else {
      // Unknown/null zone: rely on catalog flag as a fallback
      kycNeeded = Boolean(kycRequired);
    }
  }

  const showKycBadge = kycNeeded && kycStatus !== 'approved';

  return {
    blockedByAml,
    kycNeeded,
    showKycBadge,
  };
}
