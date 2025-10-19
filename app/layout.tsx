// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: "VIGRI is the utility token of the Lumiros ecosystem.",
  icons: { icon: "/favicon.ico" },
  description:
    "$VIGRI is a utility token on Solana for payments, discounts, and access to services and experiences from sports clubs and dance studios. Part of the Lumiros ecosystem.",
  };

// Reads cookie value across Next versions (string | { value })
function getCookieVal(
  store: ReturnType<typeof cookies>,
  name: string
): string | undefined {
  // @ts-expect-error next headers get() type varies
  const c: unknown = store.get(name);
  if (typeof c === "string") return c;
  if (c && typeof c === "object" && "value" in (c as any)) {
    const v = (c as any).value;
    return typeof v === "string" ? v : undefined;
  }
  return undefined;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Read theme cookies on the server
  const store = cookies();
  const pref = getCookieVal(store, "vigri_theme") ?? "auto"; // 'auto' | 'light' | 'dark'
  const resolved = getCookieVal(store, "vigri_theme_resolved") as
    | "light"
    | "dark"
    | undefined;

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
      <body>{children}</body>
    </html>
  );
}
