"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, History, ListOrdered, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { resetBenchmarks, savePricing } from "@/app/admin/netback/actions";
import { PriceFileCard } from "@/components/admin/netback/price-file-card";
import { RankingPreview } from "@/components/admin/netback/ranking-preview";
import { Panel, SaveBar, useEditorGuards } from "@/components/admin/aquibot/shared";
import { Card, CardHeader, Pill, btnGhost, field, label } from "@/components/admin/ui";
import { formatDay } from "@/lib/content-types";
import type { NetbackCosts } from "@/lib/netback/calculate";
import { liveOrigins, type Benchmark, type BenchmarkSource, type PriceFile, type PriceSnapshot } from "@/lib/netback-desk/types";
import type { PortRecord } from "@/lib/ports";

type Draft = Record<string, { fob: number; active: boolean }>;

const SOURCE: Record<BenchmarkSource, { text: string; tone: "neutral" | "blue" | "teal" }> = {
  "built-in": { text: "Built-in", tone: "neutral" },
  file: { text: "From file", tone: "teal" },
  manual: { text: "Edited", tone: "blue" },
};

const toDraft = (benchmarks: Benchmark[]): Draft => Object.fromEntries(benchmarks.map((item) => [item.key, { fob: item.fob, active: item.active }]));

function Change({ now, before }: { now: number; before: number | undefined }) {
  if (before === undefined || !before || !now) return <span className="text-dim">—</span>;
  const diff = now - before;
  if (!diff) return <span className="text-dim">0.00</span>;
  return (
    <span className={diff > 0 ? "text-[#b42318]" : "text-[#1f7a45]"}>
      {diff > 0 ? "+" : "−"}
      {Math.abs(diff).toFixed(2)}
      <span className="ml-1 text-[10.5px] opacity-70">({((diff / before) * 100).toFixed(1)}%)</span>
    </span>
  );
}

