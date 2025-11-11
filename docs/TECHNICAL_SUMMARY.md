# VIGRI Site — Technical Summary (2025-11-11)

## Overview
VIGRI Site is the **frontend platform** of the **Lumiros / Люмирос** ecosystem, providing user interaction with the `$VIGRI` token, fan clubs, NFTs, and user dashboard.  
Current stage — **staging / pre-production**, deployed locally via **WSL (Ubuntu 24.04.1)**.

---

## Core Stack

| Layer | Technology | Purpose |
|-------|-------------|----------|
| **Framework** | Next.js 15 (App Router, TypeScript) | SSR, SSG, React 19 |
| **Database** | Prisma + SQLite (local) | Users / sessions |
| **Auth** | Cookie `vigri_session` (TTL 14 days), Argon2 (`@node-rs/argon2`) | Secure user login |
| **Theme** | Light / Dark / Auto (SSR) | Stored in cookie `vigri_theme_resolved` |
| **i18n** | `useI18n` hook | Unified keys `common.*`, `nav.*`, `activity.*` |
| **UI** | Tailwind v4 tokens | Smooth transitions, `rounded-2xl` cards |
| **Compliance** | EU Cookie Consent (client-only gate) | GDPR compliance without SSR hydration errors |
| **Build system** | Turbopack | Optimized dev/prod builds |

---

## Pages

- `/` — Home (hero, auth modal, language switcher, theme)  
- `/dashboard/*` — Internal area (DashboardShell + sidebar, breadcrumbs, notifications, profile menu)  
- `/center` — Public page **“International Training and Rehabilitation Center for Sport and Dance”**  
  (own header and OG metadata)

---

## Runtime & Build

- **Next.js 15.5.3** (App Router, Turbopack)  
- `next.config.ts`: `eslint.ignoreDuringBuilds = true` (lint does not block prod build)  
- `metadataBase` is derived from `NEXT_PUBLIC_APP_URL` (fallback: `http://localhost:3000`)

---

## Environment

- `.env.local` — development  
- `.env.production` — production  

**Required keys (minimum):**
- `NEXT_PUBLIC_APP_URL` — e.g. `https://vigri.ee` (for OG/Twitter images)  
- **SMTP (later):**
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

---

## Routing & API (mock state via cookies)

| Endpoint | Cookie | Description |
|-----------|---------|-------------|
| `/api/assets` | `vigri_assets` | Portfolio / asset mocks |
| `/api/nft` | `vigri_nfts` | NFT catalog / purchase / activation |
| `/api/nft/claim` | `vigri_nft_claim` | NFT claiming endpoint |
| `/api/nft/discount` | `vigri_nft_discount` | Apply discount codes |
| `/api/nft/rights` | `vigri_nft_rights` | NFT rights info |
| `/api/nft/summary` | — | Dynamic sales summary (force-dynamic, no cache) |
| `/api/award/kyc` | — | One-time KYC reward (see award_rules.json) |
| `/api/kyc` | `vigri_kyc` | KYC status (`none | pending | approved | rejected`) |
| `/api/auth/*` | `vigri_session` | Real authentication (Prisma + Argon2) |
| `/api/auth/dev-verify` | — | Dev-only; disabled in production |

---

## Cookies (client/server)

- `vigri_session` — authentication (TTL 14 days)  
- `vigri_theme_resolved` — theme (SSR)  
- `vigri_nft_claim` — NFT claim tracking  
- See other cookies in API table above  

> ⚙️ **Note:**  
> All cookie access is unified via `lib/cookies.ts → getCookie(name: string): string | null`.  
> All API routes migrated from `cookies().get(...)` to this helper for safer typing (Next 15).

---

## Components & Structure (refactor)

- `components/layout/` → `DashboardShell`, `DashboardNav`, `PublicHeader` (+ barrel `index.ts`)
- `components/nav/` → `LanguageSwitcher`, `ProfileMenu` (+ barrel)
- `components/notifications/` → `NotificationsBell` (+ barrel)
- `components/ui/` → clean presentational components (`PublicBreadcrumbs`, `StatusBadge`, etc.)

- Imports unified through **barrel exports**  
- Layout components standardized in style and markup  
- `DashboardShell` uses only `<Link />` from `next/link`

---

## UI / UX

- Tailwind v4 inline tokens  
- Smooth transitions and hover effects  
- Unified color scheme (`brand-400`, `brand-600`, `brand-800`)  
- `rounded-2xl` cards  
- i18n: unified `useI18n` hook with keys `common.*`, `nav.*`, `activity.*`

---

## Cookie Consent (EU)

**Files:**
- `components/CookieConsent.tsx` — banner UI with i18n texts  
- `components/CookieConsentGate.tsx` — server-side cookie check  
- `components/CookieConsentClient.tsx` — client wrapper to prevent hydration mismatch  
- `lib/cookieConsent.ts` — helpers for read/write operations  

**Integration:**
- `<CookieConsentGate />` added to `app/layout.tsx` before `</body>`  
- Renders only on client side; no SSR issues  

**Status:**
- Fixed: `t is not a function`, `Property 'get'`, `Hook called conditionally`, hydration mismatch  
- Banner works correctly, texts load from localization, console clean

---

## Awards (Echo) — Mock Implementation

**Source:**  
- `config/award_rules.json` — canonical source of reward rules (server-side)
  

**Structure example:**
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

---