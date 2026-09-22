import { useEffect, useMemo, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { useTheme } from "next-themes";
import {
  LayoutDashboard, MessageSquareText, ClipboardList, KanbanSquare, PackageCheck,
  Ship, LineChart, Users, Landmark, Home, PlusCircle, FileText, Package,
  Crown, Inbox, Wallet, Building2, Moon, Sun, LogOut, Menu, X, ChevronDown,
  ChevronsLeft, ChevronsRight, RefreshCcw, Languages, FlaskConical,
  ArrowLeftRight, ShieldCheck, Radio, Bot, Lock, BookOpen, FileUp,
  Newspaper, Gauge, Calculator, ShoppingCart, PhoneCall, BookOpenCheck, Mail, SlidersHorizontal,
} from "lucide-react";
import { AQ1_MENU, type Aq1MenuKey } from "@contracts/aq1";
import { InfoTip } from "@/components/aq1/InfoTip";
import { useAq1Tips } from "@/components/aq1/tips";
import { Aq1Tour } from "@/components/aq1/Aq1Tour";
import { Aq1Promo } from "@/components/aq1/Aq1Promo";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { trpc } from "@/providers/trpc";
import { VerifyEmailBanner } from "@/components/VerifyEmailBanner";
import { Logo, LogoMark } from "@/components/shared/Logo";
import { Tip } from "@/components/shared/Tip";
import { NotificationsBell } from "@/components/shared/NotificationsBell";
import { MembershipBadge } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

type NavItem = { to: string; label: string; icon: ReactNode; roles?: string[]; membersOnly?: boolean; tier2Only?: boolean };

const STAFF_NAV: NavItem[] = [
  { to: "/hub", label: "Hub", icon: <Radio className="h-4 w-4" /> },
  { to: "/library", label: "Library", icon: <BookOpen className="h-4 w-4" /> },
  { to: "/admin", label: "Command Center", icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: "/admin/communications", label: "AI Communications", icon: <MessageSquareText className="h-4 w-4" /> },
  { to: "/admin/requests", label: "Requests", icon: <ClipboardList className="h-4 w-4" /> },
  { to: "/admin/drafts", label: "Draft Queue", icon: <KanbanSquare className="h-4 w-4" /> },
  { to: "/admin/orders", label: "Orders", icon: <PackageCheck className="h-4 w-4" /> },
  { to: "/admin/trades", label: "Trade Desk", icon: <ArrowLeftRight className="h-4 w-4" /> },
  { to: "/admin/documents", label: "Document Control", icon: <ShieldCheck className="h-4 w-4" /> },
  { to: "/admin/tracking", label: "Logistics Tracker", icon: <Ship className="h-4 w-4" /> },
  { to: "/admin/insights", label: "Market Insights", icon: <LineChart className="h-4 w-4" /> },
  { to: "/admin/library", label: "Library Admin", icon: <FileUp className="h-4 w-4" /> },
  { to: "/admin/users", label: "Users", icon: <Users className="h-4 w-4" />, roles: ["ADMIN"] },
  { to: "/admin/finance", label: "Finance", icon: <Landmark className="h-4 w-4" />, roles: ["ADMIN", "FINANCE"] },
  { to: "/admin/aq1", label: "AQ1 Free Plan", icon: <Gauge className="h-4 w-4" /> },
  { to: "/aquibot", label: "Aquibot", icon: <Bot className="h-4 w-4" /> },
];

const BUYER_NAV: NavItem[] = [
  { to: "/hub", label: "Hub", icon: <Radio className="h-4 w-4" /> },
  { to: "/library", label: "Library", icon: <BookOpen className="h-4 w-4" /> },
  { to: "/buyer", label: "Dashboard", icon: <Home className="h-4 w-4" /> },
  { to: "/buyer/request", label: "New Request", icon: <PlusCircle className="h-4 w-4" />, membersOnly: true },
  { to: "/buyer/quotes", label: "Quotes & Invoices", icon: <FileText className="h-4 w-4" />, membersOnly: true },
  { to: "/buyer/orders", label: "Orders", icon: <Package className="h-4 w-4" />, membersOnly: true },
  { to: "/nitrogen-report", label: "Nitrogen Report", icon: <FlaskConical className="h-4 w-4" /> },
  { to: "/aquibot", label: "Aquibot", icon: <Bot className="h-4 w-4" /> },
  { to: "/buyer/insights", label: "Market Insights", icon: <LineChart className="h-4 w-4" />, membersOnly: true },
  { to: "/buyer/financing", label: "Financing", icon: <Landmark className="h-4 w-4" />, membersOnly: true },
  { to: "/buyer/membership", label: "Membership", icon: <Crown className="h-4 w-4" /> },
];

const SUPPLIER_NAV: NavItem[] = [
  { to: "/hub", label: "Hub", icon: <Radio className="h-4 w-4" /> },
  { to: "/library", label: "Library", icon: <BookOpen className="h-4 w-4" /> },
  { to: "/supplier", label: "Dashboard", icon: <Home className="h-4 w-4" /> },
  { to: "/supplier/requests", label: "Request Inbox", icon: <Inbox className="h-4 w-4" /> },
  { to: "/supplier/orders", label: "Active Orders", icon: <Package className="h-4 w-4" /> },
  { to: "/supplier/earnings", label: "Earnings", icon: <Wallet className="h-4 w-4" /> },
  { to: "/supplier/profile", label: "Profile", icon: <Building2 className="h-4 w-4" /> },
  { to: "/aquibot", label: "Aquibot", icon: <Bot className="h-4 w-4" /> },
];

export function portalHome(role?: string | null) {
  if (!role) return "/onboarding";
  if (["ADMIN", "OPERATIONS", "FINANCE", "SUPPORT"].includes(role)) return "/admin";
  if (role === "BUYER") return "/buyer";
  return "/supplier";
}

function navForRole(role: string | null | undefined) {
  if (!role) return [];
  if (["ADMIN", "OPERATIONS", "FINANCE", "SUPPORT"].includes(role)) return STAFF_NAV;
  if (role === "BUYER") return BUYER_NAV;
  return SUPPLIER_NAV;
}

const AQ1_ICONS: Record<Aq1MenuKey, ReactNode> = {
  telex: <Radio className="h-4 w-4" />,
  analysis: <Newspaper className="h-4 w-4" />,
  signal: <Gauge className="h-4 w-4" />,
  nitrogen: <FlaskConical className="h-4 w-4" />,
  library: <BookOpen className="h-4 w-4" />,
  ureaCalc: <Calculator className="h-4 w-4" />,
  freightAnalytics: <Ship className="h-4 w-4" />,
  orderNow: <ShoppingCart className="h-4 w-4" />,
  communityCall: <PhoneCall className="h-4 w-4" />,
  userGuide: <BookOpenCheck className="h-4 w-4" />,
  contact: <Mail className="h-4 w-4" />,
};

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="hidden md:inline-flex items-center gap-1.5 font-data text-xs text-muted-foreground tabular-nums">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 aqf-pulse-dot" />
      {now.toLocaleTimeString("en-GB")}
    </span>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Tip label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle dark mode"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      >
        {resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>
    </Tip>
  );
}

