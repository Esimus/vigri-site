"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_LANG, detectLang, type Lang } from "../lib/i18n";
import en from "../locales/en.json";

type Messages = Record<string, string>;

export function useI18n() {
  // ВАЖНО: на сервере и на первом клиентском рендере всегда EN,
  // чтобы не было расхождения HTML.
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const [messages, setMessages] = useState<Messages>(en as Messages);

  // После монтирования читаем сохранённый/детектed язык и обновляем состояние
  useEffect(() => {
    const stored = (typeof window !== "undefined"
      ? (localStorage.getItem("lang") as Lang | null)
      : null);
    const next = stored ?? detectLang(); // ru/et/en
    if (next !== lang) setLang(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Подгружаем JSON локали при смене языка + сохраняем выбор
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (lang === "en") {
        if (!cancelled) setMessages(en as Messages);
        return;
      }
      const mod = await import(`../locales/${lang}.json`);
      if (!cancelled) setMessages(mod.default as Messages);
    }
    load();
    try { localStorage.setItem("lang", lang); } catch {}
    return () => { cancelled = true; };
  }, [lang]);

  const t = useMemo(
    () => (key: string) => messages[key] ?? (en as Messages)[key] ?? key,
    [messages]
  );

  return { lang, setLang, t };
}
