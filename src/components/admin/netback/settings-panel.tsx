"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Anchor, Gauge, Landmark, RotateCcw, Ship, Truck } from "lucide-react";
import { toast } from "sonner";
import { saveNetbackSettings } from "@/app/admin/netback/actions";
import { NumberField, Panel, SaveBar, useEditorGuards } from "@/components/admin/aquibot/shared";
import { btnGhost } from "@/components/admin/ui";
import { formatDay } from "@/lib/content-types";
import { estimateNetbackFreight, type NetbackCosts, type NetbackOrigin } from "@/lib/netback/calculate";
import { DEFAULT_NETBACK_SETTINGS, type NetbackSettings } from "@/lib/netback-desk/types";

const PLANS = [
  { key: "limitCore", plan: "Core" },
  { key: "limitGrowth", plan: "Growth" },
  { key: "limitEnterprise", plan: "Enterprise" },
] as const;

const SAMPLE = { name: "Paranaguá", lat: -25.52, lon: -48.51, region: "South America" };
const SAMPLE_CARGO = 35000;

type Live = { bdi: { value: number; date: string | null } | null; vlsfo: { city: string; price: number } | null };

export function NetbackSettingsPanel({ initial, savedAt: initialSavedAt, live, origins }: { initial: NetbackSettings; savedAt: string | null; live: Live; origins: NetbackOrigin[] }) {
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [savedAt, setSavedAt] = useState(initialSavedAt);
  const [saving, start] = useTransition();
  const dirty = JSON.stringify(settings) !== baseline;
  const costs = settings.costs;

  const set = <K extends keyof NetbackSettings>(key: K) => (value: NetbackSettings[K]) => setSettings((draft) => ({ ...draft, [key]: value }));
  const cost = (key: keyof NetbackCosts, scale = 1) => ({
    value: Number((costs[key] * scale).toFixed(4)),
    onChange: (value: number) => setSettings((draft) => ({ ...draft, costs: { ...draft.costs, [key]: value / scale } })),
  });

  const sample = useMemo(() => {
    const saved = JSON.parse(baseline) as NetbackSettings;
    return origins.map((origin) => {
      const point = { ...origin, name: origin.port };
      return {
        key: origin.key,
        label: origin.label,
        before: estimateNetbackFreight(point, SAMPLE, SAMPLE_CARGO, saved.costs).freightMt,
        after: estimateNetbackFreight(point, SAMPLE, SAMPLE_CARGO, costs).freightMt,
      };
    });
  }, [origins, costs, baseline]);

  const save = () =>
    start(async () => {
      const result = await saveNetbackSettings(settings);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setSettings(result.settings);
      setBaseline(JSON.stringify(result.settings));
      setSavedAt(result.savedAt);
      toast.success(result.pruned ? `Saved. ${result.pruned} logs past the retention window were removed.` : "Saved. New calculations use these costs now.");
      router.refresh();
    });

  useEditorGuards(dirty, save);

  return (
    <div className="space-y-5">
      <SaveBar dirty={dirty} saving={saving} savedAt={savedAt} onSave={save}>
        <button
          type="button"
          className={btnGhost}
          onClick={() => {
            if (window.confirm("Load the built-in costs and limits into the form? Nothing changes until you save.")) setSettings(DEFAULT_NETBACK_SETTINGS);
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Load built-in values
        </button>
      </SaveBar>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel icon={<Gauge className="h-4 w-4" />} title="Monthly calculation limits" description="Netback calculations each member can run per calendar month. 0 means unlimited. Admins are never limited.">
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
          <div className="mt-5 border-t border-border pt-4 sm:max-w-[240px]">
            <NumberField
              id="retentionDays"
              label="Keep logs for"
              value={settings.retentionDays}
              onChange={set("retentionDays")}
              unit="days"
              hint={settings.retentionDays < 30 ? <span className="text-[#9a5b00]">Minimum is 30 days.</span> : "Older logs are removed on save and as new ones arrive."}
            />
          </div>
        </Panel>

        <Panel icon={<Anchor className="h-4 w-4" />} title="Delivery costs" description="Per tonne, added between CFR and the farm gate. Discharge and margin drop out on a CFR basis.">
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField id="discharge" label="Discharge port" {...cost("discharge")} unit="$/MT" step={0.5} />
            <NumberField id="margin" label="Merchant margin" {...cost("margin")} unit="$/MT" step={0.5} />
            <NumberField id="bagged" label="Bags & bagging" {...cost("bagged")} unit="$/MT" step={0.5} />
            <NumberField id="inspection" label="Inspection" {...cost("inspection")} unit="$/MT" step={0.25} />
            <NumberField id="insurance" label="Insurance" {...cost("insurance")} unit="$/MT" step={0.25} hint="Also the insurance in the CIF duty base." />
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel icon={<Truck className="h-4 w-4" />} title="Haulage tiers" description="Inland haulage from the port, by the delivery basis the member picks.">
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField id="haulageLocal" label="Local, under 50 km" {...cost("haulageLocal")} unit="$/MT" step={0.5} />
            <NumberField id="haulageRegional" label="Regional, 50–150 km" {...cost("haulageRegional")} unit="$/MT" step={0.5} />
            <NumberField id="haulageRemote" label="Remote, over 150 km" {...cost("haulageRemote")} unit="$/MT" step={0.5} />
          </div>
        </Panel>

        <Panel icon={<Landmark className="h-4 w-4" />} title="Finance and levies" description="LC interest is charged on CFR for the credit period. AFRMM applies where the duty record says so.">
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField id="lcRate" label="LC interest" {...cost("lcRate", 100)} unit="% a year" step={0.25} />
            <NumberField id="lcDays" label="Credit period" {...cost("lcDays")} unit="days" />
            <NumberField id="afrmmRate" label="AFRMM levy" {...cost("afrmmRate", 100)} unit="% of freight" step={0.05} />
          </div>
          <p className="mt-3 text-[12px] text-dim">
            At these rates LC adds {((costs.lcRate / 365) * costs.lcDays * 100).toFixed(2)}% of CFR, about ${((costs.lcRate / 365) * costs.lcDays * 450).toFixed(2)}/MT on a $450 CFR.
          </p>
        </Panel>
      </div>

      <Panel
        icon={<Ship className="h-4 w-4" />}
        title="Freight model"
        description="Netback prices its own ocean freight for every origin. Supramax under 45,000 MT, Panamax above. Hire is the BDI reference times the vessel multiplier."
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField
              id="hireBase"
              label="BDI reference"
              {...cost("hireBase")}
              unit="index"
              step={10}
              hint={
                live.bdi ? (
                  <button type="button" className="font-semibold text-blue" onClick={() => cost("hireBase").onChange(live.bdi!.value)}>
                    Use freight desk BDI {live.bdi.value.toLocaleString()}
                    {live.bdi.date ? ` (${formatDay(live.bdi.date)})` : ""}
                  </button>
                ) : (
                  "No live BDI on the freight desk yet."
                )
              }
            />
            <NumberField
              id="bunkerPrice"
              label="Bunker price"
              {...cost("bunkerPrice")}
              unit="$/MT"
              step={5}
              hint={
                live.vlsfo ? (
                  <button type="button" className="font-semibold text-blue" onClick={() => cost("bunkerPrice").onChange(live.vlsfo!.price)}>
                    Use {live.vlsfo.city} VLSFO ${live.vlsfo.price}
                  </button>
                ) : undefined
              }
            />
            <NumberField id="portAndAgency" label="Port & agency" {...cost("portAndAgency")} unit="$ / voyage" step={500} />
            <NumberField id="extraDays" label="Extra port days" {...cost("extraDays")} unit="days" step={0.5} />
            <NumberField id="loadRate" label="Load rate" {...cost("loadRate")} unit="MT/day" step={500} />
            <NumberField id="dischargeRate" label="Discharge rate" {...cost("dischargeRate")} unit="MT/day" step={500} />
            <NumberField id="cargoPremium" label="Cargo premium" {...cost("cargoPremium")} unit="$/MT" step={0.5} />
            <NumberField id="seasonalPremium" label="Seasonal premium" {...cost("seasonalPremium")} unit="$/MT" step={0.5} />
          </div>
          <div className="overflow-hidden rounded-xl border border-border">
            <p className="border-b border-border bg-s2/60 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-dim">
              Freight to {SAMPLE.name}, {SAMPLE_CARGO.toLocaleString()} MT
            </p>
            <table className="w-full text-[12.5px]">
              <tbody className="divide-y divide-border">
                {sample.map((row) => {
                  const diff = row.after - row.before;
                  return (
                    <tr key={row.key}>
                      <td className="px-3 py-1.5 text-ink">{row.label}</td>
                      <td className="px-3 py-1.5 text-right font-mono font-semibold text-ink">${row.after.toFixed(2)}</td>
                      <td className={`w-20 px-3 py-1.5 text-right font-mono text-[11.5px] ${!diff ? "text-dim" : diff > 0 ? "text-[#b42318]" : "text-[#1f7a45]"}`}>
                        {diff ? `${diff > 0 ? "+" : "−"}${Math.abs(diff).toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>
    </div>
  );
}
