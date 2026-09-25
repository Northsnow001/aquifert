import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { parseMarkdown, type MdBlock } from "@/lib/markdown-blocks";
import { downloadNitrogenPdf } from "@/lib/nitrogen-pdf";
import { fmtDateTime } from "@/lib/format";
import { ArrowLeft, ArrowRight, Download, FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";

/* ---------------------------------------------------------- options */
const PACKAGING = ["Bulk", "Big bags (500–1,000 kg)", "50 kg bags", "25 kg bags"];
const SOURCES = ["Urea", "Ammonium Nitrate", "CAN", "UAN solution", "Ammonium Sulphate", "Inhibited urea"];
const CROPS = ["Winter wheat", "Winter barley", "Oilseed rape", "Maize", "Sugar beet", "Potatoes", "Grassland (grazed)", "Grassland (silage)", "Other"];
const SOILS = ["Sandy", "Sandy loam", "Loam", "Clay loam", "Clay", "Peaty"];
const METHODS = ["Broadcast (granular)", "Liquid injection", "Fertigation", "Foliar feed", "Precision placement"];
const WINDOWS = ["Next 2 weeks", "2–6 weeks", "6–12 weeks", "Next quarter", "Flexible / spot"];
const ADDITIVES = ["Urease inhibitor", "Nitrification inhibitor", "Sulphur blend", "None"];

type Answers = {
  destinationCountry: string; destinationPort: string; preferredOrigin: string;
  deliveryWindow: string; packaging: string;
  nitrogenSources: string[]; annualVolume: string; warehouseCapacity: string;
  cropType: string; areaHectares: string; soilTexture: string; applicationMethod: string;
  priority: "COST" | "BALANCED" | "EFFICIENCY"; additives: string[]; siteNotes: string;
};

const EMPTY: Answers = {
  destinationCountry: "", destinationPort: "", preferredOrigin: "", deliveryWindow: "", packaging: "",
  nitrogenSources: [], annualVolume: "", warehouseCapacity: "",
  cropType: "", areaHectares: "", soilTexture: "", applicationMethod: "",
  priority: "BALANCED", additives: [], siteNotes: "",
};

const STEPS = [
  { key: "logistics", title: "Logistics & Delivery", desc: "Where and how product should arrive." },
  { key: "products", title: "Products & Volumes", desc: "What you buy, and how much." },
  { key: "agronomic", title: "Agronomic Profile", desc: "Crop, soils and how you apply." },
  { key: "goals", title: "Strategic Goals", desc: "What matters most this season." },
] as const;

/* ------------------------------------------------------ inline bold */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**")
          ? <strong key={i} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>)}
    </>
  );
}

