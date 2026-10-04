/**
 * Plans shown on /pricing. No payment processor is connected yet, so plan
 * changes are previewed honestly and then routed to the desk.
 */
export type Interval = "monthly" | "annual";

type Capability = { capabilityKey: string; label: string; group: string; description: string | null };
type Limit = { limitKey: string; value: number | "unlimited" };

export type Plan = {
  planId: string;
  planKey: string;
  displayName: string;
  family: "trading" | "analytics" | "aq0";
  priceMonthlyMinor: number | null;
  annualDiscountPct: number | null;
  annualMinor: number | null;
  capabilities: Capability[];
  limits: Limit[];
};

const TELEX: Capability = {
  capabilityKey: "intel.telex_feed",
  label: "TELEX",
  group: "Market intelligence",
  description: null,
};

export const PLANS: Plan[] = [
  {
    planId: "aq1",
    planKey: "aq1",
    displayName: "AQ1 Free",
    family: "trading",
    priceMonthlyMinor: null,
    annualDiscountPct: null,
    annualMinor: null,
    capabilities: [TELEX],
    limits: [],
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
      TELEX,
      { capabilityKey: "analytics.pra_data", label: "Market Data", group: "Analytics & licensed data", description: null },
      { capabilityKey: "intel.aq_signal_outlook", label: "AQ Signal", group: "Market intelligence", description: null },
      { capabilityKey: "push.paid_newsletter", label: "The Briefing", group: "Pushes & alerts", description: null },
    ],
    limits: [],
  },
];

const GROUP_ORDER = ["Market intelligence", "Analytics & licensed data", "AI assistant", "Pushes & alerts", "Trading", "Limits", "Support"];

export function pricingMatrix() {
  const groups = new Map<string, { capabilityKey: string; label: string; description: string | null }[]>();
  for (const p of PLANS) {
    for (const c of p.capabilities) {
      if (!groups.has(c.group)) groups.set(c.group, []);
      const rows = groups.get(c.group)!;
      if (!rows.some((r) => r.capabilityKey === c.capabilityKey)) {
        rows.push({ capabilityKey: c.capabilityKey, label: c.label, description: c.description });
      }
    }
  }
  const grouped = GROUP_ORDER.filter((g) => groups.has(g)).map((g) => ({
    group: g,
    rows: groups.get(g)!.sort((a, b) => a.label.localeCompare(b.label)),
  }));
  return { plans: PLANS, grouped };
}

/** Every member starts on AQ1 Free until billing is connected. */
export const CURRENT_PLAN_KEY = "aq1";

const VAT_PCT = 20;
const gbp = (minor: number) => `£${(minor / 100).toFixed(2)}`;
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export function previewChange(targetPlanKey: string, interval: Interval) {
  const current = PLANS.find((p) => p.planKey === CURRENT_PLAN_KEY)!;
  const target = PLANS.find((p) => p.planKey === targetPlanKey) ?? PLANS[1];
  const has = (p: Plan, key: string) => p.capabilities.some((c) => c.capabilityKey === key);
  const price = (interval === "annual" ? target.annualMinor : target.priceMonthlyMinor) ?? 0;
  const currentPrice = (interval === "annual" ? current.annualMinor : current.priceMonthlyMinor) ?? 0;
  const upgrade = price >= currentPrice;
  const vatMinor = Math.round((price * VAT_PCT) / 100);
  const renewal = new Date();
  if (interval === "annual") renewal.setFullYear(renewal.getFullYear() + 1);
  else renewal.setMonth(renewal.getMonth() + 1);

  return {
    changeType: (target.priceMonthlyMinor == null ? "cancel" : upgrade ? "upgrade" : "downgrade") as
      | "upgrade"
      | "downgrade"
      | "crossgrade"
      | "cancel",
    current: { planKey: current.planKey, displayName: current.displayName },
    target: { planKey: target.planKey, displayName: target.displayName },
    gains: target.capabilities.filter((c) => !has(current, c.capabilityKey)).map((c) => c.label),
    losses: current.capabilities.filter((c) => !has(target, c.capabilityKey)).map((c) => c.label),
    effective: upgrade
      ? { when: "immediate" as const, date: null }
      : { when: "period_end" as const, date: isoDate(renewal) },
    money: {
      chargeTodayMinor: upgrade ? price + vatMinor : 0,
      chargeTodayLabel: upgrade ? gbp(price + vatMinor) : null,
      nextRenewalMinor: price || null,
      nextRenewalDate: price ? isoDate(renewal) : null,
      nothingChargedNow: !upgrade || price === 0,
    },
    interval,
    seats: null,
    grandfatheredOrders: [] as { reference: string; quantityMt: number }[],
    vat: {
      ratePct: price ? VAT_PCT : 0,
      note: price ? "UK VAT applies to UK customers." : "No VAT on free plans.",
      vatMinor,
      totalMinor: price + vatMinor,
    },
  };
}
