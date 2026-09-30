"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowRight, Save, X } from "lucide-react";
import { toast } from "sonner";
import { saveFixture } from "@/app/admin/freight-calculator/actions";
import { FlagMark } from "@/components/calculators/flag-mark";
import { btnPrimary, btnSecondary, field, label } from "@/components/admin/ui";
import { geoKey, resolveLeg, type LegGeo, type PortIndex } from "@/lib/freight-desk/benchmark";
import { REGIONS, type Fixture, type FixtureInput } from "@/lib/freight-desk/types";
import { searchPorts, type PortRecord } from "@/lib/ports";

export const MATCH_STYLE: Record<LegGeo["match"], string> = {
  port: "bg-[#eaf7ef] text-[#1f7a45]",
  country: "bg-blue-light text-blue",
  area: "bg-[#eef2ff] text-[#4338ca]",
  region: "bg-s2 text-mid",
  cluster: "bg-[#fff6e5] text-[#9a5b00]",
  unknown: "bg-[#fdecec] text-[#b42318]",
};

export function matchText(geo: LegGeo) {
  if (geo.match === "port") return `Port · ${geo.codes[0]}`;
  if (geo.match === "country") return `Country · ${geo.codes.length} ports`;
  if (geo.match === "area") return `Area · ${geo.label}`;
  if (geo.match === "region") return `Region · ${geo.label}`;
  if (geo.match === "cluster") return `${geo.codes.length} ports named ${geo.label}`;
  return "No match";
}

type Leg = { name: string; code: string; region: string };

