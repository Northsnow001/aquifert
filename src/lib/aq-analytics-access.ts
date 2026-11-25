import type { Plan } from "@/lib/session-shared";

export type MockProductPlan = "growth" | "enterprise" | null;

/** AQ Analytics tools: admins, AQ Analytics members (growth) and AQ ZERO (enterprise, which includes them). */
export function canSeeAqAnalytics(viewer: { plan: Plan; admin?: boolean } | null) {
  if (!viewer) return false;
  return Boolean(viewer.admin) || viewer.plan === "growth" || viewer.plan === "enterprise";
}

/** Payment is collected when Stripe has set the account plan to AQ Analytics or AQ ZERO. */
export function hasAqAnalytics(viewer: { plan: Plan; mockPlan?: MockProductPlan }) {
  return viewer.plan === "growth" || viewer.plan === "enterprise";
}

/** AQ Zero opens once that membership is active. AQ Analytics alone does not include it. */
export function hasAqZero(viewer: { plan: Plan; mockPlan?: MockProductPlan }) {
  return viewer.plan === "enterprise";
}
