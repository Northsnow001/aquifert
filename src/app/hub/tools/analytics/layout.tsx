import { ProductOnboarding } from "@/components/hub/product-onboarding";
import { fmtDayYear } from "@/lib/aq-analytics/contracts";
import { dataNow } from "@/lib/aq-analytics/queries";
import { getPrefs } from "@/lib/aq-modules/members";
import { needsProductOnboarding, productPlan } from "@/lib/onboarding/gate";
import { requireAqAnalytics } from "@/lib/aq-preview";

export const dynamic = "force-dynamic";

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAqAnalytics("/hub/plans/aq-analytics");
  const prefs = await getPrefs(user);
  const plan = productPlan(user, prefs);
  if (plan && needsProductOnboarding(user, prefs)) {
    const gate = await ProductOnboarding({ plan });
    if (gate) return gate;
  }
  const now = await dataNow().catch(() => "2026-09-03");
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <p className="text-[12px] text-dim">
        Freight analytics · BL data to {fmtDayYear(now)}
        <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">Sample data</span>
        <span className="ml-2">Premium · daily updates</span>
      </p>
      {children}
    </div>
  );
}
