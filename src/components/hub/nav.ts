import {
  Activity,
  ArrowLeftRight,
  Bell,
  BookOpenText,
  Calculator,
  ChartLine,
  CircleUser,
  Crown,
  FileText,
  FlaskConical,
  Globe,
  House,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Newspaper,
  PhoneCall,
  Radio,
  RadioTower,
  Scale,
  ShieldCheck,
  Ship,
  ShoppingCart,
  SlidersHorizontal,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { ModuleKey } from "@/lib/aq-modules/types";
import type { Plan } from "@/lib/session-shared";

export type HubSection = "Main" | "AQ ONE" | "Plans" | "AQ Analytics" | "Help" | "You";

export type HubNavItem = {
  key: string;
  href: string;
  label: string;
  /** One-word label for the phone tab bar. */
  short: string;
  icon: LucideIcon | "aquibot";
  section: HubSection;
  tip: string;
  /** Locked until the member's plan unlocks this module. */
  module?: ModuleKey;
  /** Hidden from members on the free AQ ONE plan. */
  paidOnly?: boolean;
  /** Kept out of every menu until the feature launches. The page itself still exists. */
  hidden?: boolean;
  /** Plan entry: hovering the row opens a card with this pitch instead of the ⓘ tip. */
  promo?: { headline: string; line?: string };
};

export const HUB_NAV: HubNavItem[] = [
  {
    key: "dashboard",
    href: "/hub/dashboard",
    label: "Dashboard",
    short: "Dashboard",
    icon: LayoutDashboard,
    section: "Main",
    paidOnly: true,
    tip: "Your day at a glance: ask Aquibot, see your usage and recent requests, the latest Telex with what moved, and a plain-language briefing tuned to how you buy.",
  },

  {
    key: "home",
    href: "/hub",
    label: "Hub",
    short: "Hub",
    icon: House,
    section: "AQ ONE",
    tip: "The market desk: the Telex feed and top stories, the market ticker for nitrogen, phosphate and potash, market analysis and the paper forward curve.",
  },
  {
    key: "library",
    href: "/hub/library",
    label: "Library - Reports & Analysis",
    short: "Library",
    icon: BookOpenText,
    section: "AQ ONE",
    tip: "Every weekly report and research note the desk has published. Filter by collection, year or access, read the summary and open the file in one click.",
  },
  {
    key: "aquibot",
    href: "/hub/aquibot",
    label: "Aquibot Trader AI",
    short: "Aquibot",
    icon: "aquibot",
    section: "AQ ONE",
    tip: "Ask Aquibot about the market in plain English. It answers from Aquifert's own Telex, reports and price records, and keeps your chats so you can pick up where you left off.",
  },
  {
    key: "analysis",
    href: "/hub/analysis",
    label: "AQ View",
    short: "AQ View",
    icon: Newspaper,
    section: "AQ ONE",
    tip: "The desk's interpretation, separate from the Telex: what a move means for buyers and what to watch next.",
  },
  {
    key: "telex",
    href: "/hub/telex",
    label: "TELEX",
    short: "TELEX",
    icon: Radio,
    section: "AQ ONE",
    tip: "Desk-issued market flashes, newest first, grouped by day. Filter by product and save the filter as your default so the feed opens on what you trade.",
  },
  {
    key: "nitrogen",
    href: "/hub/nitrogen-report",
    label: "Nitrogen Report",
    short: "Nitrogen",
    icon: FlaskConical,
    section: "AQ ONE",
    tip: "Answer four short sections about destination, volumes, crop and goals, and get a tailored nitrogen sourcing and agronomy report you can print or save as PDF.",
  },
  {
    key: "freight",
    href: "/hub/freight-calculator",
    label: "Freight Calculator",
    short: "Freight",
    icon: Calculator,
    section: "AQ ONE",
    tip: "Estimates the cost of moving a cargo between two ports from the vessel, route and live bunker and market data. Use it to sanity-check a freight quote before you accept it.",
  },
  {
    key: "netback",
    href: "/hub/netback",
    label: "Netback",
    short: "Netback",
    icon: ArrowLeftRight,
    section: "AQ ONE",
    tip: "Works out what a tonne of granular urea actually costs you landed, or what your farm-gate price implies back at FOB. It shows the full cost ladder and ranks which origin lands cheapest.",
  },
  {
    key: "tools",
    href: "/hub/tools",
    label: "AQ Trader Tools",
    short: "Tools",
    icon: Wrench,
    section: "AQ ONE",
    tip: "Interactive references: a world map of terminals and producers, a production cost calculator driven by gas, rock and sulphur prices, how each fertilizer is made, and a glossary.",
  },
  {
    key: "order",
    href: "/hub/order-desk",
    label: "Buy Fertilizer",
    short: "Buy",
    icon: ShoppingCart,
    section: "AQ ONE",
    tip: "Register for Aquifert Zero, or tell the trading desk what you need, product, quantity, destination and target price, and get a quote back.",
  },
  {
    key: "call",
    href: "/hub/community-call",
    label: "Weekly Market Call",
    short: "Call",
    icon: PhoneCall,
    section: "AQ ONE",
    tip: "A free 45-minute market and freight call with the Aquifert desk. Register in one click, add it to your calendar and send in your questions.",
  },

  {
    key: "zero",
    href: "/hub/order-desk?tab=zero",
    label: "AQ Zero",
    short: "AQ Zero",
    icon: Globe,
    section: "Plans",
    promo: { headline: "Transparent Global Fertiliser Access" },
    tip: "Transparent Global Fertiliser Access. Register your interest on the Buy Fertilizer page.",
  },
  {
    key: "aq-analytics",
    href: "/hub/order-desk?tab=zero",
    label: "AQ Analytics",
    short: "Analytics",
    icon: ChartLine,
    section: "Plans",
    promo: { headline: "Advisory for the Global Market", line: "The trader working for you" },
    tip: "Advisory for the Global Market. The trader working for you. Register your interest on the Buy Fertilizer page.",
  },
  {
    key: "signal",
    href: "/hub/signal",
    label: "AQ Signal",
    short: "Signal",
    icon: Activity,
    section: "AQ ONE",
    hidden: true,
    tip: "Rolling 7, 30, 60 and 90-day windows on benchmark prices: start and current price, change, high and low, and a one-line summary of the window.",
  },
  {
    key: "freight-analytics",
    href: "/hub/freight-analytics",
    label: "Freight Analytics",
    short: "Freight",
    icon: Ship,
    section: "AQ ONE",
    module: "freight-analytics",
    hidden: true,
    tip: "Fixtures, lane benchmarks and freight commentary from AQ Analytics. Upgrade to unlock, or talk to the desk.",
  },

  {
    key: "a-telex",
    href: "/hub/analytics/telex",
    label: "AQ TELEX",
    short: "AQ Telex",
    icon: RadioTower,
    section: "AQ Analytics",
    module: "aq-telex",
    hidden: true,
    tip: "The full desk wire: every flash for every plan tier, searchable, with the complete archive.",
  },
  {
    key: "a-market",
    href: "/hub/analytics/market-data",
    label: "Market Data",
    short: "Data",
    icon: ChartLine,
    section: "AQ Analytics",
    module: "market-data",
    hidden: true,
    tip: "Benchmark price series for nitrogen, phosphate, potash and freight, charted and downloadable as CSV.",
  },
  {
    key: "a-signal",
    href: "/hub/analytics/signal",
    label: "AQ Signal",
    short: "Signal",
    icon: Activity,
    section: "AQ Analytics",
    module: "aq-signal-pro",
    hidden: true,
    tip: "Signal windows up to 180 days on every tracked series, with momentum, range position and the drivers behind each move.",
  },
  {
    key: "a-freight",
    href: "/hub/analytics/freight",
    label: "Freight Analytics",
    short: "Freight",
    icon: Ship,
    section: "AQ Analytics",
    module: "freight-analytics",
    hidden: true,
    tip: "Recent fertilizer fixtures, lane benchmarks and desk commentary on freight and vessel supply.",
  },
  {
    key: "a-sd",
    href: "/hub/analytics/supply-demand",
    label: "Supply & Demand",
    short: "S&D",
    icon: Scale,
    section: "AQ Analytics",
    module: "supply-demand",
    hidden: true,
    tip: "Balance sheets for the major nutrients: production, consumption, trade, stocks and the direction of travel.",
  },
  {
    key: "a-briefing",
    href: "/hub/analytics/briefing",
    label: "The Briefing",
    short: "Briefing",
    icon: FileText,
    section: "AQ Analytics",
    module: "briefing",
    hidden: true,
    tip: "The desk's weekly written briefing: what happened, why it matters and what to watch, with the full back catalogue.",
  },
  {
    key: "a-alerts",
    href: "/hub/analytics/alerts",
    label: "Alerts & Brief",
    short: "Alerts",
    icon: Bell,
    section: "AQ Analytics",
    module: "alerts",
    hidden: true,
    tip: "Set price alerts on the series you follow. Triggered alerts show on your dashboard every time the desk updates prices.",
  },

  {
    key: "guide",
    href: "/hub/guide",
    label: "User Guide",
    short: "Guide",
    icon: LifeBuoy,
    section: "Help",
    tip: "Step-by-step help for every part of Aquifert, including what each number means and how the calculators work. Start here if something isn't obvious.",
  },
  {
    key: "contact",
    href: "/hub/contact",
    label: "Contact Us",
    short: "Contact",
    icon: Mail,
    section: "Help",
    tip: "Reach the Aquifert desk by WhatsApp, a booked meeting or a message. Use this when you want a person rather than a screen.",
  },
  {
    key: "account",
    href: "/hub/account",
    label: "Account",
    short: "Account",
    icon: CircleUser,
    section: "You",
    tip: "Your profile and password, your plan and usage, membership, billing and the legal notices that apply to market data.",
  },
];

export const ADMIN_LINK = { href: "/admin", label: "Admin console", icon: ShieldCheck };

export type HubTabLink = { key: string; href: string; icon: HubNavItem["icon"]; locked: boolean; promo?: string };
export type HubTab = { key: string; tour?: string; links: HubTabLink[] };

/** Account pages that sit in the tab row but not in the menu list. */
const TAB_EXTRAS: Record<string, { href: string; icon: LucideIcon }> = {
  "plan-usage": { href: "/hub/account/usage", icon: SlidersHorizontal },
  membership: { href: "/hub/account/membership", icon: Crown },
};

/** Desktop tab row, left to right. A tab with one page is a plain link; more pages open a dropdown. */
const TAB_GROUPS: { key: string; items: string[] }[] = [
  { key: "dashboard", items: ["dashboard"] },
  { key: "home", items: ["home"] },
  { key: "nitrogen", items: ["nitrogen"] },
  { key: "library", items: ["library"] },
  { key: "aquibot", items: ["aquibot"] },
  { key: "telex-feed", items: ["telex", "analysis", "signal"] },
  { key: "netback", items: ["netback"] },
  { key: "freight-group", items: ["freight-analytics", "freight", "call"] },
  { key: "order-group", items: ["order", "tools", "guide", "contact"] },
  { key: "plans", items: ["plan-usage", "membership", "zero", "aq-analytics"] },
  { key: "analytics", items: ["a-telex", "a-market", "a-signal", "a-freight", "a-sd", "a-briefing", "a-alerts"] },
];

/** Tabs built from the member's own menu, so hidden and paid-only pages stay out exactly as they do in the drawer. */
export function tabsFor(nav: HubNavItem[], unlocked: string[]): HubTab[] {
  return TAB_GROUPS.map((group) => {
    const links = group.items.flatMap((key): HubTabLink[] => {
      const extra = TAB_EXTRAS[key];
      if (extra) return [{ key, href: extra.href, icon: extra.icon, locked: false }];
      const item = nav.find((entry) => entry.key === key);
      if (!item) return [];
      return [{ key, href: item.href, icon: item.icon, locked: Boolean(item.module && !unlocked.includes(item.module)), promo: item.promo?.headline }];
    });
    const tour = TOUR_STOPS.find((stop) => links.some((link) => link.key === stop.key))?.key;
    return { key: group.key, tour, links };
  }).filter((tab) => tab.links.length > 0);
}

export const SECTIONS: HubSection[] = ["Main", "AQ ONE", "Plans", "AQ Analytics", "Help", "You"];

export const hasPaidPages = (plan: Plan, admin: boolean) => admin || plan !== "core";

export function navFor(plan: Plan, admin: boolean) {
  const paid = hasPaidPages(plan, admin);
  return HUB_NAV.filter((item) => !item.hidden && (paid || !item.paidOnly));
}

/** Phone tab bar: the four most-used places plus "More", which opens the full menu. */
export function tabKeysFor(plan: Plan, admin: boolean) {
  return hasPaidPages(plan, admin) ? ["dashboard", "home", "telex", "aquibot"] : ["home", "library", "telex", "aquibot"];
}

export const TOUR_STOPS: { key: string; title: string; body: string }[] = [
  { key: "dashboard", title: "Dashboard", body: "Your day at a glance: usage, recent requests, the latest Telex and a briefing tuned to you." },
  { key: "home", title: "Hub", body: "The market desk: Telex, top stories and the market ticker show what moved overnight." },
  { key: "telex", title: "TELEX", body: "Desk flashes, newest first. Save a product filter as your default." },
  { key: "nitrogen", title: "Nitrogen Report", body: "Four short sections, one tailored nitrogen report you can keep." },
  { key: "netback", title: "Netback", body: "Work out your real landed cost, or what a farm-gate price implies at FOB." },
  { key: "a-telex", title: "AQ Analytics", body: "Deeper data and the full wire. A lock means your plan does not include it yet; open it to see how to unlock." },
  { key: "aquibot", title: "Aquibot Trader AI", body: "Ask anything about the market. You can replay this tour from the User Guide." },
];

const EXTRA_TITLES: [string, string][] = [
  ["/hub/account/profile", "Profile"],
  ["/hub/account/password", "Password"],
  ["/hub/account/legal", "Legal"],
  ["/hub/account/usage", "Plan & Usage"],
  ["/hub/account/membership", "Membership"],
  ["/hub/account/billing", "Billing"],
  ["/hub/voyage", "Voyage"],
];

const EXACT_TITLES: Record<string, string> = { "/hub/analytics": "AQ Analytics" };

export function isActive(pathname: string, href: string) {
  return href === "/hub" ? pathname === "/hub" : pathname === href || pathname.startsWith(`${href}/`);
}

export function pageTitle(pathname: string) {
  if (EXACT_TITLES[pathname]) return EXACT_TITLES[pathname];
  const extra = EXTRA_TITLES.find(([href]) => pathname.startsWith(href));
  if (extra) return extra[1];
  return HUB_NAV.find((item) => isActive(pathname, item.href))?.label ?? "Hub";
}
