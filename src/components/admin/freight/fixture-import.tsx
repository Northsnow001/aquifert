"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { FileUp, History, Sparkles, TableProperties, X } from "lucide-react";
import { toast } from "sonner";
import { importFixtures, lastExtractionRows } from "@/app/admin/freight-calculator/actions";
import { MATCH_STYLE, matchText } from "@/components/admin/freight/fixture-form";
import { btnPrimary, btnSecondary, field, label, textarea } from "@/components/admin/ui";
import { formatStamp } from "@/lib/content-types";
import { resolveLeg, type PortIndex } from "@/lib/freight-desk/benchmark";
import { parseFixtureSheet } from "@/lib/freight-desk/parse";
import type { FixtureInput } from "@/lib/freight-desk/types";

const SAMPLE = `Damietta\tConstanta\t10\t28/29\tFertilizer / DAP / Urea\tBroker sheet\t2026-07-01
Baltic
Brazil\t30-35\t44.5/46
US Gulf\t25\t38`;

function ReviewTable({ rows, index, selected, onToggle }: { rows: FixtureInput[]; index: PortIndex; selected?: Set<number>; onToggle?: (row: number) => void }) {
  return (
    <div className="max-h-[420px] overflow-auto rounded-xl border border-border">
      <table className="w-full text-[12.5px]">
        <thead className="sticky top-0 bg-s2 text-left font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim">
          <tr>
            {selected ? <th className="w-8 px-3 py-2" /> : null}
            <th className="px-3 py-2 font-semibold">Route</th>
            <th className="px-3 py-2 font-semibold">Cargo kT</th>
            <th className="px-3 py-2 font-semibold">$/MT</th>
            <th className="px-3 py-2 font-semibold">Date</th>
            <th className="px-3 py-2 font-semibold">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, i) => {
            const load = resolveLeg(index, row.loadName, row.loadCode, row.loadRegion);
            const discharge = resolveLeg(index, row.dischargeName, row.dischargeCode, row.dischargeRegion);
            const lowConfidence = (row.confidence ?? 1) < 0.7;
            return (
              <tr key={i} className={selected && !selected.has(i) ? "opacity-45" : ""}>
                {selected ? (
                  <td className="px-3 py-2">
                    <input type="checkbox" aria-label={`Include row ${i + 1}`} checked={selected.has(i)} onChange={() => onToggle?.(i)} className="h-4 w-4 accent-[var(--color-blue)]" />
                  </td>
                ) : null}
                <td className="px-3 py-2">
                  <p className="font-medium text-ink">
                    {row.loadName} <span className="text-dim">→</span> {row.dischargeName}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-1">
                    <span className={`rounded px-1.5 py-px text-[10.5px] font-semibold ${MATCH_STYLE[load.match]}`}>{matchText(load)}</span>
                    <span className={`rounded px-1.5 py-px text-[10.5px] font-semibold ${MATCH_STYLE[discharge.match]}`}>{matchText(discharge)}</span>
                    {lowConfidence ? <span className="rounded bg-[#fff6e5] px-1.5 py-px text-[10.5px] font-semibold text-[#9a5b00]">check · {Math.round((row.confidence ?? 0) * 100)}%</span> : null}
                  </p>
                </td>
                <td className="px-3 py-2 font-mono">{row.cargoMinKt === row.cargoMaxKt ? row.cargoMinKt : `${row.cargoMinKt}–${row.cargoMaxKt}`}</td>
                <td className="px-3 py-2 font-mono">{row.rateLow === row.rateHigh ? row.rateLow.toFixed(2) : `${row.rateLow}–${row.rateHigh}`}</td>
                <td className="px-3 py-2 font-mono text-mid">{row.fixtureDate}</td>
                <td className="max-w-[180px] truncate px-3 py-2 text-mid" title={row.excerpt || row.source}>
                  {row.source}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function FixtureImport({
  mode,
  index,
  lastExtraction,
  onClose,
  onImported,
}: {
  mode: "sheet" | "ai";
  index: PortIndex;
  lastExtraction: { fileName: string; at: string; count: number } | null;
  onClose: () => void;
  onImported: () => void;
}) {
  const [text, setText] = useState("");
  const [sheetLabel, setSheetLabel] = useState("Pasted sheet");
  const [previewed, setPreviewed] = useState("");
  const [aiRows, setAiRows] = useState<FixtureInput[] | null>(null);
  const [aiFile, setAiFile] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [reading, setReading] = useState(false);
  const [busy, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => (previewed ? parseFixtureSheet(previewed, sheetLabel || "CSV import") : null), [previewed, sheetLabel]);

  const commit = (rows: FixtureInput[], origin: "csv" | "ai", batchLabel: string) =>
    start(async () => {
      const result = await importFixtures(rows, origin, batchLabel);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`Imported ${result.count} fixtures${result.skipped ? `, skipped ${result.skipped}` : ""}.`);
      onImported();
    });

  const showAi = (rows: FixtureInput[], fileName: string) => {
    setAiRows(rows);
    setAiFile(fileName);
    setSelected(new Set(rows.map((_, i) => i)));
  };

  const readFile = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a rate sheet first.");
      return;
    }
    setReading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/admin/freight-calculator/extract", { method: "POST", body });
      const result = (await response.json().catch(() => null)) as { ok: boolean; rows?: FixtureInput[]; fileName?: string; message?: string } | null;
      if (!result?.ok || !result.rows) toast.error(result?.message ?? "Could not read this file.");
      else {
        showAi(result.rows, result.fileName ?? file.name);
        toast.success(`Gemini found ${result.rows.length} rows. Review them before importing.`);
      }
    } finally {
      setReading(false);
    }
  };

  const loadLast = () =>
    start(async () => {
      const last = await lastExtractionRows();
      if (last?.rows.length) showAi(last.rows, last.fileName);
      else toast.error("There is no saved AI result.");
    });

  return (
    <section className="rounded-2xl border border-blue/25 bg-surface shadow-[0_1px_2px_rgba(26,58,92,0.05)]">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-light text-blue">{mode === "ai" ? <Sparkles className="h-4 w-4" /> : <TableProperties className="h-4 w-4" />}</span>
          <div>
            <h2 className="text-[14px] font-bold text-ink">{mode === "ai" ? "Read a rate sheet with AI" : "Import a pasted sheet"}</h2>
            <p className="mt-0.5 text-[12px] text-dim">
              {mode === "ai"
                ? "Upload a PDF or image of a broker rate sheet. Gemini proposes rows and nothing is saved until you import them."
                : "Paste rows from Excel or a broker email. Columns: load, discharge, cargo kT, rate $/MT, then optional cargo type, source and date."}
            </p>
          </div>
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className="rounded-md p-1.5 text-dim hover:bg-s2 hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 p-5">
        {mode === "sheet" ? (
          <>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div>
                <textarea
                  aria-label="Fixture rows"
                  rows={7}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={SAMPLE}
                  className={`${textarea} font-mono text-[12px]`}
                />
                <p className="mt-1 text-[11.5px] text-dim">Ranges like 10-15 or 28/29 work. A line holding only a region name sets the load for the rows under it.</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label htmlFor="sheet-label" className={label}>
                    Source and batch name
                  </label>
                  <input id="sheet-label" value={sheetLabel} onChange={(event) => setSheetLabel(event.target.value)} className={`${field} mt-1.5 h-10 w-full`} maxLength={80} />
                </div>
                <button type="button" className={`${btnSecondary} w-full`} disabled={!text.trim()} onClick={() => setPreviewed(text)}>
                  Preview rows
                </button>
              </div>
            </div>
            {parsed ? (
              <div className="space-y-3">
                {parsed.errors.length ? (
                  <ul className="space-y-1 rounded-lg bg-[#fdf2f1] px-3 py-2 text-[12px] text-[#b42318]">
                    {parsed.errors.map((error) => (
                      <li key={error.line}>
                        Line {error.line}: {error.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {parsed.rows.length ? <ReviewTable rows={parsed.rows} index={index} /> : null}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12.5px] text-mid">
                    {parsed.rows.length} ready{parsed.errors.length ? `, ${parsed.errors.length} skipped` : ""}.{previewed !== text ? " The text changed since this preview." : ""}
                  </p>
                  <button type="button" className={btnPrimary} disabled={busy || !parsed.rows.length} onClick={() => commit(parsed.rows, "csv", sheetLabel)}>
                    {busy ? "Importing…" : `Import ${parsed.rows.length} fixtures`}
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-[13px] text-mid hover:border-blue/40">
                <FileUp className="h-4 w-4 shrink-0 text-blue" />
                <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="min-w-0 text-[12.5px] file:mr-3 file:rounded-md file:border-0 file:bg-blue-light file:px-2.5 file:py-1 file:text-[12px] file:font-semibold file:text-blue" />
              </label>
              <button type="button" className={btnPrimary} disabled={reading || busy} onClick={readFile}>
                <Sparkles className="h-4 w-4" />
                {reading ? "Reading…" : "Read with AI"}
              </button>
              {lastExtraction ? (
                <button type="button" className={btnSecondary} disabled={reading || busy} onClick={loadLast} title={`${lastExtraction.fileName}, ${formatStamp(lastExtraction.at)} UTC`}>
                  <History className="h-4 w-4" />
                  Last result ({lastExtraction.count})
                </button>
              ) : null}
            </div>
            {reading ? <p className="text-[12.5px] text-mid">Gemini is reading the sheet. Large PDFs can take a minute.</p> : null}
            {aiRows ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-mid">
                  <span>
                    {aiRows.length} rows from <span className="font-semibold text-ink">{aiFile}</span>. Untick anything misread.
                  </span>
                  <span className="flex gap-3">
                    <button type="button" className="font-semibold text-blue" onClick={() => setSelected(new Set(aiRows.map((_, i) => i)))}>
                      Select all
                    </button>
                    <button type="button" className="font-semibold text-blue" onClick={() => setSelected(new Set())}>
                      Select none
                    </button>
                  </span>
                </div>
                <ReviewTable
                  rows={aiRows}
                  index={index}
                  selected={selected}
                  onToggle={(row) =>
                    setSelected((current) => {
                      const next = new Set(current);
                      if (next.has(row)) next.delete(row);
                      else next.add(row);
                      return next;
                    })
                  }
                />
                <div className="flex justify-end">
                  <button type="button" className={btnPrimary} disabled={busy || !selected.size} onClick={() => commit(aiRows.filter((_, i) => selected.has(i)), "ai", aiFile)}>
                    {busy ? "Importing…" : `Import ${selected.size} fixtures`}
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
