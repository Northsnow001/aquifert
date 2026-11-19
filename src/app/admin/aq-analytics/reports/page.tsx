import Link from "next/link";
import { addScheduleAction } from "@/app/admin/aq-analytics/actions";
import { DownloadReport } from "@/components/admin/aq-analytics/report-actions";
import { BarList } from "@/components/admin/aq-analytics/kpi";
import { Card, CardHeader, PageHeader, btnSecondary, input } from "@/components/admin/ui";
import { fmtDayYear, fmtMTFull, fmtPct } from "@/lib/aq-analytics/contracts";
import { dataNow, marketReport } from "@/lib/aq-analytics/queries";
import { getAqAnalytics } from "@/lib/aq-analytics/store";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ market?: string; period?: string }>;
}) {
  const params = await searchParams;
  const state = await getAqAnalytics();
  const market = params.market || state.markets.countries[0] || "Turkey";
  const period = params.period === "90" ? "90" : "30";
  const [now, report] = await Promise.all([dataNow(), marketReport(market, period)]);
  return (
    <>
      <PageHeader
        title="Personalised market reports"
        description="Figures trace to the freight pipeline. Confidentiality footer is required on every brief."
        crumbs={[
          { href: "/admin/aq-analytics", label: "Map" },
          { href: "/admin/aq-analytics/reports", label: "Reports" },
        ]}
        actions={<DownloadReport market={market} period={report.period} />}
      />
      <form method="get" action="/admin/aq-analytics/reports" className="mb-5 flex flex-wrap gap-2">
        <select name="market" defaultValue={market} className={`${input} h-9 w-40`}>
          {["Turkey", "Brazil", "India", "Nigeria", "Italy"].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select name="period" defaultValue={period} className={`${input} h-9 w-40`}>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <button className={btnSecondary} type="submit">
          Open
        </button>
      </form>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 print:col-span-3">
          <div className="px-6 py-5">
            <p className="text-[11px] uppercase tracking-[0.1em] text-dim">Aquifert AQ Analytics</p>
            <h2 className="mt-1 text-[22px] font-semibold">{market} market brief</h2>
            <p className="text-[13px] text-mid">
              {report.period} · data to {fmtDayYear(now)}
            </p>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-[14px] text-ink">
              {report.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {report.pace ? (
              <p className="mt-4 text-[14px]">
                Pace {fmtPct(report.pace.pctVsAvg)} · YTD {fmtMTFull(report.pace.ytdMt)}
              </p>
            ) : null}
          </div>
          <CardHeader title="Pace by product" />
          <BarList rows={report.products} />
          <CardHeader title="Origins" />
          <BarList rows={report.origins} />
          <CardHeader title="Freight lanes" />
          <ul className="divide-y divide-border">
            {report.lanes.map((row) => (
              <li key={row.key} className="flex items-center justify-between px-5 py-2.5 text-[13px]">
                <span>{row.key}</span>
                <Link href={`/admin/aq-analytics/calculator`} className="font-semibold text-blue no-underline">
                  Reprice
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-border px-5 py-4">
            <p className="text-[12.5px] font-semibold">AQ View</p>
            {report.view.map((item) => (
              <p key={item.title} className="mt-1 text-[13px] text-mid">
                {item.title}
              </p>
            ))}
            <p className="mt-3 text-[12px] text-dim">Confidential. Subscribers see aggregates only (n ≥ 3). No counterparty identities or margins.</p>
          </div>
        </Card>
        <div className="flex flex-col gap-4 print:hidden">
          <Card>
            <CardHeader title="Schedules" />
            <ul className="divide-y divide-border">
              {state.schedules.map((row) => (
                <li key={row.id} className="px-5 py-2.5 text-[13px]">
                  <p className="font-medium">{row.name}</p>
                  <p className="text-mid">
                    {row.cadence} · {row.market}
                  </p>
                </li>
              ))}
            </ul>
            <form action={addScheduleAction} className="space-y-2 border-t border-border p-4">
              <input name="name" className={input} placeholder="Name" required />
              <input name="cadence" className={input} placeholder="Cadence" required />
              <input name="market" className={input} placeholder="Market" required />
              <button className={btnSecondary}>Add schedule</button>
            </form>
          </Card>
          <Card>
            <CardHeader title="History" />
            <ul className="divide-y divide-border">
              {state.runs.map((row) => (
                <li key={row.id} className="px-5 py-2.5 text-[13px]">
                  {row.name} · {row.period}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
