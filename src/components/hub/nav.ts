import {
  Archive,
  ArrowLeftRight,
  BookOpenCheck,
  Calculator,
  FileText,
  Home,
  LayoutDashboard,
  Mail,
  UserCircle,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type HubNavKey = "home" | "freight" | "netback" | "library" | "tools" | "order" | "aquibot" | "contact" | "account" | "guide";

export type HubNavItem = {
  key: HubNavKey;
  href: string;
  label: string;
  /** One-word label for the phone tab bar. */
  short: string;
  icon: LucideIcon | "aquibot";
  section: "Markets" | "Calculators" | "Desk" | "You";
  tip: string;
};

export const HUB_NAV: HubNavItem[] = [
  {
    key: "home",
    href: "/hub",
    label: "Home",
    short: "Home",
    icon: Home,
    section: "Markets",
    tip: "Your market desk: sentiment gauges for nitrogen, phosphate and potash, the Telex feed of desk intelligence and the weekly commentary. Read it first thing to see what moved overnight.",
  },
  {
    key: "library",
    href: "/hub/library",
    label: "Library",
    short: "Library",
    icon: Archive,
    section: "Markets",
    tip: "Every weekly report and research note the desk has published, grouped into collections. Search by title and open any file in one click.",
  },
  {
    key: "tools",
    href: "/hub/tools",
    label: "Tools",
    short: "Tools",
    icon: Wrench,
    section: "Markets",
    tip: "Interactive references: a world map of terminals and producers, a production cost calculator driven by gas, rock and sulphur prices, how each fertilizer is made, and a glossary.",
  },
  {
    key: "freight",
    href: "/hub/freight-calculator",
    label: "Freight Calculator",
    short: "Freight",
    icon: Calculator,
    section: "Calculators",
    tip: "Estimates the cost of moving a cargo between two ports from the vessel, route and live bunker and market data. Use it to sanity-check a freight quote before you accept it.",
  },
  {
    key: "netback",
    href: "/hub/netback",
    label: "Netback",
    short: "Netback",
    icon: ArrowLeftRight,
    section: "Calculators",
    tip: "Works out what a tonne of granular urea actually costs you landed, or what your farm-gate price implies back at FOB. It shows the full cost ladder and ranks which origin lands cheapest.",
  },
  {
    key: "order",
    href: "/hub/order-desk",
    label: "Order Desk",
    short: "Order",
    icon: FileText,
    section: "Desk",
    tip: "Tell the desk what you need, product, quantity, destination and target price, and the Aquifert trading desk comes back with a quote.",
  },
  {
    key: "aquibot",
    href: "/hub/aquibot",
    label: "Aquibot",
    short: "Aquibot",
    icon: "aquibot",
    section: "Desk",
    tip: "Ask Aquibot about the market in plain English. It answers from Aquifert's own Telex, reports and price records, and keeps your chats so you can pick up where you left off.",
  },
  {
    key: "contact",
    href: "/hub/contact",
    label: "Contact Us",
    short: "Contact",
    icon: Mail,
    section: "Desk",
    tip: "Reach the Aquifert desk by WhatsApp, a booked meeting or a message. Use this when you want a person rather than a screen.",
  },
  {
    key: "account",
    href: "/hub/account",
    label: "Account",
    short: "Account",
    icon: UserCircle,
    section: "You",
    tip: "Your profile, password, plan, payments and the legal notices that apply to market data.",
  },
  {
    key: "guide",
    href: "/hub/guide",
    label: "User Guide",
    short: "Guide",
    icon: BookOpenCheck,
    section: "You",
    tip: "Step-by-step help for every part of Aquifert, including what each number means and how the calculators work. Start here if something isn't obvious.",
  },
];

export const ADMIN_LINK = { href: "/admin", label: "Admin console", icon: LayoutDashboard };

export const SECTIONS: HubNavItem["section"][] = ["Markets", "Calculators", "Desk", "You"];

/** Phone tab bar: the four most-used places plus "More", which opens the full menu. */
export const TAB_KEYS: HubNavKey[] = ["home", "freight", "netback", "aquibot"];

export const TOUR_STOPS: { key: HubNavKey; title: string; body: string }[] = [
  { key: "home", title: "Market Home", body: "Start here: gauges, Telex and commentary show what moved overnight." },
  { key: "freight", title: "Freight Calculator", body: "Price a voyage between any two ports in seconds." },
  { key: "netback", title: "Netback", body: "Work out your real landed cost, or what a farm-gate price implies at FOB." },
  { key: "library", title: "Library", body: "Weekly reports and research from the desk, searchable in one place." },
  { key: "order", title: "Order Desk", body: "Ready to buy? Tell the desk what you need and get a quote." },
  { key: "aquibot", title: "Aquibot", body: "Ask anything about the market. You can replay this tour from the User Guide." },
];

const EXTRA_TITLES: [string, string][] = [
  ["/hub/account/profile", "Profile"],
  ["/hub/account/password", "Password"],
  ["/hub/account/plan", "Plan"],
  ["/hub/account/payments", "Payments"],
  ["/hub/account/subscriptions", "Subscriptions"],
  ["/hub/account/legal", "Legal"],
  ["/hub/voyage", "Voyage"],
];

export function isActive(pathname: string, href: string) {
  return href === "/hub" ? pathname === "/hub" : pathname === href || pathname.startsWith(`${href}/`);
}

export function pageTitle(pathname: string) {
  const extra = EXTRA_TITLES.find(([href]) => pathname.startsWith(href));
  if (extra) return extra[1];
  return HUB_NAV.find((item) => isActive(pathname, item.href))?.label ?? "Home";
}
