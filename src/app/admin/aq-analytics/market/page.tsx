import Link from "next/link";
import { BarList, KpiCard, KpiGrid } from "@/components/admin/aq-analytics/kpi";
import { Card, CardHeader, PageHeader } from "@/components/admin/ui";
import { fmtMTFull, fmtPct, PACE_META, stageOf } from "@/lib/aq-analytics/contracts";
import { countryPanel, dataNow } from "@/lib/aq-analytics/queries";
import { getAqAnalytics } from "@/lib/aq-analytics/store";
import { qtyOf } from "@/lib/aq-analytics/types";

export const dynamic = "force-dynamic";

export default async function MyMarketPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; product?: string }>;
}) {
  const params = await searchParams;
  const state = await getAqAnalytics();
  const country = params.country || state.markets.countries[0] || "Turkey";
  const product = params.product;
  const [now, panel] = await Promise.all([dataNow(), countryPanel(country, product)]);
  const pace = panel.pace;
  const max = Math.max(...panel.months.map((m) => Math.max(m.current, m.prior, m.avg5y)), 1);
  return (
    <>
      <PageHeader
        title={country}
        description={
          pace?.pctVsAvg != null
            ? `${country} is tracking ${fmtPct(pace.pctVsAvg)} versus its five-year average (${PACE_META[pace.status].label}).`
            : `${country} does not yet have a five-year coverage reading.`
        }
        crumbs={[
          { href: "/admin/aq-analytics", label: "Map" },
          { href: "/admin/aq-analytics/market", label: country },
        ]}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {state.markets.products.map((item) => (
          <Link
            key={item}
            href={`/admin/aq-analytics/market?country=${encodeURIComponent(country)}&product=${encodeURIComponent(item)}`}
            className={`rounded-full px-3 py-1 text-[12.5px] font-semibold no-underline ${product === item ? "bg-blue text-white" : "bg-s2 text-mid"}`}
          >
            {item}
          </Link>
        ))}
      </div>
      <KpiGrid>
        <KpiCard label="Imports YTD" value={fmtMTFull(panel.ytd)} />
        <KpiCard label="5-yr average" value={pace?.avg5yMt != null ? fmtMTFull(pace.avg5yMt) : "Coverage gap"} />
        <KpiCard label="30-day trend" value={fmtPct(panel.trend30Pct)} hint={fmtMTFull(panel.trend30)} />
        <KpiCard label="90-day trend" value={fmtPct(panel.trend90Pct)} hint={fmtMTFull(panel.trend90)} />
      </KpiGrid>
      <Card className="mb-4">
        <CardHeader title="Cumulative vs prior year and 5-yr average" meta="Buying windows shaded from the country profile" />
        <div className="grid grid-cols-12 gap-1 px-5 py-4">
          {panel.months.map((row) => (
            <div key={row.month} className="flex h-28 flex-col justify-end gap-0.5">
              <div className="rounded-t bg-blue/30" style={{ height: `${(row.avg5y / max) * 100}%` }} title="5-yr avg" />
              <div className="rounded-t bg-s3" style={{ height: `${(row.prior / max) * 100}%` }} title="Prior year" />
              <div className="rounded-t bg-blue" style={{ height: `${(row.current / max) * 100}%` }} title="Current" />
              <p className="text-center font-mono text-[10px] text-dim">{row.month}</p>
            </div>
          ))}
        </div>
        {panel.profile ? <p className="border-t border-border px-5 py-3 text-[13px] text-mid">{panel.profile.calendarNote}</p> : null}
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Open enquiries" />
          <ul className="divide-y divide-border">
            {panel.open.map((row) => (
              <li key={row.id} className="flex items-center justify-between px-5 py-2.5 text-[13px]">
                <span>
                  {row.product} · {row.loadPort} → {row.dischPort}
                </span>
                <Link className="text-[12.5px] font-semibold text-blue no-underline" href={`/admin/aq-analytics/calculator?load=${encodeURIComponent(row.loadPort)}&disch=${encodeURIComponent(row.dischPort)}&qty=${row.qtyMax}&product=${encodeURIComponent(row.product)}`}>
                  Price lane
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Port lineups" meta="Sample AIS layer" />
          <ul className="divide-y divide-border">
            {panel.lineups.map((row) => (
              <li key={row.port} className="px-5 py-2.5 text-[13px]">
                <p className="font-medium">{row.port}</p>
                <p className="text-mid">
                  Berth {row.berth} · Anchor {row.anchor} · Expected {row.expected}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader title="Concluded shipments" meta="n ≥ 3 · no counterparty identities" />
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-border font-mono text-[10.5px] uppercase text-dim">
              <th className="px-5 py-2">Product</th>
              <th>Route</th>
              <th>Qty</th>
              <th>Stage</th>
            </tr>
          </thead>
          <tbody>
            {panel.concluded.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-5 py-2">{row.product}</td>
                <td>
                  {row.loadPort} → {row.dischPort}
                </td>
                <td>{Math.round(qtyOf(row)).toLocaleString("en-GB")} MT</td>
                <td>{stageOf(row.laycanStart, row.laycanEnd, now)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-border px-5 py-3 text-[12px] text-dim">Confidentiality: aggregates and anonymised accounts only. Individual negotiated quotes are never shown.</p>
      </Card>
    </>
  );
}
