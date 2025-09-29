// lib/i18n.ts
export type Lang = "en" | "ru" | "et";

export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
  { code: "et", label: "Eesti" }
];

export const DEFAULT_LANG: Lang = "en";

export function detectLang(): Lang {
  if (typeof navigator === "undefined") return DEFAULT_LANG;
  const n = (navigator.language || "").toLowerCase();
  if (n.startsWith("ru")) return "ru";
  if (n.startsWith("et")) return "et";
  return DEFAULT_LANG;
}
