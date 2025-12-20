// constants/nftCatalog.ts
// Centralized NFT catalog & nav used by details pages.
// All comments must be in English.

export type NftDesign = {
  id: string;          // stable id for selection/purchases
  label: string;       // UI label (can be localized later)
  rarity?: number;     // optional rarity weight 0..1
};

export type NftMeta = {
  id: string;                           // route id, e.g. 'nft-tree-steel'
  tier: 'tree' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'ws';

  // Prefer i18n keys for text; UI will call t() for these if present.
  nameKey?: string;                     // e.g. 'nft.treeSteel.name'
  blurbKey?: string;                    // e.g. 'nft.treeSteel.blurb'
  featureKeys?: string[];               // e.g. ['nft.treeSteel.f1', '...']

  // Fallback plain text (optional; used if no *Key is provided)
  name?: string;
  blurb?: string;
  features?: string[];

  // Visual
  image: string;                     // file name from /public/images/nft/

  // Purchase/rights flags (static hints)
  kycRequired?: boolean;
  vesting?: string | null;
  revealNote?: string;

  // Activation mode
  activationType: 'flex' | 'fixed' | 'none';
  fixedClaimPct?: number;               // if activationType === 'fixed'

  // Optional list of selectable designs/variants
  designs?: NftDesign[];

  // ---- spec fields ----
  supply?: number;
  // After given date price in SOL may increase by multiplier (default 2x)
  priceAfter?: { date: string; solMultiplier?: number } | null;
  revealLabelKey?: string;  // i18n key for label
  revealValue?: string;     // e.g. "Q2 2026"

  // ---- explainers ----
  explainers?: Array<{ titleKey: string; textKey: string }>;
};

// --- NAV ---

export const NFT_NAV: Array<{ id: string; name: string }> = [
  { id: 'nft-tree-steel', name: 'Tree / Steel NFT' },
  { id: 'nft-bronze',     name: 'Bronze NFT' },
  { id: 'nft-silver',     name: 'Silver NFT' },
  { id: 'nft-gold',       name: 'Gold NFT' },
  { id: 'nft-platinum',   name: 'Platinum NFT' },
  { id: 'nft-ws-20',      name: 'WS · 20 NFT' },
];

// --- CATALOG ---

