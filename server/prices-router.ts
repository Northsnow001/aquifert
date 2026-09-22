import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as s from "../db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import { isStale } from "./ingest-prices";

const REGIONS = [
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
] as const;

function toDTO(p: s.Price, src: s.PriceSource) {
  const stale = isStale(src.dataAsOf, src.refreshCadence);
  return {
    id: Number(p.id),
    product: p.product,
    grade: p.grade,
    basis: p.basis,
    region: p.region,
    location: p.location,
    currency: p.currency,
    unit: p.unit,
    value: p.value,
    changeAbs: p.changeAbs,
    changePct: p.changePct,
    direction: p.direction,
    sourceCode: src.code,
    sourceName: src.name,
    dataAsOf: p.dataAsOf,
    stale,
  };
}

export const pricesRouter = createRouter({
  /** Feature flag, the band hides entirely when PRICE_SLIDER_ENABLED=false. */
  enabled: publicQuery.query(() => process.env.PRICE_SLIDER_ENABLED !== "false"),

  /** Region list for the slider dropdown. */
  regions: publicQuery.query(() => [...REGIONS]),

  /**
   * Slider prices for one region, or every region when region is "All".
   * Values from sources where redistributionAllowed is false, or the source
   * is disabled, are NEVER returned.
   */
  slider: publicQuery
    .input(z.object({ region: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const sources = await db.select().from(s.priceSources);
      const allowed = new Map(
        sources
          .filter((x) => x.redistributionAllowed && x.enabled)
          .map((x) => [Number(x.id), x])
      );
      const rows = input.region === "All"
        ? await db.select().from(s.prices).orderBy(asc(s.prices.product), desc(s.prices.dataAsOf))
        : await db
            .select()
            .from(s.prices)
            .where(eq(s.prices.region, input.region))
            .orderBy(asc(s.prices.product), desc(s.prices.dataAsOf));
      const items = rows
        .filter((r) => allowed.has(Number(r.sourceId)))
        .map((r) => toDTO(r, allowed.get(Number(r.sourceId))!));
      const asOf = items.reduce<Date | null>(
        (acc, i) => (!acc || i.dataAsOf > acc ? i.dataAsOf : acc),
        null
      );
      return { region: input.region, asOf, items };
    }),

  /** Source registry for the footer Market Data block (public info only). */
  sources: publicQuery.query(async () => {
    const db = getDb();
    const sources = await db
      .select()
      .from(s.priceSources)
      .where(and(eq(s.priceSources.redistributionAllowed, true), eq(s.priceSources.enabled, true)))
      .orderBy(asc(s.priceSources.name));
    return sources.map((x) => ({
      code: x.code,
      name: x.name,
      url: x.url,
      attributionText: x.attributionText,
      refreshCadence: x.refreshCadence,
      dataAsOf: x.dataAsOf,
    }));
  }),
});
