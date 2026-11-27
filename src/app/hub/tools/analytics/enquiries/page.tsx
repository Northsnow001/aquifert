import Link from "next/link";
import { FilterBar } from "@/components/admin/aq-analytics/filter-bar";
import { KpiCard } from "@/components/admin/aq-analytics/kpi";
import { input } from "@/components/admin/ui";
import { fmtMTFull, STAGE_META, stageOf, vesselBand, VESSEL_BANDS } from "@/lib/aq-analytics/contracts";
import { enquiryBoard } from "@/lib/aq-analytics/queries";

export const dynamic = "force-dynamic";

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; origin?: string; destination?: string; q?: string; vessel?: string }>;
}) {
  const params = await searchParams;
  const data = await enquiryBoard({
    product: params.product,
    origin: params.origin,
    destination: params.destination,
    search: params.q,
    vessel: params.vessel,
  });
  const max = Math.max(...data.weeks.map((week) => week.mt), 1);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[28px] font-semibold tracking-[-0.02em]">Freight enquiries</h2>
          <p className="text-[14px] text-mid">Every chartering enquiry the market is pricing, tracked through loading and bill of lading confirmation.</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard dark label="Total quantity enquired" value={fmtMTFull(data.totalQty)} hint={`${data.total} enquiries`} />
        {([1, 2, 3] as const).map((stage) => (
          <KpiCard key={stage} label={STAGE_META[stage].label} value={STAGE_META[stage].name} hint={STAGE_META[stage].blurb} />
        ))}
      </div>
      <FilterBar
        action="/hub/tools/analytics/enquiries"
        values={params}
        products={data.options.products}
        origins={data.options.origins}
        destinations={data.options.destinations}
        extra={
          <label className="text-[12px] text-mid">
            Vessel size
            <select name="vessel" defaultValue={params.vessel ?? "All"} className={`${input} mt-1 h-9 w-48`}>
              <option>All</option>
              {VESSEL_BANDS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        <section className="aq-card overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-border font-mono text-[10.5px] uppercase text-dim">
                <th className="px-4 py-2">Enquired</th>
                <th>Load → discharge</th>
                <th>Quantity</th>
                <th>Vessel</th>
                <th>Laycan</th>
                <th>Stage</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-mono text-[12px]">{row.laycanStart}</td>
                  <td>
                    {row.loadPort} → {row.dischPort}
                    <span className="block text-[12px] text-dim">
                      {row.loadCountry} → {row.dischCountry}
                    </span>
                  </td>
                  <td className="font-mono">
                    {row.qtyMin.toLocaleString("en-GB")}–{row.qtyMax.toLocaleString("en-GB")} MT
                  </td>
                  <td>{vesselBand(row.qtyMax)}</td>
                  <td className="font-mono text-[12px]">
                    {row.laycanStart} – {row.laycanEnd}
                  </td>
                  <td>Stage {stageOf(row.laycanStart, row.laycanEnd, data.now)}</td>
                  <td>
                    <Link
                      href="/hub/freight-calculator"
                      className="font-semibold text-blue no-underline"
                    >
                      Price lane
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="aq-card p-4">
          <h3 className="font-semibold">Laycans ahead</h3>
          <ul className="mt-3 space-y-2">
            {data.weeks.map((row) => (
              <li key={row.weekStart}>
                <div className="mb-1 flex justify-between text-[12px]">
                  <span>w/c {row.weekStart.slice(5)}</span>
                  <span className="font-mono">{Math.round(row.mt).toLocaleString("en-GB")}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-s2">
                  <div className="h-full bg-[#10263b]" style={{ width: `${(row.mt / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
