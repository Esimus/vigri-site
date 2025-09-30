# VIGRI Site

Лендинг VIGRI на **Next.js (App Router)** с локализацией **EN / RU / ET** и вынесенной конфигурацией.

## Быстрый старт
1. Установить зависимости:
    
    npm install

2. Запустить дев-сервер:
    
    npm run dev

Открой: http://localhost:3000

## Переменные окружения
Скопируй `.env.example` → `.env.local` и при необходимости обнови значения.

Основные переменные:
- `NEXT_PUBLIC_SOLANA_CLUSTER` — `devnet` | `testnet` | `mainnet`
- `NEXT_PUBLIC_TELEGRAM_URL`, `NEXT_PUBLIC_X_URL`, `NEXT_PUBLIC_GITHUB_URL`, `NEXT_PUBLIC_DEX_URL`
- `NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_PROGRAM_ID`, `NEXT_PUBLIC_ARWEAVE_URI`

> Файл `.env.local` **не коммитим** (уже добавлен в `.gitignore`).

## Локализация (i18n)
- Тексты: `locales/en.json`, `locales/ru.json`, `locales/et.json`
- Хук: `hooks/useI18n.ts` (использование: `t("key")`)
- Переключатель языков: `components/LanguageSwitcher.tsx`
- Новые строки добавляем **одинаковыми ключами** во все языки.

## Полезно знать
- Статика: `public/` (картинки, иконки)
- Токен-лист для кошельков (план): `public/tokenlist.json`
- Конфиг: `lib/config.ts` (читает публичные переменные окружения)
- Главная страница: `app/page.tsx`
- Глобальные стили: `app/globals.css`

## Скрипты
- `npm run dev` — режим разработки  
- `npm run build` — сборка продакшен  
- `npm start` — запуск собранного приложения

## Примечания (архитектура)
- Проект готов к расширению (личный кабинет, API-роуты, KYC-интеграция).
- Держим **crypto-agile** подход (слои абстракций под криптографию и конфиг).