function PersonaSwitcher() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { data: personas } = trpc.profile.personas.useQuery();
  const select = trpc.profile.selectPersona.useMutation({
    onSuccess: async (r) => {
      await utils.invalidate();
      toast.success(`Switched to ${r.persona.name}`);
      navigate(portalHome(r.persona.portalRole));
    },
    onError: () => toast.error("Could not switch persona"),
  });
  return (
    <>
      {(personas ?? []).map((p) => (
        <DropdownMenuItem key={p.key} onClick={() => select.mutate({ unionId: p.unionId })} disabled={select.isPending}>
          <RefreshCcw className="mr-2 h-3.5 w-3.5" />
          {p.label}
        </DropdownMenuItem>
      ))}
    </>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const { user, membership, portalRole, isPersona, isMember } = useProfile();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tourRestart, setTourRestart] = useState(0);
  const tips = useAq1Tips();
  const { data: aq1Config } = trpc.aq1.config.useQuery(undefined, { staleTime: 60_000 });
  const aq1On = aq1Config?.enabled === true && portalRole === "BUYER";
  useEffect(() => {
    const onRestart = () => setTourRestart(1);
    window.addEventListener("aq1:restart-tour", onRestart);
    return () => window.removeEventListener("aq1:restart-tour", onRestart);
  }, []);
  const setLanguage = trpc.profile.setLanguage.useMutation({
    onSuccess: () => toast.success("Language updated / 语言已更新"),
  });
  const utils = trpc.useUtils();

  const nav = useMemo(() => {
    const items = navForRole(portalRole);
    return items.filter((i) => {
      if (i.roles && !i.roles.includes(portalRole ?? "")) return false;
      if (i.membersOnly && !isMember) return false;
      if (i.tier2Only && !(membership?.tier === "HARVEST" || membership?.tier === "SCALE")) return false;
      return true;
    });
  }, [portalRole, isMember, membership]);

  const isStaff = ["ADMIN", "OPERATIONS", "FINANCE", "SUPPORT"].includes(portalRole ?? "");
  const { data: libraryBadge } = trpc.library.unreadCount.useQuery(undefined, { staleTime: 60_000, retry: 1 });
  const initials = (user?.name ?? "U").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const pageTitle = nav.find((i) =>
    i.to === location.pathname ||
    (i.to !== "/hub" && i.to !== "/buyer" && i.to !== "/supplier" && i.to !== "/admin" && location.pathname.startsWith(i.to + "/"))
  )?.label ?? "Dashboard";

  const navContent = (onNavigate?: () => void) => (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {nav.map((item) => {
        const link = (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/admin" || item.to === "/buyer" || item.to === "/supplier"}
            onClick={onNavigate}
            className={({ isActive }) =>
              `relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-accent font-semibold text-navy-800 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-teal-500 dark:text-white dark:before:bg-teal-400"
                  : "font-medium text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              } ${collapsed ? "justify-center px-0 before:hidden" : ""}`
            }
            aria-label={item.label}
          >
            {item.icon}
            {!collapsed && <span className="truncate">{item.label}</span>}
            {!collapsed && item.to === "/library" && (libraryBadge?.count ?? 0) > 0 && (
              <span
                className="ml-auto rounded-full bg-teal-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
                aria-label={`${libraryBadge!.count} new reports in the Library`}
              >
                {libraryBadge!.count}
              </span>
            )}
          </NavLink>
        );
        return collapsed ? <Tip key={item.to} label={item.label} side="right">{link}</Tip> : link;
      })}
      {aq1On && (
        <div className="mt-4 border-t border-sidebar-border pt-3" aria-label="AQ1 free plan">
          {!collapsed && <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">AQ1 free plan</p>}
          {AQ1_MENU.map((m) => {
            const link = (
              <NavLink
                key={m.to}
                to={m.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `relative flex min-w-0 flex-1 items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-sidebar-accent font-semibold text-navy-800 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-teal-500 dark:text-white dark:before:bg-teal-400"
                      : "font-medium text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  } ${collapsed ? "justify-center px-0 before:hidden" : ""}`
                }
                aria-label={m.label}
              >
                {AQ1_ICONS[m.key]}
                {!collapsed && <span className="truncate">{m.label}</span>}
                {!collapsed && m.locked && <Lock className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Locked — upgrade available" />}
              </NavLink>
            );
            return (
              <div key={m.key} className="flex items-center" data-tour={m.key}>
                {collapsed ? <Tip label={m.label} side="right">{link}</Tip> : link}
                {!collapsed && <InfoTip label={m.label} text={tips[m.key]} />}
              </div>
            );
          })}
          <NavLink
            to="/account/plan"
            onClick={onNavigate}
            className={({ isActive }) =>
              `relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-accent font-semibold text-navy-800 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-teal-500 dark:text-white dark:before:bg-teal-400"
                  : "font-medium text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              } ${collapsed ? "justify-center px-0 before:hidden" : ""}`
            }
            aria-label="Plan & Usage"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {!collapsed && <span className="truncate">Plan & Usage</span>}
          </NavLink>
        </div>
      )}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[80] focus:rounded-md focus:bg-navy-700 focus:px-3 focus:py-2 focus:text-sm focus:text-white">
        Skip to content
      </a>
      {/* Desktop sidebar */}
      <aside
        className={`aqf-sidebar hidden lg:flex flex-col border-r border-sidebar-border bg-sidebar-background transition-all duration-200 ${
          collapsed ? "w-[72px]" : "w-[280px]"
        } fixed inset-y-0 z-30 shadow-[8px_0_32px_-16px_rgb(0_0_0/0.45)]`}
      >
        <div className={`flex h-16 items-center border-b border-sidebar-border ${collapsed ? "justify-center" : "px-5"}`}>
          {collapsed ? (
            <NavLink to="/" aria-label="Aquifert home" title="Aquifert home" className="transition-opacity hover:opacity-80">
              <span className="aqf-rail-logo"><LogoMark size={26} /></span>
            </NavLink>
          ) : (
            <div className="flex items-center justify-between w-full">
              <NavLink to="/" aria-label="Aquifert home" className="transition-opacity hover:opacity-80">
                <span className="aqf-rail-logo"><Logo size={30} /></span>
              </NavLink>
            </div>
          )}
        </div>
        {navContent()}
        <div className="border-t border-sidebar-border p-3">
          <Tip label={collapsed ? "Expand sidebar" : "Collapse sidebar"} side="right">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors"
              aria-label="Collapse sidebar"
            >
              {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse</>}
            </button>
          </Tip>
        </div>
      </aside>

      {/* Main column */}
      <div className={`flex min-h-screen min-w-0 flex-1 flex-col transition-all duration-200 ${collapsed ? "lg:pl-[72px]" : "lg:pl-[280px]"}`}>
        <VerifyEmailBanner />
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-card/85 px-4 backdrop-blur">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" title="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] bg-sidebar-background p-0 text-sidebar-foreground">
              <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
                <NavLink to="/" aria-label="Aquifert home" onClick={() => setMobileOpen(false)} className="transition-opacity hover:opacity-80">
                  <span className="aqf-rail-logo"><Logo size={30} /></span>
                </NavLink>
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close menu" className="text-sidebar-foreground">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              {navContent(() => setMobileOpen(false))}
            </SheetContent>
          </Sheet>

          <div className="lg:hidden">
            <NavLink to="/" aria-label="Aquifert home" className="transition-opacity hover:opacity-80">
              <Logo size={26} />
            </NavLink>
          </div>

          {/* Command-bar page context */}
          <div className="hidden lg:flex items-center gap-2 text-sm" aria-label="Current page">
            <span className="text-muted-foreground">Aquifert ONE</span>
            <span className="text-muted-foreground/60">/</span>
            <span className="font-semibold text-foreground">{pageTitle}</span>
            {!isMember && portalRole === "BUYER" && (
              <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                <Lock className="h-2.5 w-2.5" /> Free plan
              </span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {isStaff && <LiveClock />}
            {isPersona && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                <FlaskConical className="h-3 w-3" /> Demo: {portalRole}
              </span>
            )}
            {portalRole === "SUPPLIER" && (
              <Tip label={user?.language === "ZH" ? "Switch to English" : "切换到中文"}>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Toggle language"
                  onClick={async () => {
                    await setLanguage.mutateAsync({ language: user?.language === "ZH" ? "EN" : "ZH" });
                    utils.profile.me.invalidate();
                  }}
                >
                  <Languages className="h-5 w-5" />
                </Button>
              </Tip>
            )}
            <ThemeToggle />
            <NotificationsBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-muted transition-colors" aria-label="Account menu" title="Account & demo portals">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-navy-400 to-navy-700 text-xs font-bold text-white aqf-chip-3d">
                    {initials}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{user?.name}</span>
                    <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
                    <div className="mt-1.5 flex gap-1.5">
                      <span className="rounded-full bg-navy-600/10 px-2 py-0.5 text-[10px] font-semibold text-navy-600 dark:text-navy-200">
                        {portalRole}
                      </span>
                      {membership && <MembershipBadge tier={membership.tier} />}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Switch demo portal
                </DropdownMenuLabel>
                <PersonaSwitcher />
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-danger focus:text-danger">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main id="main-content" className="aqf-page flex-1 px-4 py-6 sm:px-6 lg:px-8 pb-24 lg:pb-10">{children}</main>
        {aq1On && <Aq1Tour forceStart={tourRestart} onDone={() => setTourRestart(0)} />}
        {aq1On && <Aq1Promo />}

        {/* Mobile bottom tab bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-border bg-card/95 backdrop-blur lg:hidden">
          {nav.slice(0, 5).map((item) => {
            const active = location.pathname === item.to || (item.to !== "/buyer" && item.to !== "/admin" && item.to !== "/supplier" && location.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
                  active ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground"
                }`}
              >
                {item.icon}
                <span className="truncate max-w-[64px]">{item.label.split(" ")[0]}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/** Route guard: authenticated + portal role + optional role restriction */
export function RequirePortal({
  allow,
  membersOnly = false,
  children,
}: {
  allow: string[];
  /** Buyer pages that require an active membership, non-members are sent to the Membership page. */
  membersOnly?: boolean;
  children: ReactNode;
}) {
  const { isAuthenticated, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const { portalRole, isMember, isLoading } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && portalRole === null && isAuthenticated) {
      navigate("/onboarding", { replace: true });
    } else if (!isLoading && portalRole && !allow.includes(portalRole)) {
      navigate(portalHome(portalRole), { replace: true });
    } else if (!isLoading && membersOnly && portalRole === "BUYER" && !isMember) {
      navigate("/buyer/membership", { replace: true });
    }
  }, [isLoading, portalRole, allow, isAuthenticated, isMember, membersOnly, navigate]);

  if (authLoading || isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
        <div className="aqf-drop-pulse">
          <LogoMark size={72} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-semibold text-foreground">Loading your workspace…</p>
          <div className="h-1 w-40 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/2 animate-[aqf-shimmer_1.2s_linear_infinite] rounded-full bg-gradient-to-r from-transparent via-teal-400 to-transparent bg-[length:200px_100%]" />
          </div>
        </div>
      </div>
    );
  }
  if (!portalRole || !allow.includes(portalRole)) return null;
  if (membersOnly && portalRole === "BUYER" && !isMember) return null;
  return <AppLayout>{children}</AppLayout>;
}
