import type { MembershipTier } from "@/lib/aq-modules/membership";
import type { Plan } from "@/lib/session-shared";

export const BILLING_OFFERS = ["analytics", "sprout", "harvest", "scale"] as const;
export type BillingOffer = (typeof BILLING_OFFERS)[number];

const PRICE_ENV: Record<BillingOffer, string> = {
  analytics: "STRIPE_PRICE_ANALYTICS",
  sprout: "STRIPE_PRICE_ZERO_SPROUT",
  harvest: "STRIPE_PRICE_ZERO_HARVEST",
  scale: "STRIPE_PRICE_ZERO_SCALE",
};

export function isBillingOffer(value: unknown): value is BillingOffer {
  return typeof value === "string" && (BILLING_OFFERS as readonly string[]).includes(value);
}

export function offerAccess(offer: BillingOffer): { plan: Extract<Plan, "growth" | "enterprise">; tier: MembershipTier | null } {
  if (offer === "analytics") return { plan: "growth", tier: null };
  return { plan: "enterprise", tier: offer };
}

export function priceEnv(offer: BillingOffer) {
  return PRICE_ENV[offer];
}

export function priceIdFor(offer: BillingOffer, env: Record<string, string | undefined> = process.env) {
  const value = env[PRICE_ENV[offer]]?.trim();
  return value || null;
}

export function offerForPrice(priceId: string, env: Record<string, string | undefined> = process.env): BillingOffer | null {
  return BILLING_OFFERS.find((offer) => priceIdFor(offer, env) === priceId) ?? null;
}

export function productHome(offer: BillingOffer) {
  return offer === "analytics" ? "/hub/tools/analytics" : "/hub/zero";
}

export function checkoutCancelPath(offer: BillingOffer) {
  return offer === "analytics" ? "/hub/plans/aq-analytics" : "/hub/plans/aq-zero";
}
