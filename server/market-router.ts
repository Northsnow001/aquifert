import { z } from "zod";
import { and, desc, eq, gte } from "drizzle-orm";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as s from "@db/schema";
import { effUser, assertStaff, logActivity, fmtActor } from "./rbac";
import { generateMarketInsight } from "./ai";

export const marketRouter = createRouter({
  /** Public teaser series (landing page sparkline) */
  teaser: publicQuery.query(async () => {
    return getDb().query.marketData.findMany({
      where: and(eq(s.marketData.commodity, "UREA"), eq(s.marketData.region, "UK")),
      orderBy: desc(s.marketData.date),
      limit: 30,
    });
  }),

  series: authedQuery
    .input(z.object({
      commodity: z.enum(["UREA", "DAP", "MOP", "MAP", "NPK"]),
      region: z.string().optional(),
      weeks: z.number().min(4).max(52).default(26),
    }))
    .query(async ({ ctx, input }) => {
      await effUser(ctx.user);
      const since = new Date(Date.now() - input.weeks * 7 * 864e5);
      const rows = await getDb().query.marketData.findMany({
        where: and(eq(s.marketData.commodity, input.commodity), gte(s.marketData.date, since)),
        orderBy: desc(s.marketData.date),
        limit: 600,
      });
      return rows.filter((r) => !input.region || r.region === input.region);
    }),

  /** Latest price per commodity × region for the heatmap */
  latest: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    const rows = await getDb().query.marketData.findMany({
      orderBy: desc(s.marketData.date),
      limit: 2000,
    });
    const seen = new Set<string>();
    const out: s.MarketDataPoint[] = [];
    for (const r of rows) {
      const key = `${r.commodity}:${r.region}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(r);
      }
    }
    return out;
  }),

  addPoint: authedQuery
    .input(z.object({
      commodity: z.enum(["UREA", "DAP", "MOP", "MAP", "NPK"]),
      region: z.string().min(2),
      pricePerTon: z.number().positive(),
      currency: z.string().default("USD"),
      date: z.coerce.date(),
      source: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const [{ id }] = await getDb().insert(s.marketData).values({
        commodity: input.commodity,
        region: input.region,
        pricePerTon: input.pricePerTon,
        currency: input.currency,
        date: input.date,
        source: input.source ?? "Manual entry",
      }).returning({ id: s.marketData.id });
      await logActivity(fmtActor(me), `Added ${input.commodity} price point (${input.region} $${input.pricePerTon}/t)`, "market", String(id), me.id);
      return { id };
    }),

  deletePoint: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      await getDb().delete(s.marketData).where(eq(s.marketData.id, input.id));
      return { ok: true };
    }),

  /** AI insight generation (simulated OpenAI call) */
  generateInsight: authedQuery
    .input(z.object({
      commodity: z.enum(["UREA", "DAP", "MOP", "MAP", "NPK"]),
      region: z.string().default("UK"),
    }))
    .mutation(async ({ ctx, input }) => {
      await effUser(ctx.user);
      const rows = await getDb().query.marketData.findMany({
        where: and(eq(s.marketData.commodity, input.commodity), eq(s.marketData.region, input.region)),
        orderBy: desc(s.marketData.date),
        limit: 60,
      });
      const insight = generateMarketInsight(rows, input.commodity);
      await logActivity("AQUIFERT AI", `Generated ${input.commodity} (${input.region}) market insight`, "insight", input.commodity);
      return insight;
    }),

  scheduleBroadcast: authedQuery
    .input(z.object({
      audience: z.enum(["TIER_1", "TIER_2_PLUS", "TIER_3", "ALL"]),
      channel: z.enum(["WHATSAPP", "EMAIL", "IN_APP"]),
      message: z.string().min(5),
      scheduledAt: z.coerce.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const sendNow = !input.scheduledAt || input.scheduledAt.getTime() <= Date.now();
      const [{ id }] = await getDb().insert(s.broadcasts).values({
        audience: input.audience,
        channel: input.channel,
        message: input.message,
        scheduledAt: input.scheduledAt ?? new Date(),
        status: sendNow ? "SENT" : "SCHEDULED",
      }).returning({ id: s.broadcasts.id });
      if (sendNow) {
        console.log(`[Broadcast ${input.channel} → ${input.audience}] ${input.message}`);
      }
      await logActivity(fmtActor(me), `${sendNow ? "Sent" : "Scheduled"} ${input.channel} broadcast to ${input.audience}`, "broadcast", String(id), me.id);
      return { id, status: sendNow ? "SENT" : "SCHEDULED" };
    }),

  broadcasts: authedQuery.query(async ({ ctx }) => {
    assertStaff(await effUser(ctx.user));
    return getDb().query.broadcasts.findMany({
      orderBy: desc(s.broadcasts.createdAt),
      limit: 50,
    });
  }),
});
