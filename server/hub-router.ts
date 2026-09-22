import { z } from "zod";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as s from "@db/schema";
import { effUser, assertStaff, logActivity, fmtActor } from "./rbac";
import { ingestAllNews } from "./ingest-news";

const PRODUCTS = ["NITROGEN", "PHOSPHATE", "POTASSIUM", "FREIGHT", "GENERAL"] as const;
const REGIONS = [
  "GLOBAL", "MIDDLE_EAST", "NORTH_AMERICA", "SOUTH_AMERICA", "EUROPE",
  "SOUTH_ASIA", "EAST_ASIA", "FSU", "AFRICA",
] as const;

function cadenceToHours(cadence: string): number {
  const m = cadence.match(/(\d+)\s*(h|hour|d|day|w|week)/i);
  if (!m) return 24;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  if (unit.startsWith("h")) return n;
  if (unit.startsWith("d")) return n * 24;
  return n * 24 * 7;
}

export type Freshness = {
  level: "green" | "amber" | "red";
  asOf: string | null;
  ageHours: number | null;
  cadence: string;
  source: string;
  owner: string;
  nextExpected: string | null;
};

export function freshness(asOf: Date | null, cadence: string, source: string, owner: string): Freshness {
  if (!asOf) {
    return { level: "red", asOf: null, ageHours: null, cadence, source, owner, nextExpected: null };
  }
  const ageHours = (Date.now() - asOf.getTime()) / 3.6e6;
  const cadenceHours = cadenceToHours(cadence);
  const level = ageHours <= cadenceHours ? "green" : ageHours <= cadenceHours * 2 ? "amber" : "red";
  return {
    level,
    asOf: asOf.toISOString(),
    ageHours: Math.round(ageHours * 10) / 10,
    cadence,
    source,
    owner,
    nextExpected: new Date(asOf.getTime() + cadenceHours * 3.6e6).toISOString(),
  };
}