function LegInput({ id, title, value, onChange, ports, index }: { id: string; title: string; value: Leg; onChange: (leg: Leg) => void; ports: PortRecord[]; index: PortIndex }) {
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => (open ? searchPorts(value.name, ports, 8) : []), [open, value.name, ports]);
  const regionMatches = useMemo(() => {
    const key = geoKey(value.name);
    return key.length >= 2 ? REGIONS.filter((region) => geoKey(region).includes(key)).slice(0, 3) : [];
  }, [value.name]);
  const geo = resolveLeg(index, value.name, value.code, value.region);

  return (
    <fieldset className="min-w-0 space-y-2.5">
      <legend className="mb-2 text-[13px] font-bold text-ink">{title}</legend>
      <div className="relative">
        <label htmlFor={`${id}-name`} className={label}>
          Port, country, area or region
        </label>
        <input
          id={`${id}-name`}
          value={value.name}
          autoComplete="off"
          placeholder="e.g. Damietta, Brazil, US Gulf, Baltic"
          onChange={(event) => onChange({ ...value, name: event.target.value, code: "" })}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className={`${field} mt-1.5 h-10 w-full`}
        />
        {open && (matches.length || regionMatches.length) ? (
          <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-white py-1 shadow-lg">
            {matches.map((port) => (
              <button
                key={port.code}
                type="button"
                onMouseDown={() => onChange({ name: port.name, code: port.code, region: port.region })}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] hover:bg-s2"
              >
                <FlagMark country={port.country} className="h-3 w-[18px] shrink-0" />
                <span className="font-medium text-ink">{port.name}</span>
                <span className="ml-auto font-mono text-[10.5px] text-dim">
                  {port.code} · {port.region}
                </span>
              </button>
            ))}
            {regionMatches.map((region) => (
              <button key={region} type="button" onMouseDown={() => onChange({ name: region, code: "", region })} className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[12.5px] hover:bg-s2">
                <span className="font-medium text-ink">{region}</span>
                <span className="font-mono text-[10.5px] text-dim">whole region</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2.5">
        <div>
          <label htmlFor={`${id}-code`} className={label}>
            UN/LOCODE
          </label>
          <input id={`${id}-code`} value={value.code} maxLength={8} onChange={(event) => onChange({ ...value, code: event.target.value.toUpperCase() })} className={`${field} mt-1.5 h-10 w-full font-mono uppercase`} placeholder="EGDAM" />
        </div>
        <div>
          <label htmlFor={`${id}-region`} className={label}>
            Region
          </label>
          <select id={`${id}-region`} value={value.region} onChange={(event) => onChange({ ...value, region: event.target.value })} className={`${field} mt-1.5 h-10 w-full`}>
            <option value="">Work it out from the name</option>
            {REGIONS.map((region) => (
              <option key={region}>{region}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="flex items-center gap-2 text-[11.5px] text-dim">
        Matches as
        <span className={`rounded px-1.5 py-px font-semibold ${MATCH_STYLE[geo.match]}`}>{matchText(geo)}</span>
      </p>
    </fieldset>
  );
}

const blank = (today: string, cargoType: string): FixtureInput => ({
  loadName: "",
  loadCode: "",
  loadRegion: "",
  dischargeName: "",
  dischargeCode: "",
  dischargeRegion: "",
  cargoMinKt: 10,
  cargoMaxKt: 10,
  rateLow: 0,
  rateHigh: 0,
  cargoType,
  source: "Broker fixture",
  fixtureDate: today,
});

export function FixtureForm({
  editing,
  ports,
  index,
  cargoTypes,
  today,
  onDone,
}: {
  editing: Fixture | null;
  ports: PortRecord[];
  index: PortIndex;
  cargoTypes: string[];
  today: string;
  onDone: (saved: boolean) => void;
}) {
  const [form, setForm] = useState<FixtureInput>(() => (editing ? { ...editing } : blank(today, cargoTypes.find((type) => /fertili[sz]er/i.test(type)) ?? "")));
  const [saving, start] = useTransition();
  const set = <K extends keyof FixtureInput>(key: K, value: FixtureInput[K]) => setForm((draft) => ({ ...draft, [key]: value }));
  const mid = form.rateLow > 0 && form.rateHigh > 0 ? (form.rateLow + form.rateHigh) / 2 : 0;

  const submit = () =>
    start(async () => {
      const result = await saveFixture(form, editing?.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(editing ? "Fixture updated." : "Fixture added. It counts toward benchmarks now.");
      onDone(true);
    });

  const number = (key: "cargoMinKt" | "cargoMaxKt" | "rateLow" | "rateHigh", text: string, unit: string, step: number) => (
    <div>
      <label htmlFor={`fx-${key}`} className={label}>
        {text}
      </label>
      <div className="mt-1.5 flex items-center overflow-hidden rounded-lg border border-border bg-white focus-within:border-blue/50 focus-within:ring-2 focus-within:ring-blue/15">
        <input id={`fx-${key}`} type="number" min={0} step={step} value={form[key] || ""} onChange={(event) => set(key, Number(event.target.value))} className={`${field} h-10 w-full border-0 font-mono focus:ring-0`} />
        <span className="shrink-0 border-l border-border bg-s2/60 px-2.5 py-2.5 text-[11.5px] text-mid">{unit}</span>
      </div>
    </div>
  );

  return (
    <form
      className="rounded-2xl border border-blue/25 bg-surface shadow-[0_1px_2px_rgba(26,58,92,0.05)]"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div>
          <h2 className="text-[14px] font-bold text-ink">{editing ? "Edit fixture" : "Add a fixture"}</h2>
          <p className="mt-0.5 text-[12px] text-dim">Pick a registry port for an exact match, or type a country, area or region as the broker quoted it.</p>
        </div>
        <button type="button" aria-label="Close" onClick={() => onDone(false)} className="rounded-md p-1.5 text-dim hover:bg-s2 hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-5 p-5">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)]">
          <LegInput
            id="load"
            title="Load"
            ports={ports}
            index={index}
            value={{ name: form.loadName, code: form.loadCode, region: form.loadRegion }}
            onChange={(leg) => setForm((draft) => ({ ...draft, loadName: leg.name, loadCode: leg.code, loadRegion: leg.region }))}
          />
          <ArrowRight className="mt-16 hidden h-5 w-5 text-dim lg:block" />
          <LegInput
            id="discharge"
            title="Discharge"
            ports={ports}
            index={index}
            value={{ name: form.dischargeName, code: form.dischargeCode, region: form.dischargeRegion }}
            onChange={(leg) => setForm((draft) => ({ ...draft, dischargeName: leg.name, dischargeCode: leg.code, dischargeRegion: leg.region }))}
          />
        </div>
        <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-5">
          {number("cargoMinKt", "Cargo min", "kT", 0.5)}
          {number("cargoMaxKt", "Cargo max", "kT", 0.5)}
          {number("rateLow", "Rate low", "$/MT", 0.1)}
          {number("rateHigh", "Rate high", "$/MT", 0.1)}
          <div>
            <label htmlFor="fx-date" className={label}>
              Fixture date
            </label>
            <input id="fx-date" type="date" value={form.fixtureDate} max={today} onChange={(event) => set("fixtureDate", event.target.value)} className={`${field} mt-1.5 h-10 w-full`} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="fx-source" className={label}>
              Source
            </label>
            <input id="fx-source" value={form.source} onChange={(event) => set("source", event.target.value)} className={`${field} mt-1.5 h-10 w-full`} maxLength={80} />
          </div>
          <div>
            <label htmlFor="fx-cargo" className={label}>
              Cargo type <span className="normal-case tracking-normal text-dim">(optional)</span>
            </label>
            <input id="fx-cargo" list="fx-cargo-types" value={form.cargoType} onChange={(event) => set("cargoType", event.target.value)} className={`${field} mt-1.5 h-10 w-full`} maxLength={80} />
            <datalist id="fx-cargo-types">
              {cargoTypes.map((type) => (
                <option key={type} value={type} />
              ))}
            </datalist>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
        <p className="text-[12px] text-mid">{mid ? `Midpoint $${mid.toFixed(2)}/MT` : "Enter at least one rate."}</p>
        <div className="flex gap-2">
          <button type="button" className={btnSecondary} onClick={() => onDone(false)}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : editing ? "Save fixture" : "Add fixture"}
          </button>
        </div>
      </div>
    </form>
  );
}
