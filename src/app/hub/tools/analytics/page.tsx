import Link from "next/link";
import { FilterBar } from "@/components/admin/aq-analytics/filter-bar";
import { KpiCard, KpiGrid, PACE_FILL } from "@/components/admin/aq-analytics/kpi";
import { WorldBoard } from "@/components/admin/aq-analytics/world-board";
import { fmtMTFull, fmtPct, PACE_META } from "@/lib/aq-analytics/contracts";
import { aqView, arcs, board, mapKpis, paceByCountry } from "@/lib/aq-analytics/queries";
import { getAqAnalytics } from "@/lib/aq-analytics/store";

export const dynamic = "force-dynamic";

export default async function IntelligenceMapPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; origin?: string; destination?: string }>;
}) {
  const params = await searchParams;
  const product = params.product;
  const [kpis, pace, lanes, view, state, options] = await Promise.all([
    mapKpis(product),
    paceByCountry(product),
    arcs(product),
    aqView(),
    getAqAnalytics(),
    board({}),
  ]);
  return (
    <>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-dim">Freight analytics</p>
        <h2 className="text-[28px] font-semibold tracking-[-0.02em]">Global intelligence map</h2>
        <p className="text-[14px] text-mid">Following your markets. Click a country to open its intelligence panel.</p>
      </div>
      <FilterBar action="/hub/tools/analytics" values={params} products={options.options.products} origins={options.options.origins} destinations={options.options.destinations} />
      <KpiGrid>
        <KpiCard label="Stage 1 · quantity enquired" value={fmtMTFull(kpis.enquiredMt30d)} hint={fmtPct(kpis.enquiredWowPct)} />
        <KpiCard label="Open enquiries" value={String(kpis.openEnquiries)} hint={`${kpis.newLast72h} new in the last 72 hours`} />
        <KpiCard label="Stage 2 · in port lineups" value={`${kpis.vesselsInLineup} vessels`} hint={`${kpis.lineupPorts} ports · sample AIS`} />
        <KpiCard label="Stage 3 · concluded" value={fmtMTFull(kpis.concludedMt30d)} hint={`${kpis.concludedCountries} destinations`} />
      </KpiGrid>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="aq-card overflow-hidden lg:col-span-2">
          <div className="border-b border-border px-5 py-3">
            <h3 className="font-semibold">Import pace by country, with live freight activity</h3>
            <p className="text-[12.5px] text-dim">Click a country for its intelligence panel.</p>
          </div>
          <WorldBoard pace={pace} arcs={lanes} hrefBase="/hub/tools/analytics/market" />
        </section>
        <div className="flex flex-col gap-4">
          <section className="aq-card p-4">
            <h3 className="font-semibold">Your markets today</h3>
            <ul className="mt-3 divide-y divide-border">
              {state.markets.countries.map((country) => {
                const row = pace.find((item) => item.country === country);
                const status = row?.status ?? "gap";
                return (
                  <li key={country} className="flex items-center justify-between py-2.5 text-[13.5px]">
                    <Link href={`/hub/tools/analytics/market?country=${encodeURIComponent(country)}`} className="font-medium text-ink no-underline">
                      {country}
                    </Link>
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: PACE_FILL[status] ?? "#94a3b8" }}>
                      {PACE_META[status as keyof typeof PACE_META]?.short ?? status}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="aq-card p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">AQ View</h3>
              <Link href="/hub/analysis" className="text-[12.5px] font-semibold text-blue no-underline">
                All commentary
              </Link>
            </div>
            <ul className="mt-3 space-y-3">
              {view.map((item) => (
                <li key={item.title}>
                  <p className="text-[11px] uppercase tracking-[0.08em] text-dim">{item.kind}</p>
                  <p className="text-[13.5px] font-medium">{item.title}</p>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl bg-[#10263b] p-4 text-white">
            <h3 className="font-semibold">Ask AQ Bot</h3>
            <p className="mt-1 text-[13px] text-white/70">Questions about any market, product or lane, answered from the platform’s data.</p>
            <Link href="/hub/aquibot" className="mt-3 inline-flex rounded-xl bg-white px-3 py-2 text-[13px] font-semibold text-[#10263b] no-underline">
              Ask Aquibot
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}
