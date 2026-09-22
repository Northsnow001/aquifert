import { useEffect, useRef, useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { InfoTip } from "@/components/aq1/InfoTip";
import { useAq1Tips } from "@/components/aq1/tips";
import { NITROGEN_PRODUCTS, AQ1_REGIONS } from "@contracts/aq1";
import { toast } from "sonner";

function quotaMessage(raw: string): string | null {
  try {
    const p = JSON.parse(raw);
    if (p.reason === "QUOTA") return `You've used all ${p.limit} nitrogen reports for this calendar month. Your allowance resets on ${p.resetsOn}. Upgrade to AQ0 for a higher allowance.`;
  } catch { /* not a quota error */ }
  return null;
}

/** Nitrogen Report Generator — Aquibot-drafted, corpus-validated, quota-metered. */
export default function Aq1Nitrogen() {
  const tips = useAq1Tips();
  const usage = trpc.aq1.usage.useQuery();
  const myReports = trpc.aq1.myReports.useQuery();
  const [products, setProducts] = useState<string[]>([...NITROGEN_PRODUCTS]);
  const [regions, setRegions] = useState<string[]>(["Global"]);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [notes, setNotes] = useState("");
  const [report, setReport] = useState<{ title: string; reportMd: string } | null>(null);
  const [viewSaved, setViewSaved] = useState<number | null>(null);
  const savedReport = trpc.aq1.myReport.useQuery({ id: viewSaved! }, { enabled: viewSaved != null });
  const resultRef = useRef<HTMLDivElement>(null);

  const gen = trpc.aq1.nitrogenGenerate.useMutation({
    onSuccess: (r) => {
      (window as unknown as { __aqBusy?: boolean }).__aqBusy = false;
      usage.refetch(); myReports.refetch();
      if (r.blocked) { toast.error(r.message); return; }
      setReport({ title: r.title!, reportMd: r.reportMd! });
      toast.success("Report ready — saved to My Reports");
    },
    onError: (e) => {
      (window as unknown as { __aqBusy?: boolean }).__aqBusy = false;
      const qm = quotaMessage(e.message);
      if (qm) toast.info(qm); else toast.error(e.message);
    },
  });

  useEffect(() => { if (report && resultRef.current) resultRef.current.focus(); }, [report]);

  const remaining = usage.data ? usage.data.nitrogenReports.limit - usage.data.nitrogenReports.used : null;
  const nearLimit = usage.data && usage.data.nitrogenReports.used / usage.data.nitrogenReports.limit >= 0.8 && remaining! > 0;

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-6">
      <PageHeader
        title={<span className="inline-flex items-center">Nitrogen Report Generator <InfoTip label="Nitrogen Report Generator" text={tips.nitrogen} /></span>}
        description={usage.data ? `${remaining} of ${usage.data.nitrogenReports.limit} reports remaining this month (resets ${usage.data.resetsOn}).` : undefined}
      />
      {nearLimit && <p role="status" className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">You have {remaining} report{remaining === 1 ? "" : "s"} left this month.</p>}

      <Card><CardContent className="space-y-4 p-5">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Products</legend>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {NITROGEN_PRODUCTS.map((p) => (
              <div key={p} className="flex items-center gap-2">
                <Checkbox id={`p-${p}`} checked={products.includes(p)} onCheckedChange={() => toggle(products, setProducts, p)} />
                <Label htmlFor={`p-${p}`} className="font-normal">{p}</Label>
              </div>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Region focus</legend>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {AQ1_REGIONS.map((r) => (
              <div key={r} className="flex items-center gap-2">
                <Checkbox id={`r-${r}`} checked={regions.includes(r)} onCheckedChange={() => toggle(regions, setRegions, r)} />
                <Label htmlFor={`r-${r}`} className="font-normal">{r}</Label>
              </div>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Period</legend>
          <div className="flex gap-2" role="radiogroup" aria-label="Period">
            {([7, 30, 90] as const).map((d) => (
              <Button key={d} type="button" variant={period === d ? "default" : "outline"} onClick={() => setPeriod(d)} aria-pressed={period === d}>Last {d} days</Button>
            ))}
          </div>
        </fieldset>
        <div>
          <Label htmlFor="notes">Anything specific you want covered? (optional)</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" maxLength={1000} />
        </div>
        <Button
          disabled={gen.isPending || products.length === 0 || remaining === 0}
          onClick={() => {
            (window as unknown as { __aqBusy?: boolean }).__aqBusy = true;
            gen.mutate({ products, regions, periodDays: period, notes });
          }}
        >
          {gen.isPending ? "Generating — validating every figure…" : "Generate report"}
        </Button>
        {gen.isPending && <div aria-live="polite" className="space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/2" /></div>}
      </CardContent></Card>

      {(report || savedReport.data) && (
        <Card>
          <CardContent className="p-5">
            <div ref={resultRef} tabIndex={-1} aria-live="polite">
              <h2 className="text-lg font-semibold">{report?.title ?? savedReport.data?.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">AI-drafted from Aquifert data · desk-reviewed. Market information, not advice.</p>
              <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed">{report?.reportMd ?? savedReport.data?.content}</pre>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => {
                const md = report?.reportMd ?? savedReport.data?.content ?? "";
                const blob = new Blob([md], { type: "text/markdown" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `${(report?.title ?? "nitrogen-report").replace(/[^a-z0-9]+/gi, "-")}.md`;
                a.click();
              }}>Download</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <section aria-label="My Reports">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">My Reports</h2>
        {myReports.data?.length === 0 && <EmptyState title="No saved reports yet" description="Reports and calculations you run are kept here so you can return to them." />}
        <ul className="space-y-2">
          {myReports.data?.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => { setReport(null); setViewSaved(r.id); }}
                className="w-full rounded-lg border border-border p-3 text-left text-sm hover:border-teal-500/50">
                <span className="font-medium">{r.title}</span>
                <span className="ml-2 text-xs text-muted-foreground">{r.kind === "NITROGEN_REPORT" ? "Report" : "Calculation"} · {new Date(r.createdAt).toLocaleDateString("en-GB")}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
