// components/NftDetails.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useI18n } from '@/hooks/useI18n';
import PillCarousel from '@/components/ui/PillCarousel';
import { NFT_CATALOG, NFT_NAV, NftMeta } from '@/constants/nftCatalog';
import InlineLoader from '@/components/ui/InlineLoader';
import SalesBar from '@/components/ui/SalesBar';
import { usePhantomWallet } from '@/hooks/usePhantomWallet';
import { getKycBadgeStateForNftList } from '@/lib/kyc/getKycUiState';
import { Transaction, TransactionInstruction, PublicKey, Keypair, SYSVAR_RENT_PUBKEY, SystemProgram } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { getKycUiState } from '@/lib/kycUi';
import type { KycUiPill } from '@/lib/kycUi';
import { WalletBannerMain } from '@/components/wallet';

type Design = { id: string; label: string; rarity?: number };
type Item = {
  id: string;
  name: string;
  blurb: string;
  eurPrice: number;
  vigriPrice: number;
  kycRequired?: boolean;
  limited?: number;
  minted?: number;
  vesting?: string | null;
  ownedQty?: number;
  invited?: boolean;
  designs?: Design[];
  ownedDesigns?: Record<string, number>;
  tier: 'tree' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'ws';
  discountPct: number;
  activationType: 'flex' | 'fixed' | 'none';
  fixedClaimPct?: number;
  fixedDiscountPct?: number;
  userActivation?: 'claim100' | 'split50' | 'discount100' | 'fixed' | null;
  upgrades?: { rare: number; ultra: number };
  expiresAt?: string | null;
  onchain?: {
    tierId: number;
    priceSol: number;
    supplyTotal: number;
    supplyMinted: number;
    treasury?: string;
  };
};

type Rights = {
  id: string;
  discountPctEffective: number;
  claimBudgetEur: number;
  claimUsedEur: number;
  claimAvailVigri: number;
  discountBudgetEur: number;
  discountUsedEur: number;
  discountAvailEur: number;
  expiresAt: string | null;
};

type NftListResp = { ok: true; items: Item[] };
type RightsResp = { ok: true; items: Rights[]; tgePriceEur?: number };
type ClaimResp = { ok: true; vigriClaimed: number };
type DiscountResp = { ok: true; vigriBought: number; unitEur: number };
type PhantomProviderLike = {
  signTransaction?: (tx: Transaction) => Promise<Transaction>;
  signAndSendTransaction: (tx: Transaction) => Promise<{ signature?: string } | string>;
};

function getPhantomProviderClient(): PhantomProviderLike | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { solana?: PhantomProviderLike };
  return w.solana ?? null;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

type CountryZone = 'green' | 'grey' | 'red' | null;

function isZone(v: unknown): v is CountryZone {
  return v === 'green' || v === 'grey' || v === 'red' || v === null;
}

function asCountryCode(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length === 2 ? s : null;
}

function isNftListResp(v: unknown): v is NftListResp {
  return isObject(v) && v.ok === true && Array.isArray(v.items);
}
function isRightsResp(v: unknown): v is RightsResp {
  return isObject(v) && v.ok === true && Array.isArray(v.items);
}
function isClaimResp(v: unknown): v is ClaimResp {
  return isObject(v) && v.ok === true && typeof v.vigriClaimed === 'number';
}
function isDiscountResp(v: unknown): v is DiscountResp {
  return (
    isObject(v) &&
    v.ok === true &&
    typeof v.vigriBought === 'number' &&
    typeof v.unitEur === 'number'
  );
}

type KycStatus = 'none' | 'pending' | 'approved' | 'rejected';

// --- Presale on-chain constants (devnet) ---
const PRESALE_PROGRAM_ID = new PublicKey('GmrUAwBvC3ijaM2L7kjddQFMWHevxRnArngf7jFx1yEk');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const GLOBAL_CONFIG_SEED = new TextEncoder().encode('vigri-presale-config');

async function anchorSighash(ixName: string): Promise<Uint8Array> {
  // first 8 bytes of sha256("global:<name>")
  const preimage = new TextEncoder().encode(`global:${ixName}`);
  const hash = await crypto.subtle.digest('SHA-256', preimage);
  return new Uint8Array(hash).slice(0, 8);
}

function findAta(owner: PublicKey, mint: PublicKey): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  return ata;
}

function findMetadataPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID,
  );
  return pda;
}

function findGlobalConfigPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([GLOBAL_CONFIG_SEED], PRESALE_PROGRAM_ID);
  return pda;
}

// Fallback PNG name from /public/images/nft/
function pngNameFor(id: string): string {
  switch (id) {
    case 'nft-tree-steel':  return '1_mb_wood_stell.png';
    case 'nft-bronze':      return '2_mb_bronze.png';
    case 'nft-silver':      return '3_mb_silver.png';
    case 'nft-gold':        return '4_mb_gold.png';
    case 'nft-platinum':    return '5_mb_platinum.png';
    case 'nft-ws-20':       return '6_mb_ws.png';
    default:                return '6_mb_ws.png';
  }
}

type BuyPayload = {
  id: string;
  qty: number;
  designId?: string;
  activation?: 'claim100' | 'split50' | 'discount100';
};

