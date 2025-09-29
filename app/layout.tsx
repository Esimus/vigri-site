// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VIGRI — утилитарный токен экосистемы Lumiros (Solana)",
  icons: { icon: "/favicon.ico" },
  description:
    "VIGRI — утилитарный SPL-токен для сервисов клубов и городских проектов экосистемы Lumiros. Быстро, дёшево, удобно.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>{children}</body>
    </html>
  );
}