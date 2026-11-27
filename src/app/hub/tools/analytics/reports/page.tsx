import Link from "next/link";
import { addHubScheduleAction } from "@/app/hub/tools/analytics/actions";
import { BarList } from "@/components/admin/aq-analytics/kpi";
import { btnSecondary, input } from "@/components/admin/ui";
import { fmtDayYear, fmtMTFull, fmtPct } from "@/lib/aq-analytics/contracts";
import { dataNow, marketReport } from "@/lib/aq-analytics/queries";
import { getAqAnalytics } from "@/lib/aq-analytics/store";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ market?: string; period?: string }> }) {
  const params = await searchParams;
  const state = await getAqAnalytics();
  const market = params.market || state.markets.countries[0] || "Turkey";
  const period = params.period === "90" ? "90" : "30";
  const [now, report] = await Promise.all([dataNow(), marketReport(market, period)]);
  return (
    <>
      <div>
        <h2 className="text-[28px] font-semibold tracking-[-0.02em]">Reports</h2>
        <p className="text-[14px] text-mid">A report written for your markets from the latest enquiries, lineups, shipments and AQ View commentary.</p>
      </div>
      <form method="get" className="flex flex-wrap gap-2">
        <select name="market" defaultValue={market} className={`${input} h-10 w-44`}>
          {state.markets.countries.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select name="period" defaultValue={period} className={`${input} h-10 w-44`}>
          <option value="30">Last 7–30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <button className={btnSecondary} type="submit">
          Regenerate report
        </button>
      </form>
      <div className="grid gap-4 lg:grid-cols-3">
        <article className="aq-card lg:col-span-2">
          <div className="px-6 py-5">
            <p className="text-[11px] uppercase tracking-[0.1em] text-blue">Market report</p>
            <h3 className="mt-1 text-[22px] font-semibold">
              {market} · {period === "90" ? "90 days" : "this week in your market"}
            </h3>
            <p className="text-[13px] text-mid">
              {report.period} · prepared from data to {fmtDayYear(now)}
            </p>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-[14.5px]">
              {report.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {report.pace ? (
              <p className="mt-4 text-[14px]">
                Pace {fmtPct(report.pace.pctVsAvg)} · YTD {fmtMTFull(report.pace.ytdMt)} · {report.open} open enquiries · {fmtMTFull(report.mt)}
              </p>
            ) : null}
          </div>
          <h4 className="border-t border-border px-5 py-3 text-[13px] font-semibold">Pace by product</h4>
          <BarList rows={report.products} />
          <h4 className="border-t border-border px-5 py-3 text-[13px] font-semibold">Origins</h4>
          <BarList rows={report.origins} />
          <h4 className="border-t border-border px-5 py-3 text-[13px] font-semibold">Freight</h4>
          <ul className="divide-y divide-border">
            {report.lanes.map((row) => (
              <li key={row.key} className="flex items-center justify-between px-5 py-2.5 text-[13px]">
                <span>{row.key}</span>
                <Link href="/hub/freight-calculator" className="font-semibold text-blue no-underline">
                  Price
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-border bg-[#eef6f2] px-5 py-4">
            <p className="text-[12.5px] font-semibold">AQ View</p>
            {report.view.map((item) => (
              <p key={item.title} className="mt-1 text-[13.5px]">
                {item.title}
              </p>
            ))}
          </div>
        </article>
        <aside className="flex flex-col gap-4">
          <section className="aq-card p-4">
            <h3 className="font-semibold">Scheduled</h3>
            <ul className="mt-2 divide-y divide-border text-[13px]">
              {state.schedules.map((row) => (
                <li key={row.id} className="py-2">
                  <p className="font-medium">{row.name}</p>
                  <p className="text-dim">
                    {row.cadence} · {row.market}
                  </p>
                </li>
              ))}
            </ul>
            <form action={addHubScheduleAction} className="mt-3 space-y-2 border-t border-border pt-3">
              <input name="name" className={input} placeholder="Report name" required />
              <input name="cadence" className={input} placeholder="Mondays 07:00" required />
              <input name="market" className={input} placeholder="Market" required />
              <button className={btnSecondary}>Schedule a report</button>
            </form>
          </section>
          <section className="aq-card p-4">
            <h3 className="font-semibold">Previous reports</h3>
            <ul className="mt-2 space-y-1 text-[13px] text-mid">
              {state.runs.length ? state.runs.map((row) => <li key={row.id}>{row.name} · {row.period}</li>) : <li>No runs saved yet. Regenerating keeps the brief on screen.</li>}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
