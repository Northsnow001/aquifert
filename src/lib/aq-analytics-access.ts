import type { Plan } from "@/lib/session-shared";

/** AQ Analytics tools: admins, AQ Analytics members (growth) and AQ ZERO (enterprise, which includes them). */
export function canSeeAqAnalytics(viewer: { plan: Plan; admin?: boolean } | null) {
  if (!viewer) return false;
  return Boolean(viewer.admin) || viewer.plan === "growth" || viewer.plan === "enterprise";
}
