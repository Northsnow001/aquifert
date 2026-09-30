"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPaste, Download, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addSeries, deleteSeries, importSeriesPoints, saveSeriesMeta } from "@/app/admin/aq-data/actions";
import { EmptyState, Pill, btnDanger, btnGhost, btnPrimary, btnSecondary, input, label, textarea } from "@/components/admin/ui";
import { Sparkline } from "@/components/hub/kit";
import { parsePoints } from "@/lib/aq-modules/signal";
import { SERIES_GROUPS, type MarketSeries, type SeriesGroup, type Tone } from "@/lib/aq-modules/types";
import { formatDay } from "@/lib/content-types";

type Meta = { label: string; group: SeriesGroup; basis: string; unit: string };
type Panel = "edit" | "paste" | null;

const SPARK_POINTS = 26;

function trend(values: number[]): Tone {
  if (values.length < 2 || !values[0]) return "flat";
  const pct = ((values[values.length - 1] - values[0]) / values[0]) * 100;
  return Math.abs(pct) < 0.5 ? "flat" : pct > 0 ? "up" : "down";
}

function MetaFields({ id, meta, onChange }: { id: string; meta: Meta; onChange: (next: Meta) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label htmlFor={`${id}-label`} className={label}>
          Name
        </label>
        <input id={`${id}-label`} className={`${input} mt-1.5`} value={meta.label} onChange={(event) => onChange({ ...meta, label: event.target.value })} placeholder="Urea granular" required />
      </div>
      <div>
        <label htmlFor={`${id}-group`} className={label}>
          Group
        </label>
        <select id={`${id}-group`} className={`${input} mt-1.5`} value={meta.group} onChange={(event) => onChange({ ...meta, group: event.target.value as SeriesGroup })}>
          {SERIES_GROUPS.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${id}-basis`} className={label}>
          Basis
        </label>
        <input id={`${id}-basis`} className={`${input} mt-1.5`} value={meta.basis} onChange={(event) => onChange({ ...meta, basis: event.target.value })} placeholder="FOB Middle East" />
      </div>
      <div>
        <label htmlFor={`${id}-unit`} className={label}>
          Unit
        </label>
        <input id={`${id}-unit`} className={`${input} mt-1.5`} value={meta.unit} onChange={(event) => onChange({ ...meta, unit: event.target.value })} placeholder="USD/t" />
      </div>
    </div>
  );
}

function PastePoints({ series, onDone }: { series: MarketSeries; onDone: () => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [saving, startSave] = useTransition();
  const preview = parsePoints(text);
  const existing = new Set(series.points.map((point) => point.date));
  const overlap = preview.points.filter((point) => existing.has(point.date)).length;

  const submit = () => {
    if (!preview.points.length) return;
    if (mode === "replace" && series.points.length && !window.confirm(`Replace all ${series.points.length} saved points on ${series.label} (${series.basis}) with the ${preview.points.length} pasted? This cannot be undone.`)) return;
    startSave(async () => {
      const result = await importSeriesPoints(series.id, text, mode);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`${preview.points.length} ${preview.points.length === 1 ? "point" : "points"} ${mode === "replace" ? "saved as the full history" : "merged"} on ${series.label}.`);
      onDone();
      router.refresh();
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div>
        <label htmlFor={`paste-${series.id}`} className={label}>
          One price per line: <span className="font-mono">YYYY-MM-DD,value</span> (tabs or semicolons work too, so you can paste from a spreadsheet)
        </label>
        <textarea id={`paste-${series.id}`} rows={8} className={`${textarea} mt-1.5 font-mono text-[12.5px]`} value={text} onChange={(event) => setText(event.target.value)} placeholder={"2026-09-18,416\n2026-09-25,422"} />
      </div>
      <div className="space-y-3 text-[13px]">
        <p className={label}>Preview</p>
        {text.trim() ? (
          <>
            <p className="text-ink">
              <span className="font-semibold">{preview.points.length}</span> {preview.points.length === 1 ? "point" : "points"} read
              {preview.points.length ? (
                <span className="text-mid">
                  {" "}
                  · {formatDay(preview.points[0].date)} to {formatDay(preview.points[preview.points.length - 1].date)}
                  {overlap ? ` · ${overlap} replace saved dates` : ""}
                </span>
              ) : null}
            </p>
            {preview.skipped.length ? (
              <div>
                <p className="font-semibold text-[#9a5b00]">
                  {preview.skipped.length} {preview.skipped.length === 1 ? "line" : "lines"} skipped
                </p>
                <ul className="mt-1 max-h-28 overflow-auto rounded-lg border border-border bg-white px-3 py-2 font-mono text-[11.5px] text-mid">
                  {preview.skipped.slice(0, 20).map((line, index) => (
                    <li key={`${index}-${line}`} className="truncate">
                      {line}
                    </li>
                  ))}
                  {preview.skipped.length > 20 ? <li>and {preview.skipped.length - 20} more</li> : null}
                </ul>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-dim">Paste lines to see what will be read.</p>
        )}
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="How to save">
          {(
            [
              ["merge", "Merge into history"],
              ["replace", "Replace all points"],
            ] as const
          ).map(([key, name]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={mode === key}
              onClick={() => setMode(key)}
              className={`rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold transition ${mode === key ? "border-blue bg-blue text-white" : "border-border bg-white text-mid hover:text-ink"}`}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onDone}>
            Cancel
          </button>
          <button type="button" className={btnPrimary} onClick={submit} disabled={saving || !preview.points.length}>
            {saving ? "Saving…" : mode === "replace" ? "Replace points" : "Merge points"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SeriesRow({ series }: { series: MarketSeries }) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [meta, setMeta] = useState<Meta>({ label: series.label, group: series.group, basis: series.basis, unit: series.unit });
  const [saving, startSave] = useTransition();
  const [removing, startRemove] = useTransition();
  const sorted = [...series.points].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const spark = sorted.slice(-SPARK_POINTS).map((point) => point.value);

  const saveMeta = (event: React.FormEvent) => {
    event.preventDefault();
    startSave(async () => {
      const result = await saveSeriesMeta(series.id, meta);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`${meta.label} saved.`);
      setPanel(null);
      router.refresh();
    });
  };

  const remove = () => {
    if (!window.confirm(`Delete ${series.label} (${series.basis}) and its ${series.points.length} prices? Member alerts on this series stop working. This cannot be undone.`)) return;
    startRemove(async () => {
      const result = await deleteSeries(series.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`${series.label} deleted.`);
      router.refresh();
    });
  };

  const toggle = (next: Panel) => setPanel((current) => (current === next ? null : next));

  return (
    <li className="border-b border-border last:border-b-0">
      <div className="grid grid-cols-1 items-center gap-3 px-5 py-3 md:grid-cols-[130px_minmax(0,1.5fr)_90px_minmax(0,1fr)_auto]">
        <span className="flex h-[34px] items-center">{spark.length > 1 ? <Sparkline points={spark} tone={trend(spark)} /> : <span className="text-[11.5px] text-dim">Not enough data</span>}</span>
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate text-[13.5px] font-semibold text-ink">{series.label}</span>
            <Pill>{series.group}</Pill>
          </span>
          <span className="block truncate text-[12px] text-mid">
            {series.basis || "No basis"} · {series.unit} · <span className="font-mono">{series.id}</span>
          </span>
        </span>
        <span className="font-mono text-[12px] text-mid">{series.points.length} pts</span>
        <span className="font-mono text-[12px] text-ink">{latest ? `${latest.value} · ${formatDay(latest.date)}` : <span className="text-dim">No prices</span>}</span>
        <span className="flex flex-wrap items-center gap-1">
          <button type="button" className={btnGhost} onClick={() => toggle("edit")} aria-expanded={panel === "edit"}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button type="button" className={btnGhost} onClick={() => toggle("paste")} aria-expanded={panel === "paste"}>
            <ClipboardPaste className="h-3.5 w-3.5" />
            Paste
          </button>
          <a href={`/admin/market-data/export?series=${encodeURIComponent(series.id)}`} className={btnGhost} title="Download this series as CSV">
            <Download className="h-3.5 w-3.5" />
            CSV
          </a>
        </span>
      </div>
      {panel === "edit" ? (
        <form onSubmit={saveMeta} className="space-y-3 border-t border-border bg-s2/20 px-5 py-4">
          <MetaFields id={`meta-${series.id}`} meta={meta} onChange={setMeta} />
          <div className="flex items-center justify-between gap-2">
            <button type="button" className={btnDanger} onClick={remove} disabled={removing}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete series
            </button>
            <div className="flex gap-2">
              <button type="button" className={btnSecondary} onClick={() => setPanel(null)}>
                Cancel
              </button>
              <button type="submit" className={btnPrimary} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </form>
      ) : null}
      {panel === "paste" ? (
        <div className="border-t border-border bg-s2/20 px-5 py-4">
          <PastePoints series={series} onDone={() => setPanel(null)} />
        </div>
      ) : null}
    </li>
  );
}

function AddSeries({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [meta, setMeta] = useState<Meta>({ label: "", group: "Nitrogen", basis: "", unit: "USD/t" });
  const [saving, startSave] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    startSave(async () => {
      const result = await addSeries(meta);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`${meta.label} added. Paste its history or enter this week's price above.`);
      onDone();
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3 border-b border-border bg-s2/20 px-5 py-4">
      <MetaFields id="new-series" meta={meta} onChange={setMeta} />
      <div className="flex justify-end gap-2">
        <button type="button" className={btnSecondary} onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className={btnPrimary} disabled={saving || !meta.label.trim()}>
          {saving ? "Adding…" : "Add series"}
        </button>
      </div>
    </form>
  );
}

export function SeriesManager({ series }: { series: MarketSeries[] }) {
  const [adding, setAdding] = useState(false);
  const [group, setGroup] = useState<"all" | SeriesGroup>("all");
  const shown = group === "all" ? series : series.filter((item) => item.group === group);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter by group">
          {(["all", ...SERIES_GROUPS] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={group === key}
              onClick={() => setGroup(key)}
              className={`rounded-lg px-2.5 py-1 text-[12.5px] font-semibold transition ${group === key ? "bg-blue-light text-blue" : "text-mid hover:text-ink"}`}
            >
              {key === "all" ? "All" : key} <span className="font-mono text-[11px] opacity-70">{key === "all" ? series.length : series.filter((item) => item.group === key).length}</span>
            </button>
          ))}
        </div>
        {!adding ? (
          <button type="button" className={btnSecondary} onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add series
          </button>
        ) : null}
      </div>
      {adding ? <AddSeries onDone={() => setAdding(false)} /> : null}
      {shown.length ? (
        <ul>
          {shown.map((item) => (
            <SeriesRow key={`${item.id}-${item.label}-${item.group}-${item.basis}-${item.unit}`} series={item} />
          ))}
        </ul>
      ) : series.length ? (
        <p className="px-5 py-10 text-center text-[13px] text-dim">No series in this group.</p>
      ) : (
        <EmptyState title="No series yet" body="Add a series, then paste its history or enter this week's price." />
      )}
    </>
  );
}