import type { Plan } from "@/lib/session-shared";

export type MockProductPlan = "growth" | "enterprise" | null;

/** AQ Analytics tools: admins, AQ Analytics members (growth) and AQ ZERO (enterprise, which includes them). */
export function canSeeAqAnalytics(viewer: { plan: Plan; admin?: boolean } | null) {
  if (!viewer) return false;
  return Boolean(viewer.admin) || viewer.plan === "growth" || viewer.plan === "enterprise";
}

/** A paid plan, or an admin using the demo subscription. A member's saved demo flag does not open the product. */
export function hasAqAnalytics(viewer: { plan: Plan; admin?: boolean; mockPlan?: MockProductPlan }) {
  if (viewer.plan === "growth" || viewer.plan === "enterprise") return true;
  return Boolean(viewer.admin) && (viewer.mockPlan === "growth" || viewer.mockPlan === "enterprise");
}

/** AQ Zero opens once that membership is active. AQ Analytics alone does not include it. */
export function hasAqZero(viewer: { plan: Plan; mockPlan?: MockProductPlan }) {
  return viewer.plan === "enterprise";
}