function ReportBody({ md }: { md: string }) {
  return (
    <div className="space-y-4">
      {parseMarkdown(md).map((b: MdBlock, i: number) => {
        if (b.type === "h1")
          return <h2 key={i} className="text-xl font-bold tracking-tight text-foreground"><Inline text={b.text} /></h2>;
        if (b.type === "h2")
          return (
            <div key={i}>
              <h3 className="text-sm font-bold uppercase tracking-wide text-navy-700 dark:text-navy-200"><Inline text={b.text} /></h3>
              <div className="mt-1 h-px bg-teal-600/40" />
            </div>
          );
        if (b.type === "hr") return <hr key={i} className="border-border" />;
        if (b.type === "table")
          return (
            <div key={i} className="aqf-scroll overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-navy-700 text-left text-white">
                    {b.header.map((h, j) => <th key={j} className="px-3 py-2 text-xs font-semibold">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((r, j) => (
                    <tr key={j} className="border-t border-border/60">
                      {r.map((c, k) => (
                        <td key={k} className="px-3 py-2 text-[13px] text-muted-foreground first:font-medium first:text-foreground">
                          <Inline text={c} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        const italic = b.text.startsWith("*") && !b.text.startsWith("**") && b.text.endsWith("*");
        return (
          <p key={i} className={italic ? "text-xs italic leading-relaxed text-muted-foreground" : "text-sm leading-relaxed text-muted-foreground"}>
            <Inline text={italic ? b.text.slice(1, -1) : b.text} />
          </p>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------- fields */
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ChipPick({ options, values, onChange }: { options: string[]; values: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = values.includes(o);
        return (
          <button
            key={o} type="button" aria-pressed={active}
            onClick={() => onChange(active ? values.filter((x) => x !== o) : [...values, o])}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              active ? "border-navy-700 bg-navy-700 text-white dark:border-navy-300 dark:bg-navy-300 dark:text-navy-900"
                     : "border-border bg-background text-muted-foreground hover:border-navy-400 hover:text-foreground"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------ page */
export default function NitrogenReport() {
  const [view, setView] = useState<"list" | "form" | "report">("list");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [report, setReport] = useState<{ id: number; refNo: string; reportMd: string; createdAt?: Date | string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const list = trpc.nitrogen.list.useQuery(undefined, { retry: 0, staleTime: 30_000 });
  const generate = trpc.nitrogen.generate.useMutation({
    onSuccess: (r) => {
      setReport({ ...r, createdAt: new Date() });
      setView("report");
      list.refetch();
      toast.success(`Assessment ${r.refNo} ready — you can download the PDF.`);
    },
    onError: (e) => setErr(e.message),
  });
  const openReport = trpc.nitrogen.get.useMutation({
    onSuccess: (r) => setReport(r),
    onError: (e) => toast.error(e.message),
  });

  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => setAnswers((a) => ({ ...a, [k]: v }));

  const stepValid = (): string | null => {
    if (step === 0) {
      if (!answers.destinationCountry) return "Destination country is required.";
      if (!answers.deliveryWindow) return "Choose a delivery window.";
      if (!answers.packaging) return "Choose a packaging format.";
    }
    if (step === 1) {
      if (!answers.nitrogenSources.length) return "Select at least one nitrogen source.";
      if (!answers.annualVolume) return "Annual volume is required.";
    }
    if (step === 2) {
      if (!answers.cropType) return "Crop type is required.";
      if (!answers.areaHectares) return "Area (hectares) is required.";
      if (!answers.soilTexture) return "Soil texture is required.";
      if (!answers.applicationMethod) return "Application method is required.";
    }
    return null;
  };

  const next = () => {
    const v = stepValid();
    if (v) { setErr(v); return; }
    setErr(null);
    setStep((s) => Math.min(3, s + 1));
  };

  const submit = () => {
    generate.mutate(answers);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <PageHeader
        title="Nitrogen Assessment"
        description="Answer four short sections; the desk engine synthesises a tailored sourcing and agronomy report you can download as a PDF."
      />

      {/* ------------------------------------------- history (list) */}
      {view === "list" && (
        <div className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button className="gap-1.5 bg-teal-500 hover:bg-teal-600" onClick={() => { setAnswers(EMPTY); setStep(0); setErr(null); setView("form"); }}>
              <FlaskConical className="h-4 w-4" aria-hidden="true" /> New assessment
            </Button>
          </div>
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-bold text-foreground">Previous reports</h2>
              {list.isLoading && <div className="mt-3 space-y-2"><div className="h-8 rounded bg-muted" /><div className="h-8 rounded bg-muted" /></div>}
              {(list.isError || (list.isSuccess && list.data.length === 0)) && (
                <div className="mt-3 rounded-lg border border-dashed border-border p-6 text-center">
                  <p className="text-sm text-muted-foreground">No nitrogen assessments yet. Your completed reports will appear here.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setView("form")}>Start your first assessment</Button>
                </div>
              )}
              {list.isSuccess && list.data.length > 0 && (
                <ul className="mt-3 divide-y divide-border">
                  {list.data.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div>
                        <p className="font-mono text-sm font-semibold text-foreground">{r.refNo}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.cropType} · {r.destinationCountry} · {fmtDateTime(r.createdAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline" size="sm"
                          disabled={openReport.isPending}
                          onClick={() => openReport.mutate({ id: r.id }, { onSuccess: () => setView("report") })}
                        >
                          View
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* --------------------------------------------- questionnaire */}
      {view === "form" && (
        <Card className="mt-6">
          <CardContent className="p-6">
            {/* stepper */}
            <ol className="mb-6 flex items-center gap-2" aria-label="Progress">
              {STEPS.map((s, i) => (
                <li key={s.key} className="flex flex-1 items-center gap-2">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    i < step ? "bg-teal-600 text-white" : i === step ? "bg-navy-700 text-white" : "bg-muted text-muted-foreground"
                  }`} aria-current={i === step ? "step" : undefined}>{i + 1}</span>
                  <span className={`hidden text-[11px] font-semibold sm:block ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{s.title}</span>
                  {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" aria-hidden="true" />}
                </li>
              ))}
            </ol>

            <h2 className="text-base font-bold text-foreground">{STEPS[step].title}</h2>
            <p className="text-xs text-muted-foreground">{STEPS[step].desc}</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {step === 0 && (<>
                <Field label="Destination country *">
                  <Input value={answers.destinationCountry} onChange={(e) => set("destinationCountry", e.target.value)} placeholder="e.g. United Kingdom" />
                </Field>
                <Field label="Destination port">
                  <Input value={answers.destinationPort} onChange={(e) => set("destinationPort", e.target.value)} placeholder="e.g. Immingham" />
                </Field>
                <Field label="Preferred origin">
                  <Input value={answers.preferredOrigin} onChange={(e) => set("preferredOrigin", e.target.value)} placeholder="e.g. Middle East, or leave open" />
                </Field>
                <Field label="Delivery window *">
                  <Select value={answers.deliveryWindow} onValueChange={(v) => set("deliveryWindow", v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{WINDOWS.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Packaging *">
                  <Select value={answers.packaging} onValueChange={(v) => set("packaging", v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{PACKAGING.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </>)}

              {step === 1 && (<>
                <div className="sm:col-span-2">
                  <Field label="Nitrogen sources *" hint="Select every source you'd consider.">
                    <ChipPick options={SOURCES} values={answers.nitrogenSources} onChange={(v) => set("nitrogenSources", v)} />
                  </Field>
                </div>
                <Field label="Annual volume (MT) *">
                  <Input inputMode="numeric" value={answers.annualVolume} onChange={(e) => set("annualVolume", e.target.value)} placeholder="e.g. 1,200" />
                </Field>
                <Field label="Warehouse capacity (MT)">
                  <Input inputMode="numeric" value={answers.warehouseCapacity} onChange={(e) => set("warehouseCapacity", e.target.value)} placeholder="e.g. 400" />
                </Field>
              </>)}

              {step === 2 && (<>
                <Field label="Crop type *">
                  <Select value={answers.cropType} onValueChange={(v) => set("cropType", v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{CROPS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Area (hectares) *">
                  <Input inputMode="decimal" value={answers.areaHectares} onChange={(e) => set("areaHectares", e.target.value)} placeholder="e.g. 650" />
                </Field>
                <Field label="Soil texture *">
                  <Select value={answers.soilTexture} onValueChange={(v) => set("soilTexture", v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{SOILS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Application method *">
                  <Select value={answers.applicationMethod} onValueChange={(v) => set("applicationMethod", v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </>)}

              {step === 3 && (<>
                <div className="sm:col-span-2">
                  <Field label="What matters most this season? *">
                    <div className="flex flex-wrap gap-2">
                      {([["COST", "Lowest cost"], ["BALANCED", "Balanced"], ["EFFICIENCY", "Maximum efficiency"]] as const).map(([v, l]) => (
                        <button
                          key={v} type="button" aria-pressed={answers.priority === v}
                          onClick={() => set("priority", v)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                            answers.priority === v ? "border-navy-700 bg-navy-700 text-white dark:border-navy-300 dark:bg-navy-300 dark:text-navy-900"
                                                   : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >{l}</button>
                      ))}
                    </div>
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Additives / inhibitors of interest">
                    <ChipPick options={ADDITIVES} values={answers.additives} onChange={(v) => set("additives", v)} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Site notes" hint="Anything the desk should know, access, spreading windows, contractor constraints.">
                    <Textarea rows={3} value={answers.siteNotes} onChange={(e) => set("siteNotes", e.target.value)} />
                  </Field>
                </div>
              </>)}
            </div>

            {err && <p role="alert" className="mt-4 text-xs font-semibold text-red-600">{err}</p>}

            <div className="mt-6 flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => (step === 0 ? setView("list") : setStep((s) => s - 1))} className="gap-1">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {step === 0 ? "Back to reports" : "Back"}
              </Button>
              {step < 3 ? (
                <Button size="sm" onClick={next} className="gap-1 bg-navy-700 hover:bg-navy-800">
                  Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : (
                <Button size="sm" onClick={submit} disabled={generate.isPending} className="gap-1.5 bg-teal-500 hover:bg-teal-600">
                  {generate.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {generate.isPending ? "Generating…" : "Generate report"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* -------------------------------------------------- report */}
      {view === "report" && report && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => setView("list")} className="gap-1">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All reports
            </Button>
            <Button
              size="sm"
              onClick={() => {
                downloadNitrogenPdf(report.refNo, report.reportMd);
                toast.success(`Downloaded Aquifert_Nitrogen_Report_${report.refNo}.pdf`);
              }}
              className="gap-1.5 bg-navy-700 hover:bg-navy-800"
            >
              <Download className="h-4 w-4" aria-hidden="true" /> Download PDF
            </Button>
          </div>
          <Card>
            <CardContent className="p-6 sm:p-8">
              <ReportBody md={report.reportMd} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
