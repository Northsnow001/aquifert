import { FilterBar } from "@/components/admin/aq-analytics/filter-bar";
import { BarList, KpiCard, KpiGrid } from "@/components/admin/aq-analytics/kpi";
import { WorldBoard } from "@/components/admin/aq-analytics/world-board";
import { CsvButton } from "@/components/admin/aq-analytics/csv-button";
import { Card, CardHeader, PageHeader, input } from "@/components/admin/ui";
import { fmtMTFull, fmtPct, stageOf } from "@/lib/aq-analytics/contracts";
import { board, dataNow } from "@/lib/aq-analytics/queries";
import { qtyOf } from "@/lib/aq-analytics/types";

export const dynamic = "force-dynamic";

export default async function FreightBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; origin?: string; destination?: string; q?: string; account?: string; importId?: string }>;
}) {
  const params = await searchParams;
  const [now, data] = await Promise.all([
    dataNow(),
    board({
      product: params.product,
      origin: params.origin,
      destination: params.destination,
      search: params.q,
      account: params.account,
      importId: params.importId,
    }),
  ]);
  const maxWeek = Math.max(...data.weeks.map((w) => w.mt), 1);
  return (
    <>
      <PageHeader
        title="Freight Analytics"
        description={`All imports combined unless you pick a report. Latest report ${now}. Aggregates require n ≥ 3.`}
        crumbs={[
          { href: "/admin/aq-analytics", label: "Map" },
          { href: "/admin/aq-analytics/board", label: "Freight Analytics" },
        ]}
        actions={<CsvButton filename={`aq-freight-board-${now}.csv`} rows={data.rows.map((row) => ({ id: row.id, product: row.product, account: row.account, qty: qtyOf(row), load: row.loadPort, disch: row.dischPort, laycan: `${row.laycanStart}–${row.laycanEnd}` }))} />}
      />
      <FilterBar
        action="/admin/aq-analytics/board"
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
      <Card className="mb-4 overflow-hidden">
        <CardHeader title="Trade-routes map" meta="Bundled geography — no tile service" />
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
      </Card>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Product mix" />
          <BarList rows={data.products} />
        </Card>
        <Card>
          <CardHeader title="Tonnage by laycan week" />
          <ul className="space-y-2 px-5 py-4">
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
        </Card>
        <Card>
          <CardHeader title="Top origins" />
          <BarList rows={data.origins} />
        </Card>
        <Card>
          <CardHeader title="Top destinations" />
          <BarList rows={data.destinations} />
        </Card>
        <Card>
          <CardHeader title="Load ports" />
          <BarList rows={data.loadPorts} />
        </Card>
        <Card>
          <CardHeader title="Most-active accounts" meta="Anonymised labels" />
          <BarList rows={data.accountsRank} />
        </Card>
      </div>
      <Card className="overflow-x-auto">
        <CardHeader title="Order detail" meta={`${data.total} rows in the current filter`} />
        <table className="w-full min-w-[860px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-border font-mono text-[10.5px] uppercase tracking-[0.08em] text-dim">
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
                <td>Stage {stageOf(row.laycanStart, row.laycanEnd, now)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
