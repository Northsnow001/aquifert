/**
 * Hub tRPC router — sample-first for all reads (no Drizzle, no waiting on Supabase).
 * Auth still uses live Supabase via middleware / effUser.
 * Optional live rows can be re-enabled later without UI changes.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { getSupabaseService } from "./lib/supabase";
import { effUser, assertStaff, logActivity, fmtActor } from "./rbac";
import {
  SAMPLE_COMMENTARY,
  SAMPLE_FREIGHT,
  SAMPLE_HUB_INDICATORS,
  SAMPLE_NEWS,
  SAMPLE_TELEX_ITEMS,
  SAMPLE_TELEX_PAGE,
  hubFreshness,
} from "@contracts/hub-sample";

const PRODUCTS = ["NITROGEN", "PHOSPHATE", "POTASSIUM", "FREIGHT", "GENERAL"] as const;
const REGIONS = [
  "GLOBAL", "MIDDLE_EAST", "NORTH_AMERICA", "SOUTH_AMERICA", "EUROPE",
  "SOUTH_ASIA", "EAST_ASIA", "FSU", "AFRICA",
] as const;

export type Freshness = ReturnType<typeof hubFreshness>;

export function freshness(
  asOf: Date | string | null,
  cadence: string,
  source: string,
  owner: string,
): Freshness {
  if (!asOf) {
    return hubFreshness(undefined, cadence, source, owner);
  }
  return hubFreshness(
    typeof asOf === "string" ? asOf : asOf.toISOString(),
    cadence,
    source,
    owner,
  );
}

export const hubRouter = createRouter({
  indicators: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    return SAMPLE_HUB_INDICATORS.map((r) => ({
      ...r,
      updatedAt: new Date(String(r.updatedAt)),
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
      try {
        const sb = getSupabaseService();
        const { data: row } = await sb
          .from("hub_indicators")
          .select("*")
          .eq("nutrient", input.nutrient)
          .maybeSingle();
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        const history = [
          ...((row.history as { date: string; score: number }[]) ?? []),
          { date: new Date().toISOString().slice(0, 10), score: input.score },
        ].slice(-90);
        await sb
          .from("hub_indicators")
          .update({
            score: input.score,
            rationale: input.rationale,
            history,
            updatedBy: fmtActor(me),
            updatedAt: new Date().toISOString(),
          })
          .eq("id", row.id);
        await logActivity(fmtActor(me), `Updated ${input.nutrient} gauge to ${input.score}`, "hub_indicator", String(row.id), me.id);
      } catch (e) {
        if (e instanceof TRPCError) throw e;
        // Sample mode: acknowledge without persistence.
      }
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
      let items = SAMPLE_TELEX_ITEMS.filter((t) => {
        if (input.products.length && !input.products.includes(t.product)) return false;
        if (input.regions.length && !input.regions.includes(t.geography)) return false;
        return true;
      });
      if (input.cursor) items = items.filter((t) => t.id < input.cursor!);
      const page = items.slice(0, input.limit);
      const hasMore = items.length > input.limit;
      return {
        items: page,
        nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
        freshness: SAMPLE_TELEX_PAGE.freshness,
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
      let items = SAMPLE_NEWS.items;
      if (input.products.length) items = items.filter((t) => input.products.includes(t.product));
      if (input.regions.length) items = items.filter((t) => input.regions.includes(t.geography));
      return {
        items: items.slice(0, input.limit),
        sources: SAMPLE_NEWS.sources,
        freshness: SAMPLE_NEWS.freshness,
      };
    }),

  ingestNews: authedQuery.mutation(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    assertStaff(me);
    return { ok: true, message: "Sample mode — news ingestion disabled until live feeds are wired." };
  }),

  freight: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    return SAMPLE_FREIGHT;
  }),

  commentary: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    return SAMPLE_COMMENTARY;
  }),

  prefs: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    return null;
  }),

  savePrefs: authedQuery
    .input(z.object({ products: z.array(z.string()), regions: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      try {
        const sb = getSupabaseService();
        const { data: existing } = await sb.from("hub_prefs").select("id").eq("userId", me.id).maybeSingle();
        if (existing?.id) {
          await sb.from("hub_prefs").update({ products: input.products, regions: input.regions }).eq("id", existing.id);
        } else {
          await sb.from("hub_prefs").insert({ userId: me.id, products: input.products, regions: input.regions });
        }
      } catch {
        // Sample mode: prefs save is best-effort.
      }
      return { ok: true };
    }),

  interestHints: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    return null;
  }),

  taxonomies: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    return { products: [...PRODUCTS], regions: [...REGIONS] };
  }),
});
