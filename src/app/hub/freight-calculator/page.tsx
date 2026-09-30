import { Suspense } from "react";
import { after } from "next/server";
import { FreightCalculator } from "@/components/calculators/freight-calculator";
import { isAdminUser } from "@/lib/admin-access";
import { refreshStaleMarketData } from "@/lib/freight-desk/market";
import { activePorts, getFreightDesk, monthlyUsage, nextReset } from "@/lib/freight-desk/store";
import { planLimit } from "@/lib/freight-desk/types";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function FreightPage() {
  const user = await getSession();
  const desk = getFreightDesk();
  const { settings } = desk;
  after(() => refreshStaleMarketData());
  const limit = user && !isAdminUser(user) ? planLimit(settings, user.plan) : 0;

  return (
    <Suspense fallback={<p className="text-sm text-mid">Loading calculator…</p>}>
      <FreightCalculator
        ports={activePorts(desk)}
        bunkers={settings.showBunkerBar ? desk.bunker.prices : []}
        defaultBunker={desk.bunker.prices[0]?.price ?? 700}
        bdi={desk.bdi.value}
        cargoPremiums={settings.cargoPremiums}
        iranLabel={settings.iranLabel}
        usage={{ used: user ? monthlyUsage(user.id) : 0, limit, resetsOn: nextReset() }}
      />
    </Suspense>
  );
}