export function NetbackPricingPanel({
  benchmarks,
  week: initialWeek,
  date: initialDate,
  priceFile,
  previous,
  history,
  ports,
  costs,
  savedAt: initialSavedAt,
  today,
}: {
  benchmarks: Benchmark[];
  week: string;
  date: string;
  priceFile: PriceFile | null;
  previous: PriceSnapshot | null;
  history: PriceSnapshot[];
  ports: PortRecord[];
  costs: NetbackCosts;
  savedAt: string | null;
  today: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => toDraft(benchmarks));
  const [week, setWeek] = useState(initialWeek);
  const [date, setDate] = useState(initialDate);
  const [baseline, setBaseline] = useState(() => JSON.stringify({ draft: toDraft(benchmarks), week: initialWeek, date: initialDate }));
  const [savedAt, setSavedAt] = useState(initialSavedAt);
  const [saving, start] = useTransition();
  const dirty = JSON.stringify({ draft, week, date }) !== baseline;

  const draftOrigins = useMemo(() => liveOrigins(benchmarks.map((item) => ({ ...item, ...draft[item.key] }))), [benchmarks, draft]);
  const savedOrigins = useMemo(() => liveOrigins(benchmarks), [benchmarks]);
  const liveCount = draftOrigins.length;

  const save = () => {
    if (!liveCount && !window.confirm("No origin is priced and switched on. Members will see “Awaiting pricing data”. Save anyway?")) return;
    start(async () => {
      const result = await savePricing({ week, date, prices: draft });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setBaseline(JSON.stringify({ draft, week, date }));
      setSavedAt(result.savedAt);
      toast.success("Benchmarks saved. The hub ranks against them now.");
      router.refresh();
    });
  };

  useEditorGuards(dirty, save);

  const set = (key: string, patch: Partial<Draft[string]>) => setDraft((current) => ({ ...current, [key]: { ...current[key], ...patch } }));

  return (
    <div className="space-y-5">
      <SaveBar dirty={dirty} saving={saving} savedAt={savedAt} onSave={save} saveLabel="Save prices">
        <label className="flex items-center gap-2 text-[12.5px] text-mid">
          <span className={label}>Week</span>
          <input value={week} onChange={(event) => setWeek(event.target.value.replace(/[^0-9]/g, "").slice(0, 2))} inputMode="numeric" className={`${field} h-8 w-14 text-center font-mono`} aria-label="Benchmark week" />
        </label>
        <label className="flex items-center gap-2 text-[12.5px] text-mid">
          <span className={label}>Data date</span>
          <input type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} className={`${field} h-8 font-mono`} aria-label="Data date" />
        </label>
        <button
          type="button"
          className={btnGhost}
          onClick={() => {
            if (!window.confirm("Put back the built-in week 28 prices for all nine origins? This saves straight away.")) return;
            start(async () => {
              await resetBenchmarks();
              toast.success("Built-in week 28 prices restored.");
              router.refresh();
            });
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Built-in prices
        </button>
      </SaveBar>

      <Card>
        <CardHeader
          title="Granular urea FOB benchmarks"
          meta={`${liveCount} of ${benchmarks.length} origins ranked on the hub${previous ? ` · change is against week ${previous.week || "?"} (${formatDay(previous.date)})` : ""}`}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-s2/60 text-left font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim">
              <tr>
                <th className="px-5 py-2.5 font-semibold">Origin</th>
                <th className="px-3 py-2.5 font-semibold">Load port</th>
                <th className="px-3 py-2.5 font-semibold">Source</th>
                <th className="px-3 py-2.5 text-right font-semibold">Previous</th>
                <th className="px-3 py-2.5 text-right font-semibold">FOB $/MT</th>
                <th className="px-3 py-2.5 text-right font-semibold">Change</th>
                <th className="px-5 py-2.5 text-right font-semibold">Ranked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {benchmarks.map((item) => {
                const row = draft[item.key];
                const edited = row.fob !== item.fob;
                const excluded = !row.active || row.fob <= 0;
                return (
                  <tr key={item.key} className={excluded ? "bg-s2/30" : ""}>
                    <td className="px-5 py-2.5">
                      <p className={`font-semibold ${excluded ? "text-mid" : "text-ink"}`}>{item.label}</p>
                      <p className="font-mono text-[11px] text-dim">{item.key}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-ink">{item.port}</p>
                      <p className="text-[11.5px] text-dim">{item.region}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <Pill tone={edited ? "amber" : SOURCE[item.source].tone}>{edited ? "Unsaved" : SOURCE[item.source].text}</Pill>
                      {item.series && !edited ? (
                        <p className="mt-0.5 max-w-[220px] truncate text-[11px] text-dim" title={`${item.series} · ${item.product}`}>
                          {item.series}
                          {item.low && item.high ? ` · ${item.low}–${item.high}` : ""}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-mid">{previous?.prices[item.key] ? previous.prices[item.key].toFixed(0) : "—"}</td>
                    <td className="px-3 py-2.5 text-right">
                      <input
                        type="number"
                        min={0}
                        max={5000}
                        step={1}
                        value={row.fob}
                        onChange={(event) => set(item.key, { fob: event.target.value === "" ? 0 : Number(event.target.value) })}
                        aria-label={`${item.label} FOB`}
                        className={`${field} h-9 w-24 text-right font-mono font-semibold ${edited ? "border-[#e8b44c] bg-[#fffaf0]" : ""}`}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12.5px]">
                      <Change now={row.fob} before={previous?.prices[item.key]} />
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <span className="inline-flex items-center gap-2">
                        {row.fob <= 0 ? <span className="text-[11px] text-[#9a5b00]">No price</span> : null}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={row.active}
                          aria-label={`Rank ${item.label}`}
                          onClick={() => set(item.key, { active: !row.active })}
                          className={`relative h-5 w-9 shrink-0 rounded-full transition ${row.active ? "bg-[#1f7a45]" : "bg-[#cfd9e2]"}`}
                        >
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${row.active ? "left-[18px]" : "left-0.5"}`} />
                        </button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-5 py-2.5 text-[12px] text-dim">Origins switched off or priced at 0 are left out of the member ranking, so they never show a false best origin.</p>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <PriceFileCard priceFile={priceFile} benchmarks={benchmarks} blocked={dirty} icon={<FileSpreadsheet className="h-4 w-4" />} />
        <RankingPreview draft={draftOrigins} saved={savedOrigins} ports={ports} costs={costs} icon={<ListOrdered className="h-4 w-4" />} />
      </div>

      {history.length ? (
        <Panel icon={<History className="h-4 w-4" />} title="Price history" description="One row per benchmark week, from each save or file load. Kept for a year.">
          <div className="-m-5 overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="bg-s2/60 text-left font-mono text-[10px] uppercase tracking-[0.1em] text-dim">
                <tr>
                  <th className="px-5 py-2 font-semibold">Week</th>
                  {benchmarks.map((item) => (
                    <th key={item.key} className="px-2 py-2 text-right font-semibold">
                      {item.label.replace(" (Europe)", "")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((entry, index) => (
                  <tr key={`${entry.week}-${entry.date}-${index}`}>
                    <td className="whitespace-nowrap px-5 py-2">
                      <span className="font-semibold text-ink">Week {entry.week || "?"}</span>
                      <span className="ml-1.5 text-dim">{formatDay(entry.date)}</span>
                    </td>
                    {benchmarks.map((item) => {
                      const value = entry.prices[item.key];
                      const older = history[index + 1]?.prices[item.key];
                      const diff = value && older ? value - older : 0;
                      return (
                        <td key={item.key} className="px-2 py-2 text-right font-mono">
                          <span className="text-ink">{value ? value.toFixed(0) : "—"}</span>
                          {diff ? <span className={`ml-1 text-[10.5px] ${diff > 0 ? "text-[#b42318]" : "text-[#1f7a45]"}`}>{diff > 0 ? "▲" : "▼"}</span> : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
