"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useI18n } from "@/components/app/i18n";
import { LANGUAGES, languageFor } from "@/lib/i18n/locales";

export function LanguageMenu({ dark = false }: { dark?: boolean }) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = languageFor(lang);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t("top.language")}: ${current.nativeName}`}
        title={t("top.language")}
        translate="no"
        className={`flex h-9 shrink-0 items-center gap-1 rounded-full px-2 transition-colors ${dark ? "text-white hover:bg-white/10" : "text-ink hover:bg-black/[.05]"}`}
      >
        <span className={`rounded-md border px-1.5 py-0.5 font-mono text-[11.5px] font-bold leading-none tracking-wide ${dark ? "border-white/25 text-white" : "border-border text-ink"}`}>
          {current.short}
        </span>
        <ChevronDown className={`hidden h-3.5 w-3.5 transition-transform sm:block ${dark ? "text-white/60" : "text-dim"} ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div role="menu" translate="no" aria-label={t("top.language")} className="aq-drop aq-float absolute end-0 top-[calc(100%+8px)] z-50 w-60 rounded-2xl border border-border bg-white p-1.5">
          <p className="px-2.5 pb-1.5 pt-1.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-dim">{t("top.language")}</p>
          <div className="max-h-[min(70vh,420px)] overflow-y-auto">
            {LANGUAGES.map((option) => {
              const active = option.code === lang;
              return (
                <button
                  key={option.code}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  lang={option.code}
                  onClick={() => {
                    setLang(option.code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-[15px] transition-colors hover:bg-s2 ${active ? "bg-blue-light/60 font-semibold text-ink" : "font-medium text-ink"}`}
                >
                  <span
                    className={`w-9 shrink-0 rounded-md border py-0.5 text-center font-mono text-[11px] font-bold leading-tight tracking-wide ${active ? "border-blue/30 bg-white text-blue" : "border-border text-mid"}`}
                  >
                    {option.short}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{option.nativeName}</span>
                  {option.nativeName !== option.englishName ? <span className="text-[12.5px] text-dim">{option.englishName}</span> : null}
                  {active ? <Check className="h-3.5 w-3.5 shrink-0 text-blue" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
