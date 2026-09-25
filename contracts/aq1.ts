/**
 * AQ1 free-plan account — shared constants.
 * Additive module: nothing existing is modified. Menu order, tooltip copy and
 * promo copy are specified verbatim by the product brief; do not reword.
 */

/** Note: the AQ1_ENABLED flag lives server-side (api/aq1-router.ts → aq1.config)
 *  so the same bundle can switch the feature off without a rebuild. */

export type Aq1MenuKey =
  | "telex" | "analysis" | "signal" | "nitrogen" | "ureaCalc"
  | "freightAnalytics" | "orderNow" | "communityCall" | "userGuide" | "contact";

export const AQ1_MENU: { key: Aq1MenuKey; label: string; to: string; locked?: "AQ_ANALYTICS" | "AQ0" }[] = [
  { key: "telex", label: "Market TELEX Feed", to: "/account/telex" },
  { key: "analysis", label: "AQ Market Analysis Feed", to: "/account/analysis" },
  { key: "signal", label: "AQ Signal", to: "/account/signal" },
  { key: "ureaCalc", label: "Urea Cost Calculator", to: "/account/urea-calculator" },
  { key: "freightAnalytics", label: "Freight Analytics", to: "/account/freight-analytics", locked: "AQ_ANALYTICS" },
  { key: "orderNow", label: "Order Fertilizer Now", to: "/account/order-now", locked: "AQ0" },
  { key: "communityCall", label: "Community Call", to: "/account/community-call" },
  { key: "userGuide", label: "User Guide", to: "/account/user-guide" },
  { key: "contact", label: "Contact Us", to: "/account/contact" },
];

/** Verbatim tooltip copy (brief Section 5). {reports}/{calcs} are interpolated
 *  from the live configured limits at render time — a literal "{" must never render. */
export const AQ1_TOOLTIPS: Record<Aq1MenuKey, string> = {
  telex: "A running feed of fertilizer market intelligence from the Aquifert desk: tenders, price moves, plant outages, policy changes and trade flows, newest first. Read it first thing to see what moved overnight.",
  analysis: "The desk's interpretation of the news, not just the news itself. Short analytical notes explaining why a price moved and what it means for a buyer. Use it when you know what happened but not what it implies.",
  signal: "Rolling market snapshots over four windows — 7, 30, 60 and 90 days. Each shows what prices have done across that period, the direction of travel, and the events that drove it. Use 7 days for timing a purchase and 90 days to see the real trend through the noise.",
  nitrogen: "Ask Aquibot to build you a nitrogen market report on demand, covering urea, ammonia, AN, CAN, UAN and ammonium sulphate. It writes only from Aquifert's own price records and desk intelligence, and cites every figure it uses. Your plan includes {reports} reports a month.",
  ureaCalc: "Works out what a tonne of urea actually costs you delivered — or what your farm-gate price implies back at FOB. It adds freight, discharge, bagging, duty and finance, shows the full cost ladder, and ranks which origin lands cheapest. Your plan includes {calcs} calculations a month.",
  freightAnalytics: "Trade-flow and freight-rate intelligence: which corridors are moving, at what rate, and where new lanes are opening before they price in. Part of AQ Analytics — low cost, high ROI, and an unbiased view.",
  orderNow: "Tell us what you need — product, quantity, ports and packing — and the Aquifert desk sources it, prices it and ships it. Ordering runs on the AQ0 plan, which unlocks quotes, contracts and shipment tracking.",
  communityCall: "A free 45-minute call where the Aquifert desk walks through the current market and takes questions from buyers and traders. Register once and we'll send you the invitation and a calendar hold.",
  userGuide: "Step-by-step walkthroughs of every part of Aquifert, including what each number means and how the calculators work. Start here if something isn't obvious.",
  contact: "Reach the Aquifert desk by WhatsApp, phone, email or a booked call. Use this when you want a person rather than a screen.",
};

