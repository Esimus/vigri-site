// constants/phoneCodes.ts
// Extended phone codes list and basic per-country local number patterns.
// Patterns use 'X' for digits and preserve spaces/dashes/parentheses.

export type PhoneCode = { code: string; dial: string; label: string };

export const PHONE_CODES: PhoneCode[] = [
  // Nordics & Baltics
  { code: 'EE', dial: '+372', label: '+372 (EE)' },
  { code: 'LV', dial: '+371', label: '+371 (LV)' },
  { code: 'LT', dial: '+370', label: '+370 (LT)' },
  { code: 'FI', dial: '+358', label: '+358 (FI)' },
  { code: 'SE', dial: '+46',  label: '+46 (SE)' },
  { code: 'NO', dial: '+47',  label: '+47 (NO)' },
  { code: 'DK', dial: '+45',  label: '+45 (DK)' },
  { code: 'IS', dial: '+354', label: '+354 (IS)' },

  // Central & Western Europe
  { code: 'DE', dial: '+49',  label: '+49 (DE)' },
  { code: 'AT', dial: '+43',  label: '+43 (AT)' },
  { code: 'CH', dial: '+41',  label: '+41 (CH)' },
  { code: 'FR', dial: '+33',  label: '+33 (FR)' },
  { code: 'BE', dial: '+32',  label: '+32 (BE)' },
  { code: 'NL', dial: '+31',  label: '+31 (NL)' },
  { code: 'LU', dial: '+352', label: '+352 (LU)' },
  { code: 'IE', dial: '+353', label: '+353 (IE)' },
  { code: 'GB', dial: '+44',  label: '+44 (GB)' },

  // Southern Europe
  { code: 'ES', dial: '+34',  label: '+34 (ES)' },
  { code: 'PT', dial: '+351', label: '+351 (PT)' },
  { code: 'IT', dial: '+39',  label: '+39 (IT)' },
  { code: 'GR', dial: '+30',  label: '+30 (GR)' },

  // CEE
  { code: 'PL', dial: '+48',  label: '+48 (PL)' },
  { code: 'CZ', dial: '+420', label: '+420 (CZ)' },
  { code: 'SK', dial: '+421', label: '+421 (SK)' },
  { code: 'HU', dial: '+36',  label: '+36 (HU)' },
  { code: 'RO', dial: '+40',  label: '+40 (RO)' },
  { code: 'BG', dial: '+359', label: '+359 (BG)' },
  { code: 'SI', dial: '+386', label: '+386 (SI)' },
  { code: 'HR', dial: '+385', label: '+385 (HR)' },

  // Balkans
  { code: 'RS', dial: '+381', label: '+381 (RS)' },
  { code: 'BA', dial: '+387', label: '+387 (BA)' },
  { code: 'ME', dial: '+382', label: '+382 (ME)' },
  { code: 'MK', dial: '+389', label: '+389 (MK)' },
  { code: 'AL', dial: '+355', label: '+355 (AL)' },

  // Eastern Europe & Caucasus
  { code: 'UA', dial: '+380', label: '+380 (UA)' },
  { code: 'BY', dial: '+375', label: '+375 (BY)' },
  { code: 'RU', dial: '+7',   label: '+7 (RU)' },
  { code: 'KZ', dial: '+7',   label: '+7 (KZ)' },
  { code: 'AM', dial: '+374', label: '+374 (AM)' },
  { code: 'AZ', dial: '+994', label: '+994 (AZ)' },
  { code: 'GE', dial: '+995', label: '+995 (GE)' },
  { code: 'TR', dial: '+90',  label: '+90 (TR)' },

  // Middle East
  { code: 'IL', dial: '+972', label: '+972 (IL)' },
  { code: 'AE', dial: '+971', label: '+971 (AE)' },
  { code: 'SA', dial: '+966', label: '+966 (SA)' },
  { code: 'QA', dial: '+974', label: '+974 (QA)' },
  { code: 'KW', dial: '+965', label: '+965 (KW)' },
  { code: 'OM', dial: '+968', label: '+968 (OM)' },
  { code: 'BH', dial: '+973', label: '+973 (BH)' },

  // North America
  { code: 'US', dial: '+1',   label: '+1 (US)' },
  { code: 'CA', dial: '+1',   label: '+1 (CA)' },
  { code: 'MX', dial: '+52',  label: '+52 (MX)' },

  // South America
  { code: 'BR', dial: '+55',  label: '+55 (BR)' },
  { code: 'AR', dial: '+54',  label: '+54 (AR)' },
  { code: 'CL', dial: '+56',  label: '+56 (CL)' },
  { code: 'CO', dial: '+57',  label: '+57 (CO)' },
  { code: 'PE', dial: '+51',  label: '+51 (PE)' },
  { code: 'UY', dial: '+598', label: '+598 (UY)' },

  // Asia-Pacific
  { code: 'CN', dial: '+86',  label: '+86 (CN)' },
  { code: 'HK', dial: '+852', label: '+852 (HK)' },
  { code: 'MO', dial: '+853', label: '+853 (MO)' },
  { code: 'TW', dial: '+886', label: '+886 (TW)' },
  { code: 'JP', dial: '+81',  label: '+81 (JP)' },
  { code: 'KR', dial: '+82',  label: '+82 (KR)' },
  { code: 'IN', dial: '+91',  label: '+91 (IN)' },
  { code: 'ID', dial: '+62',  label: '+62 (ID)' },
  { code: 'MY', dial: '+60',  label: '+60 (MY)' },
  { code: 'SG', dial: '+65',  label: '+65 (SG)' },
  { code: 'TH', dial: '+66',  label: '+66 (TH)' },
  { code: 'PH', dial: '+63',  label: '+63 (PH)' },
  { code: 'VN', dial: '+84',  label: '+84 (VN)' },
  { code: 'AU', dial: '+61',  label: '+61 (AU)' },
  { code: 'NZ', dial: '+64',  label: '+64 (NZ)' },

  // Africa
  { code: 'ZA', dial: '+27',  label: '+27 (ZA)' },
  { code: 'EG', dial: '+20',  label: '+20 (EG)' },
  { code: 'NG', dial: '+234', label: '+234 (NG)' },
  { code: 'KE', dial: '+254', label: '+254 (KE)' },
  { code: 'MA', dial: '+212', label: '+212 (MA)' },
  { code: 'TN', dial: '+216', label: '+216 (TN)' },
  { code: 'DZ', dial: '+213', label: '+213 (DZ)' }
];

