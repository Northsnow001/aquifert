import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Crown, Download, LineChart as LineChartIcon, Lock, TrendingUp } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useProfile } from "@/hooks/useProfile";
import { PageHeader } from "@/components/shared/PageHeader";
import { PriceChart, type PricePoint } from "@/components/shared/PriceChart";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRODUCTS } from "@contracts/constants";
import { fmtDate, usd } from "@/lib/format";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { toast } from "sonner";

const REGIONS = ["UK", "EU", "Asia", "Americas"];

export default function BuyerInsights() {
  const { membership, isMember } = useProfile();
  const navigate = useNavigate();
  const [commodity, setCommodity] = useState<(typeof PRODUCTS)[number]>("UREA");
  const [compare, setCompare] = useState(false);
  const [compareWith, setCompareWith] = useState<(typeof PRODUCTS)[number]>("DAP");
  const [region, setRegion] = useState("UK");

  const tier1 = membership?.tier === "SPROUT";
  const weeks = tier1 ? 5 : 26;

  const series = trpc.market.series.useQuery({ commodity, region, weeks }, { enabled: isMember });
  const compareSeries = trpc.market.series.useQuery({ commodity: compareWith, region, weeks }, { enabled: isMember && compare });
  const latest = trpc.market.latest.useQuery(undefined, { enabled: isMember });
  const insight = trpc.market.generateInsight.useMutation();

  const chartData = useMemo(() => {
    const map = new Map<string, PricePoint>();
    for (const p of series.data ?? []) {
      const key = format(new Date(p.date), "dd MMM");
      map.set(key, { ...(map.get(key) ?? { date: key }), [commodity]: p.pricePerTon });
    }
    if (compare) {
      for (const p of compareSeries.data ?? []) {
        const key = format(new Date(p.date), "dd MMM");
        map.set(key, { ...(map.get(key) ?? { date: key }), [compareWith]: p.pricePerTon });
      }
    }
    return [...map.values()].reverse();
  }, [series.data, compareSeries.data, compare, commodity, compareWith]);

  /** Regional heatmap table: latest price per commodity × region with week delta */
  const heatmap = useMemo(() => {
    const rows: { commodity: string; cells: { region: string; price: number; delta: number | null }[] }[] = [];
    for (const c of PRODUCTS) {
      const cells = REGIONS.map((r) => {
        const points = (latest.data ?? []).filter((p) => p.commodity === c && p.region === r);
        return { region: r, price: points[0]?.pricePerTon ?? 0, delta: null as number | null };
      });
      rows.push({ commodity: c, cells });
    }
    return rows;
  }, [latest.data]);

  const volatility = useMemo(() => {
    const pts = (series.data ?? []).slice(0, 8).map((p) => p.pricePerTon);
    if (pts.length < 3) return null;
    const mean = pts.reduce((a, b) => a + b, 0) / pts.length;
    const v = Math.sqrt(pts.reduce((a, b) => a + (b - mean) ** 2, 0) / pts.length) / mean;
    return v > 0.04 ? { label: "High volatility", cls: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" }
      : v > 0.015 ? { label: "Moderate volatility", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" }
      : { label: "Stable", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" };
  }, [series.data]);

  type Point = NonNullable<typeof series.data>[number];
  const columns: Column<Point>[] = [
    { key: "date", header: "Date", sortValue: (p) => p.date, render: (p) => <span className="text-xs">{fmtDate(p.date)}</span> },
    { key: "region", header: "Region", render: (p) => p.region },
    { key: "price", header: "Price/t", sortValue: (p) => p.pricePerTon, render: (p) => <span className="font-data">{usd(p.pricePerTon)}</span> },
    { key: "source", header: "Source", render: (p) => <span className="text-xs text-muted-foreground">{p.source}</span> },
  ];

  if (!isMember) {
    return (
      <div className="mx-auto max-w-lg py-14">
        <h1 className="sr-only">Market Insights</h1>
        <EmptyState
          icon={<Lock className="h-7 w-7" />}
          title="Market Insights is a member benefit"
          description="Unlock 12-month price trends, regional comparisons and AI trade recommendations with any membership tier."
          action={<Button className="bg-teal-500 hover:bg-teal-600" onClick={() => navigate("/buyer/membership")}><Crown className="mr-1.5 h-4 w-4" /> View membership plans</Button>}
        />
      </div>
    );
  }

  const downloadReport = async () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFillColor(0, 51, 102);
    doc.rect(0, 0, 595, 80, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("AQUIFERT Market Report", 40, 48);
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.text(`${commodity} · ${region} · generated ${format(new Date(), "dd MMM yyyy HH:mm")}`, 40, 110);
    doc.setFontSize(10);
    let y = 145;
    doc.setFont("helvetica", "bold");
    doc.text("Date", 40, y);
    doc.text("Price/t", 160, y);
    doc.text("Source", 260, y);
    doc.setFont("helvetica", "normal");
    (series.data ?? []).slice(0, 26).forEach((p) => {
      y += 18;
      doc.text(fmtDate(p.date), 40, y);
      doc.text(usd(p.pricePerTon), 160, y);
      doc.text(p.source ?? "N/A", 260, y);
    });
    doc.save(`AQUIFERT-${commodity}-${region}-report.pdf`);
    toast.success("PDF report downloaded");
  };

  return (
    <div>
      <PageHeader
        title="Market Insights"
        description={tier1 ? "Sprout tier: 30-day trends + weekly digest. Upgrade for real-time AI recommendations." : "Real-time pricing, regional comparisons and AI trade recommendations."}
        actions={<Button variant="outline" onClick={downloadReport}><Download className="mr-1.5 h-4 w-4" /> PDF report</Button>}
      />

      <Tabs value={commodity} onValueChange={(v) => setCommodity(v as typeof commodity)} className="mb-5">
        <TabsList className="aqf-scroll max-w-full flex-nowrap justify-start overflow-x-auto">
          {PRODUCTS.map((p) => <TabsTrigger key={p} value={p}>{p}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <LineChartIcon className="h-4 w-4 text-navy-500" />
                {commodity} price trend {tier1 ? "(30 days)" : "(26 weeks)"}
                {volatility && <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${volatility.cls}`}>{volatility.label}</span>}
              </CardTitle>
              <div className="flex items-center gap-3">
                {!tier1 && (
                  <div className="flex items-center gap-2">
                    <Switch id="compare" checked={compare} onCheckedChange={setCompare} />
                    <Label htmlFor="compare" className="text-xs">Compare</Label>
                    {compare && (
                      <Select value={compareWith} onValueChange={(v) => setCompareWith(v as typeof compareWith)}>
                        <SelectTrigger className="h-8 w-24" aria-label="Compare with"><SelectValue /></SelectTrigger>
                        <SelectContent>{PRODUCTS.filter((p) => p !== commodity).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  </div>
                )}
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger className="h-8 w-28" aria-label="Region"><SelectValue /></SelectTrigger>
                  <SelectContent>{REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <PriceChart data={chartData} series={compare ? [commodity, compareWith] : [commodity]} area height={300} />
            </CardContent>
          </Card>

          {/* Regional heatmap */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Regional price comparison (latest, USD/t)</CardTitle></CardHeader>
            <CardContent className="aqf-scroll overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4">Commodity</th>
                    {REGIONS.map((r) => <th key={r} className="py-2 pr-4 text-right">{r}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {heatmap.map((row) => {
                    const prices = row.cells.map((c) => c.price).filter(Boolean);
                    const min = Math.min(...prices), max = Math.max(...prices);
                    return (
                      <tr key={row.commodity} className="border-t border-border/60">
                        <td className="py-2.5 pr-4 font-semibold">{row.commodity}</td>
                        {row.cells.map((c) => {
                          const ratio = max === min ? 0.5 : (c.price - min) / (max - min || 1);
                          const bg = c.price === min ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                            : c.price === max ? "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300"
                            : "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300";
                          void ratio;
                          return (
                            <td key={c.region} className="py-1.5 pr-4 text-right">
                              <span className={`inline-block rounded-lg px-2.5 py-1 font-data text-xs font-semibold ${bg}`}>
                                ${c.price ? c.price.toFixed(0) : "N/A"}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-2 text-[10px] text-muted-foreground">Green = cheapest region · red = most expensive</p>
            </CardContent>
          </Card>

          <DataTable columns={columns} rows={(series.data ?? []).slice(0, 60)} pageSize={10} searchable={false} />
        </div>

        {/* AI panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-teal-500" /> AI trade recommendation</CardTitle>
            </CardHeader>
            <CardContent>
              {tier1 ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-center">
                  <Lock className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Real-time AI recommendations unlock on Harvest and Scale.</p>
                  <Button size="sm" className="mt-3 bg-teal-500 hover:bg-teal-600" onClick={() => navigate("/buyer/membership")}>Upgrade</Button>
                </div>
              ) : insight.isPending ? (
                <p className="text-sm text-muted-foreground">Generating…</p>
              ) : insight.data ? (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed">{insight.data.narrative}</p>
                  <div className="rounded-lg bg-teal-50 p-3 text-sm dark:bg-teal-500/10">
                    <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">Recommended</p>
                    <p className="mt-1 font-medium">{insight.data.recommendation}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Confidence {insight.data.confidence}% · based on {weeks} weeks of curated index data</p>
                </div>
              ) : (
                <Button className="w-full bg-teal-500 hover:bg-teal-600 aqf-btn-press" onClick={() => insight.mutate({ commodity, region })}>
                  <TrendingUp className="mr-1.5 h-4 w-4" /> Generate recommendation
                </Button>
              )}
              {insight.data && (
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => insight.mutate({ commodity, region })}>
                  Refresh recommendation
                </Button>
              )}
            </CardContent>
          </Card>

          {tier1 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Weekly digest preview</CardTitle></CardHeader>
              <CardContent className="rounded-b-xl bg-muted/50 p-4 text-sm leading-relaxed text-muted-foreground">
                <p className="font-medium text-foreground">This week in fertiliser, </p>
                <p className="mt-1">Urea firmed in the UK while DAP softened in Asia. Your full digest lands every Monday at 07:00 by email.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
