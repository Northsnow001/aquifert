/**
 * AQUIFERT market-price seed, run with: npx tsx db/seed-prices.ts
 * Idempotent: skips if price_sources already populated.
 *
 * Licit sources only: open datasets / official APIs the publisher offers
 * for reuse, plus Aquifert desk assessments. No scraped PRA data.
 */
import "dotenv/config";
import { getDb } from "../server/queries/connection";
import * as s from "./schema";

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5);

const SOURCES = [
  {
    code: "WORLD_BANK_PINK",
    name: "World Bank Commodity Price Data (Pink Sheet)",
    url: "https://www.worldbank.org/en/research/commodity-markets",
    licenceType: "Open data (CC BY 4.0)",
    attributionText: "Source: World Bank Commodity Price Data (Pink Sheet).",
    redistributionAllowed: true,
    refreshCadence: "MONTHLY",
    owner: "Aquifert Market Data",
  },
  {
    code: "IMF_PCP",
    name: "IMF Primary Commodity Prices",
    url: "https://www.imf.org/en/Research/commodity-prices",
    licenceType: "Open data (IMF terms)",
    attributionText: "Source: IMF Primary Commodity Prices.",
    redistributionAllowed: true,
    refreshCadence: "MONTHLY",
    owner: "Aquifert Market Data",
  },
  {
    code: "USDA_AMS",
    name: "USDA Agricultural Marketing Service",
    url: "https://www.ams.usda.gov/market-news/fertilizer",
    licenceType: "Public domain (US Gov)",
    attributionText: "Source: USDA Agricultural Marketing Service.",
    redistributionAllowed: true,
    refreshCadence: "WEEKLY",
    owner: "Aquifert Market Data",
  },
  {
    code: "FAOSTAT",
    name: "FAOSTAT, Food and Agriculture Organization",
    url: "https://www.fao.org/faostat/",
    licenceType: "Open data (CC BY-NC-SA 3.0 IGO)",
    attributionText: "Source: FAOSTAT, Food and Agriculture Organization of the United Nations.",
    redistributionAllowed: true,
    refreshCadence: "ANNUAL",
    owner: "Aquifert Market Data",
  },
  {
    code: "AQUIFERT_DESK",
    name: "Aquifert Desk Assessment",
    url: "https://aquifert.com",
    licenceType: "Internal, Aquifert desk",
    attributionText: "Aquifert desk assessment.",
    redistributionAllowed: true,
    refreshCadence: "WEEKLY",
    owner: "Aquifert Market Data",
  },
  {
    // Placeholder only, licensed PRA feed. Never render publicly.
    code: "PRA_LICENSED",
    name: "Price Reporting Agency (licensed feed, not public)",
    url: "https://example-pra.invalid",
    licenceType: "Licensed, no redistribution",
    attributionText: "Licensed data, internal use only.",
    redistributionAllowed: false,
    refreshCadence: "DAILY",
    owner: "Aquifert Market Data",
    enabled: false,
  },
];

const PRODUCTS: { product: string; grade?: string; basis: string; base: number }[] = [
  { product: "Urea", grade: "Prilled", basis: "FOB", base: 340 },
  { product: "Urea", grade: "Granular", basis: "FOB", base: 355 },
  { product: "Urea", grade: "Prilled", basis: "CFR", base: 385 },
  { product: "DAP", basis: "FOB", base: 560 },
  { product: "DAP", basis: "CFR", base: 595 },
  { product: "MAP", basis: "FOB", base: 545 },
  { product: "MAP", basis: "CFR", base: 580 },
  { product: "MOP", grade: "Standard", basis: "FOB", base: 315 },
  { product: "MOP", grade: "Granular", basis: "CFR", base: 360 },
  { product: "SOP", basis: "FOB", base: 520 },
  { product: "TSP", basis: "FOB", base: 430 },
  { product: "SSP", basis: "CFR", base: 220 },
  { product: "Ammonium Nitrate", basis: "FOB", base: 290 },
  { product: "Ammonium Sulphate", basis: "FOB", base: 175 },
  { product: "Calcium Ammonium Nitrate", basis: "FOB", base: 260 },
  { product: "UAN 32", basis: "FOB", base: 250 },
  { product: "NPK 15-15-15", basis: "FOB", base: 470 },
  { product: "NPK 20-10-10", basis: "CFR", base: 500 },
  { product: "NPK 12-24-12", basis: "CFR", base: 490 },
  { product: "Ammonia", basis: "FOB", base: 480 },
  { product: "Phosphoric Acid", basis: "FOB", base: 880 },
  { product: "Sulphur", basis: "FOB", base: 110 },
];

const REGIONS: { region: string; location: string; mult: number; src: string }[] = [
  { region: "Middle East", location: "Arabian Gulf", mult: 1.0, src: "AQUIFERT_DESK" },
  { region: "Black Sea", location: "Yuzhny", mult: 0.97, src: "AQUIFERT_DESK" },
  { region: "Baltic", location: "Baltic ports", mult: 0.98, src: "AQUIFERT_DESK" },
  { region: "North Africa", location: "Egypt", mult: 1.02, src: "AQUIFERT_DESK" },
  { region: "North West Europe", location: "ARA", mult: 1.08, src: "USDA_AMS" },
  { region: "US Gulf", location: "NOLA", mult: 1.05, src: "USDA_AMS" },
  { region: "Brazil", location: "Paranaguá", mult: 1.12, src: "AQUIFERT_DESK" },
  { region: "India", location: "West Coast India", mult: 1.1, src: "IMF_PCP" },
  { region: "China", location: "China domestic", mult: 1.03, src: "AQUIFERT_DESK" },
  { region: "Southeast Asia", location: "SE Asia CFR", mult: 1.09, src: "AQUIFERT_DESK" },
  { region: "East Africa", location: "Mombasa", mult: 1.18, src: "WORLD_BANK_PINK" },
  { region: "Southern Africa", location: "Durban", mult: 1.15, src: "FAOSTAT" },
];

async function main() {
  const db = getDb();
  const existing = await db.select().from(s.priceSources).limit(1);
  if (existing.length > 0) {
    console.log("price_sources already seeded, skipping.");
    return;
  }

  const srcIds = new Map<string, number>();
  for (const src of SOURCES) {
    const r = await db
      .insert(s.priceSources)
      .values({
        ...src,
        lastFetchedAt: daysAgo(1),
        dataAsOf: daysAgo(3),
        enabled: src.enabled !== false,
      })
      .returning({ id: s.priceSources.id });
    srcIds.set(src.code, Number(r[0].id));
  }

  let count = 0;
  for (const region of REGIONS) {
    for (const p of PRODUCTS) {
      const value = Math.round(p.base * region.mult * (0.96 + rand() * 0.08) * 100) / 100;
      const drift = (rand() - 0.48) * 0.06;
      const previousValue = Math.round((value / (1 + drift)) * 100) / 100;
      const changeAbs = Math.round((value - previousValue) * 100) / 100;
      const changePct = Math.round((changeAbs / previousValue) * 10000) / 100;
      const direction = changeAbs > 0.005 ? "UP" : changeAbs < -0.005 ? "DOWN" : "FLAT";
      await db.insert(s.prices).values({
        product: p.product,
        grade: p.grade ?? null,
        basis: p.basis,
        region: region.region,
        location: region.location,
        currency: "USD",
        unit: "tonne",
        value,
        previousValue,
        changeAbs,
        changePct,
        direction,
        sourceId: srcIds.get(region.src)!,
        dataAsOf: daysAgo(3),
      });
      count++;
    }
  }
  console.log(`Seeded ${srcIds.size} sources and ${count} price rows.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
