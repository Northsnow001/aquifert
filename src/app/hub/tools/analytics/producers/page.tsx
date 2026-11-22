import Link from "next/link";
import { BarList, KpiCard, KpiGrid } from "@/components/admin/aq-analytics/kpi";
import { fmtMTFull } from "@/lib/aq-analytics/contracts";
import { producerPanel } from "@/lib/aq-analytics/queries";
import { getAqAnalytics } from "@/lib/aq-analytics/store";

export const dynamic = "force-dynamic";

export default async function ProducersPage({ searchParams }: { searchParams: Promise<{ origin?: string }> }) {
  const params = await searchParams;
  const state = await getAqAnalytics();
  const origin = params.origin || state.markets.originCountries[0] || "Egypt";
  const panel = await producerPanel(origin);
  const max = Math.max(...panel.months.map((month) => month.mt), panel.capacity ?? 1, 1);
  return (
    <>
      <div>
        <p className="text-[13px] text-mid">Map / {origin}</p>
        <h2 className="text-[28px] font-semibold tracking-[-0.02em]">{origin} · exports</h2>
        <p className="max-w-2xl text-[14px] text-mid">Producer view: how much capacity is already committed, and how much is left to sell. Names stay anonymised.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {[...new Set([...state.markets.originCountries, "Egypt", "Morocco", "China"])].map((item) => (
          <Link
            key={item}
            href={`/hub/tools/analytics/producers?origin=${encodeURIComponent(item)}`}
            className={`rounded-full px-3 py-1 text-[12.5px] font-semibold no-underline ${origin === item ? "bg-blue text-white" : "bg-white text-mid ring-1 ring-border"}`}
          >
            {item}
          </Link>
        ))}
      </div>
      <KpiGrid>
        <KpiCard label="Open enquiries" value={fmtMTFull(panel.openMt)} />
        <KpiCard label="Loading now" value={fmtMTFull(panel.loadingMt)} />
        <KpiCard label="Committed (BL)" value={fmtMTFull(panel.committedMt)} />
        <KpiCard label="Room to sell" value={panel.headroom == null ? "—" : fmtMTFull(Math.max(panel.headroom, 0))} hint={panel.capacity ? `Capacity ${fmtMTFull(panel.capacity)} / month` : "No capacity on file"} />
      </KpiGrid>
      <section className="aq-card p-5">
        <h3 className="font-semibold">Committed versus capacity · last 6 months</h3>
        <div className="mt-4 flex h-40 items-end gap-2">
          {panel.months.map((row) => (
            <div key={row.month} className="flex flex-1 flex-col justify-end">
              <div className="rounded-t bg-[#10263b]" style={{ height: `${Math.max(8, (row.mt / max) * 100)}%` }} />
              <p className="mt-1 text-center font-mono text-[10px] text-dim">{row.month.slice(5)}</p>
            </div>
          ))}
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="aq-card overflow-hidden">
          <h3 className="px-5 py-4 font-semibold">Who is enquiring for {origin} product</h3>
          <BarList rows={panel.who} />
        </section>
        <section className="aq-card p-5">
          <h3 className="font-semibold">Export availability by producer</h3>
          <p className="text-[12px] text-dim">Aquifert estimate</p>
          <ul className="mt-3 divide-y divide-border">
            {panel.producers.map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                <span>
                  <span className="font-medium">{row.label}</span>
                  <span className="block text-dim">{row.note}</span>
                </span>
                <span className="rounded-full bg-s2 px-2 py-0.5 text-[11.5px] font-semibold">{row.status}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
