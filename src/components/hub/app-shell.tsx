"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpenCheck, ChevronDown, ChevronRight, CreditCard, Crown, LayoutDashboard, Lock, LogOut, Menu, MoreHorizontal, Search, SlidersHorizontal, Sparkles, UserCircle, X } from "lucide-react";
import { AquibotAvatar } from "@/components/app/aquibot-avatar";
import { AutoTranslate } from "@/components/app/auto-translate";
import { toggleAquibot, useAquibotDock } from "@/components/app/aquibot-dock-store";
import { CommandPalette, openPalette, type PaletteItem } from "@/components/app/command-palette";
import { useI18n } from "@/components/app/i18n";
import { InfoTip } from "@/components/app/info-tip";
import { LanguageMenu } from "@/components/app/language-menu";
import { NavHoverCard } from "@/components/app/nav-hover-card";
import { startTour, Tour } from "@/components/app/tour";
import { AquibotDock } from "@/components/hub/aquibot-dock";
import { HubTabs } from "@/components/hub/hub-tabs";
import { ADMIN_LINK, hasPaidPages, HUB_NAV, isActive, navFor, pageTitle, SECTIONS, tabKeysFor, tabsFor, TOUR_STOPS, type HubNavItem } from "@/components/hub/nav";
import { PLAN_LABEL } from "@/lib/aq-modules/types";
import { initials, type SessionUser } from "@/lib/session-shared";

function NavIcon({ item, locked = false }: { item: HubNavItem; locked?: boolean }) {
  if (item.icon === "aquibot") return <AquibotAvatar size={22} />;
  const Icon = item.icon;
  return <Icon className={`h-5 w-5 shrink-0 ${locked ? "opacity-45" : ""}`} strokeWidth={1.75} aria-hidden />;
}

function Brand() {
  return (
    <Link href="/hub" aria-label="Aquifert home" className="flex items-center no-underline transition-opacity hover:opacity-80">
      <Image src="/brand/logo.png" alt="Aquifert" width={784} height={209} className="h-8 w-auto" />
    </Link>
  );
}

const SECTION_KEY: Record<string, string> = { "AQ ONE": "aq1", Plans: "plans", "AQ Analytics": "analytics", Help: "help", You: "you" };
const SECTION_NOTE: Partial<Record<string, string>> = { "AQ ONE": "note.aq1", "AQ Analytics": "note.analytics" };

