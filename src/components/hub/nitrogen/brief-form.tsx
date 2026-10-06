"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, CalendarDays, Check, CircleAlert, MapPin, RotateCcw, Ship } from "lucide-react";
import { toast } from "sonner";
import { generateReport } from "@/app/hub/nitrogen-report/actions";
import { AquibotAvatar } from "@/components/app/aquibot-avatar";
import { CountrySelect } from "@/components/app/country-select";
import { btnPrimary, btnSecondary, fieldClass, hintClass, labelClass, noticeError } from "@/components/app/form";
import { SalesHero } from "@/components/hub/sales-hero";
import { WORLD_COUNTRIES, type CountryOption } from "@/lib/countries";
import { answeredCount, briefProblem, EMPTY_ANSWERS, monthLabel, PACKING, PRODUCTS, SHIPMENT_TYPES, upcomingMonths, type NitrogenAnswers } from "@/lib/nitrogen/engine";
import { sameCountry, type PortRecord } from "@/lib/ports";

const ORIGIN_REGIONS = ["Middle East", "North Africa", "West Africa", "Black Sea", "Baltic", "Southeast Asia", "North America", "South America"];

const ORIGIN_OPTIONS: CountryOption[] = [
  ...ORIGIN_REGIONS.map((region) => ({ value: region, label: region, group: "Regions" })),
  ...WORLD_COUNTRIES.map((country) => ({ ...country, group: "Countries" })),
];

const QUESTIONS = 6;

const choice = (active: boolean, tone: "teal" | "navy") =>
  `inline-flex cursor-pointer select-none items-center justify-center gap-1.5 rounded-full border px-3.5 py-2 text-[14.5px] font-semibold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue/40 ${
    active
      ? tone === "teal"
        ? "border-teal-600 bg-teal-600 text-white shadow-[0_4px_12px_-6px_rgb(63_115_100/0.7)]"
        : "border-navy-700 bg-navy-700 text-white shadow-[0_4px_12px_-6px_rgb(16_38_59/0.6)]"
      : "border-border bg-white text-mid hover:border-blue/35 hover:text-ink"
  }`;

function Legend({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <legend className={labelClass}>
      {children}
      {required ? <span className="text-danger"> *</span> : null}
    </legend>
  );
}

function MultiPick({ name, options, values, onChange, label = (item) => item, className = "flex flex-wrap gap-2" }: { name: string; options: string[]; values: string[]; onChange: (values: string[]) => void; label?: (item: string) => string; className?: string }) {
  return (
    <div className={className}>
      {options.map((item) => {
        const active = values.includes(item);
        return (
          <label key={item} className={choice(active, "teal")}>
            <input type="checkbox" name={name} value={item} checked={active} onChange={() => onChange(active ? values.filter((value) => value !== item) : [...values, item])} className="sr-only" />
            {active ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : null}
            {label(item)}
          </label>
        );
      })}
    </div>
  );
}