export const AQ1_LIMIT_KEYS = {
  nitrogenReportsPerMonth: "aq1.limit.nitrogenReportsPerMonth",
  ureaCalcsPerMonth: "aq1.limit.ureaCalcsPerMonth",
  savedReportsRetained: "aq1.limit.savedReportsRetained",
} as const;

export const AQ1_DEFAULT_LIMITS = { nitrogenReportsPerMonth: 2, ureaCalcsPerMonth: 5, savedReportsRetained: 10 } as const;

export const PACKING_STYLES = [
  "Bulk", "25kg bags", "50kg bags", "500kg big bags", "1000kg big bags", "Bagged in containers", "Other",
] as const;

export const INCOTERMS = ["FOB", "CFR", "CIF", "EXW", "DAP", "DDP"] as const;

export const AQ1_PRODUCTS = [
  "Urea (granular)", "Urea (prilled)", "Ammonia", "Ammonium Nitrate", "CAN", "UAN",
  "Ammonium Sulphate", "DAP", "MAP", "TSP", "SSP", "MOP", "SOP", "NPK", "Phosphoric Acid", "Sulphur",
] as const;

export const NITROGEN_PRODUCTS = [
  "Urea (granular)", "Urea (prilled)", "Ammonia", "Ammonium Nitrate", "CAN", "UAN", "Ammonium Sulphate",
] as const;

export const AQ1_REGIONS = [
  "Global", "North West Europe", "Middle East", "Black Sea", "Baltic", "US Gulf",
  "Brazil", "India", "China", "Southeast Asia", "North Africa", "East Africa", "Southern Africa",
] as const;

export const PORTS = [
  "Antwerp", "Belfast", "Constanta", "Durban", "Gdynia", "Hamburg", "Immingham", "Jebel Ali",
  "Kandla", "Liverpool", "Mundra", "New Orleans", "Nhava Sheva", "Novorossiysk", "Paranaguá",
  "Qingdao", "Ravenna", "Rijeka", "Rotterdam", "Santos", "St Petersburg", "Teesport", "Yuzhny",
] as const;

export const PROMOS = {
  A: {
    title: "Buy fertilizer now, delivered",
    body: "Tell the desk what you need and we source, price and ship it.",
    cta: "Order fertilizer now",
    to: "/account/order-now",
  },
  B: {
    title: "Need a trader's view? Call now",
    body: "Talk to someone who trades this market every day.",
    cta: "Book a call",
    to: "/account/contact",
  },
  C: {
    title: "AQ Analytics",
    body: "Low cost, high ROI, and an unbiased view.",
    cta: "Set up AQ Analytics",
    to: "/account/freight-analytics",
  },
} as const;

export const TOUR_STOPS: { key: Aq1MenuKey; title: string; blurb: string }[] = [
  { key: "telex", title: "Market TELEX Feed", blurb: "Start here — what moved overnight." },
  { key: "signal", title: "AQ Signal", blurb: "See the trend over 7, 30, 60 or 90 days." },
  { key: "ureaCalc", title: "Urea Cost Calculator", blurb: "Work out your real delivered cost." },
  { key: "orderNow", title: "Order Fertilizer Now", blurb: "Ready to buy? This is where you start." },
];

/** AQ Signal product groups → market_data commodities */
export const SIGNAL_GROUPS: { group: string; items: { label: string; commodity: string }[] }[] = [
  { group: "Nitrogen", items: [{ label: "Urea", commodity: "UREA" }] },
  { group: "Phosphates", items: [{ label: "DAP", commodity: "DAP" }, { label: "MAP", commodity: "MAP" }] },
  { group: "Potash", items: [{ label: "MOP", commodity: "MOP" }] },
  { group: "Freight & Feedstock", items: [] },
];

export const SIGNAL_WINDOWS = [7, 30, 60, 90] as const;

export const MEMBERSHIP_PLANS_TEASER =
  "Plans start at £2,000/month (Sprout, up to 50 t/month), £5,000/month (Harvest, 51–200 t/month) and £7,000/month (Scale, 201+ t/month); annual billing saves two months.";
