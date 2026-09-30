"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronRight, CornerDownLeft, Search } from "lucide-react";
import { AquibotAvatar } from "@/components/app/aquibot-avatar";

export type PaletteItem = { href: string; label: string; group: string; hint?: string; icon?: React.ReactNode; action?: () => void };

export function openPalette() {
  window.dispatchEvent(new Event("aq:palette"));
}

/** Ctrl/Cmd+K jump-to for every page, ending in "Ask Aquibot" with whatever was typed. */
export function CommandPalette({ items, askHref = "/hub/aquibot" }: { items: PaletteItem[]; askHref?: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setQuery("");
        setActive(0);
        setOpen((value) => !value);
      }
    };
    const onOpen = () => {
      setQuery("");
      setActive(0);
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("aq:palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("aq:palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => input.current?.focus(), 30);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => `${item.label} ${item.group} ${item.hint ?? ""}`.toLowerCase().includes(needle));
  }, [items, query]);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const choose = (item: PaletteItem) => {
    setOpen(false);
    if (item.action) item.action();
    else router.push(item.href);
  };

  const ask = () => {
    if (!askHref) return;
    setOpen(false);
    const text = query.trim();
    router.push(text ? `${askHref}?q=${encodeURIComponent(text)}` : askHref);
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="aq-app fixed inset-0 z-[96]">
      <button type="button" aria-label="Close search" className="aq-backdrop absolute inset-0 cursor-default bg-[#0b1e2d]/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search Aquifert"
        className="aq-drop aq-float absolute left-1/2 top-[10vh] w-[min(620px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-[20px] bg-white"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-dim" />
          <input
            ref={input}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((value) => Math.min(value + 1, results.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((value) => Math.max(value - 1, 0));
              } else if (event.key === "Enter") {
                event.preventDefault();
                if (results[active]) choose(results[active]);
                else ask();
              }
            }}
            placeholder="Search pages and actions…"
            aria-label="Search pages and actions"
            className="h-14 w-full bg-transparent text-[15px] text-ink outline-none"
          />
          <kbd className="hidden shrink-0 rounded-md border border-border bg-s2 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-dim sm:block">Esc</kbd>
        </div>
        <div ref={list} className="max-h-[min(52vh,420px)] overflow-y-auto p-2">
          {results.length === 0 ? <p className="px-3 py-8 text-center text-[13.5px] text-dim">No pages match{askHref ? ". Ask Aquibot below." : "."}</p> : null}
          {results.map((item, index) => {
            const heading = index === 0 || results[index - 1].group !== item.group ? item.group : null;
            return (
              <div key={`${item.group}-${item.href}-${item.label}`}>
                {heading ? <p className="px-3 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-dim first:pt-1">{heading}</p> : null}
                <button
                  type="button"
                  data-index={index}
                  onClick={() => choose(item)}
                  onMouseMove={() => setActive(index)}
                  className={`aq-nopress flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${index === active ? "bg-blue-light" : ""}`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-s3 text-mid [&>svg]:h-4 [&>svg]:w-4">{item.icon ?? <Search />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-ink">{item.label}</span>
                    {item.hint ? <span className="block truncate text-[12px] text-dim">{item.hint}</span> : null}
                  </span>
                  {index === active ? <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-blue" /> : <ChevronRight className="h-4 w-4 shrink-0 text-[#c5cfd9]" />}
                </button>
              </div>
            );
          })}
        </div>
        {askHref ? (
          <div className="flex items-center gap-3 border-t border-border bg-s2 px-4 py-2.5">
            <p className="min-w-0 flex-1 truncate text-[12.5px] text-mid">{query.trim() ? `Ask Aquibot: “${query.trim()}”` : "Can't find it? Ask Aquibot."}</p>
            <button type="button" onClick={ask} className="aq-ai-pill inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full pl-1 pr-3 text-[12.5px] font-semibold shadow-sm">
              <AquibotAvatar size={24} />
              Ask Aquibot
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
