import type { MemberPrefs } from "@/lib/aq-modules/member-types";
import type { Plan } from "@/lib/session-shared";

export type ProductPlan = "growth" | "enterprise";

/** The paid product on the account. Stripe writes this plan after checkout. */
export function productPlan(user: { plan: Plan }, _prefs?: Pick<MemberPrefs, "mockPlan">): ProductPlan | null {
  if (user.plan === "growth" || user.plan === "enterprise") return user.plan;
  return null;
}

/** AQ Analytics and AQ Zero stay closed until the questionnaire from the admin console is submitted. */
export function needsProductOnboarding(user: { plan: Plan }, prefs: Pick<MemberPrefs, "mockPlan" | "onboardingDone">) {
  return Boolean(productPlan(user, prefs)) && !prefs.onboardingDone;
}