export const hubRouter = createRouter({
  /* ------------------------------------------------ market gauges */
  indicators: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    const rows = await getDb().query.hubIndicators.findMany();
    return rows.map((r) => ({
      ...r,
      label: r.score < 40 ? "Bearish" : r.score > 60 ? "Bullish" : "Neutral",
      freshness: freshness(r.updatedAt, "7 days", "Aquifert Trading Desk", r.updatedBy),
    }));
  }),

  updateIndicator: authedQuery
    .input(z.object({
      nutrient: z.enum(["NITROGEN", "PHOSPHATE", "POTASSIUM"]),
      score: z.number().int().min(0).max(100),
      rationale: z.string().min(20, "Every gauge move requires an editor rationale."),
    }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const db = getDb();
      const row = await db.query.hubIndicators.findFirst({
        where: eq(s.hubIndicators.nutrient, input.nutrient),
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      const history = [...row.history, { date: new Date().toISOString().slice(0, 10), score: input.score }]
        .slice(-90);
      await db.update(s.hubIndicators)
        .set({ score: input.score, rationale: input.rationale, history, updatedBy: fmtActor(me), updatedAt: new Date() })
        .where(eq(s.hubIndicators.id, row.id));
      await logActivity(fmtActor(me), `Updated ${input.nutrient} gauge to ${input.score}`, "hub_indicator", String(row.id), me.id);
      return { ok: true };
    }),

  /* --------------------------------------------------- TELEX feed */
  telex: authedQuery
    .input(z.object({
      cursor: z.number().nullish(),
      limit: z.number().min(1).max(50).default(20),
      products: z.array(z.string()).default([]),
      regions: z.array(z.string()).default([]),
    }))
    .query(async ({ ctx, input }) => {
      await effUser(ctx.user);
      const conds = [];
      if (input.cursor) conds.push(lt(s.telexItems.id, input.cursor));
      if (input.products.length) conds.push(inArray(s.telexItems.product, input.products));
      if (input.regions.length) conds.push(inArray(s.telexItems.geography, input.regions));
      const rows = await getDb().query.telexItems.findMany({
        where: conds.length ? and(...conds) : undefined,
        orderBy: desc(s.telexItems.id),
        limit: input.limit + 1,
      });
      const hasMore = rows.length > input.limit;
      const items = rows.slice(0, input.limit);
      const latest = await getDb().query.telexItems.findFirst({ orderBy: desc(s.telexItems.updatedAt) });
      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
        freshness: freshness(latest?.updatedAt ?? null, "4 hours", "Aquifert Desk TELEX", "Trading Desk"),
      };
    }),

  /* ---------------------------------------------------- news feed */
  news: authedQuery
    .input(z.object({
      products: z.array(z.string()).default([]),
      regions: z.array(z.string()).default([]),
      limit: z.number().min(1).max(60).default(30),
    }))
    .query(async ({ ctx, input }) => {
      await effUser(ctx.user);
      const db = getDb();
      const conds = [];
      if (input.products.length) conds.push(inArray(s.newsItems.product, input.products));
      if (input.regions.length) conds.push(inArray(s.newsItems.geography, input.regions));
      const rows = await db.query.newsItems.findMany({
        where: conds.length ? and(...conds) : undefined,
        orderBy: desc(s.newsItems.publishedAt),
        limit: input.limit,
      });
      const sources = await db.query.newsSources.findMany();
      const byId = new Map(sources.map((x) => [x.id, x]));
      const items = rows
        .map((r) => {
          const src = byId.get(r.sourceId);
          if (!src) return null;
          return {
            id: r.id, headline: r.headline, url: r.url, snippet: r.snippet,
            publishedAt: r.publishedAt, product: r.product, geography: r.geography,
            sourceName: src.name, siteUrl: src.siteUrl, attribution: src.attributionText,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
      // Panel freshness = freshest enabled source; failure detail surfaced per source.
      const enabled = sources.filter((x) => x.enabled);
      const freshest = enabled.reduce<s.NewsSource | null>(
        (a, b) => (!a || (b.dataAsOf && (!a.dataAsOf || b.dataAsOf > a.dataAsOf)) ? b : a), null);
      return {
        items,
        sources: enabled.map((x) => ({
          code: x.code, name: x.name, siteUrl: x.siteUrl, cadence: x.refreshCadence,
          dataAsOf: x.dataAsOf, lastError: x.lastError,
        })),
        freshness: freshness(
          freshest?.dataAsOf ?? null,
          freshest?.refreshCadence ?? "6 hours",
          freshest?.name ?? "Publisher feeds",
          freshest?.owner ?? "Market Data",
        ),
      };
    }),

  /** Manual ingestion trigger, staff only (also wired to run on a schedule in prod). */
  ingestNews: authedQuery.mutation(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    assertStaff(me);
    return ingestAllNews();
  }),

  /* ----------------------------------------------- price board hub */
  freight: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    const db = getDb();
    const enquiries = await db.query.freightEnquiries.findMany({ orderBy: desc(s.freightEnquiries.createdAt), limit: 12 });
    const commentary = await db.query.hubCommentary.findFirst({
      where: eq(s.hubCommentary.kind, "FREIGHT"),
      orderBy: desc(s.hubCommentary.publishedAt),
    });
    return {
      enquiries,
      commentary,
      freshness: freshness(
        commentary?.publishedAt ?? null, "7 days",
        "Aquifert Freight Desk", commentary?.byline ?? "Freight Desk"),
    };
  }),

  commentary: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    const c = await getDb().query.hubCommentary.findFirst({
      where: eq(s.hubCommentary.kind, "MARKET"),
      orderBy: desc(s.hubCommentary.publishedAt),
    });
    return {
      commentary: c,
      freshness: freshness(c?.publishedAt ?? null, "7 days", "AQ VIEW", c?.byline ?? "Trading Desk"),
    };
  }),

  /* --------------------------------------------- saved preferences */
  prefs: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    const row = await getDb().query.hubPrefs.findFirst({ where: eq(s.hubPrefs.userId, me.id) });
    return row ? { products: row.products, regions: row.regions } : null;
  }),

  savePrefs: authedQuery
    .input(z.object({ products: z.array(z.string()), regions: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      const db = getDb();
      await db
        .insert(s.hubPrefs)
        .values({
          userId: me.id,
          products: input.products,
          regions: input.regions,
        })
        .onConflictDoUpdate({
          target: s.hubPrefs.userId,
          set: {
            products: input.products,
            regions: input.regions,
            updatedAt: new Date(),
          },
        });
      return { ok: true };
    }),

  /** Interest hints from the B4 lead capture (matched by email) for first-load pre-filtering. */
  interestHints: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    if (!me.email) return null;
    const lead = await getDb().query.leads.findFirst({
      where: eq(s.leads.email, me.email.toLowerCase()),
      orderBy: desc(s.leads.id),
    });
    if (!lead) return null;
    const mapProduct = (p: string): string | null => {
      if (["Urea", "Ammonium Sulphate", "UAN/AN/CAN", "Ammonia"].includes(p)) return "NITROGEN";
      if (["DAP/MAP", "TSP/SSP", "Phosphate rock"].includes(p)) return "PHOSPHATE";
      if (p === "MOP/SOP") return "POTASSIUM";
      return null; // NPK / solubles / micronutrients / sulphur / unsure → no filter
    };
    const mapRegion = (r: string): string | null => ({
      "Middle East": "MIDDLE_EAST", "Black Sea": "FSU", "Baltic": "FSU",
      "North Africa": "AFRICA", "North West Europe": "EUROPE", "US Gulf": "NORTH_AMERICA",
      "Brazil": "SOUTH_AMERICA", "India": "SOUTH_ASIA", "China": "EAST_ASIA",
      "Southeast Asia": "EAST_ASIA", "East Africa": "AFRICA", "Southern Africa": "AFRICA",
    } as Record<string, string>)[r] ?? null;
    const products = [...new Set((lead.products ?? []).map(mapProduct).filter((x): x is string => !!x))];
    const regions = [...new Set((lead.regions ?? []).map(mapRegion).filter((x): x is string => !!x))];
    if (!products.length && !regions.length) return null;
    return { products, regions };
  }),

  taxonomies: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    return { products: PRODUCTS, regions: REGIONS };
  }),
});

