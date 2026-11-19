import { FilterBar } from "@/components/admin/aq-analytics/filter-bar";
import { KpiCard } from "@/components/admin/aq-analytics/kpi";
import { Card, CardHeader, PageHeader, input } from "@/components/admin/ui";
import { fmtMTFull, fmtDayYear, stageOf, vesselBand, VESSEL_BANDS } from "@/lib/aq-analytics/contracts";
import { dataNow, enquiryBoard } from "@/lib/aq-analytics/queries";

export const dynamic = "force-dynamic";

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; origin?: string; destination?: string; q?: string; vessel?: string }>;
}) {
  const params = await searchParams;
  const [now, data] = await Promise.all([
    dataNow(),
    enquiryBoard({
      product: params.product,
      origin: params.origin,
      destination: params.destination,
      search: params.q,
      vessel: params.vessel,
    }),
  ]);
  const max = Math.max(...data.weeks.map((w) => w.mt), 1);
  return (
    <>
      <PageHeader
        title="Freight enquiries"
        description={`Open cargo and tonnage enquiries as at ${fmtDayYear(now)}.`}
        crumbs={[
          { href: "/admin/aq-analytics", label: "Map" },
          { href: "/admin/aq-analytics/enquiries", label: "Freight enquiries" },
        ]}
      />
      <div className="mb-4">
        <KpiCard dark label="Quantity enquired" value={fmtMTFull(data.totalQty)} hint={`${data.total} enquiries in the selected window`} />
      </div>
      <FilterBar
        action="/admin/aq-analytics/enquiries"
        values={params}
        products={data.options.products}
        origins={data.options.origins}
        destinations={data.options.destinations}
        extra={
          <label className="text-[12px] text-mid">
            Vessel band
            <select name="vessel" defaultValue={params.vessel ?? "All"} className={`${input} mt-1 h-9 w-48`}>
              <option>All</option>
              {VESSEL_BANDS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        }
      />
      <Card className="mb-4">
        <CardHeader title="Forward laycans" meta="Week-commencing buckets" />
        <ul className="space-y-2 px-5 py-4">
          {data.weeks.length ? (
            data.weeks.map((row) => (
              <li key={row.weekStart}>
                <div className="mb-1 flex justify-between text-[12.5px]">
                  <span>w/c {row.weekStart}</span>
                  <span className="font-mono">{Math.round(row.mt).toLocaleString("en-GB")} MT</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-s2">
                  <div className="h-full bg-blue" style={{ width: `${(row.mt / max) * 100}%` }} />
                </div>
              </li>
            ))
          ) : (
            <p className="text-[13px] text-mid">No laycans after {now} in this filter.</p>
          )}
        </ul>
      </Card>
      <Card className="overflow-x-auto">
        <CardHeader title="Open board" />
        <table className="w-full min-w-[820px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-border font-mono text-[10.5px] uppercase text-dim">
              <th className="px-4 py-2">Product</th>
              <th>Qty</th>
              <th>Route</th>
              <th>Laycan</th>
              <th>Band</th>
              <th>Stage</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2 font-medium">{row.product}</td>
                <td className="font-mono">
                  {row.qtyMin.toLocaleString("en-GB")}–{row.qtyMax.toLocaleString("en-GB")}
                </td>
                <td>
                  {row.loadPort} → {row.dischPort}
                </td>
                <td className="font-mono text-[12px]">
                  {row.laycanStart} – {row.laycanEnd}
                </td>
                <td>{vesselBand(row.qtyMax)}</td>
                <td>Stage {stageOf(row.laycanStart, row.laycanEnd, now)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
