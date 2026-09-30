"use client";

import { useState } from "react";
import { FlaskConical, X } from "lucide-react";
import { PortField } from "@/components/calculators/port-field";
import { btnPrimary, field, label } from "@/components/admin/ui";
import { findBenchmarkBand, type Resolver } from "@/lib/freight-desk/benchmark";
import type { Fixture } from "@/lib/freight-desk/types";
import type { FixtureBand } from "@/lib/freight/fixtures";
import type { PortRecord } from "@/lib/ports";

export type BenchmarkResult = { route: string; cargoMt: number; band: FixtureBand | null };

export function BenchmarkTester({
  ports,
  fixtures,
  resolve,
  now,
  result,
  onResult,
}: {
  ports: PortRecord[];
  fixtures: Fixture[];
  resolve: Resolver;
  now: number;
  result: BenchmarkResult | null;
  onResult: (result: BenchmarkResult | null) => void;
}) {
  const [load, setLoad] = useState<PortRecord | null>(null);
  const [discharge, setDischarge] = useState<PortRecord | null>(null);
  const [cargoMt, setCargoMt] = useState(30000);

  const run = () => {
    if (!load || !discharge) return;
    const band = findBenchmarkBand({ load, discharge, cargoMt, fixtures, resolve, now });
    onResult({ route: `${load.name} → ${discharge.name}`, cargoMt, band });
  };

  const band = result?.band;

  return (
    <section className="rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(26,58,92,0.05)]">
      <div className="flex items-start gap-3 border-b border-border px-5 py-3.5">
        <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-light text-blue">
          <FlaskConical className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-[14px] font-bold text-ink">Benchmark tester</h2>
          <p className="mt-0.5 text-[12px] text-dim">See exactly which fixtures a hub quote would use for a route. Matching rows are highlighted in the table.</p>
        </div>
      </div>
      <div className="grid items-end gap-3 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px_auto]">
        <PortField label="Load port" value={load} onSelect={setLoad} ports={ports} />
        <PortField label="Discharge port" value={discharge} onSelect={setDischarge} ports={ports} />
        <div>
          <label htmlFor="bt-cargo" className={label}>
            Cargo MT
          </label>
          <input id="bt-cargo" type="number" min={1000} step={1000} value={cargoMt} onChange={(event) => setCargoMt(Number(event.target.value))} className={`${field} mt-1.5 h-[42px] w-full font-mono`} />
        </div>
        <button type="button" className={`${btnPrimary} h-[42px]`} disabled={!load || !discharge || cargoMt <= 0} onClick={run}>
          Test route
        </button>
      </div>
      {result ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border bg-s2/40 px-5 py-3.5 text-[12.5px]">
          <span className="font-semibold text-ink">
            {result.route} · {(result.cargoMt / 1000).toLocaleString("en-US")} kT
          </span>
          {band ? (
            <>
              <span>
                Band <span className="font-mono font-semibold text-ink">${band.rateMin.toFixed(2)}–${band.rateMax.toFixed(2)}</span>
              </span>
              <span>
                Median <span className="font-mono font-semibold text-ink">${band.rateMedian.toFixed(2)}</span>
              </span>
              <span className="text-mid">
                {band.label ?? band.matchType} · {band.sampleSize} fixtures · {band.windowDays}-day window{band.cargoMatchMode === "near_band" ? " · near cargo size" : ""}
              </span>
            </>
          ) : (
            <span className="text-mid">No usable fixtures match this route. The hub quotes it from the algorithm alone.</span>
          )}
          <button type="button" onClick={() => onResult(null)} className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-blue">
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      ) : null}
    </section>
  );
}
