"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpenCheck, ChevronDown, ChevronsLeft, ChevronsRight, Lock, LogOut, Menu, MoreHorizontal, Search, Sparkles, UserCircle, X } from "lucide-react";
import { AquibotAvatar } from "@/components/app/aquibot-avatar";
import { AutoTranslate } from "@/components/app/auto-translate";
import { closeAquibot, toggleAquibot, useAquibotDock } from "@/components/app/aquibot-dock-store";
import { CommandPalette, openPalette, type PaletteItem } from "@/components/app/command-palette";
import { useI18n } from "@/components/app/i18n";
import { InfoTip } from "@/components/app/info-tip";
import { LanguageMenu } from "@/components/app/language-menu";
import { startTour, Tour } from "@/components/app/tour";
import { useStoredFlag } from "@/components/app/use-stored-flag";
import { AquibotDock } from "@/components/hub/aquibot-dock";
import { ADMIN_LINK, HUB_NAV, isActive, pageTitle, SECTIONS, TAB_KEYS, type HubNavItem } from "@/components/hub/nav";
import { PLAN_LABEL } from "@/lib/aq-modules/types";
import { initials, type SessionUser } from "@/lib/session-shared";

const RAIL_KEY = "aq.rail.collapsed";

function NavIcon({ item, size = 28, locked = false }: { item: HubNavItem; size?: number; locked?: boolean }) {
  if (item.icon === "aquibot") return <AquibotAvatar size={size} />;
  const Icon = item.icon;
  return (
    <span
      className={`aq-chip ${item.tone ? `aq-chip-${item.tone}` : ""} inline-flex shrink-0 items-center justify-center rounded-[9px] text-white ${locked ? "opacity-60 saturate-50" : ""}`}
      style={{ width: size, height: size }}
    >
      <Icon className="h-[14px] w-[14px]" strokeWidth={2.2} />
    </span>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/hub" aria-label="Aquifert home" className="flex items-center no-underline transition-opacity hover:opacity-80">
      {compact ? (
        <Image src="/brand/mark.png" alt="Aquifert" width={148} height={214} className="h-[30px] w-auto" priority />
      ) : (
        <Image src="/brand/logo.png" alt="Aquifert" width={784} height={209} className="h-8 w-auto" priority />
      )}
    </Link>
  );
}

const SECTION_KEY: Record<string, string> = { "AQ ONE Free plan": "aq1", "AQ Analytics": "analytics", "Desk tools": "desk", You: "you" };
const SECTION_NOTE: Partial<Record<string, string>> = { "AQ ONE Free plan": "note.aq1", "AQ Analytics": "note.analytics" };

