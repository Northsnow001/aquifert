import {
  Activity,
  Archive,
  ArrowLeftRight,
  BellRing,
  BookOpenCheck,
  Calculator,
  ChartLine,
  CreditCard,
  Crown,
  FlaskConical,
  LayoutDashboard,
  Mail,
  Newspaper,
  PhoneCall,
  Radar,
  Radio,
  RadioTower,
  Scale,
  ScrollText,
  Ship,
  ShoppingCart,
  SlidersHorizontal,
  UserCircle,
  Wrench,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import type { ModuleKey } from "@/lib/aq-modules/types";
import type { Plan } from "@/lib/session-shared";

export type HubSection = "Main" | "AQ ONE Free plan" | "AQ Analytics" | "Desk tools" | "You";

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
  /** Chip colour, so each section reads at a glance. */
  tone?: "blue" | "amber" | "rose";
  /** Hidden from members on the free AQ ONE plan. */
  paidOnly?: boolean;
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
    icon: Radar,
    section: "Main",
    tip: "The market desk: sentiment gauges for nitrogen, phosphate and potash, the Telex feed of desk intelligence, commentary and the paper forward curve.",
  },
  {
    key: "library",
    href: "/hub/library",
    label: "Weekly Report & Analysis",
    short: "Reports",
    icon: Archive,
    section: "Main",
    tip: "Every weekly report and research note the desk has published. Filter by collection, year or access, read the summary and open the file in one click.",
  },
  {
    key: "nitrogen",
    href: "/hub/nitrogen-report",
    label: "Nitrogen Report",
    short: "Nitrogen",
    icon: FlaskConical,
    section: "Main",
    tip: "Answer four short sections about delivery, volumes, crop and goals, and get a tailored nitrogen sourcing and agronomy report you can print or save as PDF.",
  },
  {
    key: "aquibot",
    href: "/hub/aquibot",
    label: "Aquibot",
    short: "Aquibot",
    icon: "aquibot",
    section: "Main",
    tip: "Ask Aquibot about the market in plain English. It answers from Aquifert's own Telex, reports and price records, and keeps your chats so you can pick up where you left off.",
  },

  {
    key: "telex",
    href: "/hub/telex",
    label: "Market TELEX Feed",
    short: "Telex",
    icon: Radio,
    section: "AQ ONE Free plan",
    tip: "Desk-issued market flashes, newest first, grouped by day. Filter by product and save the filter as your default so the feed opens on what you trade.",
  },
  {
    key: "analysis",
    href: "/hub/analysis",
    label: "AQ Market Analysis Feed",
    short: "Analysis",
    icon: Newspaper,
    section: "AQ ONE Free plan",
    tip: "The desk's interpretation, separate from the Telex: what a move means for buyers and what to watch next.",
  },
  {
    key: "signal",
    href: "/hub/signal",
    label: "AQ Signal",
    short: "Signal",
    icon: Activity,
    section: "AQ ONE Free plan",
    tip: "Rolling 7, 30, 60 and 90-day windows on benchmark prices: start and current price, change, high and low, and a one-line summary of the window.",
  },
  {
    key: "netback",
    href: "/hub/netback",
    label: "Netback",
    short: "Netback",
    icon: ArrowLeftRight,
    section: "AQ ONE Free plan",
    tip: "Works out what a tonne of granular urea actually costs you landed, or what your farm-gate price implies back at FOB. It shows the full cost ladder and ranks which origin lands cheapest.",
  },
  {
    key: "freight-analytics",
    href: "/hub/freight-analytics",
    label: "Freight Analytics",
    short: "Freight",
    icon: Ship,
    section: "AQ ONE Free plan",
    module: "freight-analytics",
    tip: "Fixtures, lane benchmarks and freight commentary from AQ Analytics. Upgrade to unlock, or talk to the desk.",
  },
  {
    key: "order",
    href: "/hub/order-desk",
    label: "Order Fertilizer Now",
    short: "Order",
    icon: ShoppingCart,
    section: "AQ ONE Free plan",
    tip: "Tell the desk what you need, product, quantity, destination and target price, and the Aquifert trading desk comes back with a quote.",
  },
  {
    key: "call",
    href: "/hub/community-call",
    label: "Freight Analytics Call",
    short: "Call",
    icon: PhoneCall,
    section: "AQ ONE Free plan",
    tip: "A free 45-minute market and freight call with the Aquifert desk. Register in one click, add it to your calendar and send in your questions.",
  },
  {
    key: "guide",
    href: "/hub/guide",
    label: "User Guide",
    short: "Guide",
    icon: BookOpenCheck,
    section: "AQ ONE Free plan",
    tip: "Step-by-step help for every part of Aquifert, including what each number means and how the calculators work. Start here if something isn't obvious.",
  },
  {
    key: "contact",
    href: "/hub/contact",
    label: "Contact Us",
    short: "Contact",
    icon: Mail,
    section: "AQ ONE Free plan",
    tip: "Reach the Aquifert desk by WhatsApp, a booked meeting or a message. Use this when you want a person rather than a screen.",
  },
  {
    key: "plan-usage",
    href: "/hub/plan-usage",
    label: "Plan & Usage",
    short: "Usage",
    icon: SlidersHorizontal,
    section: "AQ ONE Free plan",
    tip: "Every allowance in one place: what you have used this month, your limit and when it resets.",
  },
  {
    key: "membership",
    href: "/hub/membership",
    label: "Membership",
    short: "Plans",
    icon: Crown,
    section: "AQ ONE Free plan",
    tip: "Sprout, Harvest and Scale memberships (AQ ZERO) and AQ Analytics, monthly or annual. Select one and the desk moves your account.",
  },
  {
    key: "billing",
    href: "/hub/billing",
    label: "Billing",
    short: "Billing",
    icon: CreditCard,
    section: "AQ ONE Free plan",
    tip: "Your plan, billing contact, invoices and payment history.",
  },

  {
    key: "a-telex",
    href: "/hub/analytics/telex",
    label: "AQ TELEX",
    short: "AQ Telex",
    icon: RadioTower,
    section: "AQ Analytics",
    module: "aq-telex",
    tone: "blue",
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
    tone: "blue",
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
    tone: "blue",
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
    tone: "blue",
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
    tone: "blue",
    tip: "Balance sheets for the major nutrients: production, consumption, trade, stocks and the direction of travel.",
  },
  {
    key: "a-briefing",
    href: "/hub/analytics/briefing",
    label: "The Briefing",
    short: "Briefing",
    icon: ScrollText,
    section: "AQ Analytics",
    module: "briefing",
    tone: "blue",
    tip: "The desk's weekly written briefing: what happened, why it matters and what to watch, with the full back catalogue.",
  },
  {
    key: "a-alerts",
    href: "/hub/analytics/alerts",
    label: "Alerts & Brief",
    short: "Alerts",
    icon: BellRing,
    section: "AQ Analytics",
    module: "alerts",
    tone: "blue",
    tip: "Set price alerts on the series you follow. Triggered alerts show on your dashboard every time the desk updates prices.",
  },

  {
    key: "freight",
    href: "/hub/freight-calculator",
    label: "Freight Calculator",
    short: "Freight",
    icon: Calculator,
    section: "Desk tools",
    tone: "amber",
    tip: "Estimates the cost of moving a cargo between two ports from the vessel, route and live bunker and market data. Use it to sanity-check a freight quote before you accept it.",
  },
  {
    key: "tools",
    href: "/hub/tools",
    label: "Tools",
    short: "Tools",
    icon: Wrench,
    section: "Desk tools",
    tone: "amber",
    tip: "Interactive references: a world map of terminals and producers, a production cost calculator driven by gas, rock and sulphur prices, how each fertilizer is made, and a glossary.",
  },
  {
    key: "account",
    href: "/hub/account",
    label: "Account",
    short: "Account",
    icon: UserCircle,
    section: "You",
    tone: "rose",
    tip: "Your profile, password, payments and the legal notices that apply to market data.",
  },
];

