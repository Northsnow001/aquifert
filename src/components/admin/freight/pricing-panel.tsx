"use client";

import { useState, useTransition } from "react";
import { Gauge, Globe2, Layers, Plus, RotateCcw, Scale, ShieldAlert, Ship, Trash2, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { saveFreightSettings } from "@/app/admin/freight-calculator/actions";
import { NumberField, Panel, SaveBar, Switch, useEditorGuards } from "@/components/admin/aquibot/shared";
import { btnGhost, field, label } from "@/components/admin/ui";
import { premiumTaper } from "@/lib/freight/reference";
import { DEFAULT_FREIGHT_SETTINGS, type FreightSettings } from "@/lib/freight-desk/types";

const PLANS = [
  { key: "limitCore", plan: "AQ ONE" },
  { key: "limitGrowth", plan: "AQ Analytics" },
  { key: "limitEnterprise", plan: "AQ ZERO" },
] as const;

const TAPER_SAMPLES = [5000, 8000, 11000, 14000];

export function PricingPanel({ initial, savedAt: initialSavedAt }: { initial: FreightSettings; savedAt: string | null }) {
  const [settings, setSettings] = useState(initial);
  const [cargoRows, setCargoRows] = useState(() => Object.entries(initial.cargoPremiums).map(([name, premium]) => ({ name, premium })));
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [savedAt, setSavedAt] = useState(initialSavedAt);
  const [saving, start] = useTransition();

  const current: FreightSettings = { ...settings, cargoPremiums: Object.fromEntries(cargoRows.filter((row) => row.name.trim()).map((row) => [row.name.trim(), row.premium])) };
  const dirty = JSON.stringify(current) !== baseline;
  const duplicateCargo = new Set(cargoRows.map((row) => row.name.trim().toLowerCase())).size !== cargoRows.length;

  const set = <K extends keyof FreightSettings>(key: K) => (value: FreightSettings[K]) => setSettings((draft) => ({ ...draft, [key]: value }));
  const setTaper = (key: keyof FreightSettings["taper"]) => (value: number) => setSettings((draft) => ({ ...draft, taper: { ...draft.taper, [key]: value } }));
  const setOrigin = (region: string) => (value: number) => setSettings((draft) => ({ ...draft, originPremiums: { ...draft.originPremiums, [region]: value } }));

  const load = (next: FreightSettings) => {
    setSettings(next);
    setCargoRows(Object.entries(next.cargoPremiums).map(([name, premium]) => ({ name, premium })));
  };

  const save = () => {
    if (duplicateCargo) {
      toast.error("Two cargo types share a name. Rename one before saving.");
      return;
    }
    start(async () => {
      const result = await saveFreightSettings(current);
      load(result.settings);
      setBaseline(JSON.stringify(result.settings));
      setSavedAt(result.savedAt);
      toast.success("Pricing saved. New quotes use it now.");
    });
  };

  useEditorGuards(dirty, save);

  return (
    <div className="space-y-5">
      <SaveBar dirty={dirty} saving={saving} savedAt={savedAt} onSave={save}>
        <button
          type="button"
          className={btnGhost}
          onClick={() => {
            if (window.confirm("Load the built-in pricing into the form? Nothing changes until you save.")) load(DEFAULT_FREIGHT_SETTINGS);
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Load built-in values
        </button>
      </SaveBar>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel icon={<Gauge className="h-4 w-4" />} title="Monthly calculation limits" description="Freight quotes each member can run per calendar month. 0 means unlimited. Admins are never limited.">
          <div className="grid gap-4 sm:grid-cols-3">
            {PLANS.map(({ key, plan }) => (
              <NumberField
                key={key}
                id={key}
                label={plan}
                value={settings[key]}
                onChange={set(key)}
                unit="/ month"
                hint={settings[key] === 0 ? <span className="font-semibold text-[#1f7a45]">Unlimited</span> : `About ${Math.max(1, Math.round(settings[key] / 22))} per working day`}
              />
            ))}
          </div>
        </Panel>

        <Panel icon={<ShieldAlert className="h-4 w-4" />} title="Iran war-risk premium" description="Added when either port is inside the Persian Gulf, for the Strait of Hormuz transit.">
          <div className="space-y-4">
            <Switch checked={settings.iranEnabled} onChange={set("iranEnabled")} label="Charge the war-risk premium" />
            <div className={`grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)] ${settings.iranEnabled ? "" : "opacity-50"}`}>
              <NumberField id="iranPremium" label="Premium" value={settings.iranPremium} onChange={set("iranPremium")} unit="$/MT" step={0.5} disabled={!settings.iranEnabled} />
              <div>
                <label htmlFor="iranLabel" className={label}>
                  Label on the quote
                </label>
                <input id="iranLabel" value={settings.iranLabel} disabled={!settings.iranEnabled} onChange={(event) => set("iranLabel")(event.target.value)} className={`${field} mt-1.5 h-10 w-full`} maxLength={60} />
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Panel
          icon={<Layers className="h-4 w-4" />}
          title="Cargo premiums"
          description="The cargo types members choose from, with the premium each adds per tonne."
          actions={
            <button type="button" className={btnGhost} onClick={() => setCargoRows([...cargoRows, { name: "", premium: 0 }])}>
              <Plus className="h-3.5 w-3.5" />
              Add type
            </button>
          }
        >
          <div className="space-y-2">
            {cargoRows.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  aria-label="Cargo type"
                  value={row.name}
                  placeholder="Cargo type"
                  onChange={(event) => setCargoRows(cargoRows.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)))}
                  className={`${field} h-9 min-w-0 flex-1`}
                />
                <div className="flex items-center overflow-hidden rounded-lg border border-border bg-white">
                  <input
                    aria-label={`${row.name || "Cargo"} premium`}
                    type="number"
                    step="0.5"
                    min={0}
                    value={row.premium}
                    onChange={(event) => setCargoRows(cargoRows.map((item, i) => (i === index ? { ...item, premium: Number(event.target.value) } : item)))}
                    className={`${field} h-9 w-20 border-0 font-mono focus:ring-0`}
                  />
                  <span className="border-l border-border bg-s2/60 px-2 py-2 text-[11.5px] text-mid">$/MT</span>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${row.name || "cargo type"}`}
                  disabled={cargoRows.length <= 1}
                  onClick={() => setCargoRows(cargoRows.filter((_, i) => i !== index))}
                  className="rounded-md p-2 text-dim transition hover:bg-red-50 hover:text-danger disabled:opacity-30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          {duplicateCargo ? <p className="mt-2 text-[12px] text-danger">Two cargo types share a name.</p> : null}
          <div className="mt-5 border-t border-border pt-4 sm:max-w-[220px]">
            <NumberField id="seasonalPremium" label="Seasonal premium" value={settings.seasonalPremium} onChange={set("seasonalPremium")} unit="$/MT" step={0.5} hint="Added to every quote." />
          </div>
        </Panel>

        <Panel icon={<Globe2 className="h-4 w-4" />} title="Origin premiums" description="Added by the load port's region, for ballast positioning and ice or congestion risk.">
          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {Object.entries(settings.originPremiums).map(([region, premium]) => (
              <label key={region} className="flex items-center justify-between gap-3 border-b border-border/70 py-1.5 text-[13px]">
                <span className="text-ink">{region}</span>
                <span className="flex items-center overflow-hidden rounded-md border border-border bg-white">
                  <input type="number" step="0.5" min={0} value={premium} onChange={(event) => setOrigin(region)(Number(event.target.value))} className={`${field} h-8 w-16 border-0 text-right font-mono focus:ring-0`} />
                  <span className="bg-s2/60 px-1.5 py-1.5 text-[11px] text-mid">$</span>
                </span>
              </label>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel icon={<TrendingDown className="h-4 w-4" />} title="Premium taper" description="Long voyages dilute per-tonne premiums. Beyond the base distance they shrink toward a floor.">
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField id="baseDistanceNm" label="Full premium up to" value={settings.taper.baseDistanceNm} onChange={setTaper("baseDistanceNm")} unit="nm" step={500} />
            <NumberField id="capeFloor" label="Cape floor" value={settings.taper.capeFloor} onChange={setTaper("capeFloor")} unit="×" step={0.05} />
            <NumberField id="capeSpanNm" label="Cape span" value={settings.taper.capeSpanNm} onChange={setTaper("capeSpanNm")} unit="nm" step={500} />
            <div className="hidden sm:block" />
            <NumberField id="nonCapeFloor" label="Other floor" value={settings.taper.nonCapeFloor} onChange={setTaper("nonCapeFloor")} unit="×" step={0.05} />
            <NumberField id="nonCapeSpanNm" label="Other span" value={settings.taper.nonCapeSpanNm} onChange={setTaper("nonCapeSpanNm")} unit="nm" step={500} />
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-[12.5px]">
              <thead className="bg-s2/60 text-left font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim">
                <tr>
                  <th className="px-3 py-1.5 font-semibold">Distance</th>
                  {TAPER_SAMPLES.map((nm) => (
                    <th key={nm} className="px-3 py-1.5 text-right font-semibold">
                      {nm.toLocaleString()} nm
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(["cape", "suez"] as const).map((canal) => (
                  <tr key={canal}>
                    <td className="px-3 py-1.5 text-mid">{canal === "cape" ? "Via the Cape" : "Other routes"}</td>
                    {TAPER_SAMPLES.map((nm) => (
                      <td key={nm} className="px-3 py-1.5 text-right font-mono text-ink">
                        {Math.round(premiumTaper(nm, canal, settings.taper) * 100)}%
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel icon={<Scale className="h-4 w-4" />} title="Fixture blending" description="When the calculated rate falls outside the verified fixture band, it is blended toward the fixture midpoint.">
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField id="fixtureMaxWeight" label="Fixture weight cap" value={settings.fixtureMaxWeight} onChange={set("fixtureMaxWeight")} unit="0–1" step={0.05} hint="The most the fixture midpoint can count for." />
              <NumberField id="algoMinWeight" label="Algorithm weight floor" value={settings.algoMinWeight} onChange={set("algoMinWeight")} unit="0–1" step={0.05} hint="The least the calculated rate counts for." />
            </div>
          </Panel>

          <Panel icon={<Ship className="h-4 w-4" />} title="Hub display">
            <Switch checked={settings.showBunkerBar} onChange={set("showBunkerBar")} label="Show the VLSFO bar" description="The row of bunker hub prices above the calculator. Members can still type their own price." />
          </Panel>
        </div>
      </div>
    </div>
  );
}