function NavList({
  pathname,
  collapsed,
  items,
  admin,
  unlocked,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  items: HubNavItem[];
  admin: boolean;
  unlocked: string[];
  onNavigate?: () => void;
}) {
  const { t } = useI18n();
  return (
    <nav aria-label="Hub" className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4 pt-2">
      {SECTIONS.filter((section) => items.some((item) => item.section === section) || (section === "You" && admin)).map((section, index) => (
        <div key={section} className="flex flex-col gap-0.5" aria-label={section}>
          {collapsed ? (
            index === 0 ? null : <div className="mx-auto mb-1 h-px w-6 bg-black/[.07]" />
          ) : section === "Main" ? null : (
            <div className={`px-2.5 pb-1 ${index === 0 ? "pt-1" : "mt-1 border-t border-black/[.06] pt-3"}`}>
              <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-teal-700">{t(`section.${SECTION_KEY[section]}`)}</p>
              {SECTION_NOTE[section] ? <p className="mt-0.5 text-[12px] text-dim">{t(SECTION_NOTE[section])}</p> : null}
            </div>
          )}
          {items.filter((item) => item.section === section).map((item) => {
            const active = isActive(pathname, item.href);
            const locked = Boolean(item.module && !unlocked.includes(item.module));
            const label = t(`nav.${item.key}`);
            if (item.promo) {
              return (
                <NavHoverCard key={item.key} label={label} headline={item.promo.headline} line={item.promo.line} href={item.href} cta="View membership">
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-label={collapsed ? label : undefined}
                    className={`aq-nav-link group flex items-center gap-3 rounded-xl py-[9px] text-[15px] font-medium text-ink/85 no-underline transition-colors hover:bg-white/70 hover:text-ink ${
                      collapsed ? "justify-center px-0" : "px-3"
                    }`}
                  >
                    <NavIcon item={item} />
                    {collapsed ? null : (
                      <span className="min-w-0 flex-1 leading-snug">
                        <span className="block">{label}</span>
                        {onNavigate ? <span className="mt-0.5 block text-[12.5px] font-normal text-dim">{item.promo.headline}</span> : null}
                      </span>
                    )}
                    {collapsed ? null : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-dim opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden />
                    )}
                  </Link>
                </NavHoverCard>
              );
            }
            return (
              <div key={item.key} data-tour={item.key} className="group relative flex items-center">
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? `${label}${locked ? " (locked)" : ""}` : undefined}
                  aria-current={active ? "page" : undefined}
                  className={`aq-nav-link flex min-w-0 flex-1 items-center gap-3 rounded-xl py-[9px] text-[15px] no-underline transition-colors ${
                    collapsed ? "justify-center px-0" : "px-3 pr-8"
                  } ${active ? "bg-white font-semibold text-ink shadow-[0_1px_2px_rgb(16_38_59/0.08)]" : "font-medium text-ink/85 hover:bg-white/70 hover:text-ink"}`}
                >
                  <NavIcon item={item} locked={locked} />
                  {collapsed ? null : <span className="line-clamp-2 min-w-0 flex-1 leading-snug">{label}</span>}
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
              className={`aq-nav-link flex items-center gap-3 rounded-xl py-[9px] text-[15px] font-medium text-ink/85 no-underline transition-colors hover:bg-white/70 hover:text-ink ${
                collapsed ? "justify-center px-0" : "px-3"
              }`}
            >
              <ADMIN_LINK.icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
              {collapsed ? null : <span className="truncate">{t("top.admin")}</span>}
            </Link>
          ) : null}
        </div>
      ))}
    </nav>
  );
}

