"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, CircleAlert, FlaskConical, Lightbulb, Loader2, RotateCcw, Ship, Sprout } from "lucide-react";
import { toast } from "sonner";
import { generateReport } from "@/app/hub/nitrogen-report/actions";
import { CountrySelect } from "@/components/app/country-select";
import { areaClass, btnPrimary, btnSecondary, fieldClass, hintClass, labelClass, noticeError } from "@/components/app/form";
import { seasonalN, shipmentPlan, tonnes } from "@/components/hub/nitrogen/hints";
import { WORLD_COUNTRIES, type CountryOption } from "@/lib/countries";
import {
  ADDITIVES,
  CROPS,
  deliveryText,
  EMPTY_ANSWERS,
  METHODS,
  monthLabel,
  PACKAGING,
  PRIORITIES,
  rateBand,
  SOILS,
  SOURCES,
  stepProblem,
  upcomingMonths,
  type NitrogenAnswers,
} from "@/lib/nitrogen/engine";
import { sameCountry, type PortRecord } from "@/lib/ports";

const STEPS = [
  {
    title: "Destination",
    short: "Destination",
    desc: "Where and how the product should arrive.",
    why: "Destination, timing and packaging decide the freight and which origins the desk can realistically quote.",
  },
  {
    title: "Products & volumes",
    short: "Products",
    desc: "What you buy, and how much of it.",
    why: "Your sources and annual tonnage set how many shipments make sense and which products the desk prices side by side.",
  },
  {
    title: "Agronomic profile",
    short: "Agronomy",
    desc: "Crop, soils and how you apply.",
    why: "Crop and soil set the indicative nitrogen rate. Your area turns that rate into the tonnage you need for the season.",
  },
  {
    title: "Strategic goals",
    short: "Goals",
    desc: "What matters most this season.",
    why: "Your priority tips the programme towards the cheapest nitrogen or the most efficient, and additives change the loss risk.",
  },
];

const ORIGIN_REGIONS = ["Middle East", "North Africa", "West Africa", "Black Sea", "Baltic", "Southeast Asia", "North America", "South America"];

const ORIGIN_OPTIONS: CountryOption[] = [
  ...ORIGIN_REGIONS.map((region) => ({ value: region, label: region, group: "Regions" })),
  ...WORLD_COUNTRIES.map((country) => ({ ...country, group: "Countries" })),
];

const NOTES_MAX = 1000;
const LAST = STEPS.length - 1;

const pill = (active: boolean) =>
  `inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border px-3.5 py-2 text-[14.5px] font-semibold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue/40 ${
    active ? "border-navy-700 bg-navy-700 text-white shadow-[0_4px_12px_-6px_rgb(16_38_59/0.6)]" : "border-border bg-white text-mid hover:border-blue/35 hover:text-ink"
  }`;

