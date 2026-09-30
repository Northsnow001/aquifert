import type { Metadata } from "next";
import Link from "next/link";
import { ChartLine, Layers } from "lucide-react";
import { num, param, seriesStats, signedPct, sortedPoints, toneFor, TONE_TEXT, type SearchParams } from "@/components/hub/analytics/format";
import { PriceChart } from "@/components/hub/analytics/price-chart";
import { AsOf, DownloadLink, Metric } from "@/components/hub/analytics/ui";
import { Disclaimer, EmptyPanel, HubPageHeader, Panel, Sparkline } from "@/components/hub/kit";
import { LockedScreen } from "@/components/hub/locked-screen";
import { getHubAccess } from "@/lib/aq-modules/access";
import { dataAsOf } from "@/lib/aq-modules/signal";
import { SERIES_GROUPS } from "@/lib/aq-modules/types";
import { formatDay } from "@/lib/content-types";

export const metadata: Metadata = { title: "Market Data" };
export const dynamic = "force-dynamic";

export default async function MarketDataPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { user, modules, can } = await getHubAccess();
  if (!can("market-data")) return <LockedScreen module="market-data" required={modules.access["market-data"]} plan={user.plan} />;

  const params = await searchParams;
  const series = modules.series;
  const asOf = dataAsOf(series);
  const selected = series.find((item) => item.id === param(params, "s")) ?? series.find((item) => sortedPoints(item).length >= 2) ?? series[0];
  const stats = selected ? seriesStats(selected) : null;
  const groups = SERIES_GROUPS.map((group) => ({ group, items: series.filter((item) => item.group === group) })).filter((entry) => entry.items.length);

  return (
    <div className="flex flex-col gap-5 pb-2">
      <HubPageHeader
        eyebrow="AQ Analytics"
        title="Market Data"
        description="Benchmark price series for nitrogen, phosphate, potash and freight. Pick a series to chart it, and download everything for your own models."
        tip="Each series is a desk benchmark for one product and basis, updated as the desk publishes prices. Week-on-week compares the latest price with the one a week earlier; four-week compares it with 28 days earlier."
        actions={series.length ? <DownloadLink href="/hub/analytics/market-data/csv" label="Download CSV (all series)" /> : null}
      />

      {!series.length ? (
        <EmptyPanel title="Price series arrive soon" body="The desk is loading benchmark prices. Once published, each series appears here with its chart and a CSV download." />
      ) : (
        <>
          <AsOf>
            Prices as of {asOf ? formatDay(asOf) : "the latest desk update"} · {series.length} series
          </AsOf>

          {selected ? (
            <Panel title={`${selected.label} · ${selected.basis}`} sub={`${selected.group} · ${selected.unit}`} icon={ChartLine} tone="blue" className="aq-rise scroll-mt-24" bodyClassName="p-4 sm:p-5">
              <div id="chart" className="scroll-mt-28" />
              {stats ? (
                <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                  <Metric label="Latest" value={num(stats.latest.value)} sub={`${selected.unit} · ${formatDay(stats.latest.date)}`} />
                  <Metric label="Week on week" value={signedPct(stats.weekPct)} className={TONE_TEXT[toneFor(stats.weekPct)]} sub="vs a week earlier" />
                  <Metric label="Four weeks" value={signedPct(stats.monthPct)} className={TONE_TEXT[toneFor(stats.monthPct)]} sub="vs 28 days earlier" />
                  <Metric label="Period high / low" value={`${num(stats.high.value)} / ${num(stats.low.value)}`} sub={`Since ${formatDay(stats.first.date)}`} />
                </div>
              ) : null}
              <PriceChart key={selected.id} title={`${selected.label} ${selected.basis}`} unit={selected.unit} points={sortedPoints(selected)} />
              <p className="mt-3 text-[12px] text-dim">Hover or tap the chart to read any week. With the chart focused, the arrow keys step through each price.</p>
            </Panel>
          ) : null}

          {groups.map(({ group, items }) => (
            <Panel key={group} title={group} sub={`${items.length} series · select one to chart it`} icon={Layers} className="aq-rise">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[340px] text-[13px]">
                  <caption className="sr-only">{group} price series: latest price, week-on-week change, four-week change, high and low</caption>
                  <thead>
                    <tr className="border-b border-border bg-s2 text-left font-mono text-[10px] uppercase tracking-wider text-mid">
                      <th scope="col" className="px-4 py-2.5 font-semibold">Series</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-semibold">Latest</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-semibold">W/W</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-semibold">4 wk</th>
                      <th scope="col" className="hidden px-3 py-2.5 text-right font-semibold sm:table-cell">High</th>
                      <th scope="col" className="hidden px-3 py-2.5 text-right font-semibold sm:table-cell">Low</th>
                      <th scope="col" className="hidden px-4 py-2.5 font-semibold md:table-cell">
                        <span className="sr-only">Trend</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item) => {
                      const row = seriesStats(item);
                      const active = item.id === selected?.id;
                      return (
                        <tr key={item.id} className={active ? "bg-blue-light/50" : "transition-colors hover:bg-s2/60"}>
                          <th scope="row" className="px-4 py-3 text-left font-normal">
                            <Link href={`?s=${encodeURIComponent(item.id)}#chart`} aria-current={active ? "true" : undefined} className="group block no-underline">
                              <span className="block font-semibold text-ink group-hover:text-blue">{item.label}</span>
                              <span className="block text-[12px] text-dim">
                                {item.basis} · {item.unit}
                              </span>
                            </Link>
                          </th>
                          {row ? (
                            <>
                              <td className="px-3 py-3 text-right font-semibold tabular-nums text-ink">{num(row.latest.value)}</td>
                              <td className={`px-3 py-3 text-right tabular-nums ${TONE_TEXT[toneFor(row.weekPct)]}`}>{signedPct(row.weekPct)}</td>
                              <td className={`px-3 py-3 text-right tabular-nums ${TONE_TEXT[toneFor(row.monthPct)]}`}>{signedPct(row.monthPct)}</td>
                              <td className="hidden px-3 py-3 text-right tabular-nums text-mid sm:table-cell">{num(row.high.value)}</td>
                              <td className="hidden px-3 py-3 text-right tabular-nums text-mid sm:table-cell">{num(row.low.value)}</td>
                              <td className="hidden px-4 py-3 md:table-cell">
                                <Sparkline points={row.values.slice(-26)} tone={toneFor(row.monthPct)} width={110} height={30} label={`${item.label} ${item.basis} recent trend`} />
                              </td>
                            </>
                          ) : (
                            <td colSpan={6} className="px-3 py-3 text-right text-[12.5px] text-dim">
                              No prices yet
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          ))}

          <Disclaimer />
        </>
      )}
    </div>
  );
}
