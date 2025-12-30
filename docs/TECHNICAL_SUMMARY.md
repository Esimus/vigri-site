# VIGRI Site — Technical Summary (2025-12-29)

## Overview

**VIGRI Site** is the web platform of the **Lumiros / Люмирос** ecosystem. It provides public pages plus a user dashboard for interacting with the **$VIGRI** initiative, including **NFT presale**, **KYC/AML gating**, **referrals**, and **rewards (Echo)**.

**Network policy:** **Mainnet-only** — the production build operates strictly on **Solana mainnet** (`mainnet` / `mainnet-beta`). Devnet/testnet are not supported in production.

---

## Core stack

| Layer | Technology | Purpose |
|------|------------|---------|
| Framework | Next.js 15 (App Router) + TypeScript | SSR/SSG, API routes, React UI |
| Styling | Tailwind CSS v4 | Design tokens, responsive UI |
| Database | PostgreSQL + Prisma | Users, sessions, mint logs, referrals, awards |
| Auth | Cookie session (`vigri_session`) + password hashing (Argon2 via `@node-rs/argon2`) | User login & session management |
| i18n | JSON dictionaries + `useI18n` hook | EN / RU / ET translations |
| Solana | `@solana/web3.js` | On-chain reads + transaction integrations |
| Pricing | CoinGecko (SOL/EUR) + in-memory cache | Fiat display & tier pricing support |
| Compliance | EU Cookie Consent gate (client-safe) | GDPR-friendly consent flow |
| Build | Turbopack (Next.js) | Fast dev + optimized builds |

---

## Product areas

### Public pages
- `/` — Home / landing
- `/center` — Public page: **“International Training and Rehabilitation Center for Sport and Dance”** (custom header + OG metadata)

### Dashboard
- `/dashboard/*` — authenticated area with navigation, profile, notifications, and purchase-related UI.

---

## Runtime & build

- Next.js 15 (App Router)
- `metadataBase` derived from `NEXT_PUBLIC_APP_URL` (fallback: `http://localhost:3000`)
- ESLint and typecheck are expected to be clean for release readiness (`npm run lint`, `npm run typecheck`)

---

## Environment & configuration

### Environment files
- `.env.local` — local development
- `.env.production` — production runtime (server)

### Key variables (high level)
- `NEXT_PUBLIC_APP_URL` — required in production for correct `metadataBase`
- `DATABASE_URL` — PostgreSQL connection string
- `SOLANA_RPC_URL` — server-side mainnet RPC endpoint
- `NEXT_PUBLIC_SOLANA_CLUSTER=mainnet` — public marker; production must be mainnet
- `NEXT_PUBLIC_PROGRAM_ID` — Solana program identifier (presale)
- Public links: `NEXT_PUBLIC_TELEGRAM_URL`, `NEXT_PUBLIC_X_URL`, `NEXT_PUBLIC_GITHUB_URL`, `NEXT_PUBLIC_DEX_URL`

> `.env.local` must never be committed (ignored by `.gitignore`).  
> `.env.example` is the source of truth for the complete list.

---

## Mainnet-only policy

- The app is configured and validated to operate on **Solana mainnet only**.
- Any API endpoints that accept `network`/`cluster` query parameters must normalize and validate to mainnet (`mainnet` / `mainnet-beta`) and reject other values.
- UI must not expose devnet/testnet toggles in production.

---

## Solana integration (presale)

### Global config / tiers (on-chain)
- Endpoint: `GET /api/presale/global-config`
  - Returns on-chain **GlobalConfig** and **tiers**
  - Response includes normalized **mainnet** cluster info

### Mint logging + post-processing
- Endpoint: `POST /api/nft/mint-log`
  - Mainnet-only validation through a normalizer (rejects non-mainnet networks)
  - Persists mint events to the database
  - Triggers server-side post-processing steps (including creator signature via Metaboss flow)
  - Applies rewards logic (Echo) related to purchase events

> Note: The platform is built so the site can read on-chain state, log off-chain purchase/mint metadata, and enrich records after the on-chain transaction is confirmed.

---

## Price feed (SOL/EUR) & tier pricing

- Endpoint: `GET /api/assets`
  - Fetches **SOL/EUR** from **CoinGecko**
  - Uses **in-memory cache** with **TTL 120 seconds**
  - Builds `prices` from a base set + computed `SOL: solEur`
  - Derives tier pricing by calling internal `GET /api/presale/global-config` and merging results into the response
  - Validates `network` query param: only `mainnet` / `mainnet-beta` are accepted, otherwise returns **400**

---

## Auth & sessions

- Cookie-based session auth:
  - `vigri_session` — authentication cookie (TTL configured in app logic)
- Password hashing: Argon2 (`@node-rs/argon2`)
- Server routes under `app/api/auth/*` handle login / verification flows.

---

## Cookies

- `vigri_session` — auth session
- `vigri_theme_resolved` — resolved theme (SSR-safe)
- Cookie Consent state cookie(s) — used by the consent gate

> Cookie access is centralized via helper utilities (to avoid unsafe direct usage and to stay compatible with Next.js 15 runtime patterns).

---

## i18n (EN / RU / ET)

- Dictionaries:
  - `locales/en.json`
  - `locales/ru.json`
  - `locales/et.json`
- Hook: `hooks/useI18n.ts`
- Rule: keep keys aligned across all languages.

---

## UI structure (high level)

- `app/` — Next.js routes (pages + API routes)
- `components/` — UI building blocks (dashboard, NFT views, shared UI)
- `hooks/` — wallet hooks, i18n hook, client utilities
- `lib/` — shared config and helpers
- `src/` — services and Solana helper modules (transactions, enrichment)
- `prisma/` — schema + migrations
- `docs/` — technical documentation

---

## Compliance: EU Cookie Consent (GDPR)

Implemented as a client-safe consent gate to avoid hydration mismatches:
- Banner UI component (localized)
- Gate wrapper that checks consent cookie state
- Client wrapper to ensure SSR/CSR consistency

---

## Rewards & referrals (Echo)

- Rewards system applies server-side logic on key events (e.g., purchase/mint flows).
- Reward rules are defined in a canonical server-side config (e.g., `config/award_rules.json`).

Example structure:
```json
{
  "echo_unit_eur": 1,
  "purchase": { "buyer_pct": 0.01, "inviter_pct": 0.005 },
  "kyc": { "bonus": 5, "once_per_user": true },
  "email": { "bonus": 2 },
  "first_login": { "bonus": 1 },
  "profile": { "bonus": 5 },
  "feedback": { "bonus": 3 },
  "share_link": { "bonus": 0.5 }
}
```

---

## Database (Prisma)

Typical workflow:
```bash
npx prisma generate
npx prisma migrate dev
```

Production migrations:
```bash
npx prisma migrate deploy
```

---

## Release readiness checklist (practical)

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- Confirm production env:
  - `NEXT_PUBLIC_APP_URL` set to live domain
  - `SOLANA_RPC_URL` is mainnet RPC
  - `NEXT_PUBLIC_SOLANA_CLUSTER=mainnet`
  - DB connection works (`DATABASE_URL`)
- Confirm mainnet-only behavior:
  - `/api/presale/global-config` returns mainnet cluster
  - `/api/assets` rejects non-mainnet network values
  - `/api/nft/mint-log` rejects non-mainnet network values

---
