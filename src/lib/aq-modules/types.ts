import type { Plan } from "@/lib/session-shared";

/** AQ Analytics modules. Each unlocks at a plan the desk sets in the admin. */
export type ModuleKey = "aq-telex" | "market-data" | "aq-signal-pro" | "freight-analytics" | "supply-demand" | "briefing" | "alerts";

export const MODULES: { key: ModuleKey; label: string; href: string; pitch: string; covers: string[] }[] = [
  {
    key: "aq-telex",
    label: "AQ TELEX",
    href: "/hub/analytics/telex",
    pitch: "The full desk wire: every flash for every plan tier, searchable, with the complete archive.",
    covers: ["Every Growth and AQ Zero flash as it is filed", "Search and filter the full archive by product and tag", "Export what you are reading for your own notes"],
  },
  {
    key: "market-data",
    label: "Market Data",
    href: "/hub/analytics/market-data",
    pitch: "Benchmark price series for nitrogen, phosphate, potash and freight, charted and downloadable.",
    covers: ["Weekly price series by product and basis", "Week-on-week and period change at a glance", "CSV download for your own models"],
  },
  {
    key: "aq-signal-pro",
    label: "AQ Signal",
    href: "/hub/analytics/signal",
    pitch: "Rolling signal windows across every tracked series, with the drivers behind each move.",
    covers: ["7, 30, 60, 90 and 180-day windows on every series", "Momentum and range position per product", "The Telex and analysis notes that drove each move"],
  },
  {
    key: "freight-analytics",
    label: "Freight Analytics",
    href: "/hub/analytics/freight",
    pitch: "Fixtures, lane benchmarks and freight commentary so timing stops being guesswork.",
    covers: ["Recent fertilizer fixtures by lane", "Freight benchmarks across the major routes", "Desk commentary on freight and vessel supply"],
  },
  {
    key: "supply-demand",
    label: "Supply & Demand",
    href: "/hub/analytics/supply-demand",
    pitch: "Balance sheets for the major nutrients: production, consumption, trade and stocks.",
    covers: ["Season balances by product and region", "Stocks-to-use and the direction of travel", "Desk commentary on what would change the balance"],
  },
  {
    key: "briefing",
    label: "The Briefing",
    href: "/hub/analytics/briefing",
    pitch: "The desk's weekly written briefing: what happened, why it matters, and what to watch.",
    covers: ["A weekly issue from the desk", "The full back catalogue", "Plain-language takeaways for buyers"],
  },
  {
    key: "alerts",
    label: "Alerts & Brief",
    href: "/hub/analytics/alerts",
    pitch: "Price alerts on the series you care about, checked every time the desk updates prices.",
    covers: ["Alerts above or below a price you set", "Triggered alerts on your dashboard", "A weekly brief tuned to your products"],
  },
];

export const moduleInfo = (key: ModuleKey) => MODULES.find((item) => item.key === key)!;

export type AccessRules = Record<ModuleKey, Plan>;

export const DEFAULT_ACCESS: AccessRules = {
  "aq-telex": "growth",
  "market-data": "growth",
  "aq-signal-pro": "growth",
  "freight-analytics": "enterprise",
  "supply-demand": "enterprise",
  briefing: "growth",
  alerts: "growth",
};

export const PLAN_RANK: Record<Plan, number> = { core: 0, growth: 1, enterprise: 2 };
/** Display names. The stored key stays `enterprise`; members see it as AQ Zero. */
export const PLAN_LABEL: Record<Plan, string> = { core: "Core", growth: "Growth", enterprise: "AQ Zero" };
export const planName = (value: string | null | undefined) => (value ? (PLAN_LABEL[value as Plan] ?? value) : "");

export function canUse(rules: AccessRules, key: ModuleKey, user: { plan: Plan; admin?: boolean } | null) {
  if (!user) return false;
  if (user.admin) return true;
  return PLAN_RANK[user.plan] >= PLAN_RANK[rules[key] ?? "enterprise"];
}

export function unlockedModules(rules: AccessRules, user: { plan: Plan; admin?: boolean } | null): ModuleKey[] {
  return MODULES.filter((item) => canUse(rules, item.key, user)).map((item) => item.key);
}

/** Monthly allowances per plan. 0 means unlimited. */
export type PlanLimits = { core: number; growth: number; enterprise: number };
export type Aq1Limits = { nitrogenReports: PlanLimits; savedReports: PlanLimits };

export const DEFAULT_LIMITS: Aq1Limits = {
  nitrogenReports: { core: 2, growth: 10, enterprise: 0 },
  savedReports: { core: 10, growth: 50, enterprise: 0 },
};

export const limitFor = (limits: PlanLimits, plan: Plan) => limits[plan] ?? 0;

export type PublishState = "published" | "draft";

export type AnalysisNote = {
  id: string;
  slug: string;
  title: string;
  /** Markdown. */
  body: string;
  products: string[];
  regions: string[];
  status: PublishState;
  author: string;
  /** `YYYY-MM-DDTHH:mm` desk time. */
  publishedAt: string;
  relatedTelexIds: string[];
};

export const SERIES_GROUPS = ["Nitrogen", "Phosphate", "Potash", "Freight"] as const;
export type SeriesGroup = (typeof SERIES_GROUPS)[number];

export type PricePoint = { date: string; value: number };

