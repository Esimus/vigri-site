# 🌐 VIGRI Site

🇷🇺 [Русская версия](#-vigri-site-ru)  
🇬🇧 [English version](#-vigri-site-en)

---

## 🇷🇺 VIGRI Site (RU)

Лендинг **VIGRI** на **Next.js (App Router)** с локализацией **EN / RU / ET** и вынесенной конфигурацией.

### 🚀 Быстрый старт

1. Установить зависимости:

   ```bash
   npm install
   ```

2. Запустить дев-сервер:

   ```bash
   npm run dev
   ```

3. Открыть: [http://localhost:3000](http://localhost:3000)

---

### ⚙️ Переменные окружения

Скопируй `.env.example` → `.env.local` и при необходимости обнови значения.

Основные переменные:

- `NEXT_PUBLIC_SOLANA_CLUSTER` — `devnet` | `testnet` | `mainnet`
- `NEXT_PUBLIC_TELEGRAM_URL`, `NEXT_PUBLIC_X_URL`, `NEXT_PUBLIC_GITHUB_URL`, `NEXT_PUBLIC_DEX_URL`
- `NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_PROGRAM_ID`, `NEXT_PUBLIC_ARWEAVE_URI`

> ⚠️ Файл `.env.local` **не коммитим** (уже добавлен в `.gitignore`).

---

### 🌍 Локализация (i18n)

- Тексты: `locales/en.json`, `locales/ru.json`, `locales/et.json`  
- Хук: `hooks/useI18n.ts` (использование: `t("key")`)  
- Переключатель языков: `components/LanguageSwitcher.tsx`  
- Новые строки добавляем **одинаковыми ключами** во все языки

---

### 🧱 Полезно знать

- Статика: `public/` (картинки, иконки)  
- Токен-лист (план): `public/tokenlist.json`  
- Конфиг: `lib/config.ts` (читает публичные переменные окружения)  
- Главная страница: `app/page.tsx`  
- Глобальные стили: `app/globals.css`
- Cookie Consent: `components/CookieConsent*`, `lib/cookieConsent.ts` — баннер согласия с cookies (EU, только client-side)

---

### 🧩 Скрипты

| Команда | Назначение |
|----------|------------|
| `npm run dev` | режим разработки |
| `npm run build` | сборка продакшен |
| `npm start` | запуск собранного приложения |
| `npm run lint` | проверка ESLint |
| `npm run backup` | резервная копия проекта |

---

### 🏗 Примечания (архитектура)

- Проект готов к расширению (личный кабинет, API-роуты, KYC-интеграция).  
- Используется **crypto-agile** подход (абстрактные криптослои и централизованный конфиг).  
- Архитектура протестирована на WSL (Ubuntu 24.04.1).  
- Бэкенд API и Next.js связаны через cookies и Prisma ORM.
- Внедрён **EU Cookie Banner** и базовая система **Echo awards (mock)**.

---

### 📘 Документация

📄 **Technical summary:** [docs/TECHNICAL_SUMMARY.md](docs/TECHNICAL_SUMMARY.md)
🗂 **Репозиторий:** [Esimus/vigri-site](https://github.com/Esimus/vigri-site)
---

## 🇬🇧 VIGRI Site (EN)

Landing page and web platform for **VIGRI**, built on **Next.js (App Router)** with multilingual support (**EN / RU / ET**) and modular configuration.

### 🚀 Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open: [http://localhost:3000](http://localhost:3000)

---

### ⚙️ Environment Variables

Copy `.env.example` → `.env.local` and update values if necessary.

Main variables:

- `NEXT_PUBLIC_SOLANA_CLUSTER` — `devnet` | `testnet` | `mainnet`
- `NEXT_PUBLIC_TELEGRAM_URL`, `NEXT_PUBLIC_X_URL`, `NEXT_PUBLIC_GITHUB_URL`, `NEXT_PUBLIC_DEX_URL`
- `NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_PROGRAM_ID`, `NEXT_PUBLIC_ARWEAVE_URI`

> ⚠️ `.env.local` **must not be committed** (already ignored via `.gitignore`).

---

### 🌍 Localization (i18n)

- Texts: `locales/en.json`, `locales/ru.json`, `locales/et.json`  
- Hook: `hooks/useI18n.ts` (usage: `t("key")`)  
- Switcher: `components/LanguageSwitcher.tsx`  
- Add new strings using identical keys in all languages

---

### 🧱 Useful Info

- Static files: `public/`  
- Token list (planned): `public/tokenlist.json`  
- Config: `lib/config.ts` (reads public env vars)  
- Main page: `app/page.tsx`  
- Global styles: `app/globals.css`
- Cookie Consent: `components/CookieConsent*`, `lib/cookieConsent.ts` — баннер согласия с cookies (EU, только client-side)

---

### 🧩 Scripts

| Command | Purpose |
|----------|----------|
| `npm run dev` | development mode |
| `npm run build` | production build |
| `npm start` | run compiled app |
| `npm run lint` | run ESLint |
| `npm run backup` | create local backup archive |

---

### 🏗 Architecture Notes

- Ready for expansion (dashboard, API routes, KYC integration).  
- Uses **crypto-agile** design (abstract crypto layers, centralized configuration).  
- Fully compatible with **Next.js 15 (Turbopack)**.  
- Designed for **transparency**, **security**, and **maintainability**.
- Added **EU Cookie Banner** and **Echo awards (mock)** system.

---

## 📘 Project Docs

**VIGRI Site** — part of the *Lumiros Ecosystem*, a web platform for `$VIGRI` token holders, fan clubs, and cultural initiatives.  
Built with **Next.js 15**, **Prisma**, **Tailwind v4**, and **TypeScript**, focused on transparency, reliability, and strong data protection.

📄 **Technical summary:** [docs/TECHNICAL_SUMMARY.md](docs/TECHNICAL_SUMMARY.md)  
🗂 **Repository:** [Esimus/vigri-site](https://github.com/Esimus/vigri-site)
