"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LANG_COOKIE, languageFor, translate, type LangCode } from "@/lib/i18n/locales";

type I18nValue = {
  lang: LangCode;
  dir: "ltr" | "rtl";
  setLang: (lang: LangCode) => void;
  t: (key: string, vars?: Record<string, string>) => string;
};

const I18nContext = createContext<I18nValue>({
  lang: "en",
  dir: "ltr",
  setLang: () => {},
  t: (key, vars) => translate("en", key, vars),
});

export function I18nProvider({ initial, children }: { initial: LangCode; children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(initial);
  const dir = languageFor(lang).dir;

  useEffect(() => {
    const root = document.documentElement;
    const before = { lang: root.lang, dir: root.dir };
    root.lang = lang;
    root.dir = dir;
    return () => {
      root.lang = before.lang;
      root.dir = before.dir;
    };
  }, [lang, dir]);

  const setLang = useCallback((next: LangCode) => {
    setLangState(next);
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const value = useMemo<I18nValue>(() => ({ lang, dir, setLang, t: (key, vars) => translate(lang, key, vars) }), [lang, dir, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