function BuyPanelMobile(props: {
  item: Item | null;
  designs: Design[];
  design: string | null;
  setDesign: (id: string) => void;
  activationType: 'flex' | 'fixed' | 'none';
  act: 'claim100' | 'split50' | 'discount100';
  setAct: (a: 'claim100' | 'split50' | 'discount100') => void;
  qty: number;
  setQty: (n: number) => void;
  withPhysical: boolean;
  setWithPhysical: (v: boolean) => void;
  onBuy: () => void;
  t: ReturnType<typeof useI18n>['t'];
  purchaseBlocked: boolean;
  amlReason?: string | null;
  solPrice: number | null;
  mintMsg: string | null;
  kycPills: KycUiPill[];
  isBuying: boolean;
}) {

  const {
    item, designs, design, setDesign,
    activationType, act, setAct,
    qty, setQty, withPhysical, setWithPhysical,
    onBuy, t,
    solPrice,
    purchaseBlocked,
    amlReason,
    mintMsg,
    kycPills,
    isBuying,
  } = props;

  if (!item) return null;

  const isTree = item.tier === 'tree';
  const isSilver = item.tier === 'silver';

  const hasSol = solPrice !== null && solPrice > 0;
  const hasEur = typeof item.eurPrice === 'number' && item.eurPrice > 0;

  return (
    <div className="card p-4 md:p-5 flex flex-wrap items-end gap-3">
      {/* Mobile: design selector only for Tree/Steel */}
      {isTree && designs.length > 0 && (
        <div className="text-sm">
          <div className="text-xs mb-1">{t('nft.design.select')}</div>
          <div className="flex flex-col gap-1">
            {designs.map((d) => (
              <label key={d.id} className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="nft-design-mobile"
                  checked={design === d.id}
                  onChange={() => setDesign(d.id)}
                  style={{ accentColor: 'var(--brand-400)' }}
                />
                <span className="text-xs">{d.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Activation (flex) */}
      {activationType === 'flex' && (
        <div className="text-sm">
          <div className="text-xs mb-1">{t('nft.activation.title')}</div>
          <div className="flex flex-col gap-1">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="act" checked={act === 'claim100'} onChange={() => setAct('claim100')} style={{ accentColor: 'var(--brand-400)' }} />
              {t('nft.activation.claim100')}
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="act" checked={act === 'split50'} onChange={() => setAct('split50')} style={{ accentColor: 'var(--brand-400)' }} />
              {t('nft.activation.split50')}
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="act" checked={act === 'discount100'} onChange={() => setAct('discount100')} style={{ accentColor: 'var(--brand-400)' }} />
              {t('nft.activation.discount100')}
            </label>
          </div>
        </div>
      )}

      {/* Format (mobile): Silver only */}
      {isSilver && (
        <div className="text-sm">
          <div className="text-xs mb-1">{t('nft.physical.label')}</div>
          <div className="flex flex-col gap-1">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="physical-mobile"
                checked={withPhysical === true}
                onChange={() => setWithPhysical(true)}
                style={{ accentColor: 'var(--brand-400)' }}
              />
              <span className="text-xs">{t('nft.physical.with')}</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="physical-mobile"
                checked={withPhysical === false}
                onChange={() => setWithPhysical(false)}
                style={{ accentColor: 'var(--brand-400)' }}
              />
              <span className="text-xs">{t('nft.physical.without')}</span>
            </label>
          </div>
        </div>
      )}

      {/* Qty + buy */}
      <div>
        <label className="label">{t('nft.qty')}</label>
        <input
          type="number"
          min={1}
          step={1}
          className="input w-24 text-sm"
          value={qty}
          onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
          style={{ accentColor: 'var(--brand-400)' }}
        />
      </div>

      <div className="flex items-end gap-4">
        <div className="flex flex-col items-start">
          <div className="text-2xl font-semibold leading-none" style={{ color: 'var(--brand-400)' }}>
            {hasSol ? `${solPrice} SOL` : ''}
          </div>
          {hasSol && hasEur && (
            <div className="text-xs opacity-70 mt-1">
              ≈ {item.eurPrice.toFixed(0)}€ (presale reference)
            </div>
          )}
          <button
            className={
              "btn btn-outline mt-2 transition-transform duration-150 " +
              ((purchaseBlocked || isBuying)
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer hover:scale-[1.01] active:scale-[0.98]")
            }
            onClick={() => {
              if (purchaseBlocked || isBuying) return;
              onBuy();
            }}
            disabled={purchaseBlocked || isBuying}
            title={purchaseBlocked ? (amlReason ?? '') : undefined}
          >
            <span className="flex flex-col items-center leading-tight">
              <span className="inline-flex items-center justify-center min-h-[18px]">
                {isBuying ? (
                  <InlineLoader className="!text-white/80" />
                ) : (
                  <span>{t('nft.buy')}</span>
                )}
              </span>
              <span className="text-[10px] opacity-80 mt-0.5">
                {t('nft.buy_subtitle')}
              </span>
            </span>
          </button>
          {mintMsg ? (
            <div className="text-xs opacity-80 mt-2 max-w-[220px] break-words">
              {mintMsg}
            </div>
          ) : null}
          {kycPills.filter(p => p.level === 'error' || p.level === 'warning').length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {kycPills
                .filter(p => p.level === 'error' || p.level === 'warning')
                .map((p) => (
                  <span
                    key={p.type}
                    className={
                      'chip ' +
                      (p.level === 'error'
                        ? 'border border-red-500/30 bg-red-500/10'
                        : 'border border-amber-500/30 bg-amber-500/10')
                    }
                  >
                    {t(p.i18nKey)}
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type DetailsMeta = Pick<
  NftMeta,
  'revealLabelKey' | 'revealValue' | 'supply' | 'kycRequired' | 'vesting' | 'priceAfter' | 'tier'
> & {
  limited?: string | number;
};

function LockIcon({ size = 15 }: { size?: number }) {
  return <span aria-hidden style={{ fontSize: size, lineHeight: 1 }} className="mr-0.5 align-middle">🔒</span>;
}
function KeyIcon() {
  return <span aria-hidden className="-ml-0.5 mr-1">🔑</span>;
}

function DetailsCard(props: {
  t: ReturnType<typeof useI18n>['t'];
  title: string;
  blurb: string;
  meta: DetailsMeta;
  featureLines: string[];
  solPrice: number | null;
  effectiveKycRequired?: boolean;
  blockedByAml?: boolean;
  }) {
  const { t, title, blurb, meta, featureLines, solPrice, effectiveKycRequired, blockedByAml } = props;
  const isWS = meta?.tier === 'ws';

  const hasSol = typeof solPrice === 'number' && solPrice > 0;
  const hasAfter =
    hasSol && !!meta?.priceAfter && typeof meta.priceAfter.date === 'string';

  return (
    <div className="card p-4 md:p-5 space-y-2">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm opacity-70">{blurb}</p>

      {/* Meta chips */}
      <div className="flex flex-wrap gap-2 text-xs opacity-90">
        {meta?.limited && (
          <span className="chip">
            {t('nft.limited')}: {meta.limited}
          </span>
        )}

        {blockedByAml ? (
          <span className="chip" title={t('nft.amlBlocked')} aria-label="AML blocked">
            ⛔ {t('nft.amlBlocked')}
          </span>
        ) : null}

        {effectiveKycRequired ? (
          <span className="chip inline-flex items-center gap-0.5">
            <LockIcon size={15} />
            {t('nft.kyc')}
          </span>
        ) : null}

        {isWS && (
          <span className="chip">
            <KeyIcon />
            {t('nft.badge.invite')}
          </span>
        )}

        {meta?.vesting && (
          <span className="chip">
            {t('nft.vesting')}: {t(meta.vesting)}
          </span>
        )}

        {/* Price (SOL) */}
        {hasSol && (
          <span className="chip">
            {t('nft.price.now')}: {solPrice} SOL
          </span>
        )}

        {hasAfter && (
          <span className="chip">
            {t('nft.price.after')}
          </span>
        )}
      </div>

      {/* Spec chips */}
      <div className="flex flex-wrap gap-2 text-xs opacity-90 mt-2">
        {meta?.revealLabelKey && meta?.revealValue && (
          <span className="chip">
            {t(meta.revealLabelKey)} {meta.revealValue}
          </span>
        )}
        {meta?.supply ? (
          <span className="chip">{t('nft.supply')}: {meta.supply.toLocaleString()}</span>
        ) : null}
      </div>

      {/* Feature list */}
      {featureLines.length ? (
        <ul className="list-disc pl-5 mt-2 text-[13px] opacity-90">
          {featureLines.map((f) => <li key={f}>{f}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

function ExplainerText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n\n').map((block, i) => {
        const lines = block.split('\n').filter(l => l !== '');
        const hasBullets = lines.some(l => l.trim().startsWith('•'));

        if (hasBullets) {
          const first = lines[0] ?? '';
          const hasHeading = first.trim().length > 0 && !first.trim().startsWith('•');
          const heading = hasHeading ? first : null;

          const items = lines
            .filter(l => l.trim().startsWith('•'))
            .map(l => l.replace(/^•\s?/, ''));

          return (
            <figure
              key={i}
              className="my-4 rounded-md bg-white/60 dark:bg-white/5 p-3 pl-4 shadow-sm ring-1 ring-black/5 dark:ring-white/10 border-l-4"
              style={{ borderLeftColor: 'var(--brand-400)' }}
            >
              {heading && (
                <figcaption className="text-sm font-medium mb-2 opacity-80">
                  {heading}
                </figcaption>
              )}
              <ul className="list-disc pl-5 text-sm leading-relaxed">
                {items.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </figure>
          );
        }

        return (
          <p key={i} className="my-2 whitespace-pre-line">
            {block}
          </p>
        );
      })}
    </>
  );
}

export default function NftDetails({ id }: { id: string }) {
  const { t } = useI18n();
  const { connected, publicKey, cluster, connection } = usePhantomWallet();

  // Static catalog metadata for given id
  const meta = NFT_CATALOG[id];

  const [item, setItem] = useState<Item | null>(null);
  const [design, setDesign] = useState<string | null>(null);
  const [qty, setQty] = useState<number>(1);
  const [act, setAct] = useState<'claim100' | 'split50' | 'discount100'>('discount100');

  // Physical card selection (Silver)
  const [withPhysical, setWithPhysical] = useState<boolean>(false);

  const [rights, setRights] = useState<Rights | null>(null);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);
  const [discMsg, setDiscMsg] = useState<string | null>(null);
  const [discEur, setDiscEur] = useState<number>(0);
  const [mintMsg, setMintMsg] = useState<string | null>(null);
  const [isBuying, setIsBuying] = useState<boolean>(false);
  const [presaleAdmin, setPresaleAdmin] = useState<string | null>(null);

  const [kycStatus, setKycStatus] = useState<KycStatus>('none');
  const [countryZone, setCountryZone] = useState<CountryZone>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [profileCompleted, setProfileCompleted] = useState<boolean>(false);
  const [countryBlocked, setCountryBlocked] = useState<boolean>(false);
  const [canBuyLowTier, setCanBuyLowTier] = useState<boolean>(false);
  const [canBuyHighTier, setCanBuyHighTier] = useState<boolean>(false);

  const [meProfile, setMeProfile] = useState<{
    countryResidence?: string | null;
    countryCitizenship?: string | null;
    countryTax?: string | null;
    isikukood?: string | null;
  } | null>(null);

  const [meLoaded, setMeLoaded] = useState<boolean>(false);

  // Summary for this id (from /api/nft/summary)
  type SummaryItem = { id: string; total: number; sold: number; left: number; pct: number };
  type SummaryResp = { ok?: boolean; items?: Array<SummaryItem> };
  const [sum, setSum] = useState<SummaryItem | null>(null);

  async function loadAll(withSpinner = false) {
    if (withSpinner) setIsLoading(true);
    try {
      // 1) NFT list (mock API)
      const r = await fetch('/api/nft', { cache: 'no-store' });
      const j: unknown = await r.json().catch(() => ({}));
      if (r.ok && isNftListResp(j)) {
        const found = j.items.find((i) => i.id === id) || null;
        setItem(found);

        // Initial design for Tree on first render
        if (found?.id !== 'nft-ws-20') {
          const fromMeta = meta?.designs?.[0]?.id;
          const fromApi = found?.designs?.[0]?.id;
          const initial = fromMeta ?? fromApi ?? null;
          if (initial) setDesign(initial);
        }

        if (meta?.activationType === 'flex' && found?.userActivation && found.userActivation !== 'fixed') {
          setAct(found.userActivation);
        }
      } else {
        setItem(null);
      }

      // 2) Rights
      try {
        const rr = await fetch('/api/nft/rights', { cache: 'no-store' });
        const raw: unknown = await rr.json().catch(() => ({}));
        if (rr.ok && isRightsResp(raw)) {
          const mine = raw.items.find((x) => x.id === id) || null;
          setRights(mine);
        } else {
          setRights(null);
        }
      } catch {
        setRights(null);
      }

      // 3) Presale GlobalConfig (devnet admin/treasury)
      try {
        const gr = await fetch(`/api/presale/global-config?ts=${Date.now()}`, { cache: 'no-store' });
        const gj: unknown = await gr.json().catch(() => ({}));

        if (gr.ok && isObject(gj) && (gj as { ok?: unknown }).ok === true) {
          const adminPk = (gj as { admin?: unknown }).admin;
          setPresaleAdmin(typeof adminPk === 'string' ? adminPk : null);
        } else {
          setPresaleAdmin(null);
        }
      } catch {
        setPresaleAdmin(null);
      }

    } catch {
      setItem(null);
      setRights(null);
    } finally {
      if (withSpinner) setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAll(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const r = await fetch('/api/me', { cache: 'no-store' });
        const j: unknown = await r.json().catch(() => ({}));

        if (cancelled || !r.ok || !isObject(j) || (j as { ok?: unknown }).ok !== true) return;

        const statusRaw =
          (j as Record<string, unknown>)['kycStatus'] ??
          (j as Record<string, unknown>)['kyc'];

        setKycStatus(
          typeof statusRaw === 'string'
            ? (statusRaw.toLowerCase() as KycStatus)
            : statusRaw === true
              ? 'approved'
              : statusRaw === false
                ? 'none'
                : 'none'
        );

        setProfileCompleted(Boolean((j as Record<string, unknown>)['profileCompleted']));
        setCountryBlocked(Boolean((j as Record<string, unknown>)['countryBlocked']));
        setCanBuyLowTier(Boolean((j as Record<string, unknown>)['canBuyLowTier']));
        setCanBuyHighTier(Boolean((j as Record<string, unknown>)['canBuyHighTier']));

        const zRaw = (j as Record<string, unknown>)['kycCountryZone'];
        setCountryZone(isZone(zRaw) ? (zRaw as CountryZone) : null);

        const pRaw = (j as Record<string, unknown>)['profile'];
        if (isObject(pRaw)) {
          const p = pRaw as Record<string, unknown>;

          const r2 = asCountryCode(p['countryResidence'])?.toUpperCase() ?? null;
          const c2 = asCountryCode(p['countryCitizenship'])?.toUpperCase() ?? null;
          const tx2 = asCountryCode(p['countryTax'])?.toUpperCase() ?? null;

          setMeProfile({
            countryResidence: r2,
            countryCitizenship: c2,
            countryTax: tx2,
            isikukood: typeof p['isikukood'] === 'string' ? String(p['isikukood']) : null,
          });
        } else {
          setMeProfile(null);
        }
        setMeLoaded(true);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load global summary for this item id
  useEffect(() => {
    let cancelled = false;
    async function loadSummary() {
      if (!id) { setSum(null); return; }
      try {
        const r = await fetch(`/api/nft/summary?ts=${Date.now()}`, { cache: 'no-store' });
        const j: SummaryResp = await r.json().catch(() => ({} as SummaryResp));
        if (!cancelled && r.ok && j?.items) {
          const found = j.items.find((it) => it.id === id) ?? null;
          setSum(found);
        }
      } catch { /* ignore */ }
    }
    void loadSummary();
    return () => { cancelled = true; };
  }, [id]);

  const isWS = item?.tier === 'ws';
  const cf = useMemo(
  () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }),
  []
  );
  const rawSol = item?.onchain?.priceSol;
  const solPrice = typeof rawSol === 'number' ? rawSol : null;
  const hasSol = solPrice !== null && solPrice > 0;

  const eurFromItem =
    typeof item?.eurPrice === 'number' ? item.eurPrice : undefined;
  const hasEurItem = typeof eurFromItem === 'number' && eurFromItem > 0;

  function tierIdFromItemTier(t: Item['tier'] | undefined): number {
    switch (t) {
      case 'tree': return 0;
      case 'bronze': return 1;
      case 'silver': return 2;
      case 'gold': return 3;
      case 'platinum': return 4;
      case 'ws': return 5;
      default: return 0;
    }
  }

  const tierId =
    typeof item?.onchain?.tierId === 'number'
      ? item.onchain.tierId
      : tierIdFromItemTier(item?.tier);

  const pills = getKycUiState({
    tierId,
    profileCompleted,
    countryBlocked,
    kycStatus,
    kycCountryZone: countryZone,
    canBuyLowTier,
    canBuyHighTier,
    profile: meProfile,
  });

  // Решение по кнопке — ТОЛЬКО по /api/me
  const isLow = tierId === 0 || tierId === 1;

  const isEeTriple =
    (meProfile?.countryResidence ?? '').toUpperCase() === 'EE' &&
    (meProfile?.countryCitizenship ?? '').toUpperCase() === 'EE' &&
    (meProfile?.countryTax ?? '').toUpperCase() === 'EE';

  const hasIsikukood = typeof meProfile?.isikukood === 'string' && meProfile.isikukood.trim().length > 0;

  const silverEeNoKyc =
    tierId === 2 &&
    countryZone === 'green' &&
    isEeTriple &&
    hasIsikukood;

  // Silver EE/EE/EE + isikukood => считаем как low-tier допуск
  const needsHigh = !isLow && !(tierId === 2 && silverEeNoKyc);

  const allowedByTierFlag = needsHigh ? canBuyHighTier : canBuyLowTier;

  const isGreyCountry = countryZone === 'grey';

  const purchaseBlocked =
    !meLoaded ||
    Boolean(countryBlocked) ||
    countryZone === 'red' ||
    !profileCompleted ||
    // In grey zone everything is blocked until KYC is approved
    (isGreyCountry && kycStatus !== 'approved') ||
    // In other zones we rely on DB flags for this tier group
    (!isGreyCountry && !allowedByTierFlag);

  const isEeForBadges = isEeTriple && hasIsikukood;

  const { blockedByAml, kycNeeded } = item
    ? getKycBadgeStateForNftList({
        nftId: item.id,
        zone: countryZone,
        isEe: isEeForBadges,
        kycStatus,
        kycRequired: item.kycRequired,
      })
    : { blockedByAml: false, kycNeeded: false };

  const blockedByAmlForChips = blockedByAml;
  const effectiveKycRequired = kycNeeded;

  const firstPill = pills.find(p => p.level === 'error' || p.level === 'warning');
  const purchaseReason = firstPill ? t(firstPill.i18nKey) : null;

  const mintBlocked = purchaseBlocked;
  const mintBlockedText = purchaseReason ?? '';

  // Prefer localized keys from catalog; fall back to plain text or API
  const title = (meta?.nameKey ? t(meta.nameKey) : meta?.name) ?? item?.name ?? '';
  const blurb = (meta?.blurbKey ? t(meta.blurbKey) : meta?.blurb) ?? item?.blurb ?? '';
  const activationType = meta?.activationType ?? item?.activationType ?? 'none';
  const featureLines = (meta?.featureKeys?.map((k) => t(k)) ?? meta?.features) ?? [];
  const tier = (meta?.tier ?? item?.tier) as DetailsMeta['tier'];

  const navItems = useMemo(() => NFT_NAV, []);

  function tierParamFromItemTier(t: Item['tier'] | undefined): string {
    switch (t) {
      case 'tree': return 'Tree';
      case 'bronze': return 'Bronze';
      case 'silver': return 'Silver';
      case 'gold': return 'Gold';
      case 'platinum': return 'Platinum';
      case 'ws': return 'WS-20';
      default: return 'Base';
    }
  }

  const mintPresaleDevnet = async (tierId: number) => {
    setMintMsg(null);

    if (mintBlocked) {
      setMintMsg(mintBlockedText);
      return;
    }

    if (cluster !== 'devnet') {
      setMintMsg(t('nft.mint.onlyDevnet'));
      return;
    }

    if (!connected || !publicKey) {
      setMintMsg(t('nft.mint.connectWallet'));
      return;
    }

    const provider = getPhantomProviderClient();
    if (!provider) {
      setMintMsg(t('nft.mint.phantomNotFound'));
      return;
    }

    try {
      // Derive PDAs
      const globalConfig = findGlobalConfigPda();

      // Load admin/treasury from backend (cluster-aware)
      let adminPkStr: string | null = presaleAdmin ?? null;

      // Always prefer fresh value from global-config for current cluster
      try {
        const gr = await fetch(
          `/api/presale/global-config?cluster=${cluster}&ts=${Date.now()}`,
          { cache: 'no-store' },
        );
        const gj: unknown = await gr.json().catch(() => ({}));

        if (gr.ok && isObject(gj)) {
          const a =
            (gj as { admin?: unknown }).admin ??
            (gj as { treasury?: unknown }).treasury;

          if (typeof a === 'string' && a.length > 0) {
            adminPkStr = a;
            setPresaleAdmin(a);
          }
        }

        if (!adminPkStr) {
          setMintMsg(t('nft.mint.adminMissing'));
          return;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setMintMsg(`${t('nft.mint.failedPrefix')} ${msg}`);
        return;
      }

      const admin = adminPkStr ? new PublicKey(adminPkStr) : null;
      if (!admin) {
        setMintMsg(t('nft.mint.adminMissing'));
        return;
      }

      // AML / KYC guard: block mint if profile / AML rules do not allow it
      try {
        const amlRes = await fetch('/api/me', { cache: 'no-store' });

        if (!amlRes.ok) {
          setMintMsg(t('nft.mint.failedPrefix') + ' AML check failed');
          return;
        }

        const aml = await amlRes.json() as {
          canBuyLowTier?: boolean;
          canBuyHighTier?: boolean;
          profileCompleted?: boolean;
          profile?: {
            countryCitizenship?: string | null;
            countryResidence?: string | null;
            countryTax?: string | null;
            isikukood?: string | null;
          };
        };

        // 1) Without a completed profile we do not allow any mint
        if (!aml.profileCompleted) {
          setMintMsg(t('nft.mint.profileRequired'));
          return;
        }

        const canLow = Boolean(aml.canBuyLowTier);
        const canHigh = Boolean(aml.canBuyHighTier);

        // 2) Detect Estonia special case (EE / EE / EE)
        const prof = aml.profile ?? {};
        const cCit = (prof.countryCitizenship ?? '').toUpperCase();
        const cRes = (prof.countryResidence ?? '').toUpperCase();
        const cTax = (prof.countryTax ?? '').toUpperCase();
        const isEe =
          cCit === 'EE' &&
          cRes === 'EE' &&
          cTax === 'EE';
        const hasIsik = (prof.isikukood ?? '').trim().length > 0;
        const eeNoKyc = isEe && hasIsik;

        // 3) Decide which tier group the current NFT belongs to
        // 0 = Tree/Steel, 1 = Bronze, 2 = Silver, 3 = Gold, 4 = Platinum, 5 = WS-20
        let tierNeedsHigh: boolean;

        if (tierId === 0 || tierId === 1) {
          // Tree / Bronze — always low tier
          tierNeedsHigh = false;
        } else if (tierId === 2) {
          // Silver:
          // - for Estonia (EE/EE/EE) treat as low tier (no KYC required),
          // - for everyone else treat as high tier (KYC required).
          tierNeedsHigh = !eeNoKyc;
        } else {
          // Gold, Platinum, WS-20 — always high tier
          tierNeedsHigh = true;
        }

        const allowed = tierNeedsHigh ? canHigh : canLow;

        if (!allowed) {
          setMintMsg(t('nft.mint.amlBlocked'));
          return;
        }
      } catch (err) {
        console.error('AML check error', err);
        setMintMsg(t('nft.mint.failedPrefix') + ' AML check error');
        return;
      }

      // Fresh mint keypair (NFT mint)
      const mintKp = Keypair.generate();
      const mintPk = mintKp.publicKey;

      const payerAta = findAta(publicKey, mintPk);
      const metadata = findMetadataPda(mintPk);

      const sig8 = await anchorSighash('mint_nft');

      // Data layout must match IDL: tier_id, design_choice, kyc_proof, invite_proof
      let data: Uint8Array;

      if (tierId === 0) {
        // tierId=0 = Tree/Steel requires design_choice Some(u8)
        if (!design) {
          setMintMsg(t('nft.design.select'));
          return;
        }

        let dc: number | null = null;

        // Tree / Steel: маппим несколько возможных значений design на 1/2
        if (design === 'tree' || design === 'wood' || design === 'tree-wood') {
          dc = 1; // TR = Tree
        } else if (design === 'steel' || design === 'tree-steel') {
          dc = 2; // FE = Steel
        }

        if (dc == null) {
          setMintMsg(`${t('nft.mint.failedPrefix')} Invalid design`);
          return;
        }

        // 8 (sighash) + 1 (tier_id) + 2 (design_choice Some) + 1 (kyc None) + 1 (invite None) = 13
        data = new Uint8Array(13);
        data.set(sig8, 0);
        data[8] = tierId & 0xff;
        data[9] = 1;          // design_choice = Some
        data[10] = dc & 0xff; // design_choice value
        data[11] = 0;         // kyc_proof = None
        data[12] = 0;         // invite_proof = None
      } else {

        // 8 + 1 (tier_id) + 1 (design_choice None) + 1 (kyc None) + 1 (invite None) = 12
        data = new Uint8Array(12);
        data.set(sig8, 0);
        data[8] = tierId & 0xff;
        data[9] = 0;  // design_choice = None
        data[10] = 0; // kyc_proof = None
        data[11] = 0; // invite_proof = None
      }

      const ix = new TransactionInstruction({
        programId: PRESALE_PROGRAM_ID,
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true }, // payer
          { pubkey: globalConfig, isSigner: false, isWritable: true }, // global_config (PDA)
          { pubkey: admin, isSigner: false, isWritable: true }, // admin/treasury
          { pubkey: mintPk, isSigner: true, isWritable: true }, // mint (init)
          { pubkey: payerAta, isSigner: false, isWritable: true }, // payer_token_account (init ATA)
          { pubkey: metadata, isSigner: false, isWritable: true }, // metadata PDA
          { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        data: Buffer.from(data),
      });

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('finalized');

      const tx = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      });

      tx.add(ix);

      // partial sign with mint keypair (because mint is created by Anchor init)
      tx.partialSign(mintKp);

      let sig = '';

      // Safer flow: wallet signs, app broadcasts via our selected RPC (connection)
      if (provider.signTransaction) {
        const signedTx = await provider.signTransaction(tx);
        sig = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: false,
        });
        await connection.confirmTransaction(
          { signature: sig, blockhash, lastValidBlockHeight },
          'confirmed',
        );
      } else {
        // Fallback: Phantom signs and broadcasts itself
        const res = await provider.signAndSendTransaction(tx);
        sig = typeof res === 'string' ? res : res.signature || '';
      }

      if (!sig) {
        setMintMsg(t('nft.mint.noSignature'));
        return;
      }

      let designChoiceLog: number | null = null;
      if (tierId === 0) {
        if (design === 'tree' || design === 'wood' || design === 'tree-wood') {
          designChoiceLog = 1;
        } else if (design === 'steel' || design === 'tree-steel') {
          designChoiceLog = 2;
        }
      }

      const withPhysicalLog =
        tierId === 2 ? (withPhysical === true ? true : false) : null;

      try {
        await fetch('/api/nft/mint-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet: publicKey.toBase58(),
            tierId,
            quantity: 1,
            txSignature: sig,
            network: 'devnet',
            paidSol: item?.onchain?.priceSol ?? null,
            designChoice: designChoiceLog,
            withPhysical: withPhysicalLog,
          }),
        });
      } catch (logErr) {
        console.error('mint-log error', logErr);
      }

      setMintMsg(`${t('nft.mint.txSent')} ${sig}`);

      // refresh UI
      await loadAll(false);
      await fetch(
        `/api/presale/global-config?cluster=${cluster}&ts=${Date.now()}`,
        { cache: 'no-store' },
      );
      await fetch(`/api/nft/summary?ts=${Date.now()}`, { cache: 'no-store' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const low = msg.toLowerCase();

      const rejected =
        low.includes('user rejected') ||
        low.includes('rejected the request') ||
        low.includes('denied transaction') ||
        low.includes('declined');

      setMintMsg(
        rejected ? t('nft.mint.rejected') : `${t('nft.mint.failedPrefix')} ${msg}`,
      );
    }
  };

  // Purchase (mock)
  const buy = async () => {
    if (isBuying) return;

    if (purchaseBlocked) {
      setMintMsg(purchaseReason ?? 'KYC/AML restriction');
      return;
    }

    if (!item) return;

    setMintMsg(null);
    setIsBuying(true);

    try {
      // If tier is on-chain AND we are on devnet: BUY = real on-chain mint
      if (cluster === 'devnet' && item?.onchain && typeof item.onchain.tierId === 'number') {
        await mintPresaleDevnet(item.onchain.tierId);
        return;
      }

      const payload: BuyPayload = { id: item.id, qty: isWS ? 1 : qty };
      if (design) payload.designId = design;
      if (activationType === 'flex') payload.activation = act;

      // 1) Mock purchase
      const r = await fetch('/api/nft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const j: unknown = await r.json().catch(() => ({} as Record<string, unknown>));
      const ok = typeof j === 'object' && j !== null && (j as { ok?: boolean }).ok === true;
      if (!r.ok || !ok) return;

      // 2) Trigger rewards/referral (non-blocking)
      try {
        const meRes = await fetch('/api/me', { cache: 'no-store' });
        const meJson = await meRes.json().catch(() => ({} as { ok?: boolean; user?: { id?: string } }));
        const meId = meJson?.ok && meJson?.user?.id ? String(meJson.user.id) : null;

        const tierName = tierParamFromItemTier(item.tier);

        const eurSingle = item?.eurPrice ?? 0;
        const eurTotal = eurSingle * (isWS ? 1 : qty);

        const qsClaim = new URLSearchParams();
        qsClaim.set('tier', tierName);
        if (eurTotal > 0) qsClaim.set('eur', String(eurTotal));
        qsClaim.set('qty', String(isWS ? 1 : qty));
        if (meId) qsClaim.set('userId', meId);

        await fetch(`/api/nft/claim?${qsClaim.toString()}`, { method: 'POST' });
      } catch (err) {
        console.error('claim failed', err);
      } finally {
        await fetch(`/api/nft/summary?ts=${Date.now()}`, { cache: 'no-store' });
      }
    } finally {
      setIsBuying(false);
    }
  };

  // Claim (mock)
  const doClaimAll = async () => {
    setClaimMsg(null);
    const r = await fetch('/api/nft/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const j: unknown = await r.json().catch(() => ({}));
    if (!r.ok || !isClaimResp(j)) {
      const msg = isObject(j) && typeof j.error === 'string' ? j.error : t('nft.msg.failed');
      setClaimMsg(msg);
      return;
    }
    setClaimMsg(`${t('nft.claim.ok')} +${Math.round(j.vigriClaimed).toLocaleString()} VIGRI`);
    await loadAll(false);
  };

  // Discount (mock)
  const doDiscount = async () => {
    setDiscMsg(null);
    const r = await fetch('/api/nft/discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, eurAmount: discEur }),
    });
    const j: unknown = await r.json().catch(() => ({}));
    if (!r.ok || !isDiscountResp(j)) {
      const msg = isObject(j) && typeof j.error === 'string' ? j.error : t('nft.msg.failed');
      setDiscMsg(msg);
      return;
    }
    setDiscMsg(`${t('nft.discount.ok')} +${Math.round(j.vigriBought).toLocaleString()} VIGRI @ ${cf.format(j.unitEur)}`);
    await loadAll(false);
  };

  const daysLeft = useMemo(() => {
    if (!rights?.expiresAt) return null;
    const diff = new Date(rights.expiresAt).getTime() - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (24 * 60 * 60 * 1000));
  }, [rights?.expiresAt]);

  if (!item) {
    // Пока грузится — показываем скелет
    if (isLoading) {
      return (
        <div className="space-y-2">
          <Link href="/dashboard/nft" className="link-accent text-sm">
            {t('nft.details.back')}
          </Link>
          <div className="card p-4 md:p-5 space-y-3 animate-pulse">
            <div className="h-4 w-24 rounded bg-zinc-100/70 dark:bg-zinc-800/70" />
            <div className="h-3 w-3/4 rounded bg-zinc-100/60 dark:bg-zinc-800/60" />
            <div className="h-3 w-2/3 rounded bg-zinc-100/60 dark:bg-zinc-800/60" />
            <div className="h-40 rounded bg-zinc-100/70 dark:bg-zinc-800/70 mt-2" />
          </div>
        </div>
      );
    }

    // Если загрузка закончилась, а item так и не нашёлся — оставляем Not found
    return (
      <div className="space-y-2">
        <Link href="/dashboard/nft" className="link-accent text-sm">
          {t('nft.details.back')}
        </Link>
        <div className="text-sm opacity-70">Not found.</div>
      </div>
    );
  }

  // Narrow meta for the right-side card
  const metaForDetails: DetailsMeta = {
    tier,
    revealLabelKey: meta?.revealLabelKey,
    revealValue: meta?.revealValue,
    supply: typeof meta?.supply === 'number' ? meta.supply : undefined,
    kycRequired: meta?.kycRequired,
    vesting: meta?.vesting ?? null,
    priceAfter: meta?.priceAfter ?? null,
  };

  // ===== unified numbers for SalesBar on details page =====
  const onchainTotal = item.onchain?.supplyTotal;
  const onchainSold  = item.onchain?.supplyMinted;

  const totalForBar =
    typeof onchainTotal === 'number' && onchainTotal > 0
      ? onchainTotal
      : typeof sum?.total === 'number'
        ? sum.total
        : (typeof meta?.supply === 'number'
            ? meta.supply
            : item.limited);

  const soldFromSummary = typeof sum?.sold === 'number' ? sum.sold : 0;
  const soldLocal       = typeof item.minted === 'number' ? item.minted : 0;

  const soldForBar =
    typeof onchainSold === 'number' && onchainSold >= 0
      ? onchainSold
      : Math.max(soldFromSummary, soldLocal);

  const pctForBar =
    typeof totalForBar === 'number' && totalForBar > 0 && typeof soldForBar === 'number'
      ? Math.round((soldForBar / totalForBar) * 100)
      : 0;

  const progressColor =
    pctForBar > 70 ? '#EF4444' : pctForBar >= 30 ? '#F59E0B' : '#10B981';
  // ========================================================

  return (
    <div className="space-y-4">
      {/* Wallet */}
      <WalletBannerMain />

      {/* Top nav carousel */}
      <PillCarousel
        back={{ id: 'all', label: t('nft.details.back'), href: '/dashboard/nft' }}
        items={navItems.map((it) => ({
          id: it.id,
          label: it.name,
          href: `/dashboard/nft/${it.id}`,
          active: it.id === id,
        }))}
      />

      {/* Mobile: image + buy */}
      <div className="lg:hidden grid grid-cols-[minmax(180px,52vw)_1fr] gap-4 items-start">
        <div
          className="relative w-full max-w-[240px] mx-0 md:mx-auto card p-0 overflow-hidden"
          style={{ aspectRatio: '3 / 4' }}
        >
          <Image
            src={`/images/nft/${meta?.image ?? pngNameFor(item.id)}`}
            alt={title}
            fill
            sizes="90vw"
            className="object-cover rounded-xl border"
            priority={false}
          />
        </div>

        <BuyPanelMobile
          item={item}
          designs={meta?.designs ?? item.designs ?? []}
          design={design}
          setDesign={(d) => setDesign(d)}
          activationType={activationType}
          act={act}
          setAct={(a) => setAct(a)}
          qty={qty}
          setQty={(n) => setQty(n)}
          withPhysical={withPhysical}
          setWithPhysical={setWithPhysical}
          onBuy={buy}
          t={t}
          solPrice={solPrice}
          purchaseBlocked={purchaseBlocked}
          amlReason={purchaseReason}
          mintMsg={mintMsg}
          isBuying={isBuying}
          kycPills={pills}
        />
      </div>

      {/* Mobile: availability bar */}
      {!isWS && (
        <div className="lg:hidden card p-3">
          <div className="text-xs opacity-70 mb-2">{t('nft.availability')}</div>
          <SalesBar
            t={t}
            limited={totalForBar}
            minted={soldForBar}
            progressColor={progressColor}
          />
        </div>
      )}

      {/* Mobile: features card */}
      <div className="block lg:hidden">
        <DetailsCard
          t={t}
          title={title}
          blurb={blurb}
          meta={metaForDetails}
          featureLines={featureLines}
          solPrice={solPrice}
          effectiveKycRequired={effectiveKycRequired}
          blockedByAml={blockedByAmlForChips}
        />
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:grid grid-cols-1 md:grid-cols-[minmax(160px,240px)_1fr] gap-6">
        {/* Left: preview + availability */}
        <div className="space-y-3">
          <div
            className="relative w-full max-w-[240px] mx-auto card p-0 overflow-hidden"
            style={{ aspectRatio: '3 / 4' }}
          >
            <Image
              src={`/images/nft/${meta?.image ?? pngNameFor(item.id)}`}
              alt={title}
              fill
              sizes="(max-width: 767px) 90vw, 420px"
              className="object-cover rounded-xl border"
              priority={false}
            />
          </div>

          {!isWS && (
            <div className="mt-3 card p-3">
              <div className="text-xs opacity-70 mb-2">{t('nft.availability')}</div>
              <SalesBar
                t={t}
                limited={totalForBar}
                minted={soldForBar}
                progressColor={progressColor}
              />
            </div>
          )}
        </div>

        {/* Right: description + actions + rights */}
        <div className="space-y-4">
          {/* Desktop features/specs */}
          <div className="hidden lg:block">
            <DetailsCard
              t={t}
              title={title}
              blurb={blurb}
              meta={metaForDetails}
              featureLines={featureLines}
              solPrice={solPrice}
              effectiveKycRequired={effectiveKycRequired}
              blockedByAml={blockedByAmlForChips}
            />
          </div>

          {/* Purchase (desktop only) */}
          {item.tier !== 'ws' && (
            <div className="card p-4 md:p-5 flex flex-wrap items-end gap-3 hidden lg:flex">
              {/* Desktop: design selector ONLY for Tree/Steel */}
              {item.tier === 'tree' && (meta?.designs ?? item.designs ?? []).length > 0 && (
                <div className="text-sm">
                  <div className="text-xs mb-1">{t('nft.design.select')}</div>
                  <div className="flex flex-col gap-1">
                    {(meta?.designs ?? item.designs ?? []).map((d) => (
                      <label key={d.id} className="inline-flex items-center gap-2">
                        <input
                          type="radio"
                          name="nft-design"
                          checked={design === d.id}
                          onChange={() => setDesign(d.id)}
                          style={{ accentColor: 'var(--brand-400)' }}
                        />
                        <span className="text-xs">{d.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Desktop: physical format selector for Silver */}
              {meta?.tier === 'silver' ? (
                <div className="text-sm">
                  <div className="text-xs mb-1">{t('nft.physical.label')}</div>
                  <div className="flex flex-col gap-1">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="physical"
                        checked={withPhysical === true}
                        onChange={() => setWithPhysical(true)}
                        style={{ accentColor: 'var(--brand-400)' }}
                      />
                      <span className="text-xs">{t('nft.physical.with')}</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="physical"
                        checked={withPhysical === false}
                        onChange={() => setWithPhysical(false)}
                        style={{ accentColor: 'var(--brand-400)' }}
                      />
                      <span className="text-xs">{t('nft.physical.without')}</span>
                    </label>
                  </div>
                </div>
              ) : null}

              <div>
                <label className="label">{t('nft.qty')}</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="input w-24 text-sm"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                />
              </div>

              <div className="flex items-end gap-4">
                <div className="flex flex-col items-start">
                  <div
                    className="text-2xl font-semibold leading-none"
                    style={{ color: "var(--brand-400)" }}
                  >
                    {hasSol ? `${solPrice} SOL` : ""}
                  </div>
                  {hasSol && hasEurItem && eurFromItem !== undefined && (
                    <div className="text-xs opacity-70 mt-1">
                      ≈ {eurFromItem.toFixed(0)}€ (presale reference)
                    </div>
                  )}
                  <button
                    className={
                      "btn btn-outline mt-2 transition-transform duration-150 " +
                      ((purchaseBlocked || isBuying)
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer hover:scale-[1.01] active:scale-[0.98]")
                    }
                    onClick={buy}
                    disabled={purchaseBlocked || isBuying}
                    title={purchaseBlocked ? (purchaseReason ?? '') : undefined}
                  >
                    <span className="flex flex-col items-center leading-tight">
                      <span className="inline-flex items-center justify-center min-h-[18px]">
                        {isBuying ? (
                          <InlineLoader className="!text-white/80" />
                        ) : (
                          <span>{t('nft.buy')}</span>
                        )}
                      </span>
                      <span className="text-[10px] opacity-80 mt-0.5">
                        {t('nft.buy_subtitle')}
                      </span>
                    </span>
                  </button>
                  {mintMsg ? (
                    <div className="text-xs opacity-80 mt-2">{mintMsg}</div>
                  ) : null}

                  {pills.filter(p => p.level === 'error' || p.level === 'warning').length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {pills
                        .filter(p => p.level === 'error' || p.level === 'warning')
                        .map((p) => (
                          <span
                            key={p.type}
                            className={
                              'chip ' +
                              (p.level === 'error'
                                ? 'border border-red-500/30 bg-red-500/10'
                                : 'border border-amber-500/30 bg-amber-500/10')
                            }
                          >
                            {t(p.i18nKey)}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Rights */}
          {rights && (
            <div className="card p-4 md:p-5 space-y-4">
              <div className="text-sm font-medium">{t('nft.rights.title')}</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Claim */}
                <div className="space-y-2">
                  <div className="text-sm">
                    {t('nft.rights.claim_avail')}: <b>{Math.floor(rights.claimAvailVigri).toLocaleString()} VIGRI</b>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button className="btn btn-outline w-full sm:w-auto" onClick={doClaimAll}>
                      {t('nft.rights.claim_all')}
                    </button>
                    {claimMsg && <div className="text-xs">{claimMsg}</div>}
                  </div>
                </div>

                {/* Discount */}
                <div className="space-y-2">
                  <div className="text-sm">
                    {t('nft.rights.discount_avail')}:&nbsp;
                    <b>{cf.format(Math.max(0, rights.discountBudgetEur - rights.discountUsedEur))}</b>
                    &nbsp;· {t('nft.rights.discount_pct')}:&nbsp;
                    <b>{Math.round(rights.discountPctEffective * 100)}%</b>
                    {rights.expiresAt && (
                      <span className="ml-2 opacity-70">
                        ({t('nft.rights.expires_in')}: {daysLeft ?? '∞'} {t('nft.rights.days')})
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="label">{t('nft.rights.discount_enter_eur')}</label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className="input w-36 sm:w-40 text-sm"
                        value={discEur}
                        onChange={(e) => setDiscEur(Math.max(0, Number(e.target.value) || 0))}
                      />
                    </div>

                    <button className="btn btn-outline w-full sm:w-auto" onClick={doDiscount}>
                      {t('nft.rights.discount_buy')}
                    </button>

                    {discMsg && <div className="text-xs">{discMsg}</div>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Explainers */}
      {(meta?.explainers?.length ?? 0) > 0 && (
        <div className="card p-4 md:p-5 space-y-3">
          <div className="text-sm font-medium">{t('nft.explainers.title')}</div>
          <div className="space-y-3">
            {(meta?.explainers ?? []).map((ex: { titleKey: string; textKey: string }) => (
              <div key={ex.titleKey}>
                <div className="text-sm font-semibold">{t(ex.titleKey)}</div>
                <div className="text-sm opacity-80 mt-1">
                  <ExplainerText text={t(ex.textKey)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
