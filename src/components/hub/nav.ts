import {
  Activity,
  ArrowLeftRight,
  Bell,
  BookOpenText,
  Calculator,
  ChartLine,
  CircleUser,
  ClipboardList,
  Factory,
  FileText,
  FlaskConical,
  Globe,
  House,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Map,
  Newspaper,
  PhoneCall,
  Radio,
  RadioTower,
  Scale,
  ShieldCheck,
  Ship,
  ShoppingCart,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { canSeeAqAnalytics } from "@/lib/aq-analytics-access";
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
  /** Shown to admins and to AQ Analytics and AQ ZERO members. */
  analyticsTool?: boolean;
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
    tip: "Answer six questions on one page about destination, products, tonnage, arrival and shipping, and get a branded AQ View nitrogen brief you can download as a PDF.",
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
    tip: "World map, cost calculator, how fertilisers are made and a glossary.",
  },
  {
    key: "order",
    href: "/hub/order-desk",
    label: "Buy Fertiliser",
    short: "Buy",
    icon: ShoppingCart,
    section: "AQ ONE",
    tip: "Register for Aquifert Zero, or tell the trading desk what you need and get a quote back.",
  },
  {
    key: "call",
    href: "/hub/community-call",
    label: "Market Call",
    short: "Call",
    icon: PhoneCall,
    section: "AQ ONE",
    tip: "A free 45-minute market and freight call with the Aquifert desk. Register once and we email you the joining link.",
  },

  {
    key: "zero",
    href: "/hub/plans/aq-zero",
    label: "AQ Zero",
    short: "AQ Zero",
    icon: Globe,
    section: "Plans",
    promo: { headline: "Transparent Global Fertiliser Access" },
    tip: "Transparent Global Fertiliser Access. Buy at supplier cost with a fixed operations fee, and register for the pilot.",
  },
  {
    key: "aq-analytics",
    href: "/hub/plans/aq-analytics",
    label: "AQ Analytics",
    short: "Analytics",
    icon: ChartLine,
    section: "Plans",
    promo: { headline: "Advisory for the Global Market", line: "The trader working for you" },
    tip: "Advisory for the Global Market. Trader-level analysis and licensed market data, with no physical trading.",
  },
  {
    key: "aa-map",
    href: "/hub/tools/analytics",
    label: "Intelligent Map",
    short: "Map",
    icon: Map,
    section: "AQ Analytics",
    analyticsTool: true,
    tip: "Where cargoes are moving, which origins are ahead or behind the five-year pace, and the lanes that connect them.",
  },
  {
    key: "aa-board",
    href: "/hub/tools/analytics/board",
    label: "Freight Board",
    short: "Board",
    icon: Ship,
    section: "AQ Analytics",
    analyticsTool: true,
    tip: "The freight board: volumes, stages and the lanes behind the map.",
  },
  {
    key: "aa-market",
    href: "/hub/tools/analytics/market",
    label: "My Market",
    short: "Market",
    icon: ChartLine,
    section: "AQ Analytics",
    analyticsTool: true,
    tip: "One destination in detail: pace against the five-year average, products and the cargoes pointed at it.",
  },
  {
    key: "aa-producers",
    href: "/hub/tools/analytics/producers",
    label: "Producers",
    short: "Producers",
    icon: Factory,
    section: "AQ Analytics",
    analyticsTool: true,
    tip: "Export origins and how much each one is shipping.",
  },
  {
    key: "aa-enquiries",
    href: "/hub/tools/analytics/enquiries",
    label: "Freight Enquiries",
    short: "Enquiries",
    icon: Inbox,
    section: "AQ Analytics",
    analyticsTool: true,
    tip: "Open freight enquiries, the vessel sizes they need and where they are in the desk.",
  },
  {
    key: "aa-reports",
    href: "/hub/tools/analytics/reports",
    label: "Reports",
    short: "Reports",
    icon: FileText,
    section: "AQ Analytics",
    analyticsTool: true,
    tip: "A market report from the latest enquiries, lineups, shipments and AQ View commentary.",
  },
  {
    key: "aa-alerts",
    href: "/hub/tools/analytics/alerts",
    label: "Alerts",
    short: "Alerts",
    icon: Bell,
    section: "AQ Analytics",
    analyticsTool: true,
    tip: "The markets you follow, and when the desk should tell you they moved.",
  },
  {
    key: "aa-plans",
    href: "/hub/tools/analytics/plans",
    label: "Plans",
    short: "Plans",
    icon: ClipboardList,
    section: "AQ Analytics",
    analyticsTool: true,
    tip: "Standard, Premium and Enterprise, and how to ask the desk for access.",
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
    tip: "Recent fertiliser fixtures, lane benchmarks and desk commentary on freight and vessel supply.",
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
    key: "trade",
    href: "/hub/trade",
    label: "Trades",
    short: "Trades",
    icon: ClipboardList,
    section: "Help",
    tip: "Your trades with Aquifert, and the documents for each one.",
  },
  {
    key: "contact",
    href: "/hub/contact",
    label: "Trade Desk",
    short: "Desk",
    icon: Mail,
    section: "Help",
    tip: "Reach the Aquifert Trade Desk by WhatsApp, a booked meeting or a message. Use this when you want a person rather than a screen.",
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

export type HubTabLink = { key: string; href: string; match?: string; icon: HubNavItem["icon"]; locked: boolean; promo?: string };
export type HubTab = { key: string; tour?: string; links: HubTabLink[] };

/** Desk pages that live under AQ Analytics, in menu order. They stay in the product's left menu, not the header. */
export const ANALYTICS_MENU_KEYS = ["aa-map", "aa-board", "aa-market", "aa-producers", "aa-enquiries", "aa-reports", "aa-alerts", "aa-plans"] as const;

/** Which paid products this member can open. False sends the header straight to that product's subscription page. */
export type ProductAccess = { analytics: boolean; zero: boolean };

export const CLOSED_ACCESS: ProductAccess = { analytics: false, zero: false };

/** Header and drawer destination. A single link: subscription until payment, then the product home. */
export function hubHref(key: string, href: string, access: ProductAccess): { href: string; match?: string } {
  if (key === "aq-analytics" && access.analytics) return { href: "/hub/tools/analytics", match: "/hub/tools/analytics" };
  if (key === "zero" && access.zero) return { href: "/hub/zero", match: "/hub/zero" };
  return { href };
}

/** Desktop tab row, left to right. AQ Analytics and AQ Zero are each one link, never a dropdown. */
function tabGroups(): { key: string; items: string[] }[] {
  return [
    { key: "dashboard", items: ["dashboard"] },
    { key: "suite", items: ["home", "telex", "analysis", "library", "freight", "netback", "tools"] },
    { key: "aq-analytics", items: ["aq-analytics"] },
    { key: "zero", items: ["zero"] },
    { key: "nitrogen", items: ["nitrogen"] },
    { key: "order-group", items: ["order"] },
    { key: "call", items: ["call"] },
    { key: "trade", items: ["trade"] },
    { key: "contact", items: ["contact"] },
  ];
}

/** Tabs built from the member's own menu, so hidden and paid-only pages stay out exactly as they do in the drawer. */
export function tabsFor(nav: HubNavItem[], unlocked: string[], viewer: { plan: Plan; admin: boolean; access?: ProductAccess }): HubTab[] {
  const access = viewer.access ?? CLOSED_ACCESS;
  return tabGroups().map((group) => {
    const links = group.items.flatMap((key): HubTabLink[] => {
      const item = nav.find((entry) => entry.key === key);
      if (!item) return [];
      const dest = hubHref(key, item.href, access);
      return [{ key, href: dest.href, match: dest.match, icon: item.icon, locked: Boolean(item.module && !unlocked.includes(item.module)), promo: item.promo?.headline }];
    });
    const tour = TOUR_STOPS.find((stop) => links.some((link) => link.key === stop.key))?.key;
    return { key: group.key, tour, links };
  }).filter((tab) => tab.links.length > 0);
}

export const SECTIONS: HubSection[] = ["Main", "AQ ONE", "Plans", "AQ Analytics", "Help", "You"];

export const hasPaidPages = (plan: Plan, admin: boolean) => admin || plan !== "core";

export function navFor(plan: Plan, admin: boolean, analytics = canSeeAqAnalytics({ plan, admin })) {
  const paid = hasPaidPages(plan, admin);
  return HUB_NAV.filter((item) => !item.hidden && (paid || !item.paidOnly) && (!item.analyticsTool || analytics));
}

/** Phone tab bar: the four most-used places plus "More", which opens the full menu. */
export function tabKeysFor(plan: Plan, admin: boolean) {
  return hasPaidPages(plan, admin) ? ["dashboard", "home", "order", "aquibot"] : ["home", "order", "call", "aquibot"];
}

/** Keys that live under Client Suite on desktop and in the phone drawer. */
export const SUITE_KEYS = ["home", "telex", "analysis", "library", "freight", "netback", "tools"] as const;

/** Phone drawer groups. AQ Analytics and AQ Zero are each one link, beside Client Suite. */
export function drawerGroupsFor(_plan: Plan, _admin: boolean): { key: string; labelKey: string | null; noteKey?: string; items: string[] }[] {
  return [
    { key: "main", labelKey: null, items: ["dashboard"] },
    { key: "suite", labelKey: "tab.suite", noteKey: "note.aq1", items: [...SUITE_KEYS] },
    { key: "analytics", labelKey: null, items: ["aq-analytics"] },
    { key: "zero", labelKey: null, items: ["zero"] },
    { key: "desk", labelKey: null, items: ["nitrogen", "aquibot", "order", "call", "trade", "contact"] },
    { key: "help", labelKey: "section.help", items: ["guide"] },
    { key: "you", labelKey: "section.you", items: ["account"] },
  ];
}

/**
 * Tour stops in menu order. Each one points at the element carrying `data-tour={key}`; stops whose element is not
 * on screen (pages outside the member's plan, desktop tabs on a phone) are skipped. `anchor: false` shows a centred card.
 */
export const TOUR_STOPS: { key: string; title: string; body: string; anchor?: false }[] = [
  { key: "welcome", anchor: false, title: "Welcome to Aquifert ONE", body: "A one-minute walk through the menu, so you know where everything lives. Use the arrow keys or the buttons, and skip whenever you like." },
  { key: "dashboard", title: "Dashboard", body: "Your day at a glance: usage, recent requests, the latest Telex and a briefing tuned to you." },
  { key: "home", title: "Client Suite", body: "Your workspace dropdown: Hub, Telex, AQ View, Library, Calculators and AQ Trader Tools." },
  { key: "aq-analytics", title: "AQ Analytics", body: "Opens the AQ Analytics subscription. Once that membership is active, it opens the product: its pages sit in the left menu, and this header stays so you can move around Aquifert ONE." },
  { key: "aa-map", title: "AQ Analytics", body: "Intelligent Map, Freight Board, My Market, producers, freight enquiries, reports, alerts and plans." },
  { key: "zero", title: "AQ Zero", body: "Opens the AQ Zero subscription. Once that membership is active, it opens AQ Zero with its own left menu, and this header stays so you can move around Aquifert ONE." },
  { key: "nitrogen", title: "Nitrogen Report", body: "Answer six questions on one page and get an AQ View nitrogen brief tailored to your market, yours to keep." },
  { key: "order", title: "Order Fertiliser", body: "Send the trading desk an enquiry for the products, quantity and months you need." },
  { key: "call", title: "Market Call", body: "Join the desk's weekly market call, or catch up on the last one." },
  { key: "trade", title: "Trades", body: "Your trades with Aquifert, and the documents for each one." },
  { key: "contact", title: "Trade Desk", body: "Reach the desk by WhatsApp, a booked meeting or a message." },
  { key: "more", title: "More", body: "Everything else in the menu lives here: Client Suite pages, plans, Aquibot and help." },
  { key: "search", title: "Search", body: "Jump to any page or tool. Press Ctrl K from anywhere." },
  { key: "account", title: "Your account", body: "Profile, plan and billing, the User Guide, and this tour if you want to see it again." },
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
  if (href === "/hub" || href === "/hub/tools" || href === "/hub/tools/analytics") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function pageTitle(pathname: string) {
  if (EXACT_TITLES[pathname]) return EXACT_TITLES[pathname];
  const extra = EXTRA_TITLES.find(([href]) => pathname.startsWith(href));
  if (extra) return extra[1];
  return HUB_NAV.find((item) => isActive(pathname, item.href))?.label ?? "Hub";
}
