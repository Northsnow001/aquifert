import { useMemo, useState } from "react";
import { Lightbulb, Megaphone, Plus, Trash2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { PageHeader } from "@/components/shared/PageHeader";
import { PriceChart } from "@/components/shared/PriceChart";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { AIProcessing } from "@/components/shared/AIProcessing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusPill } from "@/components/shared/StatusPill";
import { ConfidenceBadge } from "@/components/shared/StatusPill";
import { PRODUCTS } from "@contracts/constants";
import { fmtDate, fmtDateTime, usd } from "@/lib/format";
import { toast } from "sonner";
import { format } from "date-fns";

type Insight = {
  narrative: string;
  recommendation: string;
  trend: "RISING" | "FALLING" | "STABLE";
  volatility?: "LOW" | "MODERATE" | "HIGH";
  confidence: number;
  changePct: number;
};

export default function AdminInsights() {
  const utils = trpc.useUtils();
  const [commodity, setCommodity] = useState<(typeof PRODUCTS)[number]>("UREA");
  const [region, setRegion] = useState("UK");
  const [insight, setInsight] = useState<(Insight & { commodity: string; region: string; at: Date }) | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const series = trpc.market.series.useQuery({ commodity, region, weeks: 26 });
  const generate = trpc.market.generateInsight.useMutation();
  const addPoint = trpc.market.addPoint.useMutation({
    onSuccess: () => {
      toast.success("Data point added");
      utils.market.series.invalidate();
      utils.market.latest.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const deletePoint = trpc.market.deletePoint.useMutation({
    onSuccess: () => {
      toast.success("Data point deleted");
      utils.market.series.invalidate();
    },
  });
  const schedule = trpc.market.scheduleBroadcast.useMutation({
    onSuccess: (r) => {
      toast.success(r.status === "SENT" ? "Broadcast sent" : "Broadcast scheduled");
      utils.market.broadcasts.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const broadcasts = trpc.market.broadcasts.useQuery();

  const chartData = useMemo(() => {
    return (series.data ?? [])
      .map((p) => ({ date: format(new Date(p.date), "dd MMM"), [region]: p.pricePerTon }))
      .reverse();
  }, [series.data, region]);

  const [form, setForm] = useState({ commodity: "UREA" as (typeof PRODUCTS)[number], region: "UK", price: "", date: format(new Date(), "yyyy-MM-dd"), source: "" });
  const [bForm, setBForm] = useState({ audience: "ALL" as "ALL" | "TIER_1" | "TIER_2_PLUS" | "TIER_3", channel: "WHATSAPP" as "WHATSAPP" | "EMAIL" | "IN_APP", message: "", scheduledAt: "" });

  type Point = NonNullable<typeof series.data>[number];
  const columns: Column<Point>[] = [
    { key: "date", header: "Date", sortValue: (p) => p.date, render: (p) => <span className="text-xs">{fmtDate(p.date)}</span> },
    { key: "commodity", header: "Commodity", render: (p) => p.commodity },
    { key: "region", header: "Region", render: (p) => p.region },
    { key: "price", header: "Price/t", sortValue: (p) => p.pricePerTon, render: (p) => <span className="font-data">{usd(p.pricePerTon)}</span> },
    { key: "source", header: "Source", render: (p) => <span className="text-xs text-muted-foreground">{p.source}</span> },
    {
      key: "actions", header: "",
      render: (p) => (
        <Button variant="ghost" size="icon" className="h-7 w-7 text-danger" onClick={() => deletePoint.mutate({ id: p.id })} aria-label="Delete data point">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  const trendColor = insight?.trend === "RISING" ? "text-emerald-600" : insight?.trend === "FALLING" ? "text-red-500" : "text-amber-600";

  return (
    <div>
      <PageHeader title="Market Insights Engine" description="Curate price data, generate AI narratives and broadcast intelligence to members." />

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Chart + data entry */}
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Price trend, 26 weeks</CardTitle>
              <div className="flex gap-2">
                <Select value={commodity} onValueChange={(v) => setCommodity(v as typeof commodity)}>
                  <SelectTrigger className="h-9 w-32" aria-label="Commodity"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRODUCTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger className="h-9 w-32" aria-label="Region"><SelectValue /></SelectTrigger>
                  <SelectContent>{["UK", "EU", "Asia", "Americas"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <PriceChart data={chartData} series={[region]} area height={280} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Plus className="h-4 w-4 text-teal-600" /> Add data point</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div>
                  <Label>Commodity</Label>
                  <Select value={form.commodity} onValueChange={(v) => setForm({ ...form, commodity: v as typeof form.commodity })}>
                    <SelectTrigger aria-label="Commodity"><SelectValue /></SelectTrigger>
                    <SelectContent>{PRODUCTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Region</Label>
                  <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v })}>
                    <SelectTrigger aria-label="Region"><SelectValue /></SelectTrigger>
                    <SelectContent>{["UK", "EU", "Asia", "Americas"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label htmlFor="mp-price">Price / t (USD)</Label><Input id="mp-price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="331.50" /></div>
                <div><Label htmlFor="mp-date">Date</Label><Input id="mp-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                <div><Label htmlFor="mp-src">Source</Label><Input id="mp-src" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Argus FMB" /></div>
              </div>
              <Button
                className="mt-3 bg-navy-600 hover:bg-navy-700"
                disabled={!form.price || addPoint.isPending}
                onClick={() =>
                  addPoint.mutate({
                    commodity: form.commodity, region: form.region,
                    pricePerTon: Number(form.price), date: new Date(form.date),
                    source: form.source || "Manual entry",
                  })
                }
              >
                Add to index
              </Button>
            </CardContent>
          </Card>

          <DataTable columns={columns} rows={(series.data ?? []).slice(0, 60)} pageSize={10} searchPlaceholder="Search source…" />
        </div>

        {/* AI insight + broadcast */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Lightbulb className="h-4 w-4 text-teal-500" /> AI insight generator</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full bg-teal-500 hover:bg-teal-600 aqf-btn-press"
                disabled={aiBusy}
                onClick={async () => {
                  setAiBusy(true);
                  // Simulated OpenAI latency (2s per PRD)
                  const [r] = await Promise.all([
                    generate.mutateAsync({ commodity, region }),
                    new Promise((res) => setTimeout(res, 2000)),
                  ]);
                  setInsight({ ...r, commodity, region, at: new Date() });
                  setBForm((b) => ({ ...b, message: `${r.narrative} ${r.recommendation}` }));
                  setAiBusy(false);
                }}
              >
                <Lightbulb className="mr-1.5 h-4 w-4" /> Generate insight ({commodity} · {region})
              </Button>

              <div className="mt-4">
                {aiBusy ? (
                  <AIProcessing label="Analysing 26 weeks of price data…" />
                ) : insight ? (
                  <div className="aqf-pop space-y-3 rounded-xl border border-teal-500/30 bg-teal-50/50 p-4 dark:bg-teal-500/5">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold ${trendColor}`}>
                        {insight.trend} {insight.changePct ? `(${insight.changePct > 0 ? "+" : ""}${insight.changePct.toFixed(1)}%)` : ""}
                      </span>
                      <ConfidenceBadge score={insight.confidence} />
                    </div>
                    <p className="text-sm leading-relaxed">{insight.narrative}</p>
                    <div className="rounded-lg bg-card p-3 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommended action</p>
                      <p className="mt-1 font-medium">{insight.recommendation}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Generated {fmtDateTime(insight.at)} · {insight.commodity} · {insight.region}</p>
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    Generate an AI narrative from the curated price index.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Megaphone className="h-4 w-4 text-navy-500" /> Schedule broadcast</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Audience</Label>
                  <Select value={bForm.audience} onValueChange={(v) => setBForm({ ...bForm, audience: v as typeof bForm.audience })}>
                    <SelectTrigger aria-label="Audience"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All buyers</SelectItem>
                      <SelectItem value="TIER_1">Tier 1 (Sprout)</SelectItem>
                      <SelectItem value="TIER_2_PLUS">Tier 2+ (Harvest/Scale)</SelectItem>
                      <SelectItem value="TIER_3">Tier 3 (Scale)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Channel</Label>
                  <Select value={bForm.channel} onValueChange={(v) => setBForm({ ...bForm, channel: v as typeof bForm.channel })}>
                    <SelectTrigger aria-label="Channel"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="IN_APP">In-app</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="bc-msg">Message</Label>
                <Textarea id="bc-msg" rows={4} value={bForm.message} onChange={(e) => setBForm({ ...bForm, message: e.target.value })} placeholder="Generate an insight to pre-fill, or write your own…" />
              </div>
              <div>
                <Label htmlFor="bc-when">Schedule for (optional)</Label>
                <Input id="bc-when" type="datetime-local" value={bForm.scheduledAt} onChange={(e) => setBForm({ ...bForm, scheduledAt: e.target.value })} />
              </div>
              <Button
                className="w-full bg-navy-600 hover:bg-navy-700"
                disabled={bForm.message.length < 5 || schedule.isPending}
                onClick={() =>
                  schedule.mutate({
                    audience: bForm.audience,
                    channel: bForm.channel,
                    message: bForm.message,
                    scheduledAt: bForm.scheduledAt ? new Date(bForm.scheduledAt) : undefined,
                  })
                }
              >
                {bForm.scheduledAt ? "Schedule broadcast" : "Send now"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Broadcast history</CardTitle></CardHeader>
            <CardContent className="space-y-2.5">
              {(broadcasts.data ?? []).map((b) => (
                <div key={b.id} className="rounded-lg border border-border p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{b.channel} → {b.audience.replace(/_/g, " ")}</span>
                    <StatusPill status={b.status} />
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-muted-foreground">{b.message}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground/70">{fmtDateTime(b.scheduledAt)}</p>
                </div>
              ))}
              {(broadcasts.data ?? []).length === 0 && <p className="text-xs text-muted-foreground">No broadcasts yet.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
