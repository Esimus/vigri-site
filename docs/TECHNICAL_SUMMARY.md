# VIGRI Site — Technical Summary (2025-10-19)

## Overview
VIGRI Site — это фронтенд-платформа экосистемы **Lumiros / Люмирос**, обеспечивающая взаимодействие пользователей с токеном `$VIGRI`, фан-клубами, NFT и личным кабинетом.  
Текущая стадия — **staging / pre-production**, развёртывается локально через WSL (Ubuntu 24.04.1).

---

## Core Stack

| Layer | Technology | Purpose |
|-------|-------------|----------|
| **Framework** | Next.js 15 (App Router, TypeScript) | SSR, SSG, React 19 |
| **Database** | Prisma + SQLite (локально) | Users / sessions |
| **Auth** | Cookie `vigri_session` (TTL 14 days), Argon2 (`@node-rs/argon2`) | Secure user login |
| **Theme** | Light / Dark / Auto (SSR) | Stored in cookie `vigri_theme_resolved` |
| **i18n** | `useI18n` hook | Unified keys `common.*`, `nav.*`, `activity.*` |
| **UI** | Tailwind v4 tokens | Smooth transitions, `rounded-2xl` cards |
| **Build system** | Turbopack | Optimized dev/prod builds |

---

## Pages

- `/` — главная (hero, auth modal, языки, тема)  
- `/dashboard/*` — внутренняя часть (DashboardShell + sidebar, breadcrumbs, notifications, profile menu)  
- `/center` — публичная страница **«Международный тренировочно-реабилитационный центр спорта и танцев»**  
  (со своей шапкой и OG-метаданными)

---

## Runtime & Build

- **Next.js 15.5.3** (App Router, Turbopack)  
- `next.config.ts`: `eslint.ignoreDuringBuilds = true`  
  (lint не блокирует prod build; в dev `npm run lint` остаётся строгим)  
- `metadataBase` берётся из `NEXT_PUBLIC_APP_URL`  
  *(fallback: `http://localhost:3000`)*  

---

## Environment

- `.env.local` — dev  
- `.env.production` — prod  

**Обязательные ключи (минимум):**
- `NEXT_PUBLIC_APP_URL` — например `https://vigri.ee` (для OG/Twitter images)  
- **SMTP (позже):**
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

---

## Routing & API (mock state via cookies)

| Endpoint | Cookie | Description |
|-----------|---------|-------------|
| `/api/assets` | `vigri_assets` | Портфель / позиции (моки) |
| `/api/nft` | `vigri_nfts` | Каталог / покупка / активация |
| `/api/nft/claim` | `vigri_nft_claim` | Получение NFT (claim) |
| `/api/nft/discount` | `vigri_nft_discount` | Применение скидок |
| `/api/nft/rights` | `vigri_nft_rights` | Права на NFT |
| `/api/kyc` | `vigri_kyc` | Статус (`none | pending | approved | rejected`) |
| `/api/auth/*` | `vigri_session` | Реальная аутентификация (Prisma + Argon2) |
| `/api/auth/dev-verify` | — | Только для dev; в проде будет отключён |

---

## Cookies (client/server)

- `vigri_session` — аутентификация, TTL 14 дней  
- `vigri_theme_resolved` — тема (SSR)  
- Прочие cookies — см. API выше

> ⚙️ **Важно:** из-за типизации Next 15 используется единый безопасный геттер:  
> `lib/cookies.ts → getCookie(name: string): string | null`  
> Все серверные роуты заменены с `cookies().get(...)` на `getCookie(...)`.

---

## Components & Structure (refactor)
- `components/layout/` → `DashboardShell`, `DashboardNav`, `PublicHeader` (+ barrel `index.ts`)
- `components/nav/` → `LanguageSwitcher`, `ProfileMenu` (+ barrel)
- `components/notifications/` → `NotificationsBell` (+ barrel)
- `components/ui/` → чистые презентационные компоненты (`PublicBreadcrumbs`, `StatusBadge`, …, barrel)

- Все импорты постепенно приведены к **barrel-экспортам**  
- Layout-компоненты унифицированы по стилю и разметке  
- Навигация (`DashboardShell`) использует только `<Link />` из `next/link`

---

## UI / UX

- Tailwind v4 inline tokens  
- Плавные hover/transition эффекты  
- Карточки `rounded-2xl`  
- Единая цветовая схема (brand-400, brand-600, brand-800)  
- i18n: единый `useI18n`, ключи `common.*`, `nav.*`, `activity.*`

---

## Types & Lint

- Убраны проблемы с `cookies().get`  
- В API заменён `any` на конкретные типы (`DevVerifyBody`, `ActivationKind`, `DiscountState`, …)  
- Dev-политика:  
  - Исправляем предупреждения по мере работы  
  - `npm run lint -- --max-warnings=0` — строгая проверка  
  - Build не блокируется из-за lint  

---

## Scripts

| Script | Purpose |
|---------|----------|
| `npm run dev` | локальная разработка |
| `npm run build` | production build |
| `npm run start` | запуск собранного приложения |
| `npm run lint` | проверка ESLint |
| `npm run backup` | создаёт архив проекта в `~/Backups/` |

---

## Repository & Backups

- **GitHub:** `Esimus/vigri-site` (SSH, branch `main`)  
- **Backups:**  
  - Linux: `/home/adet/Backups/`  
  - Windows: `\\wsl$\Ubuntu-24.04\home\adet\Backups`

---

## Security & Next Steps

1. Минимизировать прямую работу с cookie API через единый хелпер  
2. Включить SMTP и убрать dev-эндпоинт (`/api/auth/dev-verify`) на проде  
3. Удалить оставшиеся `any` / `unused`  
4. Привести все React hooks к полным зависимостям  
5. Проверить HTTPS и CSP при деплое

---

## Recent Changes (2025-10-19)

- Исправлены все вызовы `cookies().get()` (типизация Next 15)  
- Добавлены barrel-экспорты в `components/`  
- Исправлены импорты `ProfileMenu`, `DashboardShell`  
- Добавлен `scripts/backup.sh` и npm-скрипт `backup`  
- В `next.config.ts` отключён build-blocking ESLint  
- Добавлен fallback для `metadataBase`  
- Проверен успешный build (Turbopack, без ошибок)

---