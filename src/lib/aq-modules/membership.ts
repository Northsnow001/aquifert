import type { Plan } from "@/lib/session-shared";

export const MEMBERSHIP_TIERS = ["sprout", "harvest", "scale"] as const;
export type MembershipTier = (typeof MEMBERSHIP_TIERS)[number];
export type BillingCycle = "monthly" | "annual";

export const ANNUAL_DISCOUNT = 0.1;

export type MembershipOffer = {
  id: MembershipTier | "analytics";
  name: string;
  plan: Plan;
  tier: MembershipTier | null;
  /** GBP per month. */
  monthly: number;
  tagline: string;
  features: string[];
  missing: string[];
  popular?: boolean;
};

export const MEMBERSHIP_OFFERS: MembershipOffer[] = [
  {
    id: "sprout",
    name: "Sprout",
    plan: "enterprise",
    tier: "sprout",
    monthly: 2000,
    tagline: "Up to 200 tonnes / month",
    features: ["Cost-to-cost pricing (no margin)", "Basic market insights dashboard", "30-day price trends", "Standard support"],
    missing: ["Invoice financing", "Real-time AI recommendations", "Dedicated account manager"],
  },
  {
    id: "harvest",
    name: "Harvest",
    plan: "enterprise",
    tier: "harvest",
    monthly: 5000,
    tagline: "201–600 tonnes / month",
    features: ["Everything in Sprout", "Real-time insights dashboard", "Invoice financing up to £50k", "AI trade recommendations", "Priority support"],
    missing: ["Dedicated account manager", "Custom analytics"],
    popular: true,
  },
  {
    id: "scale",
    name: "Scale",
    plan: "enterprise",
    tier: "scale",
    monthly: 7000,
    tagline: "Unlimited tonnes / month",
    features: ["Everything in Harvest", "Dedicated account manager", "Financing up to £200k", "Custom analytics & reports", "Quarterly strategy reviews"],
    missing: [],
  },
  {
    id: "analytics",
    name: "AQ Analytics",
    plan: "growth",
    tier: null,
    monthly: 299,
    tagline: "Analytics & licensed market data · no physical trading",
    features: [
      "Everything in the free AQ ONE plan",
      "AQ Analytics dashboard: PRA data, trade flows, port lineups",
      "Freight benchmarks & fixtures",
      "Unlimited Aquibot assistant",
      "Daily brief & tailored price alerts",
      "200 data exports / month",
    ],
    missing: ["Physical trading (quotes, orders, contracts)"],
  },
];

export const TIER_LABEL: Record<MembershipTier, string> = { sprout: "Sprout", harvest: "Harvest", scale: "Scale" };

export const isTier = (value: unknown): value is MembershipTier => MEMBERSHIP_TIERS.includes(value as MembershipTier);
export const isCycle = (value: unknown): value is BillingCycle => value === "monthly" || value === "annual";

export const annualPrice = (monthly: number) => Math.round(monthly * 12 * (1 - ANNUAL_DISCOUNT));
export const annualSaving = (monthly: number) => monthly * 12 - annualPrice(monthly);

export function gbp(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}
