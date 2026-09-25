/**
 * Billing stubs for the UI update. Full processor/entitlement wiring can come later.
 * Avoids Drizzle/DATABASE_URL so auth on Supabase HTTPS stays intact.
 */
import { z } from "zod";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { effUser } from "./rbac";

const INTERVAL = z.enum(["monthly", "annual"]);
const PLAN_KEY = z.enum(["aq1", "aq_analytics", "aq0_sprout", "aq0_harvest", "aq0_scale"]);

const FREE_SUMMARY = {
  subscriptionId: "demo-free",
  status: "active" as const,
  plan: {
    planId: "aq1",
    planKey: "aq1" as const,
    displayName: "AQ1 Free",
    family: "trading" as const,
  },
  interval: "monthly" as const,
  currentPeriodEnd: null as string | null,
  pendingChange: null as null,
  cancelAtPeriodEnd: false,
  graceEndsAt: null as string | null,
  hasCardOnFile: false,
  seatCount: 1,
};

const SAMPLE_PLANS = [
  {
    planId: "aq1",
    planKey: "aq1",
    displayName: "AQ1 Free",
    family: "trading",
    priceMonthlyMinor: 0,
    annualDiscountPct: 0,
    annualMinor: 0,
    capabilities: [
      { capabilityKey: "intel.telex_feed", label: "Market TELEX Feed", group: "Market intelligence", description: null, included: true },
    ],
    limits: { tonnage: 0 },
  },
  {
    planId: "aq_analytics",
    planKey: "aq_analytics",
    displayName: "AQ Analytics",
    family: "analytics",
    priceMonthlyMinor: 14900,
    annualDiscountPct: 20,
    annualMinor: 143040,
    capabilities: [
      { capabilityKey: "analytics.pra_data", label: "Market Data", group: "Analytics & licensed data", description: null, included: true },
      { capabilityKey: "intel.aq_signal_outlook", label: "AQ Signal", group: "Market intelligence", description: null, included: true },
      { capabilityKey: "push.paid_newsletter", label: "The Briefing", group: "Pushes & alerts", description: null, included: true },
    ],
    limits: { tonnage: "unlimited" as const },
  },
];

export const billingRouter = createRouter({
  pricingMatrix: publicQuery.query(async () => {
    const GROUP_ORDER = ["Market intelligence", "Analytics & licensed data", "AI assistant", "Pushes & alerts", "Trading", "Limits", "Support"];
    const groups = new Map<string, { capabilityKey: string; label: string; description: string | null }[]>();
    for (const p of SAMPLE_PLANS) {
      for (const c of p.capabilities) {
        if (!groups.has(c.group)) groups.set(c.group, []);
        const row = groups.get(c.group)!;
        if (!row.some((r) => r.capabilityKey === c.capabilityKey)) {
          row.push({ capabilityKey: c.capabilityKey, label: c.label, description: c.description });
        }
      }
    }
    const grouped = GROUP_ORDER.filter((g) => groups.has(g)).map((g) => ({
      group: g,
      rows: groups.get(g)!.sort((a, b) => a.label.localeCompare(b.label)),
    }));
    return { plans: SAMPLE_PLANS, grouped };
  }),

  mySummary: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    return FREE_SUMMARY;
  }),

  preview: authedQuery
    .input(z.object({ targetPlanKey: PLAN_KEY, interval: INTERVAL }))
    .query(async ({ ctx, input }) => {
      await effUser(ctx.user);
      const target = SAMPLE_PLANS.find((p) => p.planKey === input.targetPlanKey) ?? SAMPLE_PLANS[1];
      return {
        changeType: "upgrade" as const,
        applied: "immediate" as const,
        gains: target.capabilities.map((c) => c.label),
        losses: [] as string[],
        effectiveAt: new Date().toISOString(),
        amountDueMinor: input.interval === "annual" ? target.annualMinor : target.priceMonthlyMinor,
        currency: "GBP",
        targetPlanKey: target.planKey,
        displayName: target.displayName,
      };
    }),

  applyChange: authedQuery
    .input(z.object({
      targetPlanKey: PLAN_KEY,
      interval: INTERVAL,
      idempotencyKey: z.string().min(8).max(80),
      revokeSeatIds: z.array(z.string()).optional(),
      simulateFailure: z.boolean().optional(),
    }))
    .mutation(async () => ({
      changeType: "upgrade" as const,
      applied: "immediate" as const,
      message: "Billing processor not connected yet — plan change is demo-only.",
    })),

  undoPending: authedQuery.mutation(async () => ({ ok: true })),

  invoices: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    return [] as { id: string; number: string; status: string; totalMinor: number; issuedAt: string; pdfUrl: string | null }[];
  }),

  profile: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    return {
      billingName: null as string | null,
      billingEmail: null as string | null,
      country: null as string | null,
      vatNumber: null as string | null,
      addressLine: null as string | null,
    };
  }),

  updateProfile: authedQuery
    .input(z.object({
      billingName: z.string().optional(),
      billingEmail: z.string().optional(),
      country: z.string().optional(),
      vatNumber: z.string().optional(),
      addressLine: z.string().optional(),
    }))
    .mutation(async () => ({ ok: true })),

  refreshStatus: authedQuery.mutation(async () => ({ ok: true })),

  updatePaymentMethod: authedQuery.mutation(async () => ({
    url: "demo://update-card",
  })),

  cancel: authedQuery
    .input(z.object({ immediate: z.boolean().optional() }).optional())
    .mutation(async () => ({ applied: "period_end" as const })),

  adminDashboard: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    return { mrrMinor: 0, active: 0, pastDue: 0, cancelling: 0 };
  }),

  adminUserSubscription: authedQuery
    .input(z.object({ userId: z.number() }))
    .query(async () => null),

  adminManualChange: authedQuery
    .input(z.object({
      userId: z.number(),
      planKey: PLAN_KEY,
      interval: INTERVAL.optional(),
      note: z.string().optional(),
    }))
    .mutation(async () => ({ ok: true })),
});