function AccountMenu({ user, admin, paid }: { user: SessionUser; admin: boolean; paid: boolean }) {
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

  const item = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[15px] font-medium text-ink no-underline hover:bg-s2";
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("top.account")}
        className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-white/10 sm:pr-2"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#5789b0] to-[#1e405f] text-[12.5px] font-bold text-white shadow-sm ring-1 ring-white/20">
          {initials(user.name)}
        </span>
        <ChevronDown className={`hidden h-3.5 w-3.5 text-white/60 transition-transform sm:block ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div role="menu" className="aq-drop aq-float absolute end-0 top-[calc(100%+8px)] z-50 w-64 rounded-2xl border border-border bg-white p-1.5">
          <div translate="no" className="px-2.5 pb-2.5 pt-2">
            <p className="truncate text-[15.5px] font-semibold text-ink">{user.name}</p>
            <p className="truncate text-[13px] text-dim">{user.email}</p>
            <span className="mt-2 inline-flex rounded-full bg-blue-light px-2 py-0.5 font-mono text-[11.5px] font-semibold uppercase tracking-wide text-blue">
              {PLAN_LABEL[user.plan]}
            </span>
          </div>
          <div className="h-px bg-border" />
          <div className="py-1">
            {paid ? (
              <Link href="/hub/dashboard" role="menuitem" className={item} onClick={() => setOpen(false)}>
                <LayoutDashboard className="h-4 w-4 text-mid" /> {t("nav.dashboard")}
              </Link>
            ) : null}
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

function Masthead({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-8 lg:py-4">
      <Link href="/hub" className="block text-white no-underline transition-opacity hover:opacity-85">
        <span className="block text-[20px] font-bold leading-tight tracking-tight lg:text-[26px]">Aquifert ONE</span>
        <span className="block text-[12.5px] leading-tight text-slate-300 lg:text-[14px]">{t("top.tagline")}</span>
      </Link>
      <div className="hidden items-center gap-3 text-right md:flex">
        <span className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.14em] text-teal-300">{t("top.portal")}</span>
        <span className="text-[13px] text-slate-300" suppressHydrationWarning>
          {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>
    </div>
  );
}

const NAVY = "bg-gradient-to-r from-[#0C1C2E] via-[#16324F] to-[#1E4265] text-white";

export function AppShell({
  user,
  admin = false,
  unlocked = [],
  ticker,
  children,
}: {
  user: SessionUser;
  admin?: boolean;
  unlocked?: string[];
  ticker?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [drawer, setDrawer] = useState(false);
  const onAquibotPage = isActive(pathname, "/hub/aquibot");
  const dockOpen = useAquibotDock().open && !onAquibotPage;
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

  const nav = useMemo(() => navFor(user.plan, admin), [user.plan, admin]);
  const hubTabs = useMemo(() => tabsFor(nav, unlocked), [nav, unlocked]);
  const tourStops = useMemo(() => TOUR_STOPS.filter((stop) => nav.some((item) => item.key === stop.key)), [nav]);

  const palette = useMemo<PaletteItem[]>(() => {
    const pages: PaletteItem[] = nav.map((item) => ({
      href: item.href,
      label: item.module && !unlocked.includes(item.module) ? `${t(`nav.${item.key}`)} (locked)` : t(`nav.${item.key}`),
      group: item.section === "You" ? "Account" : item.section === "Main" ? "Go to" : item.section,
      hint: item.tip.split(". ")[0],
      icon: item.icon === "aquibot" ? <AquibotAvatar size={20} /> : <item.icon />,
    }));
    const account: PaletteItem[] = [
      { href: "/hub/account/profile", label: "Profile details", group: "Account", icon: <UserCircle /> },
      { href: "/hub/account/password", label: "Change password", group: "Account", icon: <UserCircle /> },
      { href: "/hub/account/usage", label: t("nav.plan-usage"), group: "Account", icon: <SlidersHorizontal /> },
      { href: "/hub/account/membership", label: t("nav.membership"), group: "Account", icon: <Crown /> },
      { href: "/hub/account/billing", label: t("nav.billing"), group: "Account", icon: <CreditCard /> },
      { href: "#tour", label: t("top.tour"), group: "Help", icon: <Sparkles />, action: startTour },
    ];
    return [...pages, ...account, ...(admin ? [{ href: "/admin", label: t("top.admin"), group: "Help", icon: <ADMIN_LINK.icon /> }] : [])];
  }, [nav, admin, unlocked, t]);

  const tabs = tabKeysFor(user.plan, admin).map((key) => HUB_NAV.find((item) => item.key === key)!);

  return (
    <div className="aq-app aq-frame h-dvh overflow-hidden lg:p-2.5 xl:flex xl:gap-2.5">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[99] focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <div className="flex h-full min-w-0 flex-col overflow-hidden lg:rounded-[22px] lg:shadow-[0_24px_64px_-24px_rgb(0_0_0/0.55)] xl:flex-1">
        <div className="aq-masthead relative z-30 shrink-0">
          <header className={`flex h-14 items-center gap-2 border-b border-white/10 px-3 sm:px-5 lg:h-[72px] ${NAVY}`}>
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label={t("top.menu")}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/hub" aria-label="Aquifert home" className="shrink-0 no-underline transition-opacity hover:opacity-85">
              <Image src="/brand/logo-v2-light.png" alt="Aquifert" width={814} height={214} className="h-7 w-auto lg:h-10" priority />
            </Link>
            <div className="ms-2 hidden min-w-0 items-center gap-2 text-[14.5px] lg:flex" aria-label="Current page">
              <span className="text-slate-300">Aquifert ONE</span>
              <span className="text-white/40">/</span>
              <span className="truncate font-semibold text-white">{title}</span>
              <Link
                href="/hub/account/usage"
                title={t("nav.plan-usage")}
                className="ms-1 inline-flex shrink-0 items-center rounded-full border border-teal-400/30 bg-teal-400/10 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-teal-200 no-underline hover:bg-teal-400/20"
              >
                {PLAN_LABEL[user.plan]}
              </Link>
            </div>

            <div className="ms-auto flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={openPalette}
                aria-label="Search"
                className="hidden h-9 w-56 items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-3.5 text-[14px] text-white/70 transition hover:bg-white/10 md:flex xl:w-60"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="flex-1 truncate text-start">{t("top.search")}</span>
                <kbd className="rounded border border-white/15 px-1 font-mono text-[10.5px] font-semibold text-white/50">Ctrl K</kbd>
              </button>
              <button type="button" onClick={openPalette} aria-label="Search" className="flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10 md:hidden">
                <Search className="h-[18px] w-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => (onAquibotPage ? document.getElementById("aquibot-input")?.focus() : toggleAquibot())}
                aria-expanded={dockOpen}
                aria-controls="aquibot-dock"
                className={`aq-ai-pill hidden h-9 items-center gap-1.5 rounded-full pl-1 pr-3.5 text-[13.5px] font-semibold shadow-[0_6px_16px_-8px_rgb(0_0_0/0.6)] transition hover:brightness-110 sm:inline-flex ${
                  dockOpen ? "ring-2 ring-white/40 ring-offset-2 ring-offset-[#16324F]" : ""
                }`}
              >
                <AquibotAvatar size={28} active={dockOpen} />
                {t("top.askAquibot")}
              </button>
              <LanguageMenu dark />
              <AccountMenu user={user} admin={admin} paid={hasPaidPages(user.plan, admin)} />
            </div>
          </header>
          <div className={`hidden lg:block ${NAVY}`}>
            <Masthead t={t} />
            <HubTabs tabs={hubTabs} pathname={pathname} />
          </div>
          <div className="hidden lg:block">{ticker}</div>
        </div>

        <div id="aq-scroll" className="aq-canvas relative flex min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          <div className="lg:hidden">
            <div className={NAVY}>
              <Masthead t={t} />
            </div>
            {ticker}
          </div>

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
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-1 text-[11.5px] font-semibold leading-tight no-underline ${active ? "text-blue" : "text-dim"}`}
            >
              {Icon === "aquibot" ? <AquibotAvatar size={24} active={active} /> : <Icon className="h-6 w-6" strokeWidth={active ? 2.3 : 1.8} />}
              <span className="block max-w-full truncate px-0.5" translate={item.key === "aquibot" ? "no" : undefined}>
                {item.key === "aquibot" ? "Aquibot" : item.key === "telex" || item.key === "library" ? t(`short.${item.key}`) : t(`nav.${item.key}`)}
              </span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setDrawer(true)} className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-1 text-[11.5px] font-semibold leading-tight text-dim">
          <MoreHorizontal className="h-6 w-6" strokeWidth={1.8} />
          <span className="block max-w-full truncate px-0.5">{t("top.more")}</span>
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
            <NavList pathname={pathname} collapsed={false} items={nav} admin={admin} unlocked={unlocked} onNavigate={() => setDrawer(false)} />
            <div className="aq-safe-bottom shrink-0 border-t border-black/[.06] px-4 pt-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#5789b0] to-[#1e405f] text-[13px] font-bold text-white">
                  {initials(user.name)}
                </span>
                <div translate="no" className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-ink">{user.name}</p>
                  <p className="truncate font-mono text-[11.5px] uppercase tracking-wide text-dim">{PLAN_LABEL[user.plan]}</p>
                </div>
                <form action="/api/logout" method="post">
                  <button type="submit" className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[13.5px] font-semibold text-danger hover:bg-red-50">
                    <LogOut className="h-4 w-4" /> {t("top.signOut")}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Tour stops={tourStops} />
      <CommandPalette items={palette} />
      <AutoTranslate />
    </div>
  );
}
