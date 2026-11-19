// ============================================================================
// AQ ZERO — shared domain contract for the buyer platform + AQ Analytics.
// Pure TypeScript: runs in the browser and on the server so both agree.
// Numbers are only ever computed from the freight database or the seeded
// reference tables — never invented per-page.
// ============================================================================

// ---------------------------------------------------------------------------
// Pipeline stages (the three-stage cargo tracking model from the designs)
// ---------------------------------------------------------------------------

export type Stage = 1 | 2 | 3;

export const STAGE_META: Record<Stage, { label: string; name: string; blurb: string }> = {
  1: {
    label: "Stage 1 · Intent",
    name: "Open freight enquiry",
    blurb: "A trader is pricing a cargo. Days to weeks of lead time; lowest certainty.",
  },
  2: {
    label: "Stage 2 · Loading",
    name: "Port lineup",
    blurb: "A vessel is at berth or anchor at a load port. The trade is happening.",
  },
  3: {
    label: "Stage 3 · Confirmed",
    name: "Bill of lading",
    blurb: "Shipper, consignee, vessel and quantity on record. Highest certainty.",
  },
};

/**
 * Classify an order into the 3-stage pipeline relative to the board date.
 * Laycan already underway → loading; window closed → concluded; else open.
 */
export function stageOf(laycanStart: string | null, laycanEnd: string | null, dataNow: string): Stage {
  if (laycanEnd && laycanEnd < dataNow) return 3;
  if (laycanStart && laycanStart <= dataNow) return 2;
  return 1;
}

// ---------------------------------------------------------------------------
// Vessel size bands (dry-cargo convention)
// ---------------------------------------------------------------------------

export function vesselBand(qtyMax: number): string {
  if (qtyMax <= 0) return "Unspecified";
  if (qtyMax < 35000) return "Handysize";
  if (qtyMax < 55000) return "Handymax / Supramax";
  if (qtyMax < 65000) return "Ultramax";
  return "Panamax";
}

export const VESSEL_BANDS = ["Handysize", "Handymax / Supramax", "Ultramax", "Panamax"];

// ---------------------------------------------------------------------------
// Import pace: current year-to-date vs the five-year average, same period
// ---------------------------------------------------------------------------

export type PaceStatus = "ahead" | "on" | "behind" | "gap";

export function paceStatus(pctVsAvg: number | null): PaceStatus {
  if (pctVsAvg === null || !isFinite(pctVsAvg)) return "gap";
  if (pctVsAvg >= 4) return "ahead";
  if (pctVsAvg <= -4) return "behind";
  return "on";
}

export const PACE_META: Record<PaceStatus, { label: string; short: string }> = {
  ahead: { label: "Ahead of pace", short: "Ahead" },
  on: { label: "On pace", short: "On pace" },
  behind: { label: "Behind pace", short: "Behind" },
  gap: { label: "Coverage gap", short: "Coverage gap" },
};

// ---------------------------------------------------------------------------
// Product catalogue (canonical products seen on the board + suite catalogue)
// ---------------------------------------------------------------------------

export interface ProductMeta {
  name: string;
  group: string;
  aliases: string[];
}

