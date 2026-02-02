# 🌐 VIGRI Site

Web platform for the **VIGRI** project: public pages + user dashboard with **KYC/AML gating**, **NFT presale purchases**, **referrals & rewards (Echo)**, and on-chain reads from the **Solana mainnet**.

> **Mainnet-only:** production is **strictly Solana mainnet**. Devnet/testnet are not supported in production builds.

---

## Key features

- **Next.js App Router** (Next.js 16.1.6)
- **i18n (EN / RU / ET)** via JSON dictionaries in `locales/`
- **User dashboard** (profile completion, KYC/AML gating)
- **NFT presale flow**
  - Reads **GlobalConfig** + tiers from Solana on-chain
  - Purchase logging to DB + post-processing (incl. creator signature step)
- **Rewards / Referrals**
  - Echo awards and referral tracking on purchase-related events
- **Price feed**
  - SOL/EUR via **CoinGecko** with in-memory caching (TTL 120s)

---

## Tech stack

- **Frontend / Server:** Next.js (App Router) 16.1.6, TypeScript 5.9.3
- **Styling:** Tailwind CSS v4.1.18
- **Database:** PostgreSQL + Prisma 7.3.0
- **Solana:** `@solana/web3.js` (mainnet RPC)
- **Ops (production):** typically behind Nginx + process manager (e.g., PM2)

---

## Mainnet-only policy

- The app is configured and validated to operate on **Solana mainnet only**.
- API endpoints that accept a `network`/`cluster` query param must resolve to `mainnet` / `mainnet-beta` only.
- UI should not expose devnet/testnet toggles in production.

---

## Requirements

- Node.js **24.13.0** (see `.nvmrc`)
- npm **11.6.2** (see `package.json#packageManager`)
- PostgreSQL **14+** (or compatible managed Postgres)

---

## Quick start (local)

```bash
npm install
npm run dev
```

Open: http://localhost:3000

---

## Environment variables

Copy `.env.example` → `.env.local` and fill in values.

`.env.local` must not be committed (already ignored by `.gitignore`).

This project uses a mix of public (`NEXT_PUBLIC_*`) and server-only variables.  
Use `.env.example` as the source of truth for the full list.

### Commonly used variables

#### Solana (mainnet)

- `SOLANA_RPC_URL` (server-side mainnet RPC endpoint)
- `NEXT_PUBLIC_SOLANA_CLUSTER=mainnet` (public marker; production must be mainnet)

Program / presale identifiers (kept in env/config):

- `NEXT_PUBLIC_PROGRAM_ID`
- other on-chain addresses if applicable

#### Links / marketing

- `NEXT_PUBLIC_TELEGRAM_URL`
- `NEXT_PUBLIC_X_URL`
- `NEXT_PUBLIC_GITHUB_URL`
- `NEXT_PUBLIC_DEX_URL`

#### App URL (production)

- `NEXT_PUBLIC_APP_URL` (must be set on production so Next `metadataBase` resolves correctly)

#### Database / Auth

- `DATABASE_URL` (PostgreSQL connection string)
- Auth-related secrets (see `.env.example`)

---

## Database (Prisma)

Typical workflow:

```bash
npx prisma generate
npx prisma migrate dev
```

For production migrations:

```bash
npx prisma migrate deploy
```

---

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint (no warnings) |
| `npm run typecheck` | TypeScript typecheck |
| `npm run backup` | Create a local backup archive (if present in package scripts) |

---

## Project structure (high level)

- `app/` — Next.js App Router (pages + API routes)
- `app/api/` — server routes (presale config, mint logging, auth, etc.)
- `components/` — UI components (dashboard, NFT cards, etc.)
- `hooks/` — wallet integrations, i18n, client utilities
- `lib/` — shared utilities & config
- `src/` — services and Solana helpers (transactions/enrichment, etc.)
- `prisma/` — Prisma schema and migrations
- `locales/` — i18n dictionaries (`en.json`, `ru.json`, `et.json`)
- `docs/` — technical documentation

---

## i18n (EN / RU / ET)

- Dictionaries: `locales/en.json`, `locales/ru.json`, `locales/et.json`
- Hook: `hooks/useI18n.ts`
- Always keep keys aligned across all languages.

---

## Notes on pricing (SOL/EUR)

- Endpoint: `app/api/assets/route.ts`
- SOL/EUR is fetched from CoinGecko and cached in-memory for 120 seconds.
- Tier pricing is derived via an internal call to `/api/presale/global-config` and merged into the response.

---

## Security & compliance (KYC/AML)

The platform includes a KYC/AML gating layer and user profile completeness checks.  
Higher tiers can require stricter verification rules depending on residency/citizenship and internal compliance logic.

---

## Documentation

- Technical summary: `docs/TECHNICAL_SUMMARY.md`
- Repo: `Esimus/vigri-site`

---

## License

TBD (add a license file or specify the intended license here).
