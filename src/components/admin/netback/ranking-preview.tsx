"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { PortField } from "@/components/calculators/port-field";
import { Panel } from "@/components/admin/aquibot/shared";
import { field, label } from "@/components/admin/ui";
import { rankForward, type NetbackCosts, type NetbackOrigin } from "@/lib/netback/calculate";
import { findPort, type PortRecord } from "@/lib/ports";

const money = (value: number) => `$${value.toFixed(2)}`;

/** Landed EXW bagged cost at one destination, with the draft prices against the saved ones. */
export function RankingPreview({ draft, saved, ports, costs, icon }: { draft: NetbackOrigin[]; saved: NetbackOrigin[]; ports: PortRecord[]; costs: NetbackCosts; icon: React.ReactNode }) {
  const [destination, setDestination] = useState<PortRecord | null>(() => findPort("BRPNG", ports) ?? findPort("INMUN", ports) ?? ports[0] ?? null);
  const [cargo, setCargo] = useState(35000);

  const rows = useMemo(() => {
    if (!destination) return [];
    const options = { basis: "exw" as const, packaging: "bagged" as const, dutyEnabled: false, dutyPercent: 0, afrmm: false, inlandUsd: 0, costs };
    const before = rankForward(destination, cargo, options, saved);
    const after = rankForward(destination, cargo, options, draft);
    return after.map((row, index) => {
      const was = before.findIndex((item) => item.key === row.key);
      return { ...row, rank: index + 1, moved: was === -1 ? null : was - index, delta: was === -1 ? null : row.totalFarm - before[was].totalFarm };
    });
  }, [destination, cargo, draft, saved, costs]);

  const changed = rows.some((row) => row.delta);

  return (
    <Panel icon={icon} title="Ranking preview" description="Delivered EXW port, bagged, no duty. Uses the prices in the table, including unsaved edits.">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px]">
        <PortField label="Destination" value={destination} onSelect={setDestination} ports={ports} />
        <label className="block">
          <span className={`${label} mb-1.5 font-mono text-[10px] tracking-[0.14em]`}>Cargo MT</span>
          <input type="number" min={5000} max={100000} step={1000} value={cargo} onChange={(event) => setCargo(Number(event.target.value) || 5000)} className={`${field} h-[42px] w-full font-mono`} />
        </label>
      </div>
      {rows.length ? (
        <ol className="mt-4 divide-y divide-border rounded-xl border border-border">
          {rows.map((row) => (
            <li key={row.key} className={`flex items-center gap-3 px-3 py-2 text-[13px] ${row.rank === 1 ? "bg-[#f4fbf7]" : ""}`}>
              <span className="w-5 font-mono text-[12px] text-dim">{row.rank}</span>
              <span className="min-w-0 flex-1">
                <span className="font-semibold text-ink">{row.label}</span>
                <span className="ml-1.5 text-[11.5px] text-dim">
                  FOB {money(row.fob)} + freight {money(row.freightMt)}
                </span>
              </span>
              {row.moved ? (
                <span className={`flex items-center font-mono text-[11px] ${row.moved > 0 ? "text-[#1f7a45]" : "text-[#b42318]"}`}>
                  {row.moved > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {Math.abs(row.moved)}
                </span>
              ) : null}
              <span className="w-20 text-right font-mono font-semibold text-ink">{money(row.totalFarm)}</span>
              {changed ? (
                <span className={`w-16 text-right font-mono text-[11.5px] ${!row.delta ? "text-dim" : row.delta > 0 ? "text-[#b42318]" : "text-[#1f7a45]"}`}>
                  {row.delta ? `${row.delta > 0 ? "+" : "−"}${Math.abs(row.delta).toFixed(2)}` : "—"}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-[12.5px] text-dim">{draft.length ? "Choose a destination port." : "No origins are priced and switched on."}</p>
      )}
    </Panel>
  );
}