export const PRODUCTS: ProductMeta[] = [
  { name: "Urea", group: "Nitrogen", aliases: ["urea granular", "urea prilled", "prilled 46", "carbamide"] },
  { name: "DAP", group: "Phosphates", aliases: ["dap 18-46-0", "diammonium phosphate"] },
  { name: "MAP", group: "Phosphates", aliases: ["map 11-52-0", "monoammonium phosphate"] },
  { name: "TSP", group: "Phosphates", aliases: ["triple super phosphate", "triple superphosphate"] },
  { name: "SSP", group: "Phosphates", aliases: ["single super phosphate"] },
  { name: "Phosphate Rock", group: "Phosphates", aliases: ["phos rock", "phosrock"] },
  { name: "MOP", group: "Potash", aliases: ["muriate of potash", "potassium chloride", "kcl"] },
  { name: "SOP", group: "Potash", aliases: ["sulphate of potash", "potassium sulphate", "gsop"] },
  { name: "Ammonium Sulphate", group: "Nitrogen", aliases: ["amsul", "ammonium sulphate granular", "as"] },
  { name: "Ammonium Nitrate", group: "Nitrogen", aliases: ["an", "ammonium nitrate"] },
  { name: "CAN", group: "Nitrogen", aliases: ["calcium ammonium nitrate"] },
  { name: "UAN", group: "Nitrogen", aliases: ["uan 28", "uan 30", "uan 32"] },
  { name: "Anhydrous Ammonia", group: "Nitrogen", aliases: ["ammonia", "nh3"] },
  { name: "NPK", group: "Compound NPK", aliases: ["npk 15-15-15", "npk 16-16-16", "compound"] },
  { name: "Calcium Nitrate", group: "Calcium & Magnesium", aliases: ["calcium nitrate granular", "cn"] },
  { name: "Sulphur", group: "Sulphur & Raw Materials", aliases: ["sulphur granular", "sulfur"] },
  { name: "Sulphuric Acid", group: "Sulphur & Raw Materials", aliases: ["sulphuric acid"] },
  { name: "Fertilisers (mixed)", group: "Other", aliases: ["ferts", "mixed fertilisers"] },
];

export const PRODUCT_GROUPS = [...new Set(PRODUCTS.map((p) => p.group))];