export const NFT_CATALOG: Record<string, NftMeta> = {
  // 1) Tree / Steel
  'nft-tree-steel': {
    id: 'nft-tree-steel',
    tier: 'tree',

    // i18n-first content; UI will call t() with these keys
    nameKey: 'Tree / Steel',
    blurbKey: 'nft.summary.tree_6',
    featureKeys: [
      'nft.summary.tree_0',
      'nft.summary.tree_1',
      'nft.summary.tree_2',
      'nft.summary.tree_3',
      'nft.summary.tree_4',
      'nft.summary.tree_5',
    ],

    // visual
    image: '1_mb_wood_stell.webp',

    // flags (tune if needed)
    kycRequired: false,
    vesting: null,
    revealNote: 'Design selection at checkout',

    // activation: user chooses between claim/discount split
    activationType: 'none',

    // selectable designs (labels are plain for now; can switch to labelKey later)
    designs: [
      { id: 'wood',  label: 'Wood'  },
      { id: 'steel', label: 'Steel' },
    ],

    // additional fields for specs/chips
    priceAfter: { date: '2025-12-31', solMultiplier: 2 },


    // explanations (accordion/sheet)
    explainers: [
        { titleKey: 'nft.explain.buy.title', textKey: 'nft.explain.tree_buy.text' },
        { titleKey: 'nft.summary.tree_0', textKey: 'nft.explain.tree.d0' },
        { titleKey: 'nft.summary.tree_1', textKey: 'nft.explain.tree.d1' },
        { titleKey: 'nft.summary.tree_2', textKey: 'nft.explain.tree.d2' },
        { titleKey: 'nft.summary.tree_3', textKey: 'nft.explain.tree.d3' },
        { titleKey: 'nft.summary.tree_4', textKey: 'nft.explain.tree.d4' },
        { titleKey: 'nft.summary.tree_5', textKey: 'nft.explain.tree.d5' },
    ] as Array<{ titleKey: string; textKey: string }>,
  },

  // 2) Bronze
  'nft-bronze': {
    id: 'nft-bronze',
    tier: 'bronze',

    // plain title is fine; use blurbKey to reuse your summary text
    name: 'Bronze NFT',
    blurbKey: 'nft.summary.bronze_8',
    featureKeys: [
      'nft.summary.bronze_0',
      'nft.summary.bronze_1',
      'nft.summary.bronze_2',
      'nft.summary.bronze_3',
      'nft.summary.bronze_4',
      'nft.summary.bronze_5',
      'nft.summary.bronze_7',
    ],

    image: '2_mb_bronze.webp',

    // flags
    kycRequired: false,
    vesting: null,
    revealNote: 'Reveals at event (Q2 2026)',

    // activation
    activationType: 'none',

    // single design (selector can hide itself on single option)
    designs: [{ id: 'bronze', label: 'Bronze' }],

    // specs
    priceAfter: { date: '2025-12-31', solMultiplier: 2 },
    revealLabelKey: 'nft.summary.bronze_0',

    // explainers will be added step-by-step (keep empty for now)
    explainers: [
      { titleKey: 'nft.explain.buy.title', textKey: 'nft.explain.bronze_buy.text' },
      { titleKey: 'nft.summary.bronze_0', textKey: 'nft.explain.bronze.d0' },
      { titleKey: 'nft.summary.bronze_1', textKey: 'nft.explain.bronze.d1' },
      { titleKey: 'nft.summary.bronze_2', textKey: 'nft.explain.bronze.d2' },
      { titleKey: 'nft.summary.bronze_3', textKey: 'nft.explain.bronze.d3' },
      { titleKey: 'nft.summary.bronze_4', textKey: 'nft.explain.bronze.d4' },
      { titleKey: 'nft.summary.bronze_5', textKey: 'nft.explain.bronze.d5' },
      { titleKey: 'nft.summary.bronze_7', textKey: 'nft.explain.bronze.d7' },
    ],
  },

  // 3) Silver
  'nft-silver': {
    id: 'nft-silver',
    tier: 'silver',

    name: 'Silver NFT',
    blurbKey: 'nft.summary.silver_10',
    featureKeys: [
      'nft.summary.silver_0',
      'nft.summary.silver_1',
      'nft.summary.silver_2',
      'nft.summary.silver_3',
      'nft.summary.silver_4',
      'nft.summary.silver_5',
      'nft.summary.silver_6',
      'nft.summary.silver_7',
      'nft.summary.silver_8',
      'nft.summary.silver_9',
    ],

    image: '3_mb_silver.webp',

    kycRequired: true,
    vesting: 'yes',
    revealNote: 'Reveals at event (Q2 2026)',

    activationType: 'none',

    // specs
    priceAfter: { date: '2025-12-31', solMultiplier: 2 },
    revealLabelKey: 'nft.summary.silver_0',

    explainers: [
      { titleKey: 'nft.explain.buy.title', textKey: 'nft.explain.silver_buy.text' },
      { titleKey: 'nft.summary.silver_0', textKey: 'nft.explain.silver.d0' },
      { titleKey: 'nft.summary.silver_1', textKey: 'nft.explain.silver.d1' },
      { titleKey: 'nft.summary.silver_2', textKey: 'nft.explain.silver.d2' },
      { titleKey: 'nft.summary.silver_3', textKey: 'nft.explain.silver.d3' },
      { titleKey: 'nft.summary.silver_4', textKey: 'nft.explain.silver.d4' },
      { titleKey: 'nft.summary.silver_5', textKey: 'nft.explain.silver.d5' },
      { titleKey: 'nft.summary.silver_6', textKey: 'nft.explain.silver.d6' },
      { titleKey: 'nft.summary.silver_7', textKey: 'nft.explain.silver.d7' },
      { titleKey: 'nft.summary.silver_8', textKey: 'nft.explain.silver.d8' },
      { titleKey: 'nft.summary.silver_9', textKey: 'nft.explain.silver.d9' },
    ],
  },

  // 4) Gold
  'nft-gold': {
    id: 'nft-gold',
    tier: 'gold',

    name: 'Gold NFT',
    blurbKey: 'nft.summary.gold_8',
    featureKeys: [
      'nft.summary.gold_0',
      'nft.summary.gold_1',
      'nft.summary.gold_2',
      'nft.summary.gold_3',
      'nft.summary.gold_4',
      'nft.summary.gold_5',
      'nft.summary.gold_6',
      'nft.summary.gold_7',
      'nft.summary.gold_9',
    ],

    image: '4_mb_gold.webp',

    kycRequired: true,
    vesting: 'yes', 
    revealNote: 'Reveals at event (Q2 2026)',

    activationType: 'none',

    // specs
    priceAfter: { date: '2025-12-31', solMultiplier: 2 },
    revealLabelKey: 'nft.summary.gold_0',


    explainers: [
      { titleKey: 'nft.explain.buy.title', textKey: 'nft.explain.gold_buy.text' },
      { titleKey: 'nft.summary.gold_0', textKey: 'nft.explain.gold.d0' },
      { titleKey: 'nft.summary.gold_1', textKey: 'nft.explain.gold.d1' },
      { titleKey: 'nft.summary.gold_2', textKey: 'nft.explain.gold.d2' },
      { titleKey: 'nft.summary.gold_3', textKey: 'nft.explain.gold.d3' },
      { titleKey: 'nft.summary.gold_4', textKey: 'nft.explain.gold.d4' },
      { titleKey: 'nft.summary.gold_5', textKey: 'nft.explain.gold.d5' },
      { titleKey: 'nft.summary.gold_6', textKey: 'nft.explain.gold.d6' },
      { titleKey: 'nft.summary.gold_7', textKey: 'nft.explain.gold.d7' },
      { titleKey: 'nft.summary.gold_9', textKey: 'nft.explain.gold.d9' },
    ],
  },

  // 5) Platinum
  'nft-platinum': {
    id: 'nft-platinum',
    tier: 'platinum',

    name: 'Platinum NFT',
    blurbKey: 'nft.summary.platinum_8',
    featureKeys: [
      'nft.summary.platinum_0',
      'nft.summary.platinum_1',
      'nft.summary.platinum_2',
      'nft.summary.platinum_3',
      'nft.summary.platinum_4',
      'nft.summary.platinum_5',
      'nft.summary.platinum_6',
      'nft.summary.platinum_7',
      'nft.summary.platinum_9',
    ],

    image: '5_mb_platinum.webp',

    kycRequired: true,
    vesting: 'yes',
    revealNote: 'Reveals at event (Q2 2026)',

    activationType: 'none',

    // specs
    priceAfter: { date: '2025-12-31', solMultiplier: 2 },
    revealLabelKey: 'nft.summary.platinum_0',

    explainers: [
      { titleKey: 'nft.explain.buy.title', textKey: 'nft.explain.platinum_buy.text' },
      { titleKey: 'nft.summary.platinum_0', textKey: 'nft.explain.platinum.d0' },
      { titleKey: 'nft.summary.platinum_1', textKey: 'nft.explain.platinum.d1' },
      { titleKey: 'nft.summary.platinum_2', textKey: 'nft.explain.platinum.d2' },
      { titleKey: 'nft.summary.platinum_3', textKey: 'nft.explain.platinum.d3' },
      { titleKey: 'nft.summary.platinum_4', textKey: 'nft.explain.platinum.d4' },
      { titleKey: 'nft.summary.platinum_5', textKey: 'nft.explain.platinum.d5' },
      { titleKey: 'nft.summary.platinum_6', textKey: 'nft.explain.platinum.d6' },
      { titleKey: 'nft.summary.platinum_7', textKey: 'nft.explain.platinum.d7' },
      { titleKey: 'nft.summary.platinum_9', textKey: 'nft.explain.platinum.d9' },
    ],
  },

  // 6) WS · 20 (invite only)
  'nft-ws-20': {
    id: 'nft-ws-20',
    tier: 'ws',

    name: 'WS · 20 NFT',
    blurbKey: 'nft.summary.ws20_8', // short lead; or keep plain blurb
    featureKeys: [
      'nft.summary.ws20_0',
      'nft.summary.ws20_1',
      'nft.summary.ws20_2',
      'nft.summary.ws20_3',
      'nft.summary.ws20_4',
      'nft.summary.ws20_5',
      'nft.summary.ws20_6',
      'nft.summary.ws20_7',
      'nft.summary.ws20_9',
    ],

    image: '6_mb_ws.webp',

    kycRequired: true,
    vesting: null,
    revealNote: 'Reveals at event (Q2 2026)',

    activationType: 'none', // invite / airdrop

    // specs: no price for invite-only airdrop
    priceAfter: null,
    revealLabelKey: 'nft.summary.ws20_0',

    explainers: [
      { titleKey: 'nft.explain.ws_buy.title', textKey: 'nft.explain.ws_buy.text' },
      { titleKey: 'nft.summary.ws20_0', textKey: 'nft.explain.ws.d0' },
      { titleKey: 'nft.summary.ws20_1', textKey: 'nft.explain.ws.d1' },
      { titleKey: 'nft.summary.ws20_2', textKey: 'nft.explain.ws.d2' },
      { titleKey: 'nft.summary.ws20_3', textKey: 'nft.explain.ws.d3' },
      { titleKey: 'nft.summary.ws20_4', textKey: 'nft.explain.ws.d4' },
      { titleKey: 'nft.summary.ws20_5', textKey: 'nft.explain.ws.d5' },
      { titleKey: 'nft.summary.ws20_6', textKey: 'nft.explain.ws.d6' },
      { titleKey: 'nft.summary.ws20_7', textKey: 'nft.explain.ws.d7' },
      { titleKey: 'nft.summary.ws20_9', textKey: 'nft.explain.ws.d9' },
    ],
  },
};
