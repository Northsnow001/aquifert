/**
 * 1.2 AQ Analytics — Licensed Market Data. Overlay up to five series,
 * absolute vs indexed-to-100, spreads, URL-encoded shareable state,
 * export only where the licence allows. Attribution rides with the numbers.
 */
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Download, GitCompareArrows, LineChart as LineIcon, Lock } from "lucide-react";
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/shared/PageHeader";
import { trpc } from "@/providers/trpc";
import { Attribution, DataTableFallback, Freshness, LockedTeaser, seriesColor } from "@/components/analytics/shared";
import { toast } from "sonner";

type Pt = { date: string; value: number; low?: number; high?: number };

export default function MarketData() {
  const [params, setParams] = useSearchParams();
  const selected = useMemo(() => (params.get("series") ?? "").split(",").filter(Boolean).slice(0, 5), [params]);
  const mode = (params.get("mode") as "abs" | "idx") ?? "abs";
  const spread = params.get("spread") === "1";

  const list = trpc.analytics.seriesList.useQuery(undefined, { retry: 0 });
  const gated = list.error && !list.isLoading;
  const read = trpc.analytics.seriesRead.useQuery(
    { keys: selected },
    { enabled: !gated && selected.length > 0 },
  );
  const exporter = trpc.analytics.seriesExport.useMutation({
    onSuccess: (r) => {
      const blob = new Blob([r.csv], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `aquifert-series-${selected[0] ?? "export"}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`Export complete — ${r.rows} rows`);
    },
    onError: (e) => toast.error(e.message),
  });

  const series = (read.data ?? []).filter((s) => s.points && s.points.length > 0 && !("refused" in s));

  // Index to 100 at the earliest shared date, or absolute.
  const chart = useMemo(() => {
    if (!series.length) return [];
    const dates = [...new Set(series.flatMap((s) => s.points.map((p: Pt) => p.date)))].sort();
    return dates.map((d) => {
      const row: Record<string, string | number> = { date: d };
      for (const s of series) {
        const p = s.points.find((x: Pt) => x.date === d);
        if (!p) continue;
        row[s.key] = mode === "idx" ? (p.value / s.points[0].value) * 100 : p.value;
      }
      if (spread && series.length >= 2) {
        const a = series[0].points.find((x: Pt) => x.date === d)?.value;
        const b = series[1].points.find((x: Pt) => x.date === d)?.value;
        row.spread = a != null && b != null ? Math.round((a - b) * 100) / 100 : NaN;
      }
      return row;
    });
  }, [series, mode, spread]);

  const toggle = (key: string) => {
    const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key].slice(0, 5);
    setParams({ series: next.join(","), mode, spread: spread ? "1" : "0" }, { replace: true });
  };

  const latestAsOf = series.length ? series.map((s) => s.asOf).sort().pop() : null;
  const exportable = selected.length === 1 ? list.data?.find((d) => d.key === selected[0]) : null;

  // All hooks above this line — the gated return must not change hook count.
  if (gated) {
    return (
      <LockedTeaser capability="analytics.pra_data" title="Licensed Market Data">
        <p>Multi-product, multi-region price series from Argus, Infostat and IFA Stat — overlay up to five series, index to a common base, and compute spreads, with every value carrying its provider attribution and assessment date.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Absolute or indexed-to-100, spreads between any two series</li>
          <li>Shareable filter state — copy the URL, send the view</li>
          <li>Exports honour each dataset's licence terms and row caps</li>
        </ul>
      </LockedTeaser>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <PageHeader
        title={<span className="inline-flex items-center">Licensed Market Data {!list.isLoading && <Lock className="sr-only" aria-hidden="true" />}</span>}
        description="Price and statistics analytics built on Argus, Infostat and IFA Stat — every value carries its attribution."
      />

      <Card>
        <CardContent className="space-y-4 p-5">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Series (up to five)</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(list.data ?? []).map((d) => (
                <label key={d.key} className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-2.5 text-sm hover:bg-accent/40">
                  <Checkbox
                    checked={selected.includes(d.key)}
                    onCheckedChange={() => toggle(d.key)}
                    aria-label={`Toggle ${d.label}`}
                    disabled={!selected.includes(d.key) && selected.length >= 5}
                  />
                  <span>
                    <span className="font-medium">{d.label}</span>
                    <span className="block text-xs text-muted-foreground">{d.key}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-border" role="group" aria-label="Value mode">
              <Button size="sm" variant={mode === "abs" ? "default" : "ghost"} onClick={() => setParams({ series: selected.join(","), mode: "abs", spread: spread ? "1" : "0" }, { replace: true })}>Absolute</Button>
              <Button size="sm" variant={mode === "idx" ? "default" : "ghost"} onClick={() => setParams({ series: selected.join(","), mode: "idx", spread: spread ? "1" : "0" }, { replace: true })}>Indexed to 100</Button>
            </div>
            <Button
              size="sm" variant={spread ? "default" : "outline"}
              disabled={selected.length < 2}
              onClick={() => setParams({ series: selected.join(","), mode, spread: spread ? "0" : "1" }, { replace: true })}
            >
              <GitCompareArrows className="mr-1.5 h-4 w-4" /> Spread
            </Button>
            {exportable && exportable.exportAllowed && (
              <Button size="sm" variant="outline" onClick={() => exporter.mutate({ key: exportable.key })}>
                <Download className="mr-1.5 h-4 w-4" /> Export CSV
                {exportable.maxRowsPerExport != null && ` (max ${exportable.maxRowsPerExport} rows)`}
              </Button>
            )}
            {exportable && !exportable.exportAllowed && (
              // Export is hidden where forbidden; when exactly one series is
              // selected we say why, once, rather than showing a dead control.
              <p className="text-xs text-muted-foreground">Exports of {exportable.label} are not permitted under its licence.</p>
            )}
            <span className="ml-auto"><Freshness asOf={latestAsOf} /></span>
          </div>
        </CardContent>
      </Card>

      {selected.length === 0 && (
        <Card><CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <LineIcon className="h-5 w-5" aria-hidden="true" />
          Select at least one series. Nothing is shown until you choose — the data only loads for what you pick.
        </CardContent></Card>
      )}

      {read.isLoading && selected.length > 0 && (
        <div className="h-72 animate-pulse rounded-lg border border-border bg-muted/40" aria-label="Loading series" />
      )}

      {chart.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="h-72" role="img" aria-label="Price series chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ strokeOpacity: 0.3 }} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={{ strokeOpacity: 0.3 }} width={48} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ fontVariantNumeric: "tabular-nums", fontSize: 12 }}
                    cursor={{ stroke: "#64748b", strokeDasharray: "4 4" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {series.map((s, i) => (
                    <Line key={s.key} type="monotone" dataKey={s.key} name={list.data?.find((d) => d.key === s.key)?.label ?? s.key} stroke={seriesColor(i)} dot={false} strokeWidth={2} activeDot={{ r: 4 }} />
                  ))}
                  {spread && series.length >= 2 && (
                    <Line type="monotone" dataKey="spread" name={`Spread (${series[0].key} − ${series[1].key})`} stroke="#0f172a" strokeDasharray="5 4" dot={false} strokeWidth={1.5} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <DataTableFallback
              caption="Price series data"
              headers={["Date", ...series.map((s) => s.key)]}
              rows={chart.map((r) => [String(r.date), ...series.map((s) => (r[s.key] != null ? Number(r[s.key]).toFixed(2) : "—"))])}
            />
            <div className="mt-3 space-y-2">
              {series.map((s) => <Attribution key={s.key} text={s.attribution} />)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
