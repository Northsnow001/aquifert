import type { Plan } from "@/lib/session-shared";

export const MEMBERSHIP_TIERS = ["sprout", "harvest", "scale"] as const;
export type MembershipTier = (typeof MEMBERSHIP_TIERS)[number];
export type BillingCycle = "monthly" | "annual";

export type MembershipOffer = {
  id: MembershipTier | "analytics";
  name: string;
  plan: Plan;
  tier: MembershipTier | null;
  tagline: string;
  features: string[];
  missing: string[];
  popular?: boolean;
};

export const MEMBERSHIP_OFFERS: MembershipOffer[] = [
  {
    id: "sprout",
    name: "AQ Sprout",
    plan: "enterprise",
    tier: "sprout",
    tagline: "Up to 200 tonnes / month",
    features: ["Cost-to-cost pricing (no margin)", "Basic market insights dashboard", "30-day price trends", "Standard support"],
    missing: ["Invoice financing", "Real-time AI recommendations", "Dedicated account manager"],
  },
  {
    id: "harvest",
    name: "AQ Harvest",
    plan: "enterprise",
    tier: "harvest",
    tagline: "201–600 tonnes / month",
    features: ["Everything in AQ Sprout", "Real-time insights dashboard", "Invoice financing up to £50k", "AI trade recommendations", "Priority support"],
    missing: ["Dedicated account manager", "Custom analytics"],
    popular: true,
  },
  {
    id: "scale",
    name: "AQ Scale",
    plan: "enterprise",
    tier: "scale",
    tagline: "Unlimited tonnes / month",
    features: ["Everything in AQ Harvest", "Dedicated account manager", "Financing up to £200k", "Custom analytics & reports", "Quarterly strategy reviews"],
    missing: [],
  },
  {
    id: "analytics",
    name: "AQ Analytics",
    plan: "growth",
    tier: null,
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

export const TIER_LABEL: Record<MembershipTier, string> = { sprout: "AQ Sprout", harvest: "AQ Harvest", scale: "AQ Scale" };

export const isTier = (value: unknown): value is MembershipTier => MEMBERSHIP_TIERS.includes(value as MembershipTier);
export const isCycle = (value: unknown): value is BillingCycle => value === "monthly" || value === "annual";
