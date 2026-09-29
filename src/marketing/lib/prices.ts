/** Public price indications (Aquifert desk sample set) used by the footer registry and lead report. */
export const PRICES_AS_OF = "2026-09-17T21:07:00.000Z";

export type PriceRow = {
  id: number;
  product: string;
  grade: string | null;
  basis: string;
  location: string;
  currency: string;
  unit: string;
  value: number;
  changeAbs: number;
  changePct: number;
  direction: "UP" | "DOWN" | "FLAT";
  region: string;
  dataAsOf: string;
};

const row = (r: Omit<PriceRow, "currency" | "unit" | "dataAsOf">): PriceRow => ({
  currency: "USD",
  unit: "t",
  dataAsOf: PRICES_AS_OF,
  ...r,
});

const PRICES_ME: PriceRow[] = [
  row({ id: 1, product: "Urea", grade: "granular", basis: "FOB", location: "Middle East", value: 342.75, changeAbs: -0.65, changePct: -0.19, direction: "DOWN", region: "Middle East" }),
  row({ id: 2, product: "Urea", grade: "prilled", basis: "FOB", location: "Middle East", value: 328.5, changeAbs: 1.05, changePct: 0.32, direction: "UP", region: "Middle East" }),
  row({ id: 3, product: "Ammonium Nitrate", grade: null, basis: "FOB", location: "Black Sea", value: 298, changeAbs: 0, changePct: 0, direction: "FLAT", region: "Middle East" }),
  row({ id: 4, product: "Ammonium Sulphate", grade: null, basis: "CFR", location: "SE Asia", value: 168, changeAbs: -1.2, changePct: -0.71, direction: "DOWN", region: "Middle East" }),
  row({ id: 5, product: "UAN 32", grade: null, basis: "FOB", location: "NWE", value: 245, changeAbs: 2.1, changePct: 0.86, direction: "UP", region: "Middle East" }),
  row({ id: 6, product: "DAP", grade: null, basis: "FOB", location: "Morocco", value: 612, changeAbs: 1.05, changePct: 0.17, direction: "UP", region: "Middle East" }),
  row({ id: 7, product: "MAP", grade: null, basis: "CFR", location: "Brazil", value: 598, changeAbs: -0.4, changePct: -0.07, direction: "DOWN", region: "Middle East" }),
  row({ id: 8, product: "TSP", grade: null, basis: "FOB", location: "N. Africa", value: 455, changeAbs: 3.2, changePct: 0.71, direction: "UP", region: "Middle East" }),
  row({ id: 9, product: "SSP", grade: null, basis: "FOB", location: "India", value: 210, changeAbs: 0, changePct: 0, direction: "FLAT", region: "Middle East" }),
  row({ id: 10, product: "MOP", grade: null, basis: "CFR", location: "SE Asia", value: 285, changeAbs: -0.5, changePct: -0.18, direction: "DOWN", region: "Middle East" }),
  row({ id: 11, product: "SOP", grade: null, basis: "FOB", location: "NW Europe", value: 620, changeAbs: 1.8, changePct: 0.29, direction: "UP", region: "Middle East" }),
  row({ id: 12, product: "Ammonia", grade: null, basis: "FOB", location: "Middle East", value: 410, changeAbs: 4.5, changePct: 1.11, direction: "UP", region: "Middle East" }),
  row({ id: 13, product: "Phosphoric Acid", grade: null, basis: "CFR", location: "India", value: 980, changeAbs: -2, changePct: -0.2, direction: "DOWN", region: "Middle East" }),
  row({ id: 14, product: "Sulphur", grade: null, basis: "FOB", location: "Middle East", value: 118, changeAbs: 0.5, changePct: 0.42, direction: "UP", region: "Middle East" }),
];

const PRICES_FREIGHT: PriceRow[] = [
  row({ id: 21, product: "Handysize", grade: null, basis: "USD/t", location: "ME → Brazil", value: 42, changeAbs: -0.5, changePct: -1.18, direction: "DOWN", region: "Freight" }),
  row({ id: 22, product: "Supramax", grade: null, basis: "USD/t", location: "Black Sea → India", value: 38, changeAbs: 0.8, changePct: 2.15, direction: "UP", region: "Freight" }),
  row({ id: 23, product: "Panamax", grade: null, basis: "USD/t", location: "USG → NWE", value: 28, changeAbs: 0, changePct: 0, direction: "FLAT", region: "Freight" }),
];

export const PRICE_SLIDER_ENABLED = process.env.NEXT_PUBLIC_PRICE_SLIDER_ENABLED !== "false";

export const PRICE_REGIONS = [
  "Middle East",
  "Black Sea",
  "Baltic",
  "North Africa",
  "North West Europe",
  "US Gulf",
  "Brazil",
  "India",
  "China",
  "Southeast Asia",
  "East Africa",
  "Southern Africa",
  "Freight",
] as const;

export function priceSlider(region: string) {
  const items =
    region === "Freight"
      ? PRICES_FREIGHT
      : region === "All"
        ? [...PRICES_ME, ...PRICES_FREIGHT]
        : PRICES_ME;
  return {
    region,
    asOf: PRICES_AS_OF,
    items: items.map((p) => ({
      ...p,
      sourceCode: "AQ_DESK",
      sourceName: "Aquifert desk assessments",
      stale: false,
    })),
  };
}

export type PriceSource = {
  code: string;
  name: string;
  url: string;
  attributionText: string | null;
  refreshCadence: string;
  dataAsOf: string | null;
};

export const PRICE_SOURCES: PriceSource[] = [
  {
    code: "AQ_DESK",
    name: "Aquifert desk assessments",
    url: "https://aquifert.com",
    attributionText: "Aquifert desk assessments (sample)",
    refreshCadence: "7 days",
    dataAsOf: PRICES_AS_OF,
  },
];
