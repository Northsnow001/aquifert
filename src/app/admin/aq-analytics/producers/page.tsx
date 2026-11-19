import { BarList, KpiCard, KpiGrid } from "@/components/admin/aq-analytics/kpi";
import { Card, CardHeader, PageHeader } from "@/components/admin/ui";
import { fmtMTFull } from "@/lib/aq-analytics/contracts";
import { dataNow, producerPanel } from "@/lib/aq-analytics/queries";
import { getAqAnalytics } from "@/lib/aq-analytics/store";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProducersPage({ searchParams }: { searchParams: Promise<{ origin?: string }> }) {
  const params = await searchParams;
  const state = await getAqAnalytics();
  const origin = params.origin || state.markets.originCountries[0] || "Egypt";
  const [now, panel] = await Promise.all([dataNow(), producerPanel(origin)]);
  const max = Math.max(...panel.months.map((m) => m.mt), panel.capacity ?? 1, 1);
  return (
    <>
      <PageHeader
        title={`Producer view · ${origin}`}
        description="Export liquidity versus monthly capacity. Producer names are anonymised. Capacity is an Aquifert estimate."
        crumbs={[
          { href: "/admin/aq-analytics", label: "Map" },
          { href: "/admin/aq-analytics/producers", label: "Producers" },
        ]}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {[...new Set([...state.markets.originCountries, "Egypt", "Morocco", "China"])].map((item) => (
          <Link
            key={item}
            href={`/admin/aq-analytics/producers?origin=${encodeURIComponent(item)}`}
            className={`rounded-full px-3 py-1 text-[12.5px] font-semibold no-underline ${origin === item ? "bg-blue text-white" : "bg-s2 text-mid"}`}
          >
            {item}
          </Link>
        ))}
      </div>
      <KpiGrid>
        <KpiCard label="Open enquiries" value={fmtMTFull(panel.openMt)} />
        <KpiCard label="Loading now" value={fmtMTFull(panel.loadingMt)} />
        <KpiCard label="Committed (BL)" value={fmtMTFull(panel.committedMt)} />
        <KpiCard
          label="Indicative headroom"
          value={panel.headroom == null ? "—" : fmtMTFull(Math.max(panel.headroom, 0))}
          hint={panel.capacity ? `vs ${fmtMTFull(panel.capacity)} / month · Aquifert estimate` : "No capacity on file"}
        />
      </KpiGrid>
      <Card className="mb-4">
        <CardHeader title="Monthly exports" meta={`Capacity reference · data to ${now}`} />
        <div className="flex h-40 items-end gap-2 px-5 py-4">
          {panel.months.map((row) => (
            <div key={row.month} className="flex flex-1 flex-col justify-end">
              <div className="rounded-t bg-blue" style={{ height: `${(row.mt / max) * 100}%` }} />
              <p className="mt-1 text-center font-mono text-[10px] text-dim">{row.month.slice(5)}</p>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Producer status" meta="Anonymised · Aquifert estimate" />
          <ul className="divide-y divide-border">
            {panel.producers.map((row) => (
              <li key={row.label} className="px-5 py-3">
                <p className="text-[13.5px] font-medium">{row.label}</p>
                <p className="text-[12.5px] text-mid">
                  {row.status} · {row.note}
                </p>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Who is enquiring" />
          <BarList rows={panel.who} />
        </Card>
      </div>
    </>
  );
}
