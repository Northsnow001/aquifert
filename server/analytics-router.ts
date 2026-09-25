/**
 * AQ Analytics — lightweight router with sample market content for client demos.
 * Real licensed feeds can replace these later without changing the UI routes.
 * Does not use Drizzle / DATABASE_URL.
 */
import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { effUser } from "./rbac";

const PRODUCTS = ["NITROGEN", "PHOSPHATE", "POTASSIUM", "FREIGHT", "GENERAL"] as const;
const REGIONS = [
  "GLOBAL", "MIDDLE_EAST", "NORTH_AMERICA", "SOUTH_AMERICA", "EUROPE",
  "SOUTH_ASIA", "EAST_ASIA", "FSU", "AFRICA",
] as const;

const SAMPLE_TELEX = [
  {
    id: 1,
    title: "POTASSIUM, Contract chatter",
    body: "SE Asia standard MOP contracts under discussion; spot remains quiet with soft liquidity.",
    product: "POTASSIUM",
    geography: "EAST_ASIA",
    createdAt: new Date("2026-09-12T10:00:00Z"),
    updatedAt: new Date("2026-09-12T10:00:00Z"),
    tag: "STEADY TELEX",
  },
  {
    id: 2,
    title: "PHOSPHATE, TSP niche firm",
    body: "LatAm demand for TSP supports a firmer niche; mainstream DAP/MAP balanced.",
    product: "PHOSPHATE",
    geography: "SOUTH_AMERICA",
    createdAt: new Date("2026-09-12T14:00:00Z"),
    updatedAt: new Date("2026-09-12T14:00:00Z"),
    tag: "FIRMER TELEX",
  },
  {
    id: 3,
    title: "FREIGHT, Baltic dry index flat",
    body: "Dry bulk indices little changed week-on-week; fertilizer stems still finding cover.",
    product: "FREIGHT",
    geography: "GLOBAL",
    createdAt: new Date("2026-09-13T09:00:00Z"),
    updatedAt: new Date("2026-09-13T09:00:00Z"),
    tag: "SOFTER TELEX",
  },
  {
    id: 4,
    title: "NITROGEN, US fill done",
    body: "US fill season largely complete; attention shifts to Mexican and Brazilian stems.",
    product: "NITROGEN",
    geography: "NORTH_AMERICA",
    createdAt: new Date("2026-09-13T16:00:00Z"),
    updatedAt: new Date("2026-09-13T16:00:00Z"),
    tag: "FIRMER AQUIFERT DESK WIRE",
  },
  {
    id: 5,
    title: "India IPL issues urea tender for October shipment",
    body: "Fresh Indian tender keeps Middle East FOB constructive into October.",
    product: "NITROGEN",
    geography: "SOUTH_ASIA",
    createdAt: new Date("2026-09-17T12:00:00Z"),
    updatedAt: new Date("2026-09-17T12:00:00Z"),
    tag: "FIRMER AQUIFERT DESK WIRE",
  },
];

const CAPS = [
  "intel.telex_feed", "analytics.pra_data", "intel.aq_signal_history", "intel.aq_signal_outlook",
  "analytics.trade_flows", "analytics.port_lineups", "analytics.fixtures", "analytics.freight_bench",
  "calc.freight_calculator", "calc.broker_link", "analytics.supply_demand",
  "aquibot.unlimited", "push.paid_newsletter", "push.tailored_alerts", "push.daily_brief",
  "push.trader_in_pocket",
] as const;

/** Free-plan sample: TELEX unlocked; premium modules locked with upgrade hint. */
const FREE_ALLOWED = new Set<string>(["intel.telex_feed", "push.trader_in_pocket"]);