function SinglePick({ name, options, value, onChange }: { name: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((item) => (
        <label key={item} className={`${choice(value === item, "navy")} px-4`}>
          <input type="radio" name={name} value={item} checked={value === item} onChange={() => onChange(item)} className="sr-only" />
          {item}
        </label>
      ))}
    </div>
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

function SectionCard({ icon: Icon, step, title, sub, children }: { icon: typeof Ship; step: string; title: string; sub: string; children: React.ReactNode }) {
  const id = `n-${step.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <section className="aq-card overflow-hidden" aria-labelledby={id}>
      <header className="flex items-center gap-3 border-b border-border bg-s2/70 px-5 py-4 sm:px-6">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-700 text-white">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-teal-700">{step}</p>
          <h2 id={id} className="text-[16.5px] font-bold text-ink">
            {title}
          </h2>
        </div>
      </header>
      <div className="p-5 sm:p-6">
        <p className="mb-4 text-[14px] text-mid">{sub}</p>
        {children}
      </div>
    </section>
  );
}

export function NitrogenBriefForm({ ports, onClose, onReset, blocked }: { ports: PortRecord[]; onClose: () => void; onReset: () => void; blocked: string | null }) {
  const router = useRouter();
  const alertRef = useRef<HTMLParagraphElement>(null);
  const [answers, setAnswers] = useState<NitrogenAnswers>(EMPTY_ANSWERS);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof NitrogenAnswers>(key: K, value: NitrogenAnswers[K]) => setAnswers((current) => ({ ...current, [key]: value }));
  const problem = briefProblem(answers);
  const count = answeredCount(answers);
  const months = useMemo(() => upcomingMonths(), []);
  const countryPorts = useMemo(
    () => (answers.destinationCountry ? ports.filter((port) => sameCountry(port.country, answers.destinationCountry)).sort((a, b) => a.name.localeCompare(b.name)) : []),
    [answers.destinationCountry, ports],
  );

  function submit() {
    if (problem) {
      setTried(true);
      requestAnimationFrame(() => alertRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }));
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
      toast.success("Your nitrogen brief is ready.");
      router.push(`/hub/nitrogen-report/${result.id}`);
    });
  }

  return (
    <form
      className="mx-auto flex w-full max-w-4xl flex-col gap-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <SalesHero
        src="/media/greenhouse-tomatoes.mp4"
        poster="/media/greenhouse-tomatoes.jpg"
        videoLabel="Rows of crops growing inside a modern greenhouse fed by nitrogen fertiliser"
        eyebrow="Aquifert ONE Hub · AQ View Special Edition"
        title={
          <>
            Your sourcing brief, written by the desk AI in the <span className="text-teal-300">AQ View</span> format
          </>
        }
        sub="Six questions. The engine structures your answers against desk reference data and returns a confidential, branded intelligence brief with a market pulse, a position, a shipment plan and recommendations."
        compact
      >
        <div className="flex items-center gap-1.5" role="status" aria-live="polite">
          {Array.from({ length: QUESTIONS }, (_, index) => (
            <span key={index} className={`h-1.5 w-7 rounded-full transition-colors duration-300 sm:w-8 ${index < count ? "bg-teal-300" : "bg-white/25"}`} aria-hidden />
          ))}
          <span className="ml-2 text-[12.5px] font-semibold text-white/85">
            {count} of {QUESTIONS} answered
          </span>
        </div>
      </SalesHero>

      <SectionCard icon={MapPin} step="Section 1" title="Destination & Products" sub="Where the product should land, and what you buy.">
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
          <div className="sm:col-span-2">
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
          <fieldset className="sm:col-span-2">
            <Legend required>Products</Legend>
            <MultiPick name="n-products" options={PRODUCTS} values={answers.products} onChange={(values) => set("products", PRODUCTS.filter((item) => values.includes(item)))} />
            <p className={hintClass}>Select every nitrogen product you would consider.</p>
          </fieldset>
        </div>
      </SectionCard>

      <SectionCard icon={CalendarDays} step="Section 2" title="Programme & Arrival" sub="How much you buy a year, and when it should arrive.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="n-tonnage" label="Annual tonnage (t)" required>
            <input id="n-tonnage" inputMode="decimal" value={answers.annualTonnage} onChange={(event) => set("annualTonnage", event.target.value)} placeholder="e.g. 1,200" maxLength={20} className={fieldClass} />
          </Field>
          <Field id="n-capacity" label="Warehouse capacity (t)" hint="Optional. Used to size parcels.">
            <input id="n-capacity" inputMode="decimal" value={answers.warehouseCapacity} onChange={(event) => set("warehouseCapacity", event.target.value)} placeholder="e.g. 400" maxLength={20} className={fieldClass} />
          </Field>
          <fieldset className="sm:col-span-2">
            <Legend required>Preferred arrival months</Legend>
            <MultiPick
              name="n-months"
              options={months}
              values={answers.arrivalMonths}
              onChange={(values) => set("arrivalMonths", months.filter((month) => values.includes(month)))}
              label={(month) => monthLabel(month)}
              className="grid grid-cols-3 gap-2 sm:grid-cols-4 [&>label]:rounded-xl [&>label]:px-2"
            />
            <p className={hintClass}>Select every month that works for arrival. More months give the desk more room on price.</p>
          </fieldset>
        </div>
      </SectionCard>

      <SectionCard icon={Ship} step="Section 3" title="Shipment & Packing" sub="How the cargo should be carried and presented.">
        <div className="grid gap-5">
          <fieldset>
            <Legend required>Shipment type</Legend>
            <SinglePick name="n-shipment" options={SHIPMENT_TYPES} value={answers.shipmentType} onChange={(value) => set("shipmentType", value)} />
          </fieldset>
          <fieldset>
            <Legend required>Packing</Legend>
            <SinglePick name="n-packing" options={PACKING} value={answers.packing} onChange={(value) => set("packing", value)} />
          </fieldset>
        </div>
      </SectionCard>

      {tried && problem ? (
        <p ref={alertRef} role="alert" className={noticeError}>
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {problem}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className={noticeError}>
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      ) : null}
      {blocked ? (
        <p role="status" className={noticeError}>
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {blocked}
        </p>
      ) : null}

      <div className="aq-card flex flex-col-reverse gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={`${btnSecondary} flex-1 sm:flex-none`}>
            <ArrowLeft className="h-4 w-4" /> All reports
          </button>
          <button type="button" onClick={onReset} className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-[14.5px] font-semibold text-dim transition hover:text-ink" title="Clear every answer and start again">
            <RotateCcw className="h-4 w-4" /> Start over
          </button>
        </div>
        <button type="submit" disabled={pending || Boolean(blocked)} className={btnPrimary}>
          <AquibotAvatar size={24} active={pending} />
          {pending ? "Writing your brief…" : "Generate AI report"}
        </button>
      </div>
    </form>
  );
}
