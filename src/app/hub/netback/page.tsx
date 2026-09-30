import { Suspense } from "react";
import { NetbackCalculator } from "@/components/calculators/netback-calculator";
import { isAdminUser } from "@/lib/admin-access";
import { activePorts, getFreightDesk, nextReset } from "@/lib/freight-desk/store";
import { getNetbackDesk, netbackUsage } from "@/lib/netback-desk/store";
import { liveOrigins, planLimit, weekLabel } from "@/lib/netback-desk/types";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NetbackPage() {
  const [user, desk, freight] = await Promise.all([getSession(), getNetbackDesk(), getFreightDesk()]);
  const limit = !user || isAdminUser(user) ? 0 : planLimit(desk.settings, user.plan);
  const usage = { used: user ? await netbackUsage(user.id) : 0, limit, resetsOn: nextReset() };
  const config = { origins: liveOrigins(desk.benchmarks), costs: desk.settings.costs, duties: desk.duties, week: weekLabel(desk.week, desk.date) };
  return (
    <Suspense fallback={<p className="text-sm text-mid">Loading calculator…</p>}>
      <NetbackCalculator ports={activePorts(freight)} config={config} usage={usage} />
    </Suspense>
  );
}