/** Resolve a free-text product mention to a canonical product name. */
export function resolveProduct(text: string): string | null {
  const t = text.toLowerCase();
  for (const p of PRODUCTS) {
    if (p.name.toLowerCase() === t) return p.name;
    if (p.aliases.some((a) => t.includes(a))) return p.name;
  }
  // partial: "urea", "dap" etc. inside a longer string
  for (const p of PRODUCTS) {
    if (t.includes(p.name.toLowerCase())) return p.name;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** 2,840,500 MT style */
export function fmtMTFull(n: number): string {
  return `${Math.round(n).toLocaleString("en-GB")} MT`;
}

/** 2.84m / 612k style used on the intelligence screens */
export function fmtMTShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}m`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return `${Math.round(n)}`;
}

export function fmtUsd(n: number, decimals = 2): string {
  return `USD ${n.toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function fmtUsdWhole(n: number): string {
  return `USD ${Math.round(n).toLocaleString("en-GB")}`;
}

export function fmtPct(n: number | null, decimals = 1, sign = true): string {
  if (n === null || !isFinite(n)) return "—";
  const s = sign && n > 0 ? "+" : "";
  return `${s}${n.toFixed(decimals)}%`;
}

/** "16 Nov" */
export function fmtDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** "16 Nov 2026" */
export function fmtDayYear(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function isoDaysAgo(from: string, days: number): string {
  const d = new Date(from + "T00:00:00");
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Subscriptions — plans are set by the Aquifert team (B2B by invitation).
// ---------------------------------------------------------------------------

export interface Plan {
  code: string;
  name: string;
  tagline: string;
  price: string;
  cta: "Request access" | "Talk to us";
  recommended?: boolean;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    code: "standard",
    name: "Standard",
    tagline: "See where the market is pricing",
    price: "[Price TBC]",
    cta: "Request access",
    features: [
      "Weekly data updates",
      "Interactive map with freight enquiry layer",
      "Freight calculator with FOB netback",
      "Historical imports and country panels",
      "AQ View commentary feed",
    ],
  },
  {
    code: "premium",
    name: "Premium",
    tagline: "Know what is loading and who is behind pace",
    price: "[Price TBC]",
    cta: "Request access",
    recommended: true,
    features: [
      "Everything in Standard, updated daily",
      "Concluded shipments with named shipper and consignee",
      "Live port lineups at 15 key ports",
      "Trend intelligence: ahead/behind pace",
      "Aquifert proprietary estimates",
      "Instant alerts and personalised reports",
    ],
  },
  {
    code: "enterprise",
    name: "Enterprise",
    tagline: "For trading and analyst teams",
    price: "[Price TBC]",
    cta: "Talk to us",
    features: [
      "Everything in Premium",
      "Volume seat licensing",
      "Custom data exports",
      "Dedicated account management",
    ],
  },
];

export const PLAN_COMPARE: { feature: string; standard: string; premium: string; enterprise: string }[] = [
  { feature: "Data updates", standard: "Weekly", premium: "Daily", enterprise: "Daily" },
  { feature: "Global map with freight enquiry & trade flow layers", standard: "Yes", premium: "Yes", enterprise: "Yes" },
  { feature: "Freight calculator with FOB netback", standard: "Yes", premium: "Yes", enterprise: "Yes" },
  { feature: "Vessel fixtures & concluded shipments module", standard: "Yes", premium: "Yes", enterprise: "Yes" },
  { feature: "Country panels with 5-year history", standard: "Yes", premium: "Yes", enterprise: "Yes" },
  { feature: "AQ View commentary feed", standard: "Yes", premium: "Yes", enterprise: "Yes" },
  { feature: "Trend intelligence: pace, direction, projection", standard: "—", premium: "Yes", enterprise: "Yes" },
  { feature: "Named shipper & consignee (BL)", standard: "—", premium: "Yes", enterprise: "Yes" },
  { feature: "Live port lineups", standard: "—", premium: "Yes", enterprise: "Yes" },
  { feature: "Aquifert proprietary estimates", standard: "—", premium: "Yes", enterprise: "Yes" },
  { feature: "Alerts on WhatsApp & email", standard: "Weekly digest", premium: "As it happens", enterprise: "As it happens" },
  { feature: "AQ Bot & personalised reports", standard: "Limited", premium: "20 / month", enterprise: "Unlimited" },
  { feature: "Seats", standard: "1", premium: "1", enterprise: "Volume licensing" },
  { feature: "Custom data exports & account manager", standard: "—", premium: "—", enterprise: "Yes" },
];

// ---------------------------------------------------------------------------
// Shared API payload types
// ---------------------------------------------------------------------------

export interface BarItem {
  key: string;
  qty: number;
  count: number;
}

export interface EnquiryRow {
  id: number;
  product: string;
  qtyMin: number;
  qtyMax: number;
  loadPort: string;
  loadCountry: string;
  dischPort: string;
  dischCountry: string;
  laycanStart: string | null;
  laycanEnd: string | null;
  enquired: string; // ISO date the row entered the board (proxy: laycanStart - lead, else report date)
  stage: Stage;
}

export interface CountryPace {
  country: string;
  ytdMt: number;
  avg5yMt: number | null; // null = no history → coverage gap
  pctVsAvg: number | null;
  status: PaceStatus;
}

export interface MapKpis {
  enquiredMt30d: number;
  enquiredWowPct: number | null;
  openEnquiries: number;
  newLast72h: number;
  vesselsInLineup: number;
  lineupPorts: number;
  concludedMt30d: number;
  concludedCountries: number;
}

export interface LaneEstimateInput {
  loadPort: string;
  dischPort: string;
  product: string;
  quantityMt: number;
  market: "normal" | "tight" | "soft";
  loadPortCostUsd: number;
  dischPortCostUsd: number;
  agencyUsd: number;
  extraPortDays: number;
  cfrPriceUsd: number | null;
}

export interface LaneEstimate {
  loadPort: string;
  dischPort: string;
  distanceNm: number;
  vesselType: string;
  voyageDays: number;
  seaDays: number;
  loadDays: number;
  dischDays: number;
  freightPerMt: number;
  grossRevenue: number;
  tcePerDay: number;
  bunkerT: number;
  bunkerPriceT: number;
  bunkerCost: number;
  portCosts: number;
  canalCosts: number;
  agencyFees: number;
  totalVoyageCost: number;
  dailyHire: number;
  totalTimeCost: number;
  fobNetback: number | null;
  bdiReference: number;
  method: string;
}

/** Great-circle distance in nautical miles. */
export function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
