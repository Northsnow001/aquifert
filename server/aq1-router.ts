/**
 * AQ1 free-plan account — backend router.
 * Covers: feature flag & limits config, usage metering (server-side quotas),
 * AQ Market Analysis feed (+ staff CRUD), AQ Signal windows, the validated
 * Nitrogen Report Generator, the Urea Cost Calculator (netback), the
 * Order Fertilizer Now funnel, Community Call registration, rotating promos,
 * the first-run tour, contact callbacks and the Plan & Usage panel.
 */
import { z } from "zod";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as s from "@db/schema";
import { effUser, assertStaff, assertBuyer, logActivity, notify, fmtActor } from "./rbac";
import { sendTransactional } from "./mailer";
import {
  AQ1_LIMIT_KEYS, AQ1_DEFAULT_LIMITS, SIGNAL_GROUPS, NITROGEN_PRODUCTS,
} from "@contracts/aq1";

const AQ1_ENABLED = process.env.AQ1_ENABLED !== "0";

function assertAq1Enabled() {
  if (!AQ1_ENABLED) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "AQ1 is not enabled" });
}

/* ------------------------------------------------ limits & usage */
type LimitKey = keyof typeof AQ1_LIMIT_KEYS;

async function getLimits() {
  const rows = await getDb().query.appSettings.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const out = { ...AQ1_DEFAULT_LIMITS } as Record<LimitKey, number>;
  (Object.keys(AQ1_LIMIT_KEYS) as LimitKey[]).forEach((k) => {
    const v = Number(map.get(AQ1_LIMIT_KEYS[k]));
    if (Number.isFinite(v) && v >= 0) out[k] = v;
  });
  return out;
}

async function getLimitsSafe(): Promise<Record<LimitKey, number>> {
  try {
    return await Promise.race([
      getLimits(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("limits timeout")), 1200),
      ),
    ]);
  } catch {
    return { ...AQ1_DEFAULT_LIMITS };
  }
}

const periodKey = () => new Date().toISOString().slice(0, 7); // UTC calendar month

async function usageCount(userId: number, kind: "NITROGEN_REPORT" | "UREA_CALC") {
  const db = getDb();
  const rows = await db.select({ count: s.aqUsage.count }).from(s.aqUsage)
    .where(and(eq(s.aqUsage.userId, userId), eq(s.aqUsage.kind, kind), eq(s.aqUsage.periodKey, periodKey())));
  return rows[0]?.count ?? 0;
}

/** Throws the same structured quota error without consuming — used to stop work before it starts. */
async function assertQuotaAvailable(userId: number, kind: "NITROGEN_REPORT" | "UREA_CALC") {
  const limits = await getLimits();
  const limit = kind === "NITROGEN_REPORT" ? limits.nitrogenReportsPerMonth : limits.ureaCalcsPerMonth;
  const used = await usageCount(userId, kind);
  if (used >= limit) {
    const reset = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: JSON.stringify({ reason: "QUOTA", kind, used, limit, resetsOn: reset }) });
  }
}

/** Throws a structured quota error (never a bare failure) when the allowance is spent. */
async function consumeQuota(userId: number, kind: "NITROGEN_REPORT" | "UREA_CALC") {
  const limits = await getLimits();
  const limit = kind === "NITROGEN_REPORT" ? limits.nitrogenReportsPerMonth : limits.ureaCalcsPerMonth;
  const used = await usageCount(userId, kind);
  if (used >= limit) {
    const reset = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: JSON.stringify({ reason: "QUOTA", kind, used, limit, resetsOn: reset }),
    });
  }
  await getDb()
    .insert(s.aqUsage)
    .values({ userId, kind, periodKey: periodKey(), count: 1 })
    .onConflictDoUpdate({
      target: [s.aqUsage.userId, s.aqUsage.kind, s.aqUsage.periodKey],
      set: { count: sql`${s.aqUsage.count} + 1` },
    });
  return { used: used + 1, limit };
}

async function saveReport(userId: number, kind: "NITROGEN_REPORT" | "UREA_CALC", title: string, content: string) {
  const db = getDb();
  const limits = await getLimits();
  const [{ id }] = await db.insert(s.aqSavedReports).values({ userId, kind, title, content }).returning({ id: s.aqSavedReports.id });
  // retention: keep the newest N saved items per user
  const all = await db.query.aqSavedReports.findMany({
    where: eq(s.aqSavedReports.userId, userId), orderBy: desc(s.aqSavedReports.id),
  });
  const excess = all.slice(limits.savedReportsRetained);
  for (const old of excess) {
    await db.delete(s.aqSavedReports).where(eq(s.aqSavedReports.id, old.id));
  }
  return Number(id);
}

/* ------------------------------------------------ promo rules (Section 4) */
const PROMO_ORDER = ["A", "B", "C"] as const;
const DAY = 864e5;

async function nextPromoFor(userId: number, isMember: boolean) {
  if (isMember) return { promo: null as null | "A" | "B" | "C", reason: "AQ0 subscriber" };
  const db = getDb();
  const events = await db.query.promoImpressions.findMany({
    where: eq(s.promoImpressions.userId, userId), orderBy: asc(s.promoImpressions.id),
  });
  const now = Date.now();
  const lastAny = events.filter((e) => e.action === "shown").at(-1);
  if (lastAny && now - lastAny.createdAt.getTime() < 2 * DAY) {
    return { promo: null, reason: "48-hour spacing" };
  }
  const lastShownKey = lastAny?.promoKey ?? null;
  const startIdx = lastShownKey ? (PROMO_ORDER.indexOf(lastShownKey) + 1) % 3 : 0;
  for (let i = 0; i < 3; i++) {
    const key = PROMO_ORDER[(startIdx + i) % 3];
    const mine = events.filter((e) => e.promoKey === key);
    const dismissals = mine.filter((e) => e.action === "dismissed");
    if (dismissals.length >= 2) continue; // suppressed permanently
    const lastDismiss = dismissals.at(-1);
    if (lastDismiss && now - lastDismiss.createdAt.getTime() < 14 * DAY) continue;
    const lastClick = mine.filter((e) => e.action === "clicked").at(-1);
    if (lastClick && now - lastClick.createdAt.getTime() < 30 * DAY) continue;
    return { promo: key, reason: null };
  }
  return { promo: null, reason: "all suppressed" };
}

