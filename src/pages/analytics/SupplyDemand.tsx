/**
 * 1.6 Global Supply & Demand Analysis — IFA Stat / FAO-sourced balances.
 * Annual data: every figure carries its source and vintage; the UI never
 * implies it is current-week data.
 */
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { trpc } from "@/providers/trpc";
import { DataTableFallback, Freshness, LockedTeaser, seriesColor } from "@/components/analytics/shared";

export default function SupplyDemand() {
  const [nutrient, setNutrient] = useState<"N" | "P" | "K">("N");
  const q = trpc.analytics.supplyDemand.useQuery({ nutrient }, { retry: 0 });
  const locked = q.error && !q.isLoading;

  if (locked) {
    return (
      <LockedTeaser capability="analytics.supply_demand" title="Supply & Demand Analysis">
        <p>Global and regional balances by nutrient and product, capacity and announced projects, consumption trends, net exporters and importers.</p>
      </LockedTeaser>
    );
  }

  const rows = q.data?.rows ?? [];
  const world = rows.filter((r) => r.region === "World").sort((a, b) => a.year - b.year);
  const regions = rows.filter((r) => r.region !== "World" && r.year === Math.max(...rows.map((x) => x.year)));
  const product = rows[0]?.product ?? "";

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <PageHeader
        title="Global Supply & Demand"
        description={`Annual balances by nutrient — source ${q.data?.sourceName ?? "IFA Stat"}, vintage ${q.data?.vintage ?? "2026 H1"}. Annual data, refreshed as new statistics are published.`}
      />

      <div className="flex items-center gap-3">
        <div className="inline-flex rounded-md border border-border" role="group" aria-label="Nutrient">
          {(["N", "P", "K"] as const).map((n) => (
            <Button key={n} size="sm" variant={nutrient === n ? "default" : "ghost"} onClick={() => setNutrient(n)}>
              {n === "N" ? "N — Nitrogen" : n === "P" ? "P — Phosphate" : "K — Potash"}
            </Button>
          ))}
        </div>
        <span className="ml-auto"><Freshness asOf={q.data?.vintage ? `${q.data.vintage} vintage` : null} label="Data" /></span>
      </div>

      {world.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-3 text-lg font-semibold">{product} — world balance (Mt)</h2>
            <div className="h-64" role="img" aria-label="World supply and demand by year">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={world} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ strokeOpacity: 0.3 }} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={{ strokeOpacity: 0.3 }} width={48} />
                  <Tooltip contentStyle={{ fontVariantNumeric: "tabular-nums", fontSize: 12 }} cursor={{ fillOpacity: 0.08 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="supplyMt" name="Supply" fill={seriesColor(0)} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="demandMt" name="Demand" fill={seriesColor(1)} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <DataTableFallback
              caption={`${product} world supply and demand`}
              headers={["Year", "Supply (Mt)", "Demand (Mt)", "Balance (Mt)", "Capacity (Mt)"]}
              rows={world.map((r) => [r.year, r.supplyMt, r.demandMt, r.balanceMt, r.capacityMt ?? "—"])}
            />
            <p className="mt-2 text-xs text-muted-foreground">Source: {q.data?.sourceName}, vintage {q.data?.vintage} — annual statistics, not current-week data.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 text-lg font-semibold">Regional balance — {Math.max(...rows.map((r) => r.year), 0)}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="py-2 pr-3 font-medium">Region</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Product</th>
                  <th scope="col" className="py-2 pr-3 font-medium text-right">Supply (Mt)</th>
                  <th scope="col" className="py-2 pr-3 font-medium text-right">Demand (Mt)</th>
                  <th scope="col" className="py-2 pr-3 font-medium text-right">Balance</th>
                  <th scope="col" className="py-2 pr-3 font-medium text-right">Net exports</th>
                  <th scope="col" className="py-2 font-medium">Announced projects</th>
                </tr>
              </thead>
              <tbody>
                {regions.map((r) => (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-medium">{r.region}</td>
                    <td className="py-2 pr-3">{r.product}</td>
                    <td className="py-2 pr-3 text-right">{r.supplyMt}</td>
                    <td className="py-2 pr-3 text-right">{r.demandMt}</td>
                    <td className={`py-2 pr-3 text-right font-semibold ${r.balanceMt >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                      {r.balanceMt >= 0 ? "▲ +" : "▼ "}{r.balanceMt} {r.balanceMt >= 0 ? "surplus" : "deficit"}
                    </td>
                    <td className="py-2 pr-3 text-right">{r.netExportsMt != null ? `${r.netExportsMt > 0 ? "+" : ""}${r.netExportsMt}` : "—"}</td>
                    <td className="py-2">
                      {r.announcedProjects.length ? r.announcedProjects.map((p, i) => (
                        <Badge key={i} variant="outline" className="mr-1 mb-1 text-[11px]">{p.name} ({p.startYear}, {p.capacityMt} Mt)</Badge>
                      )) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Source: {q.data?.sourceName}, vintage {q.data?.vintage}.</p>
        </CardContent>
      </Card>
    </div>
  );
}
