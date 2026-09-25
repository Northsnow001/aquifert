/**
 * Sample Hub content — server + client. No Drizzle / no live feed required.
 */
export const HUB_AS_OF = "2026-09-17T21:07:00.000Z";

export function hubFreshness(
  asOf = HUB_AS_OF,
  cadence = "7 days",
  source = "Aquifert Trading Desk",
  owner = "Trading Desk",
) {
  const t = new Date(asOf).getTime();
  const ageHours = Math.round(((Date.now() - t) / 3.6e6) * 10) / 10;
  return {
    level: (ageHours <= 168 ? "amber" : "red") as "green" | "amber" | "red",
    asOf,
    ageHours,
    cadence,
    source,
    owner,
    nextExpected: null as string | null,
  };
}

export const SAMPLE_HUB_INDICATORS = [
  {
    id: 1,
    nutrient: "NITROGEN" as const,
    score: 62,
    label: "Bullish",
    rationale:
      "Fresh Indian tender and firm Egyptian FOB keep the desk constructive; China export policy remains the swing factor into October.",
    history: [
      { date: "2026-06-20", score: 55 },
      { date: "2026-07-15", score: 58 },
      { date: "2026-08-10", score: 60 },
      { date: "2026-09-01", score: 59 },
      { date: "2026-09-17", score: 62 },
    ],
    updatedBy: "Aquifert Trading Desk",
    updatedAt: HUB_AS_OF,
    freshness: hubFreshness(),
  },
  {
    id: 2,
    nutrient: "PHOSPHATE" as const,
    score: 54,
    label: "Neutral",
    rationale:
      "Brazil demand is winding down while Chinese export allocations and Indian parity keep the desk balanced rather than directional.",
    history: [
      { date: "2026-06-20", score: 52 },
      { date: "2026-07-15", score: 53 },
      { date: "2026-08-10", score: 55 },
      { date: "2026-09-01", score: 54 },
      { date: "2026-09-17", score: 54 },
    ],
    updatedBy: "Aquifert Trading Desk",
    updatedAt: HUB_AS_OF,
    freshness: hubFreshness(),
  },
  {
    id: 3,
    nutrient: "POTASSIUM" as const,
    score: 47,
    label: "Neutral",
    rationale:
      "SE Asia spot is flat; Baltic logistics works and no disruption is confirmed — desk stays neutral into Q4 contracts.",
    history: [
      { date: "2026-06-20", score: 50 },
      { date: "2026-07-15", score: 49 },
      { date: "2026-08-10", score: 48 },
      { date: "2026-09-01", score: 47 },
      { date: "2026-09-17", score: 47 },
    ],
    updatedBy: "Aquifert Trading Desk",
    updatedAt: HUB_AS_OF,
    freshness: hubFreshness(),
  },
];