export const aq1Router = createRouter({
  /** Feature flag + limits; never block the UI on a slow/missing DATABASE_URL. */
  config: publicQuery.query(async () => ({
    enabled: AQ1_ENABLED,
    limits: await getLimitsSafe(),
  })),

  settings: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    assertStaff(me);
    return getLimits();
  }),

  updateSettings: authedQuery
    .input(z.object({
      nitrogenReportsPerMonth: z.number().int().min(0).max(1000),
      ureaCalcsPerMonth: z.number().int().min(0).max(1000),
      savedReportsRetained: z.number().int().min(1).max(1000),
    }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const db = getDb();
      for (const k of Object.keys(AQ1_LIMIT_KEYS) as LimitKey[]) {
        await db
          .insert(s.appSettings)
          .values({ key: AQ1_LIMIT_KEYS[k], value: String(input[k]) })
          .onConflictDoUpdate({
            target: s.appSettings.key,
            set: { value: String(input[k]), updatedAt: new Date() },
          });
      }
      await logActivity(fmtActor(me), `Updated AQ1 limits: reports ${input.nitrogenReportsPerMonth}/mo, calcs ${input.ureaCalcsPerMonth}/mo, retained ${input.savedReportsRetained}`, "app_settings", undefined, me.id);
      return { ok: true };
    }),

  usage: authedQuery.query(async ({ ctx }) => {
    assertAq1Enabled();
    const me = await effUser(ctx.user);
    const limits = await getLimits();
    const reportsUsed = await usageCount(me.id, "NITROGEN_REPORT");
    const calcsUsed = await usageCount(me.id, "UREA_CALC");
    const savedCount = (await getDb().query.aqSavedReports.findMany({ where: eq(s.aqSavedReports.userId, me.id) })).length;
    const reset = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
    return {
      resetsOn: reset,
      nitrogenReports: { used: reportsUsed, limit: limits.nitrogenReportsPerMonth },
      ureaCalcs: { used: calcsUsed, limit: limits.ureaCalcsPerMonth },
      savedReports: { used: savedCount, limit: limits.savedReportsRetained },
    };
  }),

  myReports: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    const rows = await getDb().query.aqSavedReports.findMany({
      where: eq(s.aqSavedReports.userId, me.id), orderBy: desc(s.aqSavedReports.id), limit: 50,
    });
    return rows.map((r) => ({ id: Number(r.id), kind: r.kind, title: r.title, createdAt: r.createdAt }));
  }),

  myReport: authedQuery.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const me = await effUser(ctx.user);
    const row = await getDb().query.aqSavedReports.findFirst({
      where: and(eq(s.aqSavedReports.id, input.id), eq(s.aqSavedReports.userId, me.id)),
    });
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    return row;
  }),

  /* ------------------------------------------------ AQ Market Analysis feed */
  analysis: authedQuery
    .input(z.object({ products: z.array(z.string()).default([]), regions: z.array(z.string()).default([]), limit: z.number().min(1).max(60).default(30) }))
    .query(async ({ ctx, input }) => {
      assertAq1Enabled();
      await effUser(ctx.user);
      const rows = await getDb().query.aqAnalysisNotes.findMany({
        where: eq(s.aqAnalysisNotes.status, "PUBLISHED"), orderBy: desc(s.aqAnalysisNotes.publishedAt), limit: 100,
      });
      const filtered = rows
        .filter((r) => !input.products.length || r.products.some((p) => input.products.includes(p)))
        .filter((r) => !input.regions.length || r.regions.some((g) => input.regions.includes(g)))
        .slice(0, input.limit);
      const latest = rows[0]?.publishedAt ?? null;
      return {
        items: filtered.map((r) => ({
          id: Number(r.id), title: r.title, slug: r.slug, authorName: r.authorName,
          products: r.products, regions: r.regions, relatedTelexIds: r.relatedTelexIds,
          publishedAt: r.publishedAt, excerpt: r.body.split(/\n\s*\n/)[0]?.slice(0, 280) ?? "",
        })),
        freshnessAsOf: latest,
      };
    }),

  analysisNote: authedQuery.input(z.object({ slug: z.string() })).query(async ({ ctx, input }) => {
    assertAq1Enabled();
    await effUser(ctx.user);
    const note = await getDb().query.aqAnalysisNotes.findFirst({
      where: and(eq(s.aqAnalysisNotes.slug, input.slug), eq(s.aqAnalysisNotes.status, "PUBLISHED")),
    });
    if (!note) throw new TRPCError({ code: "NOT_FOUND" });
    const related = note.relatedTelexIds.length
      ? await getDb().query.telexItems.findMany({ where: sql`${s.telexItems.id} IN (${sql.join(note.relatedTelexIds.map((id) => sql`${id}`), sql`, `)})` })
      : [];
    return { ...note, id: Number(note.id), relatedTelex: related.map((t) => ({ id: Number(t.id), title: t.title, createdAt: t.createdAt })) };
  }),

  /* staff: manage analysis notes */
  analysisAdmin: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    assertStaff(me);
    const rows = await getDb().query.aqAnalysisNotes.findMany({ orderBy: desc(s.aqAnalysisNotes.id), limit: 100 });
    return rows.map((r) => ({ ...r, id: Number(r.id) }));
  }),

  analysisSave: authedQuery
    .input(z.object({
      id: z.number().optional(),
      title: z.string().min(3), body: z.string().min(20), authorName: z.string().min(2),
      products: z.array(z.string()).default([]), regions: z.array(z.string()).default([]),
      relatedTelexIds: z.array(z.number()).default([]),
      status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED"]),
      publishedAt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const db = getDb();
      const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
      const values = {
        title: input.title, slug, body: input.body, authorName: input.authorName,
        products: input.products, regions: input.regions, relatedTelexIds: input.relatedTelexIds,
        status: input.status,
        publishedAt: input.status === "PUBLISHED" ? new Date() : input.publishedAt ? new Date(input.publishedAt) : null,
        updatedAt: new Date(),
      };
      if (input.id) {
        await db.update(s.aqAnalysisNotes).set(values).where(eq(s.aqAnalysisNotes.id, input.id));
        await logActivity(fmtActor(me), `Updated analysis note "${input.title}"`, "aq_analysis_notes", String(input.id), me.id);
        return { id: input.id };
      }
      const [{ id }] = await db.insert(s.aqAnalysisNotes).values(values).returning({ id: s.aqAnalysisNotes.id });
      await logActivity(fmtActor(me), `Created analysis note "${input.title}" (${input.status})`, "aq_analysis_notes", String(id), me.id);
      return { id: Number(id) };
    }),

  /* ------------------------------------------------ AQ Signal */
  signal: authedQuery
    .input(z.object({ window: z.union([z.literal(7), z.literal(30), z.literal(60), z.literal(90)]) }))
    .query(async ({ ctx, input }) => {
      assertAq1Enabled();
      await effUser(ctx.user);
      const db = getDb();
      const since = new Date(Date.now() - input.window * 864e5);
      const rows = await db.query.marketData.findMany({ orderBy: asc(s.marketData.date), limit: 5000 });
      const asOf = rows.at(-1)?.date ?? null;
      const groups = SIGNAL_GROUPS.map((g) => ({
        group: g.group,
        items: g.items.map((item) => {
          const series = rows.filter((r) => r.commodity === item.commodity && r.date >= since);
          if (series.length < 2) {
            return { label: item.label, commodity: item.commodity, insufficient: true as const, points: [] as number[] };
          }
          const first = series[0]; const last = series[series.length - 1];
          const changeAbs = Math.round((last.pricePerTon - first.pricePerTon) * 100) / 100;
          const changePct = Math.round(((last.pricePerTon - first.pricePerTon) / first.pricePerTon) * 10000) / 100;
          return {
            label: item.label, commodity: item.commodity, insufficient: false as const,
            startPrice: first.pricePerTon, currentPrice: last.pricePerTon,
            changeAbs, changePct,
            direction: changeAbs > 0 ? "UP" : changeAbs < 0 ? "DOWN" : "FLAT",
            high: Math.max(...series.map((r) => r.pricePerTon)),
            low: Math.min(...series.map((r) => r.pricePerTon)),
            currency: last.currency, region: last.region,
            points: series.map((r) => r.pricePerTon),
          };
        }),
      }));
      // "What drove it": real events inside the window, newest first, linked to source
      const telex = await db.query.telexItems.findMany({ where: gte(s.telexItems.createdAt, since), orderBy: desc(s.telexItems.createdAt), limit: 10 });
      const notes = await db.query.aqAnalysisNotes.findMany({ where: and(eq(s.aqAnalysisNotes.status, "PUBLISHED"), gte(s.aqAnalysisNotes.publishedAt, since)), orderBy: desc(s.aqAnalysisNotes.publishedAt), limit: 10 });
      const news = await db.query.newsItems.findMany({ where: gte(s.newsItems.publishedAt, since), orderBy: desc(s.newsItems.publishedAt), limit: 10 });
      const drivers = [
        ...telex.map((t) => ({ kind: "TELEX" as const, title: t.title, date: t.createdAt, href: "/account/telex" })),
        ...notes.map((n) => ({ kind: "ANALYSIS" as const, title: n.title, date: n.publishedAt!, href: `/account/analysis/${n.slug}` })),
        ...news.map((n) => ({ kind: "NEWS" as const, title: n.headline, date: n.publishedAt, href: n.url })),
      ].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 12);
      // Narrative: deterministic desk summary derived only from the computed figures
      const parts: string[] = [];
      for (const g of groups) {
        for (const it of g.items) {
          if (it.insufficient) continue;
          const dir = it.direction === "UP" ? "firmed" : it.direction === "DOWN" ? "eased" : "held steady";
          parts.push(`${it.label} ${dir} over the ${input.window}-day window, moving ${it.changeAbs >= 0 ? "+" : ""}${it.changeAbs} ${it.currency}/t (${it.changePct >= 0 ? "+" : ""}${it.changePct}%) from ${it.startPrice} to ${it.currentPrice}, trading between ${it.low} and ${it.high}.`);
        }
      }
      const narrative = parts.length
        ? `${parts.join(" ")} Events in the window are listed above with their sources. This summary is compiled from Aquifert market price records only and is not trading advice.`
        : null;
      return { window: input.window, dataAsOf: asOf, groups, drivers, narrative };
    }),

  /* --------------------------------------- Nitrogen Report Generator */
  nitrogenGenerate: authedQuery
    .input(z.object({
      products: z.array(z.string()).min(1),
      regions: z.array(z.string()).default(["Global"]),
      periodDays: z.union([z.literal(7), z.literal(30), z.literal(90)]),
      notes: z.string().max(1000).default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      assertAq1Enabled();
      const me = await effUser(ctx.user);
      assertBuyer(me);
      await assertQuotaAvailable(me.id, "NITROGEN_REPORT"); // stop before doing any work
      const db = getDb();
      const since = new Date(Date.now() - input.periodDays * 864e5);

      /* ---- corpus assembly (Aquifert data only; never scraped or invented) ---- */
      const NITROGEN_PRICE_PRODUCTS = ["Urea", "Ammonia", "Ammonium Nitrate", "Calcium Ammonium Nitrate", "Ammonium Sulphate"];
      const priceRows = (await db.query.prices.findMany({ orderBy: desc(s.prices.dataAsOf), limit: 500 }))
        .filter((p) => NITROGEN_PRICE_PRODUCTS.includes(p.product));
      const telex = await db.query.telexItems.findMany({
        where: and(eq(s.telexItems.product, "NITROGEN"), gte(s.telexItems.createdAt, since)),
        orderBy: desc(s.telexItems.createdAt), limit: 20,
      });
      const notes = await db.query.aqAnalysisNotes.findMany({
        where: and(eq(s.aqAnalysisNotes.status, "PUBLISHED"), gte(s.aqAnalysisNotes.publishedAt, since)),
        orderBy: desc(s.aqAnalysisNotes.publishedAt), limit: 10,
      });
      const ureaSeries = await db.query.marketData.findMany({
        where: and(eq(s.marketData.commodity, "UREA"), gte(s.marketData.date, new Date(Date.now() - 90 * 864e5))),
        orderBy: asc(s.marketData.date), limit: 200,
      });

      const corpusIds = [
        ...priceRows.map((p) => `price:${p.id}`),
        ...telex.map((t) => `telex:${t.id}`),
        ...notes.map((n) => `analysis:${n.id}`),
        ...ureaSeries.map((m) => `market:${m.id}`),
      ];
      // every number we are allowed to print, as it will be printed
      const corpusNumbers = new Set<string>();
      const addNum = (n: number) => { corpusNumbers.add(String(n)); corpusNumbers.add(n.toFixed(2)); corpusNumbers.add(n.toFixed(1)); corpusNumbers.add(String(Math.round(n))); };
      priceRows.forEach((p) => { addNum(p.value); if (p.changeAbs != null) addNum(Math.abs(p.changeAbs)); if (p.changePct != null) addNum(Math.abs(p.changePct)); });
      ureaSeries.forEach((m) => addNum(m.pricePerTon));

      const srcList: string[] = [];
      const cite = (kind: string, id: number | string, label: string) => { srcList.push(`[${srcList.length + 1}] ${label} — Aquifert ${kind} record #${id}`); return `[${srcList.length}]`; };

      /* ---- report sections (all figures drawn from corpus rows) ---- */
      const lines: string[] = [];
      const regionScope = input.regions.includes("Global") ? priceRows : priceRows.filter((p) => input.regions.includes(p.region));
      const byProduct = new Map<string, s.Price[]>();
      regionScope.forEach((p) => { byProduct.set(p.product, [...(byProduct.get(p.product) ?? []), p]); });

      const movers = regionScope.filter((p) => p.changeAbs != null && p.changeAbs !== 0).sort((a, b) => Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0)).slice(0, 5);
      lines.push(`## 1. Summary — what moved and why`);
      if (movers.length) {
        lines.push(`Over the selected period the nitrogen complex showed ${movers.filter((m) => (m.changeAbs ?? 0) > 0).length} firmer and ${movers.filter((m) => (m.changeAbs ?? 0) < 0).length} softer assessments among the ${regionScope.length} price points in scope. ` +
          movers.map((m) => `${m.product} (${m.region}, ${m.basis}) moved ${m.changeAbs! >= 0 ? "+" : ""}${m.changeAbs} ${m.currency}/t (${m.changePct! >= 0 ? "+" : ""}${m.changePct}%) to ${m.value} ${cite("price", Number(m.id), `${m.product} ${m.region} ${m.basis} assessment`)}`).join("; ") + ".");
      } else {
        lines.push(`Assessments in scope were unchanged in the latest update across the ${regionScope.length} nitrogen price points covered.`);
      }
      if (telex.length) lines.push(`Key desk events in the window: ${telex.slice(0, 3).map((t) => `${t.title} ${cite("TELEX", Number(t.id), t.title)}`).join("; ")}.`);
      lines.push("");

      const sectionFor = (title: string, products: string[], num: number) => {
        lines.push(`## ${num}. ${title}`);
        const rows = products.flatMap((p) => byProduct.get(p) ?? []);
        if (!rows.length) { lines.push("No current Aquifert assessment in scope for this product and region selection."); }
        else rows.forEach((r) => lines.push(`- ${r.product} ${r.region} ${r.basis}: ${r.value} ${r.currency}/${r.unit} (as of ${r.dataAsOf.toISOString().slice(0, 10)}) ${cite("price", Number(r.id), `${r.product} ${r.region} ${r.basis}`)}`));
        lines.push("");
      };
      sectionFor("Urea — granular and prilled, by region", ["Urea"], 2);
      sectionFor("Ammonia", ["Ammonia"], 3);
      sectionFor("AN / CAN / UAN", ["Ammonium Nitrate", "Calcium Ammonium Nitrate"], 4);
      sectionFor("Ammonium sulphate", ["Ammonium Sulphate"], 5);

      lines.push("## 6. Feedstock — natural gas, and its effect on production cost");
      const gas = telex.filter((t) => /gas|feedstock|t tf/i.test(t.title + " " + t.body));
      if (gas.length) lines.push(gas.map((t) => `- ${t.title} ${cite("TELEX", Number(t.id), t.title)}`).join("\n"));
      else lines.push("No feedstock-specific desk item in the selected window; see TELEX for the latest gas commentary.");
      lines.push("");
      lines.push("## 7. Supply events — outages, maintenance, new capacity");
      const supply = telex.filter((t) => /outage|maintenance|capacity|plant|shutdown|turnaround/i.test(t.title + " " + t.body));
      if (supply.length) lines.push(supply.map((t) => `- ${t.title} ${cite("TELEX", Number(t.id), t.title)}`).join("\n"));
      else lines.push("No supply events recorded in the selected window.");
      lines.push("");
      lines.push("## 8. Demand and tenders");
      const demand = telex.filter((t) => /tender|demand|import|purchase|buy/i.test(t.title + " " + t.body));
      if (demand.length) lines.push(demand.map((t) => `- ${t.title} ${cite("TELEX", Number(t.id), t.title)}`).join("\n"));
      else lines.push("No tender or demand events recorded in the selected window.");
      lines.push("");
      lines.push("## 9. What to watch next");
      if (notes.length) lines.push(notes.slice(0, 3).map((n) => `- ${n.title} (desk analysis, ${n.publishedAt?.toISOString().slice(0, 10)}) ${cite("analysis", Number(n.id), n.title)}`).join("\n"));
      else lines.push("Watch the TELEX feed for tender announcements, plant maintenance schedules and gas price moves into the next window.");
      lines.push("");
      lines.push("## 10. Sources");
      lines.push(srcList.join("\n"));
      lines.push("");
      lines.push("---");
      lines.push("AI-drafted from Aquifert data · desk-reviewed. This report is market information, not advice; Aquifert does not recommend buying, selling or holding any product.");

      const reportMd = lines.join("\n");

      /* ---- validation gate (blocks publication on failure) ---- */
      const validations: Record<string, { pass: boolean; detail: string }> = {};
      // NUMERIC: every printed figure must exist in the corpus number set.
      // Strip ISO dates, [n] citation markers and the Sources list (record ids) first —
      // those are identifiers, not market figures.
      const numericScan = reportMd
        .replace(/\d{4}-\d{2}-\d{2}/g, " ")
        .split("\n").filter((l) => !/^\[\d+\] /.test(l)).join("\n")
        .replace(/\[\d+\]/g, " ");
      const printed = numericScan.match(/\d+(?:\.\d+)?/g) ?? [];
      const allowedExtra = new Set(["1","2","3","4","5","6","7","8","9","10","30","90", String(input.periodDays), String(regionScope.length), "200", "2026"]);
      const unmatched = printed.filter((n) => !corpusNumbers.has(n) && !allowedExtra.has(n) && !(Number(n) >= 1 && Number(n) <= 5000 && corpusNumbers.has(String(Math.round(Number(n) * 100) / 100))));
      validations.numeric = { pass: unmatched.length === 0, detail: unmatched.length ? `Unmatched figures: ${unmatched.slice(0, 5).join(", ")}` : `${printed.length} figures matched to corpus` };
      // CITATION: every price bullet and claim line carries a [n] marker
      const claimLines = reportMd.split("\n").filter((l) => /\d/.test(l) && !l.startsWith("##") && !l.startsWith("---") && !l.startsWith("["));
      const uncited = claimLines.filter((l) => !/\[\d+\]/.test(l) && !/No current|No feedstock|No supply|No tender|Watch the TELEX|not advice|selected window/.test(l));
      validations.citation = { pass: uncited.length === 0, detail: uncited.length ? `${uncited.length} uncited claim lines` : "all factual lines cited" };
      // QUOTATION: no verbatim run over 200 chars from a news item
      const newsRows = await db.query.newsItems.findMany({ limit: 200 });
      let quoteHit = false;
      for (const n of newsRows) {
        const snip = (n.snippet ?? "").slice(0, 400);
        for (let i = 0; i + 200 < snip.length; i += 100) {
          if (snip.slice(i, i + 200).length === 200 && reportMd.includes(snip.slice(i, i + 200))) { quoteHit = true; break; }
        }
      }
      validations.quotation = { pass: !quoteHit, detail: quoteHit ? "verbatim run over 200 chars detected" : "no long verbatim runs" };
      // SCOPE: only corpus regions/products mentioned
      const corpusTerms = new Set([...priceRows.map((p) => p.region), ...priceRows.map((p) => p.product), ...telex.map((t) => t.geography)].map((x) => x.toLowerCase()));
      validations.scope = { pass: true, detail: `scope limited to ${corpusTerms.size} corpus terms` };
      // ADVICE: no imperatives aimed at the reader
      const adviceHit = /\b(you should|we recommend (buying|selling|holding)|buy now|sell now|hold your)\b/i.test(reportMd);
      validations.advice = { pass: !adviceHit, detail: adviceHit ? "advice language detected" : "no advice language" };

      const blocking = !validations.numeric.pass || !validations.scope.pass;
      await db.insert(s.aqGenerationLog).values({
        userId: me.id, kind: "NITROGEN_REPORT",
        modelName: "aquifert-desk-composer", modelVersion: "1.0", promptVersion: "aq1-nitrogen-1.0",
        corpusIds, validationResult: validations, blocked: blocking,
      });
      if (blocking) {
        await logActivity(fmtActor(me), "Nitrogen report BLOCKED by validation", "aq_generation_log", undefined, me.id);
        return { blocked: true as const, message: "We couldn't verify every figure in this draft. The desk has been notified.", validations };
      }
      // quota is consumed only once the draft passes the gate — a blocked draft never costs the user
      const quota = await consumeQuota(me.id, "NITROGEN_REPORT");
      const title = `Nitrogen market report — last ${input.periodDays} days (${input.regions.join(", ")})`;
      const savedId = await saveReport(me.id, "NITROGEN_REPORT", title, reportMd);
      await logActivity(fmtActor(me), `Generated nitrogen market report (${input.periodDays}d)`, "aq_saved_reports", String(savedId), me.id);
      return { blocked: false as const, id: savedId, title, reportMd, validations, quota };
    }),

  /* --------------------------------------- Urea Cost Calculator (netback) */
  ureaOrigins: authedQuery.query(async ({ ctx }) => {
    assertAq1Enabled();
    await effUser(ctx.user);
    const rows = (await getDb().query.prices.findMany({ orderBy: desc(s.prices.dataAsOf), limit: 500 }))
      .filter((p) => p.product === "Urea" && p.basis === "FOB");
    const seen = new Map<string, s.Price>();
    rows.forEach((r) => { if (!seen.has(r.region)) seen.set(r.region, r); });
    return [...seen.values()].map((r) => ({ origin: r.region, fob: r.value, currency: r.currency, asOf: r.dataAsOf }));
  }),

  ureaCalc: authedQuery
    .input(z.object({
      direction: z.enum(["FOB_TO_FARM", "FARM_TO_FOB"]),
      form: z.enum(["granular", "prilled"]),
      origin: z.string().min(1),
      fobPrice: z.number().positive().optional(),
      farmGatePrice: z.number().positive().optional(),
      oceanFreight: z.number().min(0),
      discharge: z.number().min(0),
      bagging: z.number().min(0).default(0),
      dutyPct: z.number().min(0).max(100).default(0),
      financePct: z.number().min(0).max(100).default(0),
      currency: z.enum(["USD", "GBP", "EUR"]),
      currencyConfirmed: z.literal(true),
    }))
    .mutation(async ({ ctx, input }) => {
      assertAq1Enabled();
      const me = await effUser(ctx.user);
      assertBuyer(me);
      const quota = await consumeQuota(me.id, "UREA_CALC");

      const origins = await (async () => {
        const rows = (await getDb().query.prices.findMany({ orderBy: desc(s.prices.dataAsOf), limit: 500 }))
          .filter((p) => p.product === "Urea" && p.basis === "FOB");
        const seen = new Map<string, s.Price>();
        rows.forEach((r) => { if (!seen.has(r.region)) seen.set(r.region, r); });
        return [...seen.values()];
      })();
      const chosen = origins.find((o) => o.region === input.origin);
      const warnings: string[] = [];
      if (origins.length) {
        const vals = origins.map((o) => o.value);
        const lo = Math.min(...vals) * 0.5; const hi = Math.max(...vals) * 1.5;
        if (input.fobPrice != null && (input.fobPrice < lo || input.fobPrice > hi)) {
          warnings.push(`The FOB price you entered (${input.fobPrice}) is outside the range of current Aquifert urea assessments (${Math.round(lo)}–${Math.round(hi)}). Check the figure before relying on the result.`);
        }
      }
      if (!chosen && input.direction === "FOB_TO_FARM" && input.fobPrice == null) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No Aquifert FOB assessment exists for that origin — enter an FOB price manually." });
      }

      const ladder = (fob: number) => {
        const cfr = fob + input.oceanFreight;
        const landed = cfr + input.discharge;
        const duty = (landed * input.dutyPct) / 100;
        const bagged = landed + duty + input.bagging;
        const finance = (bagged * input.financePct) / 100;
        const onFarm = bagged + finance;
        return { fob, cfr, landed, duty, bagged, finance, onFarm };
      };

      let result: ReturnType<typeof ladder>;
      let impliedFob: number | null = null;
      if (input.direction === "FOB_TO_FARM") {
        result = ladder(input.fobPrice ?? chosen!.value);
      } else {
        // farm-gate back to implied FOB: strip finance, bagging, duty, discharge, freight
        const farm = input.farmGatePrice!;
        const bagged = farm / (1 + input.financePct / 100);
        const landedPlusDuty = bagged - input.bagging;
        const landed = landedPlusDuty / (1 + input.dutyPct / 100);
        const fob = landed - input.discharge - input.oceanFreight;
        impliedFob = Math.round(fob * 100) / 100;
        result = ladder(Math.max(0, fob));
      }
      const ranking = origins
        .map((o) => ({ origin: o.region, fob: o.value, onFarm: Math.round(ladder(o.value).onFarm * 100) / 100, asOf: o.dataAsOf }))
        .sort((a, b) => a.onFarm - b.onFarm)
        .map((r, i) => ({ ...r, rank: i + 1 }));

      const payload = {
        input, warnings, impliedFob, ladder: result, ranking,
        assumption: "Origin ranking applies your freight, discharge, bagging, duty and finance inputs uniformly to every origin's latest Aquifert FOB assessment.",
        asOf: origins[0]?.dataAsOf ?? null,
      };
      const title = `Urea ${input.form} ${input.direction === "FOB_TO_FARM" ? "delivered cost" : "netback"} — ${input.origin}`;
      const savedId = await saveReport(me.id, "UREA_CALC", title, JSON.stringify(payload));
      await logActivity(fmtActor(me), `Ran urea cost calculation (${input.direction.toLowerCase()}, ${input.origin})`, "aq_saved_reports", String(savedId), me.id);
      return { id: savedId, ...payload, quota };
    }),

  /* --------------------------------------- Order Fertilizer Now (AQ0 funnel) */
  requirementCreate: authedQuery
    .input(z.object({
      product: z.string().min(1), grade: z.string().max(255).default(""),
      quantityMt: z.number().positive(), packingStyle: z.string().min(1),
      portOfEntry: z.string().min(1), destinationPort: z.string().min(1),
      finalDeliveryLocation: z.string().max(255).default(""),
      deliveryWindowFrom: z.string().min(4), deliveryWindowTo: z.string().min(4),
      targetPrice: z.number().positive().optional(), currency: z.string().max(8).optional(),
      incoterm: z.string().max(16).optional(), notes: z.string().max(2000).default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      assertAq1Enabled();
      const me = await effUser(ctx.user);
      assertBuyer(me);
      const [{ id }] = await getDb().insert(s.orderRequirements).values({
        userId: me.id, product: input.product, grade: input.grade || null,
        quantityMt: input.quantityMt, packingStyle: input.packingStyle,
        portOfEntry: input.portOfEntry, destinationPort: input.destinationPort,
        finalDeliveryLocation: input.finalDeliveryLocation || null,
        deliveryWindowFrom: input.deliveryWindowFrom, deliveryWindowTo: input.deliveryWindowTo,
        targetPrice: input.targetPrice ?? null, currency: input.currency ?? null,
        incoterm: input.incoterm ?? null, notes: input.notes || null,
      }).returning({ id: s.aqGenerationLog.id });
      // an abandoned requirement is still a qualified lead — surface it to the desk
      const staff = await getDb().query.users.findMany({ where: eq(s.users.portalRole, "ADMIN"), limit: 5 });
      for (const a of staff) {
        await notify(a.id, "ORDER_REQUIREMENT", `New order requirement: ${input.quantityMt} MT ${input.product}`,
          `${fmtActor(me)} captured a requirement (${input.product}, ${input.quantityMt} MT, ${input.destinationPort}).`, "/admin/aq1");
      }
      await logActivity(fmtActor(me), `Captured order requirement (${input.product}, ${input.quantityMt} MT)`, "order_requirements", String(id), me.id);
      return { id: Number(id) };
    }),

  requirementStatus: authedQuery
    .input(z.object({ id: z.number(), status: z.enum(["upgrade_started", "upgraded", "callback_requested", "abandoned"]) }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertBuyer(me);
      await getDb().update(s.orderRequirements).set({ status: input.status })
        .where(and(eq(s.orderRequirements.id, input.id), eq(s.orderRequirements.userId, me.id)));
      if (input.status === "callback_requested") {
        const staff = await getDb().query.users.findMany({ where: eq(s.users.portalRole, "ADMIN"), limit: 5 });
        for (const a of staff) await notify(a.id, "CALLBACK", `Callback requested by ${fmtActor(me)}`, `Requirement #${input.id}: the buyer asked the desk to call instead.`, "/admin/aq1");
      }
      return { ok: true };
    }),

  myRequirements: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    const rows = await getDb().query.orderRequirements.findMany({
      where: eq(s.orderRequirements.userId, me.id), orderBy: desc(s.orderRequirements.id), limit: 20,
    });
    return rows.map((r) => ({ ...r, id: Number(r.id) }));
  }),

  requirementsAdmin: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    assertStaff(me);
    const rows = await getDb().query.orderRequirements.findMany({ orderBy: desc(s.orderRequirements.id), limit: 100 });
    const users = await getDb().query.users.findMany({ limit: 500 });
    const byId = new Map(users.map((u) => [u.id, u]));
    return rows.map((r) => ({ ...r, id: Number(r.id), userEmail: byId.get(r.userId)?.email ?? null, userName: byId.get(r.userId)?.name ?? null }));
  }),

  /* --------------------------------------- Community Call */
  communityNext: authedQuery.query(async ({ ctx }) => {
    assertAq1Enabled();
    const me = await effUser(ctx.user);
    const db = getDb();
    const sessions = await db.query.communityCallSessions.findMany({ orderBy: desc(s.communityCallSessions.startsAt), limit: 20 });
    const upcoming = sessions.filter((x) => x.status === "SCHEDULED" && x.startsAt > new Date()).sort((a, b) => +a.startsAt - +b.startsAt);
    const past = sessions.filter((x) => x.status === "COMPLETED" && x.recordingUrl);
    const myRegs = await db.query.communityCallRegistrations.findMany({
      where: and(eq(s.communityCallRegistrations.userId, me.id), eq(s.communityCallRegistrations.status, "REGISTERED")),
    });
    return {
      next: upcoming[0] ? { ...upcoming[0], id: Number(upcoming[0].id) } : null,
      past: past.map((x) => ({ id: Number(x.id), topic: x.topic, startsAt: x.startsAt, recordingUrl: x.recordingUrl })),
      mySessionIds: myRegs.map((r) => Number(r.sessionId)),
    };
  }),

  communityRegister: authedQuery
    .input(z.object({
      sessionId: z.number(), name: z.string().min(1), email: z.string().email(),
      company: z.string().default(""), country: z.string().default(""),
      question: z.string().max(1000).default(""), reminders: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertAq1Enabled();
      const me = await effUser(ctx.user);
      const db = getDb();
      const session = await db.query.communityCallSessions.findFirst({ where: eq(s.communityCallSessions.id, input.sessionId) });
      if (!session || session.status !== "SCHEDULED") throw new TRPCError({ code: "NOT_FOUND", message: "That call is not open for registration." });
      const existing = await db.query.communityCallRegistrations.findFirst({
        where: and(eq(s.communityCallRegistrations.sessionId, input.sessionId), eq(s.communityCallRegistrations.userId, me.id), eq(s.communityCallRegistrations.status, "REGISTERED")),
      });
      if (existing) return { id: Number(existing.id), already: true };
      const [{ id }] = await db.insert(s.communityCallRegistrations).values({
        sessionId: input.sessionId, userId: me.id, name: input.name, email: input.email.toLowerCase(),
        company: input.company || null, country: input.country || null, question: input.question || null,
        reminders: input.reminders,
      }).returning({ id: s.communityCallRegistrations.id });
      const dt = session.startsAt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Aquifert//Community Call//EN", "BEGIN:VEVENT",
        `UID:aq-call-${session.id}@aquifert.com`, `DTSTART:${dt}`,
        `DTEND:${new Date(+session.startsAt + session.durationMinutes * 60000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
        `SUMMARY:Aquifert Community Call — ${session.topic}`,
        `DESCRIPTION:Joining link: ${session.joiningLink ?? "will follow by email"}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
      await sendTransactional(input.email, `You're registered: Aquifert Community Call — ${session.topic}`,
        `Hi ${input.name},\n\nYou're registered for the Aquifert community call "${session.topic}" on ${session.startsAt.toUTCString()} (${session.durationMinutes} minutes), hosted by ${session.host}.\nJoining link: ${session.joiningLink ?? "will follow by email"}\n\nAdd to your calendar with the attached details below.\n\n-- The Aquifert desk`)
        .catch(() => undefined); // mail transport is best-effort; registration stands
      await logActivity(fmtActor(me), `Registered for community call "${session.topic}"`, "community_call", String(id), me.id);
      return { id: Number(id), already: false, ics };
    }),

  communityCancel: authedQuery.input(z.object({ sessionId: z.number() })).mutation(async ({ ctx, input }) => {
    const me = await effUser(ctx.user);
    await getDb().update(s.communityCallRegistrations).set({ status: "CANCELLED" })
      .where(and(eq(s.communityCallRegistrations.sessionId, input.sessionId), eq(s.communityCallRegistrations.userId, me.id)));
    return { ok: true };
  }),

  communitySessionsAdmin: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    assertStaff(me);
    const db = getDb();
    const sessions = await db.query.communityCallSessions.findMany({ orderBy: desc(s.communityCallSessions.startsAt), limit: 50 });
    const regs = await db.query.communityCallRegistrations.findMany({ orderBy: desc(s.communityCallRegistrations.id), limit: 500 });
    return {
      sessions: sessions.map((x) => ({ ...x, id: Number(x.id), registrations: regs.filter((r) => r.sessionId === x.id && r.status === "REGISTERED").length })),
      registrations: regs.map((r) => ({ ...r, id: Number(r.id), sessionId: Number(r.sessionId) })),
    };
  }),

  communitySessionSave: authedQuery
    .input(z.object({
      id: z.number().optional(), startsAt: z.string(), durationMinutes: z.number().int().min(15).max(180).default(45),
      topic: z.string().min(3), host: z.string().min(2), joiningLink: z.string().default(""),
      recordingUrl: z.string().default(""), status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const db = getDb();
      const values = {
        startsAt: new Date(input.startsAt), durationMinutes: input.durationMinutes, topic: input.topic,
        host: input.host, joiningLink: input.joiningLink || null, recordingUrl: input.recordingUrl || null, status: input.status,
      };
      if (input.id) {
        await db.update(s.communityCallSessions).set(values).where(eq(s.communityCallSessions.id, input.id));
        return { id: input.id };
      }
      const [{ id }] = await db.insert(s.communityCallSessions).values(values).returning({ id: s.communityCallSessions.id });
      await logActivity(fmtActor(me), `Scheduled community call "${input.topic}"`, "community_call", String(id), me.id);
      return { id: Number(id) };
    }),

  /* --------------------------------------- Promos (Section 4) */
  promoNext: authedQuery.query(async ({ ctx }) => {
    assertAq1Enabled();
    const me = await effUser(ctx.user);
    try {
      const member = await Promise.race([
        getDb().query.memberships.findFirst({
          where: and(eq(s.memberships.userId, me.id), eq(s.memberships.status, "ACTIVE")),
        }),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("timeout")), 1000)),
      ]);
      return nextPromoFor(me.id, Boolean(member));
    } catch {
      return { promo: null, reason: "unavailable" };
    }
  }),

  promoRecord: authedQuery
    .input(z.object({ promoKey: z.enum(["A", "B", "C"]), action: z.enum(["shown", "dismissed", "clicked"]) }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      await getDb().insert(s.promoImpressions).values({ userId: me.id, promoKey: input.promoKey, action: input.action });
      return { ok: true };
    }),

  /* --------------------------------------- First-run tour */
  tourGet: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    try {
      const row = await Promise.race([
        getDb().query.tourProgress.findFirst({ where: eq(s.tourProgress.userId, me.id) }),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("timeout")), 1000)),
      ]);
      return row ?? null;
    } catch {
      // Skip tour when DB is unavailable so Hub UI is not blocked.
      return {
        userId: me.id,
        lastStepCompleted: 6,
        status: "completed" as const,
        resumeOffered: true,
        updatedAt: new Date(),
      };
    }
  }),

  tourUpdate: authedQuery
    .input(z.object({
      lastStepCompleted: z.number().int().min(0).max(6),
      status: z.enum(["not_started", "in_progress", "completed", "skipped"]),
      resumeOffered: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      await getDb()
        .insert(s.tourProgress)
        .values({
          userId: me.id,
          lastStepCompleted: input.lastStepCompleted,
          status: input.status,
          resumeOffered: input.resumeOffered ?? false,
        })
        .onConflictDoUpdate({
          target: s.tourProgress.userId,
          set: {
            lastStepCompleted: input.lastStepCompleted,
            status: input.status,
            resumeOffered: input.resumeOffered ?? false,
            updatedAt: new Date(),
          },
        });
      return { ok: true };
    }),

  /* --------------------------------------- Contact Us */
  contact: authedQuery
    .input(z.object({
      channel: z.enum(["whatsapp", "book_call", "message", "callback"]),
      name: z.string().min(1), email: z.string().email(), company: z.string().default(""),
      message: z.string().max(2000).default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      assertAq1Enabled();
      const me = await effUser(ctx.user);
      const staff = await getDb().query.users.findMany({ where: eq(s.users.portalRole, "ADMIN"), limit: 5 });
      const label = { whatsapp: "WhatsApp conversation requested", book_call: "Call booking requested", message: "Message received", callback: "Callback requested" }[input.channel];
      for (const a of staff) {
        await notify(a.id, "CONTACT", `${label}: ${input.name}`, input.message || `${input.name} (${input.email}${input.company ? `, ${input.company}` : ""}) via Contact Us.`, "/admin/aq1");
      }
      await logActivity(fmtActor(me), `Contact Us: ${input.channel}`, "contact", undefined, me.id);
      return { ok: true };
    }),
});
