"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { useI18n } from "@/components/app/i18n";
import { isActive, type HubTab, type HubTabLink } from "@/components/hub/nav";

const TAB_LABEL: Record<string, string> = {
  dashboard: "nav.dashboard",
  suite: "tab.suite",
  nitrogen: "nav.nitrogen",
  "order-group": "tab.orderNow",
  plans: "section.plans",
  analytics: "section.analytics",
};

const DROPDOWN_LABEL: Record<string, string> = {
  library: "short.library",
  freight: "nav.freight",
  netback: "nav.netback",
  tools: "nav.tools",
  telex: "nav.telex",
  analysis: "nav.analysis",
  home: "nav.home",
};

const tabClass = (active: boolean) =>
  `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-[3px] px-3 py-3 text-[12.5px] font-bold uppercase tracking-[0.08em] no-underline transition-colors xl:px-3.5 xl:text-[13px] ${
    active ? "border-teal-400 text-white" : "border-transparent text-slate-300 hover:border-white/35 hover:text-white"
  }`;

/** Plan promos point at the Buy Fertiliser page with a preset tab, so they never light up as the current page. */
const linkActive = (pathname: string, link: HubTabLink) => !link.href.includes("?") && isActive(pathname, link.href);

/** The desktop menu line: one tab per area, dropdowns for areas with several pages. */
export function HubTabs({ tabs, pathname }: { tabs: HubTab[]; pathname: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<{ key: string; top: number; left: number } | null>(null);
  const [seenPath, setSeenPath] = useState(pathname);
  const menu = useRef<HTMLDivElement>(null);
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});

  if (pathname !== seenPath) {
    setSeenPath(pathname);
    setOpen(null);
  }

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(null);
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menu.current?.contains(target) || triggers.current[open.key]?.contains(target)) return;
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      triggers.current[open.key]?.focus();
      close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    document.getElementById("aq-scroll")?.addEventListener("scroll", close, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      document.getElementById("aq-scroll")?.removeEventListener("scroll", close);
    };
  }, [open]);

  const toggle = (key: string, focusFirst = false) => {
    if (open?.key === key) {
      setOpen(null);
      return;
    }
    const rect = triggers.current[key]?.getBoundingClientRect();
    if (!rect) return;
    setOpen({ key, top: rect.bottom + 8, left: Math.max(8, Math.min(rect.left, window.innerWidth - 296)) });
    if (focusFirst) requestAnimationFrame(() => menu.current?.querySelector<HTMLElement>("a")?.focus());
  };

  const moveFocus = (step: number) => {
    const items = Array.from(menu.current?.querySelectorAll<HTMLElement>("a") ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    items[(index + step + items.length) % items.length]?.focus();
  };

  const label = (tab: HubTab) => t(TAB_LABEL[tab.key] ?? `nav.${tab.key}`);
  const linkLabel = (key: string) => t(DROPDOWN_LABEL[key] ?? `nav.${key}`);
  const openTab = open ? tabs.find((tab) => tab.key === open.key) : null;

  return (
    <nav aria-label="Sections" className="aq-tabs-scroll flex items-stretch gap-0 overflow-x-auto px-3 sm:px-6 xl:px-7">
      {tabs.map((tab, index) => {
        const active = tab.links.some((link) => linkActive(pathname, link));
        const divider = index > 0 ? <span key={`${tab.key}-div`} className="mx-0.5 my-auto h-4 w-px shrink-0 bg-white/20" aria-hidden /> : null;

        if (tab.links.length === 1) {
          const link = tab.links[0];
          return (
            <span key={tab.key} className="contents">
              {divider}
              <Link href={link.href} data-tour={tab.tour} aria-current={active ? "page" : undefined} className={tabClass(active)}>
                {label(tab)}
                {link.locked ? <Lock className="h-3 w-3 text-slate-400" aria-label="Locked, upgrade available" /> : null}
              </Link>
            </span>
          );
        }
        const expanded = open?.key === tab.key;
        return (
          <span key={tab.key} className="contents">
            {divider}
            <button
              ref={(node) => {
                triggers.current[tab.key] = node;
              }}
              type="button"
              data-tour={tab.tour}
              aria-haspopup="menu"
              aria-expanded={expanded}
              onClick={() => toggle(tab.key)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  if (expanded) menu.current?.querySelector<HTMLElement>("a")?.focus();
                  else toggle(tab.key, true);
                }
              }}
              className={`aq-nopress ${tabClass(active || expanded)}`}
            >
              {label(tab)}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} aria-hidden />
            </button>
          </span>
        );
      })}

      {open && openTab ? (
        <div
          ref={menu}
          role="menu"
          aria-label={label(openTab)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              moveFocus(event.key === "ArrowDown" ? 1 : -1);
            } else if (event.key === "Tab") {
              setOpen(null);
            }
          }}
          style={{ top: open.top, left: open.left }}
          className="aq-suite-drop aq-float fixed z-[60] w-72 origin-top rounded-2xl border border-border bg-white p-1.5 text-ink shadow-[0_18px_40px_-20px_rgb(11_30_45/0.45)]"
        >
          {openTab.links.map((link) => {
            const current = linkActive(pathname, link);
            return (
              <Link
                key={link.key}
                href={link.href}
                role="menuitem"
                aria-current={current ? "page" : undefined}
                onClick={() => setOpen(null)}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14.5px] no-underline outline-none transition-colors hover:bg-s2 focus-visible:bg-s2 ${
                  current ? "bg-teal-50 font-semibold text-navy-900" : "font-medium text-ink"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{linkLabel(link.key)}</span>
                  {link.promo ? <span className="block truncate text-[12.5px] font-normal text-dim">{link.promo}</span> : null}
                </span>
                {link.locked ? <Lock className="h-3.5 w-3.5 shrink-0 text-dim" aria-label="Locked, upgrade available" /> : null}
              </Link>
            );
          })}
        </div>
      ) : null}
    </nav>
  );
}
