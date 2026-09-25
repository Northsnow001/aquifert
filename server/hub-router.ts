import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { getSupabaseService } from "./lib/supabase";
import { effUser, assertStaff, logActivity, fmtActor } from "./rbac";

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

export function freshness(asOf: Date | string | null, cadence: string, source: string, owner: string): Freshness {
  if (!asOf) {
    return { level: "red", asOf: null, ageHours: null, cadence, source, owner, nextExpected: null };
  }
  const t = typeof asOf === "string" ? new Date(asOf) : asOf;
  const ageHours = (Date.now() - t.getTime()) / 3.6e6;
  const cadenceHours = cadenceToHours(cadence);
  const level = ageHours <= cadenceHours ? "green" : ageHours <= cadenceHours * 2 ? "amber" : "red";
  return {
    level,
    asOf: t.toISOString(),
    ageHours: Math.round(ageHours * 10) / 10,
    cadence,
    source,
    owner,
    nextExpected: new Date(t.getTime() + cadenceHours * 3.6e6).toISOString(),
  };
}

export const hubRouter = createRouter({
  indicators: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    const { data, error } = await getSupabaseService().from("hub_indicators").select("*");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      ...r,
      updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
      label: Number(r.score) < 40 ? "Bearish" : Number(r.score) > 60 ? "Bullish" : "Neutral",
      freshness: freshness(r.updatedAt ?? null, "7 days", "Aquifert Trading Desk", r.updatedBy ?? "Desk"),
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
      const sb = getSupabaseService();
      const { data: row, error: findErr } = await sb
        .from("hub_indicators")
        .select("*")
        .eq("nutrient", input.nutrient)
        .maybeSingle();
      if (findErr) throw new Error(findErr.message);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      const history = [
        ...((row.history as { date: string; score: number }[]) ?? []),
        { date: new Date().toISOString().slice(0, 10), score: input.score },
      ].slice(-90);
      const { error } = await sb
        .from("hub_indicators")
        .update({
          score: input.score,
          rationale: input.rationale,
          history,
          updatedBy: fmtActor(me),
          updatedAt: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
      await logActivity(fmtActor(me), `Updated ${input.nutrient} gauge to ${input.score}`, "hub_indicator", String(row.id), me.id);
      return { ok: true };
    }),

  telex: authedQuery
    .input(z.object({
      cursor: z.number().nullish(),
      limit: z.number().min(1).max(50).default(20),
      products: z.array(z.string()).default([]),
      regions: z.array(z.string()).default([]),
    }))
    .query(async ({ ctx, input }) => {
      await effUser(ctx.user);
      let q = getSupabaseService()
        .from("telex_items")
        .select("*")
        .order("id", { ascending: false })
        .limit(input.limit + 1);
      if (input.cursor) q = q.lt("id", input.cursor);
      if (input.products.length) q = q.in("product", input.products);
      if (input.regions.length) q = q.in("geography", input.regions);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      const hasMore = rows.length > input.limit;
      const items = rows.slice(0, input.limit);
      const latest = items[0];
      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
        freshness: freshness(latest?.updatedAt ?? null, "4 hours", "Aquifert Desk TELEX", "Trading Desk"),
      };
    }),

  news: authedQuery
    .input(z.object({
      products: z.array(z.string()).default([]),
      regions: z.array(z.string()).default([]),
      limit: z.number().min(1).max(60).default(30),
    }))
    .query(async ({ ctx, input }) => {
      await effUser(ctx.user);
      const sb = getSupabaseService();
      let newsQ = sb.from("news_items").select("*").order("publishedAt", { ascending: false }).limit(input.limit);
      if (input.products.length) newsQ = newsQ.in("product", input.products);
      if (input.regions.length) newsQ = newsQ.in("geography", input.regions);
      const [{ data: rows, error: newsErr }, { data: sources, error: srcErr }] = await Promise.all([
        newsQ,
        sb.from("news_sources").select("*"),
      ]);
      if (newsErr) throw new Error(newsErr.message);
      if (srcErr) throw new Error(srcErr.message);
      const byId = new Map((sources ?? []).map((x) => [x.id, x]));
      const items = (rows ?? [])
        .map((r) => {
          const src = byId.get(r.sourceId);
          if (!src) return null;
          return {
            id: r.id,
            headline: r.headline,
            url: r.url,
            snippet: r.snippet,
            publishedAt: r.publishedAt,
            product: r.product,
            geography: r.geography,
            sourceName: src.name,
            siteUrl: src.siteUrl,
            attribution: src.attributionText,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
      const enabled = (sources ?? []).filter((x) => x.enabled);
      const freshest = enabled.reduce<(typeof enabled)[number] | null>(
        (a, b) => (!a || (b.dataAsOf && (!a.dataAsOf || b.dataAsOf > a.dataAsOf)) ? b : a),
        null,
      );
      return {
        items,
        sources: enabled.map((x) => ({
          code: x.code,
          name: x.name,
          siteUrl: x.siteUrl,
          cadence: x.refreshCadence,
          dataAsOf: x.dataAsOf,
          lastError: x.lastError,
        })),
        freshness: freshness(
          freshest?.dataAsOf ?? null,
          freshest?.refreshCadence ?? "6 hours",
          freshest?.name ?? "Publisher feeds",
          freshest?.owner ?? "Market Data",
        ),
      };
    }),

  ingestNews: authedQuery.mutation(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    assertStaff(me);
    throw new Error("News ingestion requires a scheduled worker. Seed news_items in Supabase for now.");
  }),

  freight: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    const sb = getSupabaseService();
    const [{ data: enquiries }, { data: commentaryRows }] = await Promise.all([
      sb.from("freight_enquiries").select("*").order("createdAt", { ascending: false }).limit(12),
      sb.from("hub_commentary").select("*").eq("kind", "FREIGHT").order("publishedAt", { ascending: false }).limit(1),
    ]);
    const commentary = commentaryRows?.[0] ?? null;
    return {
      enquiries: enquiries ?? [],
      commentary,
      freshness: freshness(
        commentary?.publishedAt ?? null,
        "7 days",
        "Aquifert Freight Desk",
        commentary?.byline ?? "Freight Desk",
      ),
    };
  }),

  commentary: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    const { data } = await getSupabaseService()
      .from("hub_commentary")
      .select("*")
      .eq("kind", "MARKET")
      .order("publishedAt", { ascending: false })
      .limit(1);
    const c = data?.[0] ?? null;
    return {
      commentary: c,
      freshness: freshness(c?.publishedAt ?? null, "7 days", "AQ VIEW", c?.byline ?? "Trading Desk"),
    };
  }),

  prefs: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    const { data } = await getSupabaseService()
      .from("hub_prefs")
      .select("*")
      .eq("userId", me.id)
      .maybeSingle();
    return data ? { products: data.products ?? [], regions: data.regions ?? [] } : null;
  }),

  savePrefs: authedQuery
    .input(z.object({ products: z.array(z.string()), regions: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      const sb = getSupabaseService();
      const { data: existing } = await sb.from("hub_prefs").select("id").eq("userId", me.id).maybeSingle();
      if (existing?.id) {
        const { error } = await sb
          .from("hub_prefs")
          .update({
            products: input.products,
            regions: input.regions,
            updatedAt: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await sb.from("hub_prefs").insert({
          userId: me.id,
          products: input.products,
          regions: input.regions,
        });
        if (error) throw new Error(error.message);
      }
      return { ok: true };
    }),

  interestHints: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    if (!me.email) return null;
    const { data: lead } = await getSupabaseService()
      .from("leads")
      .select("*")
      .eq("email", me.email.toLowerCase())
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!lead) return null;
    const mapProduct = (p: string): string | null => {
      if (["Urea", "Ammonium Sulphate", "UAN/AN/CAN", "Ammonia"].includes(p)) return "NITROGEN";
      if (["DAP/MAP", "TSP/SSP", "Phosphate rock"].includes(p)) return "PHOSPHATE";
      if (p === "MOP/SOP") return "POTASSIUM";
      return null;
    };
    const mapRegion = (r: string): string | null =>
      ({
        "Middle East": "MIDDLE_EAST",
        "Black Sea": "FSU",
        Baltic: "FSU",
        "North Africa": "AFRICA",
        "North West Europe": "EUROPE",
        "US Gulf": "NORTH_AMERICA",
        Brazil: "SOUTH_AMERICA",
        India: "SOUTH_ASIA",
        China: "EAST_ASIA",
        "Southeast Asia": "EAST_ASIA",
        "East Africa": "AFRICA",
        "Southern Africa": "AFRICA",
      } as Record<string, string>)[r] ?? null;
    const products = [...new Set(((lead.products as string[]) ?? []).map(mapProduct).filter((x): x is string => !!x))];
    const regions = [...new Set(((lead.regions as string[]) ?? []).map(mapRegion).filter((x): x is string => !!x))];
    if (!products.length && !regions.length) return null;
    return { products, regions };
  }),

  taxonomies: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    return { products: PRODUCTS, regions: REGIONS };
  }),
});
