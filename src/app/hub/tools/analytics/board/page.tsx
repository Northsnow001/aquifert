import { FilterBar } from "@/components/admin/aq-analytics/filter-bar";
import { BarList, KpiCard, KpiGrid } from "@/components/admin/aq-analytics/kpi";
import { WorldBoard } from "@/components/admin/aq-analytics/world-board";
import { CsvButton } from "@/components/admin/aq-analytics/csv-button";
import { input } from "@/components/admin/ui";
import { fmtMTFull, fmtPct, stageOf } from "@/lib/aq-analytics/contracts";
import { board } from "@/lib/aq-analytics/queries";
import { qtyOf } from "@/lib/aq-analytics/types";

export const dynamic = "force-dynamic";

export default async function FreightBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; origin?: string; destination?: string; q?: string; account?: string; importId?: string }>;
}) {
  const params = await searchParams;
  const data = await board({
    product: params.product,
    origin: params.origin,
    destination: params.destination,
    search: params.q,
    account: params.account,
    importId: params.importId,
  });
  const maxWeek = Math.max(...data.weeks.map((week) => week.mt), 1);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[28px] font-semibold tracking-[-0.02em]">Freight board</h2>
          <p className="text-[14px] text-mid">Every imported enquiry, combined unless you pick one report. Aggregates need at least three observations.</p>
        </div>
        <CsvButton
          filename={`aq-freight-board-${data.now}.csv`}
          rows={data.rows.map((row) => ({
            id: row.id,
            product: row.product,
            account: row.account,
            qty: qtyOf(row),
            load: row.loadPort,
            disch: row.dischPort,
            laycan: `${row.laycanStart}–${row.laycanEnd}`,
          }))}
        />
      </div>
      <FilterBar
        action="/hub/tools/analytics/board"
        values={params}
        products={data.options.products}
        origins={data.options.origins}
        destinations={data.options.destinations}
        extra={
          <>
            <label className="text-[12px] text-mid">
              Report
              <select name="importId" defaultValue={params.importId ?? "all"} className={`${input} mt-1 h-9 w-52`}>
                <option value="all">All imports</option>
                {data.imports.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.reportDate} · {item.source}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[12px] text-mid">
              Account
              <select name="account" defaultValue={params.account ?? "All"} className={`${input} mt-1 h-9 w-40`}>
                <option>All</option>
                {data.options.accounts.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </>
        }
      />
      <KpiGrid>
        <KpiCard label="Enquiry tonnage" value={fmtMTFull(data.qty)} hint={data.prevQty != null ? fmtPct(((data.qty - data.prevQty) / Math.max(data.prevQty, 1)) * 100) : "Combined view"} />
        <KpiCard label="Open enquiries" value={String(data.open)} />
        <KpiCard label="Vessels sought" value={String(data.vessels)} />
        <KpiCard label="Active accounts" value={String(data.accounts)} hint={`${data.origins[0]?.key ?? "—"} / ${data.destinations[0]?.key ?? "—"}`} />
      </KpiGrid>
      <section className="aq-card overflow-hidden">
        <h3 className="border-b border-border px-5 py-3 font-semibold">Trade routes</h3>
        <WorldBoard
          pace={[]}
          arcs={data.rows.slice(0, 50).map((row) => ({
            fromLat: row.loadLat,
            fromLon: row.loadLon,
            toLat: row.dischLat,
            toLon: row.dischLon,
            qty: qtyOf(row),
            load: row.loadPort,
            disch: row.dischPort,
          }))}
        />
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="aq-card overflow-hidden">
          <h3 className="px-5 py-3 font-semibold">Product mix</h3>
          <BarList rows={data.products} />
        </section>
        <section className="aq-card p-4">
          <h3 className="font-semibold">Tonnage by laycan week</h3>
          <ul className="mt-3 space-y-2">
            {data.weeks.map((row) => (
              <li key={row.weekStart}>
                <div className="mb-1 flex justify-between text-[12.5px]">
                  <span>w/c {row.weekStart}</span>
                  <span className="font-mono">{Math.round(row.mt).toLocaleString("en-GB")} MT</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-s2">
                  <div className="h-full bg-blue" style={{ width: `${(row.mt / maxWeek) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="aq-card overflow-hidden">
          <h3 className="px-5 py-3 font-semibold">Top origins</h3>
          <BarList rows={data.origins} />
        </section>
        <section className="aq-card overflow-hidden">
          <h3 className="px-5 py-3 font-semibold">Top destinations</h3>
          <BarList rows={data.destinations} />
        </section>
      </div>
      <section className="aq-card overflow-x-auto">
        <h3 className="px-5 py-3 font-semibold">Order detail · {data.total} rows</h3>
        <table className="w-full min-w-[860px] text-left text-[13px]">
          <thead>
            <tr className="border-y border-border font-mono text-[10.5px] uppercase text-dim">
              <th className="px-4 py-2">Product</th>
              <th>Account</th>
              <th>Qty</th>
              <th>Route</th>
              <th>Laycan</th>
              <th>Stage</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.slice(0, 80).map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2 font-medium">{row.product}</td>
                <td>{row.account}</td>
                <td className="font-mono">{Math.round(qtyOf(row)).toLocaleString("en-GB")}</td>
                <td>
                  {row.loadPort} → {row.dischPort}
                </td>
                <td className="font-mono text-[12px]">
                  {row.laycanStart} – {row.laycanEnd}
                </td>
                <td>Stage {stageOf(row.laycanStart, row.laycanEnd, data.now)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
