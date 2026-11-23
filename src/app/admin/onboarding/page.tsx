import { OnboardingEditor } from "@/components/admin/onboarding-editor";
import { PageHeader } from "@/components/admin/ui";
import { getOnboardingQuestions } from "@/lib/onboarding/store";

export const dynamic = "force-dynamic";

export default async function OnboardingAdminPage() {
  const questions = await getOnboardingQuestions();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Onboarding questions"
        description="Asked once, after an admin mock-subscribes to AQ Analytics or AQ Zero, and before the dashboard opens. Country, tag and category choices come from the live lists and decide which Telex flashes and Aquibot briefing the member sees."
      />
      <OnboardingEditor initial={questions} />
    </div>
  );
}
