import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { AlertsManager, BriefProducts, type AlertRow, type SeriesOption } from "@/components/hub/analytics/alerts-manager";
import { BriefEmailToggle } from "@/components/hub/analytics/switch";
import { AsOf } from "@/components/hub/analytics/ui";
import { HubPageHeader, Panel } from "@/components/hub/kit";
import { LockedScreen } from "@/components/hub/locked-screen";
import { getHubAccess } from "@/lib/aq-modules/access";
import { evaluateAlerts, latestPoint } from "@/lib/aq-modules/alerts";
import { getPrefs, listAlerts } from "@/lib/aq-modules/members";
import { dataAsOf } from "@/lib/aq-modules/signal";
import { SERIES_GROUPS } from "@/lib/aq-modules/types";
import { formatDay } from "@/lib/content-types";

export const metadata: Metadata = { title: "Alerts & Brief" };
export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const { user, modules, can } = await getHubAccess();
  if (!can("alerts")) return <LockedScreen module="alerts" required={modules.access.alerts} plan={user.plan} />;

  const [alerts, prefs] = await Promise.all([listAlerts(user).catch(() => []), getPrefs(user).catch(() => null)]);
  const asOf = dataAsOf(modules.series);

  const series: SeriesOption[] = SERIES_GROUPS.flatMap((group) =>
    modules.series
      .filter((item) => item.group === group)
      .map((item) => {
        const latest = latestPoint(item);
        return { id: item.id, label: item.label, basis: item.basis, unit: item.unit, group: item.group, latest: latest ? { date: latest.date, value: latest.value } : null };
      }),
  );

  const rows: AlertRow[] = evaluateAlerts(alerts, modules.series).map((state) => ({
    id: state.alert.id,
    seriesId: state.alert.seriesId,
    label: state.series?.label ?? "Retired series",
    basis: state.series?.basis ?? state.alert.seriesId,
    unit: state.series?.unit ?? "",
    direction: state.alert.direction,
    threshold: state.alert.threshold,
    note: state.alert.note,
    active: state.alert.active,
    latest: state.latest,
    triggered: state.triggered,
    distance: state.distance,
    missing: !state.series,
  }));

  return (
    <div className="flex flex-col gap-5 pb-2">
      <HubPageHeader
        eyebrow="AQ Analytics"
        title="Alerts & Brief"
        description="Set a price on the series you follow and see the moment it is crossed. Tune the weekly brief to the products you buy."
        tip="An alert is hit while the latest desk price is at or beyond your threshold. Alerts are checked every time the desk updates prices, and hits also show on your dashboard. You can hold up to 25 alerts."
      />

      {asOf ? <AsOf>Latest desk prices {formatDay(asOf)}</AsOf> : null}

      <AlertsManager series={series} alerts={rows} />

      <Panel title="Brief preferences" sub="The weekly brief from the desk, tuned to you" icon={Newspaper} bodyClassName="grid gap-6 p-5 md:grid-cols-2 md:gap-8">
        <BriefProducts options={SERIES_GROUPS} initial={(prefs?.briefProducts ?? []).filter((item) => (SERIES_GROUPS as readonly string[]).includes(item))} />
        <div className="md:border-l md:border-border md:pl-8">
          <BriefEmailToggle initial={prefs?.briefByEmail ?? false} email={user.email} />
        </div>
      </Panel>
    </div>
  );
}