function PillRadio({ name, legend, required, options, value, onChange }: { name: string; legend: string; required?: boolean; options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <fieldset>
      <legend className={labelClass}>
        {legend}
        {required ? <span className="text-danger"> *</span> : null}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((item) => (
          <label key={item} className={pill(value === item)}>
            <input type="radio" name={name} value={item} checked={value === item} onChange={() => onChange(item)} className="sr-only" />
            {item}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ChipPick({
  legend,
  hint,
  required,
  options,
  values,
  onChange,
  label = (item) => item,
}: {
  legend: string;
  hint?: string;
  required?: boolean;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
  label?: (item: string) => string;
}) {
  return (
    <fieldset>
      <legend className={labelClass}>
        {legend}
        {required ? <span className="text-danger"> *</span> : null}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((item) => {
          const active = values.includes(item);
          return (
            <label key={item} className={pill(active)}>
              <input
                type="checkbox"
                checked={active}
                onChange={() => onChange(active ? values.filter((value) => value !== item) : [...values, item])}
                className="sr-only"
              />
              {active ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : null}
              {label(item)}
            </label>
          );
        })}
      </div>
      {hint ? <p className={hintClass}>{hint}</p> : null}
    </fieldset>
  );
}

function Field({ id, label, required, hint, children }: { id: string; label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {children}
      {hint ? <p className={hintClass}>{hint}</p> : null}
    </div>
  );
}

function Select({ id, value, options, onChange }: { id: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={`${fieldClass} ${value ? "" : "text-dim"}`}>
      <option value="">Choose…</option>
      {options.map((item) => (
        <option key={item} value={item} className="text-ink">
          {item}
        </option>
      ))}
    </select>
  );
}

function Callout({ icon: Icon, title, children }: { icon: typeof Ship; title: string; children: React.ReactNode }) {
  return (
    <div className="aq-rise flex items-start gap-3 rounded-2xl border border-teal-200 bg-teal-50/70 p-4">
      <span className="aq-chip flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-white">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 text-[14.5px] leading-relaxed text-mid">
        <p className="font-semibold text-ink">{title}</p>
        {children}
      </div>
    </div>
  );
}

/** Visual band on a 0 to 320 kg N/ha scale. */
function RateBar({ band }: { band: [number, number] }) {
  const max = 320;
  return (
    <div className="mt-2" aria-hidden>
      <div className="relative h-2 rounded-full bg-white ring-1 ring-teal-200">
        <div className="absolute inset-y-0 rounded-full bg-teal-500 transition-all duration-500" style={{ left: `${(band[0] / max) * 100}%`, width: `${((band[1] - band[0]) / max) * 100}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[11.5px] text-dim">
        <span>0</span>
        <span>160</span>
        <span>320 kg N/ha</span>
      </div>
    </div>
  );
}

function Preview({ answers }: { answers: NitrogenAnswers }) {
  const shipments = shipmentPlan(answers);
  const band = rateBand(answers.cropType, answers.soilTexture);
  const total = seasonalN(answers);
  const priority = PRIORITIES.find((item) => item.value === answers.priority);
  const rows: [string, string | null][] = [
    ["Destination", [answers.destinationCountry, answers.destinationPort].filter(Boolean).join(", ") || null],
    ["Months", deliveryText(answers) || null],
    ["Packing", answers.packaging || null],
    ["Sources", answers.nitrogenSources.join(", ") || null],
    ["Shipments", shipments ? `${shipments.count} of about ${tonnes(shipments.per)} t` : null],
    ["Crop", [answers.cropType, answers.soilTexture && `${answers.soilTexture.toLowerCase()} soil`].filter(Boolean).join(" on ") || null],
    ["N rate", band ? `${band[0]}–${band[1]} kg N/ha` : null],
    ["Seasonal N", total ? `${tonnes(total[0])}–${tonnes(total[1])} t N` : null],
    ["Priority", priority?.label ?? null],
  ];
  const filled = rows.filter(([, value]) => value).length;
  return (
    <aside className="aq-card p-5 lg:sticky lg:top-24" aria-label="Live preview of your report">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-teal-700">Live preview</p>
        <span className="text-[12.5px] font-medium text-dim">
          {filled} of {rows.length} ready
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-s3" aria-hidden>
        <div className="h-full rounded-full bg-teal-500 transition-[width] duration-500" style={{ width: `${Math.max(4, (filled / rows.length) * 100)}%` }} />
      </div>
      <dl className="mt-4 divide-y divide-border text-[14.5px]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 py-2">
            <dt className="shrink-0 text-dim">{label}</dt>
            <dd className={`min-w-0 text-right ${value ? "font-medium text-ink" : "text-dim/70"}`}>{value ?? "Not set yet"}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[12.5px] leading-relaxed text-dim">This is what the report works from. Change any answer and the preview updates straight away.</p>
    </aside>
  );
}

export function NitrogenWizard({ ports, onClose, onReset, blocked }: { ports: PortRecord[]; onClose: () => void; onReset: () => void; blocked: string | null }) {
  const router = useRouter();
  const top = useRef<HTMLDivElement>(null);
  const [answers, setAnswers] = useState<NitrogenAnswers>(EMPTY_ANSWERS);
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof NitrogenAnswers>(key: K, value: NitrogenAnswers[K]) => setAnswers((current) => ({ ...current, [key]: value }));
  const problem = stepProblem(step, answers);
  const band = rateBand(answers.cropType, answers.soilTexture);
  const total = seasonalN(answers);
  const shipments = shipmentPlan(answers);
  const months = useMemo(() => upcomingMonths(), []);
  const countryPorts = useMemo(
    () => (answers.destinationCountry ? ports.filter((port) => sameCountry(port.country, answers.destinationCountry)).sort((a, b) => a.name.localeCompare(b.name)) : []),
    [answers.destinationCountry, ports],
  );

  function goTo(target: number) {
    if (target > step) {
      const stuck = STEPS.findIndex((_, index) => index < target && stepProblem(index, answers));
      if (stuck !== -1) {
        setStep(stuck);
        setTried(true);
        return;
      }
    }
    setStep(target);
    setFurthest((current) => Math.max(current, target));
    setTried(false);
    setError(null);
    top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function submit() {
    const stuck = STEPS.findIndex((_, index) => stepProblem(index, answers));
    if (stuck !== -1) {
      setStep(stuck);
      setTried(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await generateReport(answers);
      if (!result.ok) {
        setError(result.message);
        toast.error(result.message);
        return;
      }
      toast.success("Your nitrogen report is ready.");
      router.push(`/hub/nitrogen-report/${result.id}`);
    });
  }

  return (
    <div ref={top} className="grid scroll-mt-24 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <form
        className="aq-card aq-rise min-w-0 p-5 md:p-6"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (step < LAST) goTo(step + 1);
          else submit();
        }}
      >
        <ol className="grid grid-cols-4 gap-1.5 sm:gap-2" aria-label="Assessment steps">
          {STEPS.map((item, index) => {
            const current = index === step;
            const done = !current && index <= furthest && !stepProblem(index, answers);
            return (
              <li key={item.title}>
                <button
                  type="button"
                  onClick={() => goTo(index)}
                  aria-current={current ? "step" : undefined}
                  aria-label={`Step ${index + 1}: ${item.title}${done ? ", complete" : ""}`}
                  className="group flex w-full flex-col items-start gap-1.5 text-left"
                >
                  <span className={`h-1.5 w-full rounded-full transition-colors ${current ? "bg-navy-700" : done ? "bg-teal-500" : "bg-s3 group-hover:bg-border"}`} />
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11.5px] font-bold ${
                        current ? "bg-navy-700 text-white" : done ? "bg-teal-500 text-white" : "bg-s3 text-dim"
                      }`}
                    >
                      {done ? <Check className="h-3 w-3" strokeWidth={3} /> : index + 1}
                    </span>
                    <span className={`hidden text-[13px] font-semibold sm:inline ${current ? "text-ink" : "text-dim group-hover:text-mid"}`}>{item.short}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mt-6">
          <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-teal-700">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2 className="mt-0.5 text-[19px] font-semibold tracking-[-0.01em] text-ink">{STEPS[step].title}</h2>
          <p className="text-[15px] text-mid">{STEPS[step].desc}</p>
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-s2 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-mid">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#d9951f]" aria-hidden />
            <span>
              <strong className="font-semibold text-ink">Why we ask. </strong>
              {STEPS[step].why}
            </span>
          </p>
        </div>

        <div className="mt-5 grid gap-5">
          {step === 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="n-country" label="Destination country" required>
                  <CountrySelect
                    id="n-country"
                    value={answers.destinationCountry}
                    onChange={(value) => setAnswers((current) => ({ ...current, destinationCountry: value, destinationPort: value === current.destinationCountry ? current.destinationPort : "" }))}
                    options={WORLD_COUNTRIES}
                    placeholder="Select a country"
                  />
                </Field>
                <Field
                  id="n-port"
                  label="Destination port"
                  hint={
                    !answers.destinationCountry
                      ? "Choose the country first to see its ports."
                      : countryPorts.length
                        ? "Keep “Not sure yet” if you have not decided."
                        : `No ${answers.destinationCountry} ports are listed yet. The desk will suggest the best one.`
                  }
                >
                  <select
                    id="n-port"
                    value={answers.destinationPort}
                    disabled={!countryPorts.length}
                    onChange={(event) => set("destinationPort", event.target.value)}
                    className={`${fieldClass} ${answers.destinationPort ? "" : "text-dim"}`}
                  >
                    <option value="">Not sure yet</option>
                    {countryPorts.map((port) => (
                      <option key={port.code} value={port.name} className="text-ink">
                        {port.name} ({port.code})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="n-origin" label="Preferred origin" hint="The desk quotes it alongside at least one alternative.">
                  <CountrySelect
                    id="n-origin"
                    value={answers.preferredOrigin}
                    onChange={(value) => set("preferredOrigin", value)}
                    options={ORIGIN_OPTIONS}
                    clearLabel="Open to any origin"
                    placeholder="Open to any origin"
                    searchPlaceholder="Search countries or regions…"
                  />
                </Field>
              </div>
              <ChipPick
                legend="Preferred month"
                required
                hint="Pick every month you could take delivery. More months give the desk more room on price."
                options={months}
                values={answers.preferredMonths}
                onChange={(values) => set("preferredMonths", months.filter((month) => values.includes(month)))}
                label={(month) => monthLabel(month)}
              />
              <PillRadio name="n-packaging" legend="Shipment packing" required options={PACKAGING} value={answers.packaging} onChange={(value) => set("packaging", value)} />
            </>
          ) : null}

          {step === 1 ? (
            <>
              <ChipPick legend="Nitrogen sources" required hint="Pick every source you would consider. The desk compares them on cost per unit of nitrogen." options={SOURCES} values={answers.nitrogenSources} onChange={(values) => set("nitrogenSources", values)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="n-volume" label="Annual volume (tonnes)" required>
                  <input id="n-volume" inputMode="decimal" value={answers.annualVolume} onChange={(event) => set("annualVolume", event.target.value)} placeholder="e.g. 1,200" maxLength={20} className={fieldClass} />
                </Field>
                <Field id="n-capacity" label="Warehouse capacity (tonnes)" hint="How much you can store at once.">
                  <input id="n-capacity" inputMode="decimal" value={answers.warehouseCapacity} onChange={(event) => set("warehouseCapacity", event.target.value)} placeholder="e.g. 400" maxLength={20} className={fieldClass} />
                </Field>
              </div>
              {shipments ? (
                <Callout icon={Ship} title={`About ${shipments.count} shipment${shipments.count > 1 ? "s" : ""} of ${tonnes(shipments.per)} t`}>
                  {shipments.assumed
                    ? "This assumes 50 t of storage. Add your warehouse capacity for a sharper split."
                    : `Splitting ${tonnes(shipments.annual)} t across your storage protects you from a single delayed vessel and spreads the cash out.`}
                </Callout>
              ) : null}
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="n-crop" label="Crop" required>
                  <Select id="n-crop" value={answers.cropType} options={CROPS} onChange={(value) => set("cropType", value)} />
                </Field>
                <Field id="n-soil" label="Soil texture" required>
                  <Select id="n-soil" value={answers.soilTexture} options={SOILS} onChange={(value) => set("soilTexture", value)} />
                </Field>
                <Field id="n-area" label="Area (hectares)" required>
                  <input id="n-area" inputMode="decimal" value={answers.areaHectares} onChange={(event) => set("areaHectares", event.target.value)} placeholder="e.g. 650" maxLength={20} className={fieldClass} />
                </Field>
                <Field id="n-method" label="Application method" required>
                  <Select id="n-method" value={answers.applicationMethod} options={METHODS} onChange={(value) => set("applicationMethod", value)} />
                </Field>
              </div>
              {band ? (
                <Callout icon={Sprout} title={`Indicative rate: ${band[0]}–${band[1]} kg N/ha`}>
                  {answers.soilTexture ? `For ${answers.cropType.toLowerCase()} on ${answers.soilTexture.toLowerCase()} soil.` : `For ${answers.cropType.toLowerCase()}. Choose your soil and the band adjusts.`}
                  <RateBar band={band} />
                  <p className="mt-2" aria-live="polite">
                    {total ? (
                      <>
                        Across your area that is <strong className="font-semibold text-ink">{tonnes(total[0])}–{tonnes(total[1])} t of nitrogen</strong> for the season.
                      </>
                    ) : (
                      "Add your area to see the total nitrogen you need this season."
                    )}
                  </p>
                </Callout>
              ) : (
                <p className={hintClass}>Choose a crop and the indicative nitrogen rate appears here.</p>
              )}
            </>
          ) : null}

          {step === 3 ? (
            <>
              <fieldset>
                <legend className={labelClass}>
                  What matters most this season?<span className="text-danger"> *</span>
                </legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {PRIORITIES.map((item) => {
                    const active = answers.priority === item.value;
                    return (
                      <label
                        key={item.value}
                        className={`cursor-pointer rounded-2xl border p-3.5 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue/40 ${active ? "border-navy-700 bg-navy-50 shadow-[0_0_0_1px_var(--color-navy-700)]" : "border-border bg-white hover:border-blue/35"}`}
                      >
                        <input type="radio" name="n-priority" value={item.value} checked={active} onChange={() => set("priority", item.value)} className="sr-only" />
                        <span className="flex items-center justify-between gap-2 text-[15.5px] font-semibold text-ink">
                          {item.label}
                          {active ? <Check className="h-4 w-4 text-navy-700" strokeWidth={3} aria-hidden /> : null}
                        </span>
                        <span className="mt-1 block text-[13px] leading-snug text-mid">{item.hint}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <ChipPick
                legend="Additives or inhibitors of interest"
                hint="Choosing None clears the others."
                options={ADDITIVES}
                values={answers.additives}
                onChange={(values) => {
                  const added = values.find((item) => !answers.additives.includes(item));
                  set("additives", added === "None" ? ["None"] : values.filter((item) => item !== "None"));
                }}
              />
              <div>
                <label htmlFor="n-notes" className={labelClass}>
                  Site notes
                </label>
                <textarea
                  id="n-notes"
                  rows={4}
                  maxLength={NOTES_MAX}
                  value={answers.siteNotes}
                  onChange={(event) => set("siteNotes", event.target.value)}
                  placeholder="Access, spreading windows, contractor constraints, anything the desk should know."
                  aria-describedby="n-notes-count"
                  className={areaClass}
                />
                <p id="n-notes-count" className={`${hintClass} flex justify-between gap-3`}>
                  <span>Optional. Recorded on the report exactly as written.</span>
                  <span className={`tabular-nums ${answers.siteNotes.length > NOTES_MAX - 100 ? "font-semibold text-[#9a5b00]" : ""}`}>
                    {answers.siteNotes.length} / {NOTES_MAX}
                  </span>
                </p>
              </div>
            </>
          ) : null}
        </div>

        {tried && problem ? (
          <p role="alert" className={`${noticeError} mt-5`}>
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {problem}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className={`${noticeError} mt-5`}>
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </p>
        ) : null}
        {step === LAST && blocked ? (
          <p role="status" className={`${noticeError} mt-5`}>
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {blocked}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <button type="button" onClick={() => (step === 0 ? onClose() : goTo(step - 1))} className={`${btnSecondary} flex-1 sm:flex-none`}>
              <ArrowLeft className="h-4 w-4" /> {step === 0 ? "All reports" : "Back"}
            </button>
            <button type="button" onClick={onReset} className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-[14.5px] font-semibold text-dim transition hover:text-ink" title="Clear every answer and start again">
              <RotateCcw className="h-4 w-4" /> Start over
            </button>
          </div>
          {step < LAST ? (
            <button type="submit" className={btnPrimary}>
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="submit" disabled={pending || Boolean(blocked)} className={btnPrimary}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
              {pending ? "Preparing your report…" : "Generate report"}
            </button>
          )}
        </div>
      </form>

      <Preview answers={answers} />
    </div>
  );
}