export const analyticsRouter = createRouter({
  config: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    const capabilities: Record<string, { allowed: boolean; cheapest: string | null }> = {};
    for (const c of CAPS) {
      const allowed = FREE_ALLOWED.has(c);
      capabilities[c] = { allowed, cheapest: allowed ? null : "AQ Analytics" };
    }
    return { enabled: true, capabilities };
  }),

  telex: authedQuery
    .input(z.object({
      products: z.array(z.string()).default([]),
      regions: z.array(z.string()).default([]),
      tags: z.array(z.string()).default([]),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.number().min(1).max(200).default(50),
    }))
    .query(async ({ ctx, input }) => {
      await effUser(ctx.user);
      let items = SAMPLE_TELEX;
      if (input.products.length) items = items.filter((t) => input.products.includes(t.product));
      if (input.regions.length) items = items.filter((t) => input.regions.includes(t.geography));
      return {
        items: items.slice(0, input.limit),
        products: [...PRODUCTS],
        regions: [...REGIONS],
        freshness: {
          level: "amber" as const,
          asOf: "2026-09-18T14:07:00.000Z",
          ageHours: 168,
          cadence: "4 hours",
          source: "Aquifert Desk TELEX",
          owner: "Trading Desk",
          nextExpected: null,
        },
      };
    }),

  telexSavedFilter: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    return { products: [] as string[], regions: [] as string[] };
  }),

  telexSaveFilter: authedQuery
    .input(z.object({ products: z.array(z.string()), regions: z.array(z.string()) }))
    .mutation(async () => ({ ok: true })),

  seriesList: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    return [
      { key: "urea_cfr_brazil", name: "Urea CFR Brazil", unit: "USD/t", product: "NITROGEN" },
      { key: "dap_fob_morocco", name: "DAP FOB Morocco", unit: "USD/t", product: "PHOSPHATE" },
      { key: "mop_cfr_se_asia", name: "MOP CFR SE Asia", unit: "USD/t", product: "POTASSIUM" },
    ];
  }),

  seriesRead: authedQuery
    .input(z.object({ keys: z.array(z.string()).min(1).max(5) }))
    .query(async ({ ctx, input }) => {
      await effUser(ctx.user);
      return input.keys.map((key) => ({
        key,
        points: [
          { date: "2026-09-01", value: 340, low: 335, high: 345 },
          { date: "2026-09-10", value: 348, low: 342, high: 352 },
          { date: "2026-09-17", value: 355, low: 350, high: 360 },
        ],
        attribution: "Sample desk series — replace with licensed PRA feed",
        exportAllowed: false,
        maxRowsPerExport: null,
        asOf: "2026-09-17",
      }));
    }),

  seriesExport: authedQuery.input(z.object({ key: z.string() })).mutation(async () => ({
    csv: "date,value\n2026-09-17,355",
    rows: 1,
  })),

  signalHistory: authedQuery
    .input(z.object({ products: z.array(z.string()).default([]) }))
    .query(async ({ ctx }) => {
      await effUser(ctx.user);
      return [
        {
          product: "Urea",
          windows: [
            { windowDays: 7, available: true as const, changePct: 1.2, direction: "up" },
            { windowDays: 30, available: true as const, changePct: -0.4, direction: "flat" },
            { windowDays: 90, available: true as const, changePct: 3.1, direction: "up" },
          ],
        },
      ];
    }),

  signalOutlook: authedQuery
    .input(z.object({ product: z.string() }).optional())
    .query(async ({ ctx }) => {
      await effUser(ctx.user);
      return {
        product: "Urea",
        bias: "constructive",
        summary: "Fresh Indian tender and firm Egyptian FOB keep a mild bullish bias into October.",
        asOf: "2026-09-17T21:07:00.000Z",
      };
    }),

  tradeFlows: authedQuery
    .input(z.object({ product: z.string().optional(), origin: z.string().optional() }).optional())
    .query(async ({ ctx }) => {
      await effUser(ctx.user);
      return { flows: [], asOf: null };
    }),

  portLineups: authedQuery
    .input(z.object({ port: z.string().optional() }))
    .query(async ({ ctx }) => {
      await effUser(ctx.user);
      return { lineups: [], asOf: null };
    }),

  actionInMarket: authedQuery
    .input(z.object({ region: z.string().optional() }).optional())
    .query(async ({ ctx }) => {
      await effUser(ctx.user);
      return { items: [] };
    }),

  freightBenchmarks: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    return { benches: [], asOf: null };
  }),

  supplyDemand: authedQuery
    .input(z.object({ nutrient: z.enum(["NITROGEN", "PHOSPHATE", "POTASSIUM"]).default("NITROGEN") }))
    .query(async ({ ctx, input }) => {
      await effUser(ctx.user);
      return {
        nutrient: input.nutrient,
        balance: "balanced",
        notes: "Sample supply-demand snapshot for client review.",
        asOf: "2026-09-17T21:07:00.000Z",
      };
    }),
});