export const ADMIN_LINK = { href: "/admin", label: "Admin console", icon: LayoutGrid };

export const SECTIONS: HubSection[] = ["Main", "AQ ONE Free plan", "AQ Analytics", "Desk tools", "You"];

export const hasPaidPages = (plan: Plan, admin: boolean) => admin || plan !== "core";

export function navFor(plan: Plan, admin: boolean) {
  const paid = hasPaidPages(plan, admin);
  return HUB_NAV.filter((item) => paid || !item.paidOnly);
}

/** Phone tab bar: the four most-used places plus "More", which opens the full menu. */
export function tabKeysFor(plan: Plan, admin: boolean) {
  return hasPaidPages(plan, admin) ? ["dashboard", "home", "telex", "aquibot"] : ["home", "library", "telex", "aquibot"];
}

export const TOUR_STOPS: { key: string; title: string; body: string }[] = [
  { key: "dashboard", title: "Dashboard", body: "Your day at a glance: usage, recent requests, the latest Telex and a briefing tuned to you." },
  { key: "home", title: "Hub", body: "The market desk: gauges, Telex and commentary show what moved overnight." },
  { key: "nitrogen", title: "Nitrogen Report", body: "Four short sections, one tailored nitrogen report you can keep." },
  { key: "telex", title: "Market TELEX Feed", body: "Desk flashes, newest first. Save a product filter as your default." },
  { key: "netback", title: "Netback", body: "Work out your real landed cost, or what a farm-gate price implies at FOB." },
  { key: "a-telex", title: "AQ Analytics", body: "Deeper data and the full wire. A lock means your plan does not include it yet; open it to see how to unlock." },
  { key: "aquibot", title: "Aquibot", body: "Ask anything about the market. You can replay this tour from the User Guide." },
];

const EXTRA_TITLES: [string, string][] = [
  ["/hub/account/profile", "Profile"],
  ["/hub/account/password", "Password"],
  ["/hub/account/legal", "Legal"],
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