function NavList({
  pathname,
  collapsed,
  admin,
  unlocked,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  admin: boolean;
  unlocked: string[];
  onNavigate?: () => void;
}) {
  const { t } = useI18n();
  return (
    <nav aria-label="Hub" className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4 pt-2">
      {SECTIONS.map((section) => (
        <div key={section} className="flex flex-col gap-0.5" aria-label={section}>
          {collapsed ? (
            <div className="mx-auto mb-1 h-px w-6 bg-black/[.07] first:hidden" />
          ) : section === "Main" ? null : (
            <div className="mt-1 border-t border-black/[.06] px-2.5 pb-1 pt-3">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-teal-700">{t(`section.${SECTION_KEY[section]}`)}</p>
              {SECTION_NOTE[section] ? <p className="mt-0.5 text-[11px] text-dim">{t(SECTION_NOTE[section])}</p> : null}
            </div>
          )}
          {HUB_NAV.filter((item) => item.section === section).map((item) => {
            const active = isActive(pathname, item.href);
            const locked = Boolean(item.module && !unlocked.includes(item.module));
            const label = t(`nav.${item.key}`);
            return (
              <div key={item.key} data-tour={item.key} className="group relative flex items-center">
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? `${label}${locked ? " (locked)" : ""}` : undefined}
                  aria-current={active ? "page" : undefined}
                  className={`aq-nav-link flex min-w-0 flex-1 items-center gap-3 rounded-xl py-[7px] text-[13.5px] no-underline transition-colors ${
                    collapsed ? "justify-center px-0" : "px-2.5 pr-8"
                  } ${active ? "bg-white font-semibold text-ink shadow-[0_1px_2px_rgb(16_38_59/0.08),0_4px_12px_-6px_rgb(16_38_59/0.12)]" : "font-medium text-mid hover:bg-white/70 hover:text-ink"}`}
                >
                  <NavIcon item={item} locked={locked} />
                  {collapsed ? null : <span className="min-w-0 flex-1 truncate">{label}</span>}
                  {!collapsed && locked ? (
                    <Lock className="h-3.5 w-3.5 shrink-0 text-dim" aria-label="Locked, upgrade available" />
                  ) : null}
                </Link>
                {collapsed ? null : (
                  <InfoTip label={label} text={item.tip} href={`/hub/guide#${item.key}`} className="absolute end-1 opacity-100 lg:opacity-0 lg:focus:opacity-100 lg:group-hover:opacity-100" />
                )}
              </div>
            );
          })}
          {section === "You" && admin ? (
            <Link
              href={ADMIN_LINK.href}
              onClick={onNavigate}
              title={collapsed ? t("top.admin") : undefined}
              className={`aq-nav-link flex items-center gap-3 rounded-xl py-[7px] text-[13.5px] font-medium text-mid no-underline transition-colors hover:bg-white/70 hover:text-ink ${
                collapsed ? "justify-center px-0" : "px-2.5"
              }`}
            >
              <span className="aq-chip aq-chip-blue inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] text-white">
                <ADMIN_LINK.icon className="h-[14px] w-[14px]" strokeWidth={2.2} />
              </span>
              {collapsed ? null : <span className="truncate">{t("top.admin")}</span>}
            </Link>
          ) : null}
        </div>
      ))}
    </nav>
  );
}

