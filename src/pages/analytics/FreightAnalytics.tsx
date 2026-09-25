/**
 * 1.4 Freight Analytics & Global Port Line-Ups — four connected views:
 * trade flows, port line-ups, action in your market, freight benchmarks.
 * Every view carries a HOW TO panel. Counterparty names appear only where
 * permitted. Benchmark sample sizes are never hidden.
 */
import { useState } from "react";
import { Ship } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { trpc } from "@/providers/trpc";
import { Direction, Freshness, HowTo, LockedTeaser, SampleSize, seriesColor } from "@/components/analytics/shared";

const fmtMt = (n: number) => `${(n / 1000).toFixed(1)}k t`;

export default function FreightAnalytics() {
  const [tab, setTab] = useState("flows");
  const [product, setProduct] = useState("");
  const [port, setPort] = useState("");
  const [actionRegion, setActionRegion] = useState("");
  const [minMt, setMinMt] = useState("");

  const flows = trpc.analytics.tradeFlows.useQuery(
    { product: product || undefined, port: undefined, origin: undefined, destination: undefined, recordType: undefined, minMt: minMt ? Number(minMt) * 1000 : undefined },
    { retry: 0 },
  );
  const flowsLocked = flows.error && !flows.isLoading;
  const lineups = trpc.analytics.portLineups.useQuery({ port: port || undefined }, { retry: 0 });
  const lineupsLocked = lineups.error && !lineups.isLoading;
  const actionProduct = product || "Urea (granular)";
  const action = trpc.analytics.actionInMarket.useQuery(
    { product: actionProduct, region: actionRegion || "India" },
    { enabled: !flowsLocked, retry: 0 },
  );
  const benchmarks = trpc.analytics.freightBenchmarks.useQuery(undefined, { retry: 0 });
  const benchmarksLocked = benchmarks.error && !benchmarks.isLoading;

  const f = flows.data;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <PageHeader title="Freight Analytics & Port Line-Ups" description="Who is moving cargo, where, and at what rate — built on Kpler and Argus freight data under licence." />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Freight views">
          <TabsTrigger value="flows">Trade Flows</TabsTrigger>
          <TabsTrigger value="lineups">Port Line-Ups</TabsTrigger>
          <TabsTrigger value="action">Action in Your Market</TabsTrigger>
          <TabsTrigger value="benchmarks">Rate Benchmarks</TabsTrigger>
        </TabsList>

        {/* a) TRADE FLOW MAP */}
        <TabsContent value="flows" className="space-y-4">
          <HowTo title="Trade Flows">
            <p>Each lane shows the tonnage moving origin → destination this period. Wider bars mean more volume. Click a lane to open its detail. Use it to answer: where is supply actually going, and is my corridor gaining or losing volume?</p>
          </HowTo>
          {flowsLocked ? <LockedTeaser capability="analytics.trade_flows" title="Trade Flows"><p>Vessel trade flows by corridor, weighted by volume, with trend against the prior period.</p></LockedTeaser> : (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-52">
                  <Label htmlFor="tf-product">Product</Label>
                  <Input id="tf-product" placeholder="e.g. Urea (granular)" value={product} onChange={(e) => setProduct(e.target.value)} />
                </div>
                <div className="w-36">
                  <Label htmlFor="tf-min">Min volume (k t)</Label>
                  <Input id="tf-min" inputMode="numeric" placeholder="0" value={minMt} onChange={(e) => setMinMt(e.target.value)} />
                </div>
                <span className="ml-auto"><Freshness asOf={f?.asOf} /></span>
              </div>

              {f && (
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Total volume", value: fmtMt(f.kpis.totalMt) },
                    { label: "Active lanes", value: String(f.kpis.lanes) },
                    { label: "Products", value: String(f.kpis.products) },
                  ].map((k) => (
                    <Card key={k.label}><CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">{k.label}</p>
                      <p className="text-xl font-bold tabular-nums">{k.value}</p>
                    </CardContent></Card>
                  ))}
                </div>
              )}

              <Card>
                <CardContent className="space-y-3 p-5" aria-label="Trade flow lanes">
                  {f?.flows.map((flow, i) => {
                    const max = Math.max(...f.flows.map((x) => x.volumeMt), 1);
                    return (
                      <div key={flow.id} className="space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="font-medium">{flow.origin} → {flow.destination}</span>
                          <span className="text-muted-foreground">{flow.product} · {fmtMt(flow.volumeMt)} {flow.trendPct != null && <Direction value={flow.trendPct} unit="%" />}</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-muted">
                          <div className="h-2.5 rounded-full" style={{ width: `${Math.max(3, (flow.volumeMt / max) * 100)}%`, background: seriesColor(i) }} />
                        </div>
                      </div>
                    );
                  })}
                  {f && !f.flows.length && <p className="text-sm text-muted-foreground">Nothing matches these filters. Widen the product or lower the volume floor.</p>}
                  {flows.isLoading && <div className="h-40 animate-pulse rounded-md bg-muted/40" aria-label="Loading flows" />}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* b) PORT LINE-UPS */}
        <TabsContent value="lineups" className="space-y-4">
          <HowTo title="Port Line-Ups">
            <p>Vessels expected, loading or discharging at each port — this answers "what is actually about to move". ETAs are estimates; charterer names appear only where the licence permits disclosure.</p>
          </HowTo>
          {lineupsLocked ? <LockedTeaser capability="analytics.port_lineups" title="Port Line-Ups"><p>Vessels expected, loading and discharging, with cargo, quantity and ETA.</p></LockedTeaser> : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Select value={port} onValueChange={setPort}>
                  <SelectTrigger className="w-56" aria-label="Port"><SelectValue placeholder="All ports" /></SelectTrigger>
                  <SelectContent>{(lineups.data?.ports ?? []).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
                <span className="ml-auto"><Freshness asOf={lineups.data?.asOf} /></span>
              </div>
              <Card>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th scope="col" className="p-3 font-medium">Vessel</th>
                        <th scope="col" className="p-3 font-medium">Port</th>
                        <th scope="col" className="p-3 font-medium">ETA</th>
                        <th scope="col" className="p-3 font-medium">Cargo</th>
                        <th scope="col" className="p-3 font-medium text-right">Quantity</th>
                        <th scope="col" className="p-3 font-medium">Status</th>
                        <th scope="col" className="p-3 font-medium">Charterer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(lineups.data?.lineups ?? []).map((l) => (
                        <tr key={l.id} className="border-b border-border/60">
                          <td className="p-3 font-medium">{l.vessel}</td>
                          <td className="p-3">{l.port}</td>
                          <td className="p-3">{l.eta}</td>
                          <td className="p-3">{l.cargo}</td>
                          <td className="p-3 text-right">{l.quantityMt.toLocaleString()} t</td>
                          <td className="p-3"><Badge variant="outline">{l.status}</Badge></td>
                          <td className="p-3 text-muted-foreground">{l.charterer ?? "Not disclosed"}</td>
                        </tr>
                      ))}
                      {lineups.isLoading && <tr><td colSpan={7} className="p-6"><div className="h-24 animate-pulse rounded-md bg-muted/40" aria-label="Loading line-ups" /></td></tr>}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* c) ACTION IN YOUR MARKET */}
        <TabsContent value="action" className="space-y-4">
          <HowTo title="Action in Your Market">
            <p>Pick a product and a region: who is moving cargo right now, at what volume, on which lanes, and the trend against the prior period. Counterparty names show only where the licence and the data's own terms permit.</p>
          </HowTo>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-52">
              <Label htmlFor="am-product">Product</Label>
              <Input id="am-product" value={actionProduct} onChange={(e) => setProduct(e.target.value)} />
            </div>
            <div className="w-52">
              <Label htmlFor="am-region">Region</Label>
              <Input id="am-region" placeholder="e.g. India" value={actionRegion} onChange={(e) => setActionRegion(e.target.value)} />
            </div>
            <span className="ml-auto"><Freshness asOf={action.data?.asOf} /></span>
          </div>
          <Card>
            <CardContent className="space-y-3 p-5">
              {(action.data?.moves ?? []).map((m) => (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
                  <span className="inline-flex items-center gap-2 font-medium"><Ship className="h-4 w-4 text-teal-600" aria-hidden="true" />{m.origin} → {m.destination}</span>
                  <span className="text-muted-foreground">
                    {fmtMt(m.volumeMt)} · {m.period} {m.trendPct != null && <Direction value={m.trendPct} unit="%" />}
                    {m.charterer && <> · <span className="font-medium text-foreground">{m.charterer}</span></>}
                  </span>
                </div>
              ))}
              {action.isLoading && <div className="h-32 animate-pulse rounded-md bg-muted/40" aria-label="Loading moves" />}
              {action.data && !action.data.moves.length && <p className="text-sm text-muted-foreground">No recorded moves for that product and region in the current period. Try a neighbouring region or another product.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* d) FREIGHT RATE BENCHMARKS */}
        <TabsContent value="benchmarks" className="space-y-4">
          <HowTo title="Freight Rate Benchmarks">
            <p>Rate bands by lane and vessel class, with the sample size on every band. A band from three fixtures is indicative only — it looks different from one built on thirty. Never treat a thin band as the market.</p>
          </HowTo>
          {benchmarksLocked ? <LockedTeaser capability="analytics.freight_bench" title="Freight Benchmarks"><p>Rate bands by lane and vessel class with honest sample sizes.</p></LockedTeaser> : (
            <>
              <span className="inline-block"><Freshness asOf={benchmarks.data?.asOf} /></span>
              <div className="grid gap-3 md:grid-cols-2">
                {(benchmarks.data?.bands ?? []).map((b) => (
                  <Card key={b.id} className={b.thin ? "border-amber-300/70 dark:border-amber-500/40" : undefined}>
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{b.lane}</p>
                        <SampleSize n={b.sampleSize} />
                      </div>
                      <p className="text-xs text-muted-foreground">{b.vesselClass} · {b.period}</p>
                      <p className="text-lg font-bold tabular-nums">${b.lowUsd}–${b.highUsd}<span className="text-sm font-normal text-muted-foreground">/t · mid ${b.midUsd}</span></p>
                      <div className="relative h-2 rounded-full bg-muted" aria-hidden="true">
                        <div className="absolute h-2 rounded-full bg-teal-600/70" style={{ left: "10%", right: "10%" }} />
                      </div>
                      {b.thin && <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Only {b.sampleSize} fixtures behind this band — treat as indicative, not the market.</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
