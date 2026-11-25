import { OnboardingOverlay } from "@/components/hub/onboarding-overlay";
import { getOnboardingQuestions } from "@/lib/onboarding/store";
import { resolveQuestions } from "@/lib/onboarding/questions";
import { catalogFromDesk } from "@/lib/onboarding/validate";
import type { ProductPlan } from "@/lib/onboarding/gate";

/** Questions come from the admin console. An empty list does not trap the member. */
export async function ProductOnboarding({ plan }: { plan: ProductPlan }) {
  const [questions, catalog] = await Promise.all([getOnboardingQuestions(), catalogFromDesk()]);
  const live = resolveQuestions(questions, catalog);
  if (!live.length) return null;
  return <OnboardingOverlay plan={plan} questions={live} />;
}
