import Link from "next/link";
import { FilterBar } from "@/components/admin/aq-analytics/filter-bar";
import { KpiCard, KpiGrid, PACE_FILL } from "@/components/admin/aq-analytics/kpi";
import { WorldBoard } from "@/components/admin/aq-analytics/world-board";
import { Card, CardHeader, PageHeader } from "@/components/admin/ui";
import { fmtMTFull, fmtPct, PACE_META } from "@/lib/aq-analytics/contracts";
import { aqView, arcs, board, dataNow, mapKpis, paceByCountry } from "@/lib/aq-analytics/queries";
import { getAqAnalytics } from "@/lib/aq-analytics/store";

export const dynamic = "force-dynamic";

export default async function AqAnalyticsMapPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; origin?: string; destination?: string; q?: string }>;
}) {
  const params = await searchParams;
  const product = params.product;
  const [now, kpis, pace, lanes, view, state, options] = await Promise.all([
    dataNow(),
    mapKpis(product),
    paceByCountry(product),
    arcs(product),
    aqView(),
    getAqAnalytics(),
    board({}),
  ]);
  return (
    <>
      <PageHeader
        title="Global intelligence map"
        description="Import pace versus the five-year average, freight lanes from the enquiry pipeline, and AQ View. Click a coloured country to open My market."
        crumbs={[{ href: "/admin/aq-analytics", label: "AQ Analytics" }]}
      />
      <FilterBar
        action="/admin/aq-analytics"
        values={params}
        products={options.options.products}
        origins={options.options.origins}
        destinations={options.options.destinations}
      />
      <KpiGrid>
        <KpiCard label="Stage 1 · enquired (30d)" value={fmtMTFull(kpis.enquiredMt30d)} hint={fmtPct(kpis.enquiredWowPct)} />
        <KpiCard label="Open enquiries" value={String(kpis.openEnquiries)} hint={`${kpis.newLast72h} with laycan inside 72 h`} />
        <KpiCard label="Stage 2 · lineup vessels" value={String(kpis.vesselsInLineup)} hint={`${kpis.lineupPorts} ports · sample AIS`} />
        <KpiCard label="Stage 3 · concluded (30d)" value={fmtMTFull(kpis.concludedMt30d)} hint={`${kpis.concludedCountries} destinations`} />
      </KpiGrid>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader title="Pace choropleth and freight lanes" meta={`As at ${now}`} />
          <WorldBoard pace={pace} arcs={lanes} hrefBase="/admin/aq-analytics/market" />
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Your markets today" />
            <ul className="divide-y divide-border">
              {state.markets.countries.map((country) => {
                const row = pace.find((item) => item.country === country);
                return (
                  <li key={country} className="flex items-center justify-between px-5 py-3 text-[13.5px]">
                    <Link href={`/admin/aq-analytics/market?country=${encodeURIComponent(country)}`} className="font-medium text-ink no-underline">
                      {country}
                    </Link>
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: PACE_FILL[row?.status ?? "gap"] }}>
                      {PACE_META[row?.status ?? "gap"].short}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card>
            <CardHeader title="AQ View" />
            <ul className="divide-y divide-border">
              {view.map((item) => (
                <li key={item.title} className="px-5 py-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-dim">{item.kind}</p>
                  <p className="mt-0.5 text-[13.5px] font-medium text-ink">{item.title}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