// Basic local patterns by ISO (most common mobile formats):
// 'X' are digits. Extra digits are simply appended (soft mask).
export const PHONE_PATTERNS: Record<string, string> = {
  // Baltics & Nordics
  EE: 'XXXX XXXX',           // 8 digits
  LV: '2XXXXXXX',            // Latvia mobiles start with 2 (8 digits) — simplified
  LT: 'XXXX XXXXX',          // 9 digits
  FI: 'XXXX XXXX',           // 8 digits (varies 7-10) — simplified
  SE: 'XXX XXX XX XX',       // 9 digits
  NO: 'XXXX XXXX',           // 8 digits
  DK: 'XXXX XXXX',           // 8 digits
  IS: 'XXX XXXX',            // 7 digits

  // Central & Western EU
  DE: 'XXXX XXXXXXX',        // 11 (var) — simplified
  AT: 'XXXX XXXXX',          // 9-10 — simplified
  CH: 'XX XXX XX XX',        // 9 digits
  FR: 'X XX XX XX XX',       // 9 digits
  BE: 'XXX XX XX XX',        // 9 digits
  NL: 'XX XXX XX XX',        // 9 digits
  LU: 'XX XX XX XX',         // 8 digits
  IE: 'XX XXX XXXX',         // 9 digits
  GB: 'XXXX XXXXXX',         // 10 (local part) — simplified

  // Southern EU
  ES: 'XXX XX XX XX',        // 9 digits
  PT: 'XXX XXX XXX',         // 9 digits
  IT: 'XXX XXX XXXX',        // 10-11 — simplified
  GR: 'XXX XXX XXXX',        // 10 digits

  // CEE
  PL: 'XXX XXX XXX',         // 9 digits
  CZ: 'XXX XXX XXX',         // 9 digits
  SK: 'XXX XXX XXX',         // 9 digits
  HU: 'XX XXX XXXX',         // 9 digits
  RO: 'XXX XXX XXX',         // 9 digits
  BG: 'XXX XXX XXX',         // 9 digits
  SI: 'XX XXX XXX',          // 8-9 — simplified
  HR: 'XXX XXX XXX',         // 9 digits

  // Balkans
  RS: 'XX XXX XXXX',         // 9 digits
  BA: 'XX XXX XXXX',         // 9 digits
  ME: 'XX XXX XXX',          // 8 digits
  MK: 'XX XXX XXXX',         // 9 digits
  AL: 'XX XXX XXXX',         // 9 digits

  // Eastern Europe & Caucasus
  UA: 'XX XXX XX XX',        // 9 digits
  BY: 'XX XXX XXXX',         // 9 digits
  RU: 'XXX XXX-XX-XX',       // 10 digits
  KZ: 'XXX XXX-XX-XX',       // 10 digits
  AM: 'XX XXX XXX',          // 8 digits
  AZ: 'XX XXX XX XX',        // 9 digits
  GE: 'XXX XX XX XX',        // 9 digits
  TR: 'XXX XXX XXXX',        // 10 digits

  // Middle East
  IL: 'XX-XXX-XXXX',         // 9 digits
  AE: 'XX XXX XXXX',         // 9 digits
  SA: '5X XXX XXXX',         // 9 digits (mobiles start 5x) — simplified
  QA: 'XXXX XXXX',           // 8 digits
  KW: 'XXXX XXXX',           // 8 digits
  OM: 'XXXX XXXX',           // 8 digits
  BH: 'XXXX XXXX',           // 8 digits

  // North America
  US: '(XXX) XXX-XXXX',      // 10 digits
  CA: '(XXX) XXX-XXXX',      // 10 digits
  MX: 'XX XXXX XXXX',        // 10 digits — simplified

  // South America
  BR: 'XX XXXXX-XXXX',       // 11 digits
  AR: 'XX XXXX-XXXX',        // 10 digits
  CL: 'X XXXX XXXX',         // 9 digits
  CO: 'XXX XXX XXXX',        // 10 digits
  PE: 'XXX XXX XXX',         // 9 digits
  UY: 'XXXX XXXX',           // 8 digits

  // APAC
  CN: 'XXX XXXX XXXX',       // 11 digits
  HK: 'XXXX XXXX',           // 8 digits
  MO: 'XXXX XXXX',           // 8 digits
  TW: 'XXXX-XXXXXX',         // 10 digits (local) — simplified
  JP: 'XX-XXXX-XXXX',        // 10 digits
  KR: 'XX-XXXX-XXXX',        // 10 digits
  IN: 'XXXXX-XXXXX',         // 10 digits
  ID: 'XXX-XXXX-XXXX',       // 11 digits — simplified
  MY: 'XXX-XXXX XXXX',       // 10-11 — simplified
  SG: 'XXXX XXXX',           // 8 digits
  TH: 'XXX-XXX-XXXX',        // 10 digits
  PH: 'XXXX-XXX-XXXX',       // 10 digits
  VN: 'XXX XXXX XXX',        // 10 digits
  AU: 'XXXX XXX XXX',        // 9 digits
  NZ: 'XXX XXX XXXX',        // 10 digits — simplified

  // Africa
  ZA: 'XX XXX XXXX',         // 9 digits
  EG: 'XXX XXXX XXX',        // 10 digits
  NG: 'XXX XXX XXXX',        // 10 digits
  KE: 'XXX XXX XXX',         // 9 digits
  MA: 'XX-XXXX-XXXX',        // 10 digits
  TN: 'XX XXX XXX',          // 8 digits
  DZ: 'XXX XX XX XX'         // 9 digits
};

// Helpers
export function getDialByCountry(iso?: string): string {
  if (!iso) return '';
  const f = PHONE_CODES.find(p => p.code === iso.toUpperCase());
  return f?.dial ?? '';
}

export function getIsoByDial(dial?: string): string {
  if (!dial) return '';
  const f = PHONE_CODES.find(p => p.dial === dial);
  return f?.code ?? '';
}

// Format local part by ISO pattern; soft mask (does not block typing).
export function formatLocalByIso(iso: string | undefined, input: string): string {
  const pattern = iso ? PHONE_PATTERNS[iso.toUpperCase()] : undefined;
  const digits = (input || '').replace(/\D+/g, '');
  if (!pattern) return digits; // no pattern: raw digits
  let out = '';
  let di = 0;
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === 'X') {
      if (di < digits.length) out += digits[di++];
      else break; // stop at first missing digit; ignore trailing pattern
    } else {
      if (di === 0 && out === '') continue; // skip leading separators until first digit
      out += ch;
    }
  }
  // append extra digits beyond pattern
  if (di < digits.length) out += digits.slice(di);
  return out;
}
