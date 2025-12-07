// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import CookieConsentGate from "@/components/CookieConsentGate";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: "VIGRI is the utility token of the Lumiros ecosystem.",
  icons: { icon: "/favicon.ico" },
  description:
    "$VIGRI is a utility token on Solana for payments, discounts, and access to services and experiences from sports clubs and dance studios. Part of the Lumiros ecosystem.",
};

// Narrow helper
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** Cross-version cookie reader (Next may return string or { value }) */
async function readServerCookie(name: string): Promise<string | undefined> {
  const store = await cookies();
  const c = store.get(name) as unknown;

  if (typeof c === "string") return c;
  if (isObject(c) && typeof (c as { value?: unknown }).value === "string") {
    return (c as { value: string }).value;
  }
  return undefined;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read theme cookies on the server
  const pref = (await readServerCookie("vigri_theme")) ?? "auto"; // 'auto' | 'light' | 'dark'
  const resolved = (await readServerCookie("vigri_theme_resolved")) as "light" | "dark" | undefined;

  // If explicit pref is set, use it; otherwise fallback to last resolved (set by client), else 'light'
  const initial: "light" | "dark" =
    pref === "dark" || pref === "light" ? (pref as "dark" | "light") : resolved ?? "light";

  // Inline first-frame colors to avoid any flash before CSS arrives
  const firstFrameBg = initial === "dark" ? "#0b0f17" : "#f7f7fb";
  const firstFrameFg = initial === "dark" ? "#eef2f7" : "#111827";

  return (
    <html
      lang="ru"
      data-theme={initial}
      className={initial === "dark" ? "dark" : undefined}
      style={{ background: firstFrameBg, color: firstFrameFg }}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="color-scheme" content="dark light" />
        {/* Update theme on first tick & clear inline colors */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(){try{
              var m=document.cookie.match(/(?:^|; )vigri_theme=([^;]+)/);
              var pref=m?decodeURIComponent(m[1]):'auto';
              var dark=(pref==='dark')||(pref!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);
              var root=document.documentElement;
              root.setAttribute('data-theme', dark?'dark':'light');
              root.classList.toggle('dark', dark);
              root.style.background=''; root.style.color='';
            }catch(e){}}();`,
          }}
        />
      </head>
      <body className="page-bg">
        {children}
        {/* Cookie consent banner (server-aware) */}
        <CookieConsentGate />
      </body>
    </html>
  );
}
