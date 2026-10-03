import type { Metadata } from "next";
import Link from "next/link";
import { Anchor, ArrowRight, Calculator, MessageSquareText, Ship, Waves } from "lucide-react";
import { btnPrimary } from "@/components/app/form";
import { num, param, seriesStats, signedPct, sortedPoints, toneFor, TONE_TEXT, type SearchParams } from "@/components/hub/analytics/format";
import { PriceChart } from "@/components/hub/analytics/price-chart";
import { AsOf, Metric } from "@/components/hub/analytics/ui";
import { FreightCommentary, FreightTable } from "@/components/hub/freight-board";
import { Disclaimer, HubPageHeader, Panel, Sparkline } from "@/components/hub/kit";
import { LockedScreen } from "@/components/hub/locked-screen";
import { getHubAccess } from "@/lib/aq-modules/access";
import { formatDay, formatStamp, splitParagraphs } from "@/lib/content-types";
import { getHubContent } from "@/lib/hub-content";

export const metadata: Metadata = { title: "Freight Analytics" };
export const dynamic = "force-dynamic";

export default async function FreightAnalyticsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { user, modules, can } = await getHubAccess();
  if (!can("freight-analytics")) return <LockedScreen module="freight-analytics" required={modules.access["freight-analytics"]} plan={user.plan} />;

  const params = await searchParams;
  const { freight } = await getHubContent();
  const fixtures = freight.fixtures.filter((row) => row.visible);
  const hasCommentary = splitParagraphs(freight.commentary).length > 0;
  const lanes = modules.series.filter((item) => item.group === "Freight");
  const lane = lanes.find((item) => item.id === param(params, "lane")) ?? lanes[0];
  const stats = lane ? seriesStats(lane) : null;

  return (
    <div className="flex flex-col gap-5 pb-2">
      <HubPageHeader
        eyebrow="AQ Analytics"
        title="Freight Analytics"
        description="Open fertilizer enquiries, lane benchmarks and the desk's read on freight and vessel supply, so your timing stops being guesswork."
        tip="Fixtures are open freight enquiries the desk is tracking. Lane benchmarks are desk freight rates per tonne on the major fertilizer routes. Use the Freight Calculator to price a specific voyage."
        actions={
          <Link href="/hub/freight-calculator" className={`${btnPrimary} h-10 px-4 text-[14.5px]`}>
            <Calculator className="h-4 w-4" aria-hidden /> Freight Calculator
          </Link>
        }
      />

      {freight.updatedAt ? <AsOf>Freight board updated {formatStamp(freight.updatedAt)}</AsOf> : null}

      {lane ? (
        <Panel title={`${lane.label} · ${lane.basis}`} sub={`Lane benchmark · ${lane.unit}`} icon={Waves} tone="blue" className="aq-rise" bodyClassName="p-4 sm:p-5">
          <div id="lane" className="scroll-mt-28" />
          {stats ? (
            <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              <Metric label="Latest" value={num(stats.latest.value)} sub={`${lane.unit} · ${formatDay(stats.latest.date)}`} />
              <Metric label="Week on week" value={signedPct(stats.weekPct)} className={TONE_TEXT[toneFor(stats.weekPct)]} sub="vs a week earlier" />
              <Metric label="Four weeks" value={signedPct(stats.monthPct)} className={TONE_TEXT[toneFor(stats.monthPct)]} sub="vs 28 days earlier" />
              <Metric label="Period high / low" value={`${num(stats.high.value)} / ${num(stats.low.value)}`} sub={`Since ${formatDay(stats.first.date)}`} />
            </div>
          ) : null}
          <PriceChart key={lane.id} title={`${lane.label} ${lane.basis}`} unit={lane.unit} points={sortedPoints(lane)} initialRange="6M" />
          {lanes.length > 1 ? (
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {lanes.map((item) => {
                const row = seriesStats(item);
                const active = item.id === lane.id;
                return (
                  <li key={item.id}>
                    <Link
                      href={`?lane=${encodeURIComponent(item.id)}#lane`}
                      aria-current={active ? "true" : undefined}
                      className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 no-underline transition ${active ? "border-blue/40 bg-blue-light/50" : "border-border bg-white hover:border-blue/30"}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14.5px] font-semibold text-ink">{item.basis}</p>
                        <p className="text-[13px] tabular-nums text-dim">
                          {row ? (
                            <>
                              {num(row.latest.value)} {item.unit} · <span className={TONE_TEXT[toneFor(row.weekPct)]}>{signedPct(row.weekPct)} w/w</span>
                            </>
                          ) : (
                            "No prices yet"
                          )}
                        </p>
                      </div>
                      {row ? <Sparkline points={row.values.slice(-26)} tone={toneFor(row.monthPct)} width={84} height={28} label={`${item.basis} trend`} /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </Panel>
      ) : (
        <section className="aq-card flex items-start gap-3 p-5 text-[15px] text-mid">
          <Waves className="mt-0.5 h-4 w-4 shrink-0 text-blue" aria-hidden />
          <p>Lane benchmarks appear here once the desk publishes a freight series. The fixtures and commentary below are live now.</p>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Panel title="Open freight enquiries" sub={fixtures.length ? `${fixtures.length} ${fixtures.length === 1 ? "cargo" : "cargoes"} on the board` : "Fixtures the desk is tracking"} icon={Ship} tone="blue" className="xl:col-span-3">
          <FreightTable fixtures={fixtures} />
        </Panel>
        <Panel title="Desk commentary" sub="Freight and vessel supply" icon={MessageSquareText} className="xl:col-span-2" bodyClassName="px-5 py-4">
          {hasCommentary ? <FreightCommentary text={freight.commentary} /> : <p className="py-6 text-center text-[14.5px] text-mid">The desk&apos;s next freight commentary lands here with the weekly update.</p>}
        </Panel>
      </div>

      <Link href="/hub/freight-calculator" className="aq-card aq-lift flex items-center gap-4 p-5 no-underline">
        <span className="aq-chip aq-chip-amber flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
          <Anchor className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold text-ink">Price a specific voyage</p>
          <p className="text-[14.5px] text-mid">The Freight Calculator works out a cargo&apos;s cost from the vessel, route and live bunker prices. Use it to check a quote against these benchmarks.</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-blue" aria-hidden />
      </Link>

      <Disclaimer />
    </div>
  );
}
