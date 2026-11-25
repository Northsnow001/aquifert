import { redirect } from "next/navigation";
import { PersonalFeed } from "@/components/hub/personal-feed";
import { ProductOnboarding } from "@/components/hub/product-onboarding";
import { isAdminUser } from "@/lib/admin-access";
import { getPrefs } from "@/lib/aq-modules/members";
import { needsProductOnboarding, productPlan } from "@/lib/onboarding/gate";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ZeroPortalPage() {
  const user = await getSession();
  if (!user) redirect("/login?redirect_to=/hub/zero");
  const prefs = await getPrefs(user);
  const allowed = isAdminUser(user) || user.plan === "enterprise" || prefs.mockPlan === "enterprise";
  if (!allowed) redirect("/hub/plans/aq-zero");
  const plan = productPlan(user, prefs);
  if (plan && needsProductOnboarding(user, prefs)) {
    const gate = await ProductOnboarding({ plan: "enterprise" });
    if (gate) return gate;
  }
  return (
    <PersonalFeed
      title="Your AQ Zero"
      lede="The same interest profile as AQ Analytics, used for the desk flashes and notes that match how you buy. Buy Fertiliser stays on AQ ONE."
    />
  );
}
