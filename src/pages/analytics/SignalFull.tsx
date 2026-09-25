/**
 * 1.3 AQ Signal — HISTORY (AQ1 entitlement) + OUTLOOK (AQ Analytics).
 * The outlook is a desk VIEW: labelled, attributed, never a recommendation.
 */
import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { trpc } from "@/providers/trpc";
import { DataTableFallback, Direction, Freshness, seriesColor } from "@/components/analytics/shared";

const VIEW_LABEL = "Aquifert desk view — an expectation, not a recommendation.";

function Spark({ points }: { points: { d: string; v: number }[] }) {
  if (!points.length) return null;
  const w = 120, h = 32;
  const min = Math.min(...points.map((p) => p.v));
  const max = Math.max(...points.map((p) => p.v));
  const span = max - min || 1;
  const d = points.map((p, i) => `${(i / Math.max(1, points.length - 1)) * w},${h - ((p.v - min) / span) * h}`).join(" ");
  return <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-[120px]" aria-hidden="true"><polyline points={d} fill="none" stroke="#31648F" strokeWidth="2" /></svg>;
}

export default function SignalFull() {
  const [product, setProduct] = useState("");
  const [horizon, setHorizon] = useState(30);
  const history = trpc.analytics.signalHistory.useQuery({ products: [] });
  const outlook = trpc.analytics.signalOutlook.useQuery(product ? { product } : undefined, { retry: 0 });
  const outlookLocked = outlook.error && !outlook.isLoading;

  const products = history.data?.products ?? [];
  const active = products.find((p) => p.product === product) ?? products[0];
  const out = outlook.data?.outlooks.find((o) => (product ? o.product === product : o.product === active?.product) && o.horizonDays === horizon)
    ?? outlook.data?.outlooks[0];

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <PageHeader title="AQ Signal" description="History and outlook in one module — history is fact, the outlook is the desk's labelled view." />

      {/* HISTORY — also in AQ1 */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">History</h2>
            <Select value={active?.product ?? ""} onValueChange={(v) => setProduct(v === product ? "" : v)}>
              <SelectTrigger className="w-56" aria-label="Product"><SelectValue placeholder="All products" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => <SelectItem key={p.product} value={p.product}>{p.product}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="ml-auto"><Freshness asOf={history.data?.freshnessAsOf ? new Date(history.data.freshnessAsOf).toISOString().slice(0, 10) : null} /></span>
          </div>

          {history.isLoading && <div className="h-40 animate-pulse rounded-md bg-muted/40" aria-label="Loading history" />}

          {products.map((p) => (
            <div key={p.product} className="mb-5 last:mb-0">
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{p.product}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th scope="col" className="py-1.5 pr-3 font-medium">Window</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Start</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Current</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Change</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">High</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Low</th>
                      <th scope="col" className="py-1.5 font-medium">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.windows.map((w) => !w.available ? (
                      <tr key={w.windowDays} className="border-b border-border/60 text-muted-foreground">
                        <td className="py-2 pr-3 font-medium">{w.windowDays}d</td>
                        <td colSpan={6} className="py-2 text-xs">Not enough history in the records yet.</td>
                      </tr>
                    ) : (
                      <tr key={w.windowDays} className="border-b border-border/60">
                        <td className="py-2 pr-3 font-medium">{w.windowDays} days</td>
                        <td className="py-2 pr-3">{w.start}</td>
                        <td className="py-2 pr-3">{w.current}</td>
                        <td className="py-2 pr-3"><Direction value={w.change} unit={` (${w.changePct}%)`} /></td>
                        <td className="py-2 pr-3">{w.high}</td>
                        <td className="py-2 pr-3">{w.low}</td>
                        <td className="py-2"><Spark points={w.spark} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {history.data?.drivers.length ? (
            <div className="mt-4 rounded-md bg-muted/50 p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">What drove it</h3>
              <ul className="space-y-1 text-sm">
                {history.data.drivers.map((d) => (
                  <li key={d.id}>• {d.title} <span className="text-xs text-muted-foreground">({d.at.slice(0, 10)})</span></li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* OUTLOOK — AQ Analytics only, labelled a view */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">Outlook</h2>
            <Badge variant="outline" className="border-amber-400/60 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              Desk view — not a recommendation
            </Badge>
            <div className="ml-auto inline-flex rounded-md border border-border" role="group" aria-label="Horizon">
              {[30, 60, 90].map((h) => (
                <Button key={h} size="sm" variant={horizon === h ? "default" : "ghost"} onClick={() => setHorizon(h)}>{h}d</Button>
              ))}
            </div>
          </div>

          {outlookLocked && (
            <div className="rounded-md border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              The forward outlook is an AQ Analytics module. History above is yours; the desk's 30/60/90-day views, scheduled events and risk lists unlock with AQ Analytics.
            </div>
          )}

          {out && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">{out.product} · {out.horizonDays}-day</span>
                <Badge>{out.deskView}</Badge>
                <span className="text-xs text-muted-foreground">{VIEW_LABEL} · {out.authorName}, as of {out.asOf.slice(0, 10)}</span>
                <span className="ml-auto"><Freshness asOf={out.asOf.slice(0, 10)} /></span>
              </div>

              {out.curve.length > 1 && (
                <>
                  <div className="h-56" role="img" aria-label={`${out.product} forward curve`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={out.curve} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ strokeOpacity: 0.3 }} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={{ strokeOpacity: 0.3 }} width={48} domain={["auto", "auto"]} />
                        <Tooltip contentStyle={{ fontVariantNumeric: "tabular-nums", fontSize: 12 }} cursor={{ stroke: "#64748b", strokeDasharray: "4 4" }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="price" name="Forward curve" stroke={seriesColor(0)} dot={{ r: 3 }} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <DataTableFallback caption={`${out.product} forward curve`} headers={["Period", "Price"]} rows={out.curve.map((c) => [c.label, c.price])} />
                </>
              )}

              <p className="text-sm leading-relaxed text-muted-foreground">{out.reasoning}</p>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key scheduled events</h3>
                  <ul className="space-y-1 text-sm">
                    {out.events.map((e, i) => <li key={i}>• {e.date} — {e.title} <Badge variant="outline" className="ml-1 text-[10px]">{e.impact}</Badge></li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upside risks</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">{out.upsideRisks.map((r, i) => <li key={i}>• {r}</li>)}</ul>
                </div>
                <div>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Downside risks</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">{out.downsideRisks.map((r, i) => <li key={i}>• {r}</li>)}</ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