export type SampleTelexItem = {
  id: number;
  title: string;
  body: string;
  product: string;
  geography: string;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const SAMPLE_TELEX_ITEMS: SampleTelexItem[] = [
  {
    id: 5,
    title: "POTASSIUM, Contract chatter",
    body: "SE Asia standard MOP contracts under discussion; spot remains quiet with soft liquidity.",
    product: "POTASSIUM",
    geography: "EAST_ASIA",
    createdAt: "2026-09-12T10:00:00.000Z",
    updatedAt: "2026-09-12T10:00:00.000Z",
  },
  {
    id: 4,
    title: "PHOSPHATE, TSP niche firm",
    body: "LatAm demand for TSP supports a firmer niche; mainstream DAP/MAP balanced.",
    product: "PHOSPHATE",
    geography: "SOUTH_AMERICA",
    createdAt: "2026-09-12T14:00:00.000Z",
    updatedAt: "2026-09-12T14:00:00.000Z",
  },
  {
    id: 3,
    title: "FREIGHT, Baltic dry index flat",
    body: "Dry bulk indices little changed week-on-week; fertilizer stems still finding cover.",
    product: "FREIGHT",
    geography: "GLOBAL",
    createdAt: "2026-09-13T09:00:00.000Z",
    updatedAt: "2026-09-13T09:00:00.000Z",
  },
  {
    id: 2,
    title: "NITROGEN, US fill done",
    body: "US fill season largely complete; attention shifts to Mexican and Brazilian stems.",
    product: "NITROGEN",
    geography: "NORTH_AMERICA",
    createdAt: "2026-09-13T16:00:00.000Z",
    updatedAt: "2026-09-13T16:00:00.000Z",
  },
  {
    id: 1,
    title: "India IPL issues urea tender for October shipment",
    body: "Fresh Indian tender keeps Middle East FOB constructive into October.",
    product: "NITROGEN",
    geography: "SOUTH_ASIA",
    createdAt: "2026-09-17T12:00:00.000Z",
    updatedAt: "2026-09-17T12:00:00.000Z",
  },
];

export const SAMPLE_TELEX_PAGE = {
  items: SAMPLE_TELEX_ITEMS,
  nextCursor: null as number | null,
  freshness: hubFreshness("2026-09-17T12:00:00.000Z", "4 hours", "Aquifert Desk TELEX", "Trading Desk"),
};

export type SamplePriceRow = {
  id: number;
  product: string;
  grade: string | null;
  basis: string;
  location: string;
  currency: string;
  unit: string;
  value: number;
  changeAbs: number | null;
  changePct: number | null;
  direction: "UP" | "DOWN" | "FLAT";
  region: string;
  dataAsOf: string;
};

export const SAMPLE_PRICES_ME: SamplePriceRow[] = [
  { id: 1, product: "Urea", grade: "granular", basis: "FOB", location: "Middle East", currency: "USD", unit: "t", value: 342.75, changeAbs: -0.65, changePct: -0.19, direction: "DOWN", region: "Middle East", dataAsOf: HUB_AS_OF },
  { id: 2, product: "Urea", grade: "prilled", basis: "FOB", location: "Middle East", currency: "USD", unit: "t", value: 328.5, changeAbs: 1.05, changePct: 0.32, direction: "UP", region: "Middle East", dataAsOf: HUB_AS_OF },
  { id: 3, product: "Ammonium Nitrate", grade: null, basis: "FOB", location: "Black Sea", currency: "USD", unit: "t", value: 298, changeAbs: 0, changePct: 0, direction: "FLAT", region: "Middle East", dataAsOf: HUB_AS_OF },
  { id: 4, product: "Ammonium Sulphate", grade: null, basis: "CFR", location: "SE Asia", currency: "USD", unit: "t", value: 168, changeAbs: -1.2, changePct: -0.71, direction: "DOWN", region: "Middle East", dataAsOf: HUB_AS_OF },
  { id: 5, product: "UAN 32", grade: null, basis: "FOB", location: "NWE", currency: "USD", unit: "t", value: 245, changeAbs: 2.1, changePct: 0.86, direction: "UP", region: "Middle East", dataAsOf: HUB_AS_OF },
  { id: 6, product: "DAP", grade: null, basis: "FOB", location: "Morocco", currency: "USD", unit: "t", value: 612, changeAbs: 1.05, changePct: 0.17, direction: "UP", region: "Middle East", dataAsOf: HUB_AS_OF },
  { id: 7, product: "MAP", grade: null, basis: "CFR", location: "Brazil", currency: "USD", unit: "t", value: 598, changeAbs: -0.4, changePct: -0.07, direction: "DOWN", region: "Middle East", dataAsOf: HUB_AS_OF },
  { id: 8, product: "TSP", grade: null, basis: "FOB", location: "N. Africa", currency: "USD", unit: "t", value: 455, changeAbs: 3.2, changePct: 0.71, direction: "UP", region: "Middle East", dataAsOf: HUB_AS_OF },
  { id: 9, product: "SSP", grade: null, basis: "FOB", location: "India", currency: "USD", unit: "t", value: 210, changeAbs: 0, changePct: 0, direction: "FLAT", region: "Middle East", dataAsOf: HUB_AS_OF },
  { id: 10, product: "MOP", grade: null, basis: "CFR", location: "SE Asia", currency: "USD", unit: "t", value: 285, changeAbs: -0.5, changePct: -0.18, direction: "DOWN", region: "Middle East", dataAsOf: HUB_AS_OF },
  { id: 11, product: "SOP", grade: null, basis: "FOB", location: "NW Europe", currency: "USD", unit: "t", value: 620, changeAbs: 1.8, changePct: 0.29, direction: "UP", region: "Middle East", dataAsOf: HUB_AS_OF },
  { id: 12, product: "Ammonia", grade: null, basis: "FOB", location: "Middle East", currency: "USD", unit: "t", value: 410, changeAbs: 4.5, changePct: 1.11, direction: "UP", region: "Middle East", dataAsOf: HUB_AS_OF },
  { id: 13, product: "Phosphoric Acid", grade: null, basis: "CFR", location: "India", currency: "USD", unit: "t", value: 980, changeAbs: -2, changePct: -0.2, direction: "DOWN", region: "Middle East", dataAsOf: HUB_AS_OF },
  { id: 14, product: "Sulphur", grade: null, basis: "FOB", location: "Middle East", currency: "USD", unit: "t", value: 118, changeAbs: 0.5, changePct: 0.42, direction: "UP", region: "Middle East", dataAsOf: HUB_AS_OF },
];

export const SAMPLE_PRICES_FREIGHT: SamplePriceRow[] = [
  { id: 21, product: "Handysize", grade: null, basis: "USD/t", location: "ME → Brazil", currency: "USD", unit: "t", value: 42, changeAbs: -0.5, changePct: -1.18, direction: "DOWN", region: "Freight", dataAsOf: HUB_AS_OF },
  { id: 22, product: "Supramax", grade: null, basis: "USD/t", location: "Black Sea → India", currency: "USD", unit: "t", value: 38, changeAbs: 0.8, changePct: 2.15, direction: "UP", region: "Freight", dataAsOf: HUB_AS_OF },
  { id: 23, product: "Panamax", grade: null, basis: "USD/t", location: "USG → NWE", currency: "USD", unit: "t", value: 28, changeAbs: 0, changePct: 0, direction: "FLAT", region: "Freight", dataAsOf: HUB_AS_OF },
];

export const SAMPLE_FREIGHT = {
  enquiries: [
    { id: 1, accountCode: "AQ-14", product: "Urea", qtyMt: 25000, origin: "Middle East", destination: "Brazil", laycan: "Oct 10–20" },
    { id: 2, accountCode: "AQ-22", product: "DAP", qtyMt: 15000, origin: "Morocco", destination: "NW Europe", laycan: "Sep 28–Oct 5" },
    { id: 3, accountCode: "AQ-09", product: "MOP", qtyMt: 30000, origin: "Baltic", destination: "SE Asia", laycan: "Oct 1–15" },
  ],
  commentary: {
    title: "Freight: dry bulk steady into October stems",
    byline: "Aquifert Freight Desk",
    publishedAt: HUB_AS_OF,
    paragraphs: [
      "Handysize and Supramax rates little changed week-on-week. Fertilizer stems still finding cover without a clear premium.",
      "Watch bunker costs into Q4; no disruption confirmed on Baltic or ME→Brazil corridors.",
    ],
  },
  freshness: hubFreshness(HUB_AS_OF, "7 days", "Aquifert Freight Desk", "Freight Desk"),
};

export const SAMPLE_COMMENTARY = {
  commentary: {
    id: 1,
    kind: "MARKET",
    title: "AQ VIEW: Balanced desks into late September",
    byline: "Aquifert Trading Desk",
    paragraphs: [
      "Nitrogen holds a mild constructive bias on tender timing.",
      "Phosphate floors supported by Brazilian demand.",
      "Potash remains the quieter nutrient with soft spot liquidity.",
    ],
    publishedAt: HUB_AS_OF,
  },
  freshness: hubFreshness(HUB_AS_OF, "7 days", "AQ VIEW", "Trading Desk"),
};

export const SAMPLE_NEWS = {
  items: [
    {
      id: 1,
      headline: "Egyptian urea FOB indications edge higher",
      url: "#",
      snippet: "Prompt stems tight; desk notes limited availability into October.",
      publishedAt: "2026-09-15T08:00:00.000Z",
      product: "NITROGEN",
      geography: "AFRICA",
      sourceName: "Aquifert Desk Wire",
      siteUrl: "#",
      attribution: "Aquifert Desk Wire",
      imageUrl: null as string | null,
    },
    {
      id: 2,
      headline: "Brazil MAP CFR levels steady ahead of planting",
      url: "#",
      snippet: "Importers covered; freights the residual swing factor.",
      publishedAt: "2026-09-15T12:00:00.000Z",
      product: "PHOSPHATE",
      geography: "SOUTH_AMERICA",
      sourceName: "Aquifert Desk Wire",
      siteUrl: "#",
      attribution: "Aquifert Desk Wire",
      imageUrl: null as string | null,
    },
  ],
  sources: [] as { code: string; name: string; siteUrl: string; cadence: string; dataAsOf: string | null; lastError: string | null }[],
  freshness: hubFreshness("2026-09-15T12:00:00.000Z", "6 hours", "Aquifert Desk Wire", "Market Data"),
};
