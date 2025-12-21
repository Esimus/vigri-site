// lib/kycUi.ts

export type KycStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type CountryZone = 'green' | 'grey' | 'red' | null;

export type KycUiLevel = 'error' | 'warning' | 'success' | 'info';

export type KycUiPill =
  | { type: 'countryBlocked'; level: 'error'; i18nKey: 'nft.kyc.countryBlocked' }
  | { type: 'profileRequired'; level: 'warning'; i18nKey: 'nft.kyc.profileRequired' }
  | { type: 'kycRequiredLowGrey'; level: 'warning'; i18nKey: 'nft.kyc.requiredLowGrey' }
  | { type: 'kycRequiredHigh'; level: 'warning'; i18nKey: 'nft.kyc.requiredHigh' }
  | { type: 'kycOk'; level: 'success'; i18nKey: 'nft.kyc.passed' }
  | { type: 'silverEeNoKyc'; level: 'info'; i18nKey: 'nft.kyc.silver.eeNoKyc' };

export type KycUiInput = {
  tierId: number; // 0..5
  profileCompleted: boolean;
  countryBlocked: boolean;
  kycStatus: KycStatus;
  kycCountryZone: CountryZone;
  canBuyLowTier: boolean;
  canBuyHighTier: boolean;
  profile?: {
    countryResidence?: string | null;
    countryCitizenship?: string | null;
    countryTax?: string | null;
    isikukood?: string | null;
  } | null;
};

function norm2(v: string | null | undefined): string {
  return (v ?? '').trim().toUpperCase();
}

function isEeTriple(profile: KycUiInput['profile']): boolean {
  if (!profile) return false;
  const r = norm2(profile.countryResidence);
  const c = norm2(profile.countryCitizenship);
  const t = norm2(profile.countryTax);
  return r === 'EE' && c === 'EE' && t === 'EE';
}

function hasIsikukood(profile: KycUiInput['profile']): boolean {
  const s = (profile?.isikukood ?? '').trim();
  return s.length > 0;
}

function isLowTier(tierId: number): boolean {
  return tierId === 0 || tierId === 1;
}

export function getKycUiState(input: KycUiInput): KycUiPill[] {
  const {
    tierId,
    profileCompleted,
    countryBlocked,
    kycStatus,
    kycCountryZone,
    canBuyLowTier,
    canBuyHighTier,
    profile,
  } = input;

  const zoneIsRed = kycCountryZone === 'red';
  const blocked = Boolean(countryBlocked || zoneIsRed);

  // Priority 1: country blocked (red)
  if (blocked) {
    return [{ type: 'countryBlocked', level: 'error', i18nKey: 'nft.kyc.countryBlocked' }];
  }

  // Priority 2: profile required
  if (!profileCompleted) {
    return [{ type: 'profileRequired', level: 'warning', i18nKey: 'nft.kyc.profileRequired' }];
  }

  const zone = kycCountryZone; // green | grey | null (null treated as green-ish from UI perspective)

  // Low-tier
  if (isLowTier(tierId)) {
    if (zone === 'grey') {
      if (kycStatus === 'approved' && canBuyLowTier) {
        return [{ type: 'kycOk', level: 'success', i18nKey: 'nft.kyc.passed' }];
      }
      return [{ type: 'kycRequiredLowGrey', level: 'warning', i18nKey: 'nft.kyc.requiredLowGrey' }];
    }

    // green / null: no KYC pill (do not scare user)
    return [];
  }

  // High-tier (2..5)
  const silverEeNoKyc =
    tierId === 2 && zone === 'green' && isEeTriple(profile) && hasIsikukood(profile);

  if (silverEeNoKyc) {
    return [{ type: 'silverEeNoKyc', level: 'info', i18nKey: 'nft.kyc.silver.eeNoKyc' }];
  }

  // Default high-tier rule
  if (kycStatus === 'approved' && canBuyHighTier) {
    return [{ type: 'kycOk', level: 'success', i18nKey: 'nft.kyc.passed' }];
  }

  return [{ type: 'kycRequiredHigh', level: 'warning', i18nKey: 'nft.kyc.requiredHigh' }];
}