export type MarketSeries = {
  id: string;
  label: string;
  group: SeriesGroup;
  /** Basis or region, e.g. `FOB Middle East`. */
  basis: string;
  unit: string;
  points: PricePoint[];
};

export type CommunityCall = {
  id: string;
  topic: string;
  host: string;
  description: string;
  /** ISO timestamp with zone. */
  startsAt: string;
  durationMinutes: number;
  joinUrl: string;
  recordingUrl: string;
  status: "scheduled" | "cancelled";
};

export type Trend = "up" | "down" | "flat";

export type BalanceRow = {
  id: string;
  product: string;
  region: string;
  season: string;
  unit: string;
  production: number;
  consumption: number;
  imports: number;
  exports: number;
  stocks: number;
  trend: Trend;
  note: string;
};

export type SupplyDemand = { balances: BalanceRow[]; commentary: string; updatedAt: string | null };

export type BriefingIssue = {
  id: string;
  title: string;
  /** `YYYY-MM-DD` */
  date: string;
  summary: string;
  /** Markdown. */
  body: string;
  status: PublishState;
};

export type AqModules = {
  access: AccessRules;
  limits: Aq1Limits;
  analysis: AnalysisNote[];
  series: MarketSeries[];
  calls: CommunityCall[];
  supplyDemand: SupplyDemand;
  briefings: BriefingIssue[];
  updatedAt: string | null;
};

export const NITROGEN_PRODUCTS = ["Urea", "Ammonia", "UAN", "Ammonium Nitrate", "CAN", "Ammonium Sulphate"];
export const TELEX_PRODUCTS = ["Nitrogen", "Phosphate", "Potash", "Freight", "General"] as const;
export type TelexProduct = (typeof TELEX_PRODUCTS)[number];

/** Nutrient category a headline or tag belongs to, for thumbnails and filters. */
export function productOf(text: string): TelexProduct {
  const value = text.toLowerCase();
  if (/urea|ammoni|nitrate|\buan\b|nitrogen|\bcan\b|\bas\b/.test(value)) return "Nitrogen";
  if (/\bdap\b|\bmap\b|\btsp\b|\bssp\b|phosph|\bnps\b/.test(value)) return "Phosphate";
  if (/\bmop\b|\bsop\b|potash|potassium/.test(value)) return "Potash";
  if (/freight|vessel|baltic|charter|route|shipping|bunker|handysize|supramax/.test(value)) return "Freight";
  return "General";
}

export const THUMBS: Record<TelexProduct | "Market", string> = {
  Nitrogen: "/media/thumbs/nitrogen.jpg",
  Phosphate: "/media/thumbs/phosphate.jpg",
  Potash: "/media/thumbs/potash.jpg",
  Freight: "/media/thumbs/freight.jpg",
  General: "/media/thumbs/general.jpg",
  Market: "/media/thumbs/market.jpg",
};

export type Tone = "up" | "down" | "flat";

const FIRM = /\b(up|firm|firms|firmer|firmed|higher|rise|rises|rising|rose|sold out|tight|tighter|premium|bullish|rally|rallied|gain|gains|jump|jumped|short|capped)\b/i;
const SOFT = /\b(down|soft|softer|soften|softens|softened|lower|quiet|ease|eased|eases|easing|calm|rangebound|bearish|ample|slip|slipped|fall|falls|fell|drop|dropped|weak|weaker)\b/i;

/** Direction a piece of desk text leans. Softer wording wins ties, since desks hedge upward calls. */
export function toneOf(text: string): Tone {
  if (SOFT.test(text)) return "down";
  if (FIRM.test(text)) return "up";
  return "flat";
}

export type Persona = "farmer" | "importer" | "buyer";

export const PERSONAS: { key: Persona; label: string }[] = [
  { key: "farmer", label: "Farmer / grower" },
  { key: "importer", label: "Importer" },
  { key: "buyer", label: "Buyer / trader" },
];

/** Plain-language "what this means for you", per persona. */
export function interpret(tone: Tone, product: string, persona: Persona): string {
  const p = product.toLowerCase() === "general" ? "fertilizer" : product.toLowerCase();
  if (persona === "farmer") {
    if (tone === "up") return `For your farm: ${p} costs are creeping up. If you need it this season, covering sooner is likely cheaper than waiting.`;
    if (tone === "down") return `For your farm: ${p} prices are easing. There is no rush, and holding off could mean a better price when you are ready.`;
    return `For your farm: ${p} is steady. No urgent action, so plan around your normal application window.`;
  }
  if (persona === "importer") {
    if (tone === "up") return `For your imports: ${p} looks firmer, so landed costs are likely to rise. Check cover on nearby laycans before offers are revised.`;
    if (tone === "down") return `For your imports: ${p} is softening and import economics are improving. A window to cover forward at better levels may be opening.`;
    return `For your imports: ${p} is rangebound. Watch freight and origin spreads rather than chasing the flat price.`;
  }
  if (tone === "up") return `For your book: expect firmer offers and shorter validity on ${p}. If a number works, move quickly.`;
  if (tone === "down") return `For your book: ${p} is turning into a buyer's market. Negotiate, ask for validity and compare origins.`;
  return `For your book: ${p} is balanced. Keep quotes short-dated and watch the next tender for direction.`;
}