function AccountMenu({ user, admin }: { user: SessionUser; admin: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

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

  const item = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] font-medium text-ink no-underline hover:bg-s2";
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("top.account")}
        className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-black/[.05] sm:pr-2"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#5789b0] to-[#1e405f] text-[11.5px] font-bold text-white shadow-sm">
          {initials(user.name)}
        </span>
        <ChevronDown className={`hidden h-3.5 w-3.5 text-dim transition-transform sm:block ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div role="menu" className="aq-drop aq-float absolute end-0 top-[calc(100%+8px)] z-50 w-64 rounded-2xl border border-border bg-white p-1.5">
          <div translate="no" className="px-2.5 pb-2.5 pt-2">
            <p className="truncate text-[14px] font-semibold text-ink">{user.name}</p>
            <p className="truncate text-[12px] text-dim">{user.email}</p>
            <span className="mt-2 inline-flex rounded-full bg-blue-light px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-wide text-blue">
              {PLAN_LABEL[user.plan]}
            </span>
          </div>
          <div className="h-px bg-border" />
          <div className="py-1">
            <Link href="/hub/account" role="menuitem" className={item} onClick={() => setOpen(false)}>
              <UserCircle className="h-4 w-4 text-mid" /> {t("top.account")}
            </Link>
            <Link href="/hub/guide" role="menuitem" className={item} onClick={() => setOpen(false)}>
              <BookOpenCheck className="h-4 w-4 text-mid" /> {t("top.guide")}
            </Link>
            <button
              type="button"
              role="menuitem"
              className={item}
              onClick={() => {
                setOpen(false);
                startTour();
              }}
            >
              <Sparkles className="h-4 w-4 text-mid" /> {t("top.tour")}
            </button>
            {admin ? (
              <Link href="/admin" role="menuitem" className={item} onClick={() => setOpen(false)}>
                <ADMIN_LINK.icon className="h-4 w-4 text-mid" /> {t("top.admin")}
              </Link>
            ) : null}
          </div>
          <div className="h-px bg-border" />
          <form action="/api/logout" method="post" className="pt-1">
            <button type="submit" role="menuitem" className={`${item} text-danger hover:bg-red-50`}>
              <LogOut className="h-4 w-4" /> {t("top.signOut")}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({
  user,
  admin = false,
  unlocked = [],
  children,
}: {
  user: SessionUser;
  admin?: boolean;
  unlocked?: string[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [railPinned, toggleRail] = useStoredFlag(RAIL_KEY);
  const [drawer, setDrawer] = useState(false);
  const onAquibotPage = isActive(pathname, "/hub/aquibot");
  const dockOpen = useAquibotDock().open && !onAquibotPage;
  const collapsed = railPinned || dockOpen;
  const englishTitle = pageTitle(pathname);
  const titleItem = HUB_NAV.find((item) => item.label === englishTitle);
  const title = titleItem ? t(`nav.${titleItem.key}`) : englishTitle;

  useEffect(() => {
    if (!drawer) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawer(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawer]);

  const palette = useMemo<PaletteItem[]>(() => {
    const pages: PaletteItem[] = HUB_NAV.map((item) => ({
      href: item.href,
      label: item.module && !unlocked.includes(item.module) ? `${t(`nav.${item.key}`)} (locked)` : t(`nav.${item.key}`),
      group: item.section === "You" ? "Account" : item.section === "Main" ? "Go to" : item.section,
      hint: item.tip.split(". ")[0],
      icon: item.icon === "aquibot" ? <AquibotAvatar size={20} /> : <item.icon />,
    }));
    const account: PaletteItem[] = [
      { href: "/hub/account/profile", label: "Profile details", group: "Account", icon: <UserCircle /> },
      { href: "/hub/account/password", label: "Change password", group: "Account", icon: <UserCircle /> },
      { href: "#tour", label: t("top.tour"), group: "Help", icon: <Sparkles />, action: startTour },
    ];
    return [...pages, ...account, ...(admin ? [{ href: "/admin", label: t("top.admin"), group: "Help", icon: <ADMIN_LINK.icon /> }] : [])];
  }, [admin, unlocked, t]);

  const tabs = TAB_KEYS.map((key) => HUB_NAV.find((item) => item.key === key)!);

  return (
    <div className="aq-app aq-frame h-dvh overflow-hidden lg:p-2.5 xl:flex xl:gap-2.5">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[99] focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <div className="aq-canvas flex h-full min-w-0 overflow-hidden lg:rounded-[22px] lg:shadow-[0_24px_64px_-24px_rgb(0_0_0/0.55)] xl:flex-1">
        <aside
          className={`aq-rail hidden shrink-0 flex-col border-r border-black/[.06] transition-[width] duration-200 lg:flex ${collapsed ? "w-[76px]" : "w-[256px]"}`}
        >
          <div className={`flex h-16 shrink-0 items-center ${collapsed ? "justify-center" : "px-5"}`}>
            <Brand compact={collapsed} />
          </div>
          <NavList pathname={pathname} collapsed={collapsed} admin={admin} unlocked={unlocked} />
          <div className="shrink-0 border-t border-black/[.06] p-3">
            <button
              type="button"
              onClick={dockOpen && !railPinned ? closeAquibot : toggleRail}
              aria-label={collapsed ? t("top.expand") : t("top.collapse")}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium text-dim transition hover:bg-white hover:text-ink hover:shadow-sm"
            >
              {collapsed ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronsLeft className="h-4 w-4" /> {t("top.collapse")}
                </>
              )}
            </button>
          </div>
        </aside>

        <div id="aq-scroll" className="relative flex min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          <header className="aq-glass sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-black/[.06] px-3 sm:px-5 lg:h-16">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label={t("top.menu")}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition hover:bg-black/[.05] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden">
              <Brand />
            </div>
            <div className="hidden min-w-0 items-center gap-2 text-[14px] lg:flex" aria-label="Current page">
              <span className="text-dim">Aquifert ONE</span>
              <span className="text-[#c5cfd9]">/</span>
              <span className="truncate font-semibold text-ink">{title}</span>
            </div>

            <div className="ms-auto flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={openPalette}
                aria-label="Search"
                className="hidden h-9 w-56 items-center gap-2 rounded-full border border-black/[.08] bg-black/[.03] px-3.5 text-[13px] text-dim transition hover:bg-black/[.05] md:flex"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="flex-1 text-start">{t("top.search")}</span>
                <kbd className="rounded border border-black/10 px-1 font-mono text-[10px] font-semibold">Ctrl K</kbd>
              </button>
              <button type="button" onClick={openPalette} aria-label="Search" className="flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-black/[.05] md:hidden">
                <Search className="h-[18px] w-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => (onAquibotPage ? document.getElementById("aquibot-input")?.focus() : toggleAquibot())}
                aria-expanded={dockOpen}
                aria-controls="aquibot-dock"
                className={`aq-ai-pill hidden h-9 items-center gap-1.5 rounded-full pl-1 pr-3.5 text-[12.5px] font-semibold shadow-[0_6px_16px_-8px_rgb(47_111_179/0.7)] transition hover:brightness-110 sm:inline-flex ${
                  dockOpen ? "ring-2 ring-blue/30 ring-offset-2 ring-offset-white" : ""
                }`}
              >
                <AquibotAvatar size={28} active={dockOpen} />
                {t("top.askAquibot")}
              </button>
              <Link
                href="/hub/plan-usage"
                title={t("nav.plan-usage")}
                className="hidden rounded-full border border-black/[.08] bg-white px-2.5 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-wide text-mid no-underline hover:text-blue md:inline-flex"
              >
                {PLAN_LABEL[user.plan]}
              </Link>
              <LanguageMenu />
              <AccountMenu user={user} admin={admin} />
            </div>
          </header>

          <main id="main-content" className="flex-1 px-4 pb-28 pt-5 transition-opacity duration-300 sm:px-6 lg:px-8 lg:pb-10 lg:pt-7">
            <div key={pathname} className="aq-page mx-auto w-full max-w-[1440px]">
              {children}
            </div>
          </main>
        </div>
      </div>

      <AquibotDock open={dockOpen} />

      <nav aria-label="Quick menu" className="aq-glass aq-safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t border-black/[.08] px-1 pt-1.5 lg:hidden">
        {tabs.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              data-tour={item.key}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1 text-[10.5px] font-semibold no-underline ${active ? "text-blue" : "text-dim"}`}
            >
              {Icon === "aquibot" ? <AquibotAvatar size={24} /> : <Icon className="h-6 w-6" strokeWidth={active ? 2.3 : 1.8} />}
              {item.key === "telex" ? t("short.telex") : t(`nav.${item.key}`)}
            </Link>
          );
        })}
        <button type="button" onClick={() => setDrawer(true)} className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1 text-[10.5px] font-semibold text-dim">
          <MoreHorizontal className="h-6 w-6" strokeWidth={1.8} />
          {t("top.more")}
        </button>
      </nav>

      {drawer ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t("top.menu")}>
          <button type="button" aria-label="Close menu" className="aq-backdrop absolute inset-0 cursor-default bg-[#0b1e2d]/45" onClick={() => setDrawer(false)} />
          <div className="aq-drawer aq-rail absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col shadow-2xl">
            <div className="flex h-14 shrink-0 items-center justify-between px-4">
              <Brand />
              <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavList pathname={pathname} collapsed={false} admin={admin} unlocked={unlocked} onNavigate={() => setDrawer(false)} />
            <div className="aq-safe-bottom shrink-0 border-t border-black/[.06] px-4 pt-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#5789b0] to-[#1e405f] text-[12px] font-bold text-white">
                  {initials(user.name)}
                </span>
                <div translate="no" className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-ink">{user.name}</p>
                  <p className="truncate font-mono text-[10.5px] uppercase tracking-wide text-dim">{PLAN_LABEL[user.plan]}</p>
                </div>
                <form action="/api/logout" method="post">
                  <button type="submit" className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold text-danger hover:bg-red-50">
                    <LogOut className="h-4 w-4" /> {t("top.signOut")}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Tour />
      <CommandPalette items={palette} />
      <AutoTranslate />
    </div>
  );
}
