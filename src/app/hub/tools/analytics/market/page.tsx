import Link from "next/link";
import { KpiCard, KpiGrid } from "@/components/admin/aq-analytics/kpi";
import { fmtMTFull, fmtPct, PACE_META } from "@/lib/aq-analytics/contracts";
import { countryPanel } from "@/lib/aq-analytics/queries";
import { getAqAnalytics } from "@/lib/aq-analytics/store";
import { qtyOf } from "@/lib/aq-analytics/types";

export const dynamic = "force-dynamic";

export default async function MyMarketPage({ searchParams }: { searchParams: Promise<{ country?: string; product?: string }> }) {
  const params = await searchParams;
  const state = await getAqAnalytics();
  const country = params.country || state.markets.countries[0] || "Turkey";
  const product = params.product;
  const panel = await countryPanel(country, product);
  const pace = panel.pace;
  const max = Math.max(...panel.months.map((month) => Math.max(month.current, month.prior, month.avg5y)), 1);
  return (
    <>
      <div>
        <p className="text-[13px] text-mid">
          <Link href="/hub/tools/analytics" className="no-underline">
            Map
          </Link>{" "}
          / {country}
        </p>
        <h2 className="text-[28px] font-semibold tracking-[-0.02em]">
          {country} · import market
        </h2>
        <p className="text-[14px] text-mid">
          {pace?.pctVsAvg != null
            ? `${country} is tracking ${fmtPct(pace.pctVsAvg)} versus its five-year average (${PACE_META[pace.status].label}).`
            : `${country} does not yet have a five-year coverage reading.`}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {state.markets.products.map((item) => (
          <Link
            key={item}
            href={`/hub/tools/analytics/market?country=${encodeURIComponent(country)}&product=${encodeURIComponent(item)}`}
            className={`rounded-full px-3 py-1 text-[12.5px] font-semibold no-underline ${product === item ? "bg-blue text-white" : "bg-white text-mid ring-1 ring-border"}`}
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
      <section className="aq-card p-5">
        <h3 className="font-semibold">Cumulative versus prior year and the five-year average</h3>
        <div className="mt-4 grid grid-cols-12 gap-1">
          {panel.months.map((row) => (
            <div key={row.month} className="flex h-28 flex-col justify-end gap-0.5">
              <div className="rounded-t bg-blue/30" style={{ height: `${(row.avg5y / max) * 100}%` }} />
              <div className="rounded-t bg-s3" style={{ height: `${(row.prior / max) * 100}%` }} />
              <div className="rounded-t bg-blue" style={{ height: `${(row.current / max) * 100}%` }} />
              <p className="text-center font-mono text-[10px] text-dim">{row.month}</p>
            </div>
          ))}
        </div>
        {panel.profile ? <p className="mt-3 text-[13px] text-mid">{panel.profile.calendarNote}</p> : null}
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="aq-card p-5">
          <h3 className="font-semibold">Open enquiries · {panel.open.length}</h3>
          <ul className="mt-3 divide-y divide-border">
            {panel.open.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                <span>
                  {row.product} · {row.loadPort} → {row.dischPort}
                  <span className="block text-dim">{Math.round(qtyOf(row)).toLocaleString("en-GB")} MT</span>
                </span>
                <Link
                  className="shrink-0 font-semibold text-blue no-underline"
                  href="/hub/freight-calculator"
                >
                  Price lane
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="aq-card p-5">
          <h3 className="font-semibold">Port lineups</h3>
          <p className="text-[12px] text-dim">Sample AIS layer</p>
          <ul className="mt-3 divide-y divide-border">
            {panel.lineups.map((row) => (
              <li key={row.port} className="py-2.5 text-[13px]">
                <p className="font-medium">{row.port}</p>
                <p className="text-mid">
                  At berth {row.berth} · At anchor {row.anchor} · Expected {row.expected}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="aq-card overflow-hidden">
        <h3 className="px-5 py-4 font-semibold">Recent concluded shipments into {country}</h3>
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-y border-border font-mono text-[10.5px] uppercase text-dim">
              <th className="px-5 py-2">Product</th>
              <th>Route</th>
              <th>Qty</th>
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
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-5 py-3 text-[12px] text-dim">Company names are hidden. Premium shows named shippers and consignees, subject to the legal notice on BL data terms.</p>
      </section>
    </>
  );
}
