"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPaste, FileText, Search, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { applyPriceFile } from "@/app/admin/netback/actions";
import { Panel } from "@/components/admin/aquibot/shared";
import { Pill, btnGhost, btnPrimary, btnSecondary, field, textarea } from "@/components/admin/ui";
import { formatDay, formatStamp } from "@/lib/content-types";
import { parseNitrogenFile, selectBenchmarks } from "@/lib/netback-desk/parse";
import type { Benchmark, NitrogenRow, PriceFile } from "@/lib/netback-desk/types";

const MAX_CHARS = 900_000;

function RowsTable({ rows, used }: { rows: NitrogenRow[]; used: Set<string> }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = needle ? rows.filter((row) => [row.product, row.series, row.incoterm, row.packaging].some((value) => value.toLowerCase().includes(needle))) : rows;
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border">
      <div className="relative border-b border-border bg-s2/40 px-3 py-2">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dim" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter by product, series or incoterm" aria-label="Filter rows" className={`${field} h-8 w-full pl-8 text-[12.5px]`} />
      </div>
      <div className="max-h-[360px] overflow-auto">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-s2 text-left font-mono text-[10px] uppercase tracking-[0.1em] text-dim">
            <tr>
              <th className="px-3 py-1.5 font-semibold">Product</th>
              <th className="px-3 py-1.5 font-semibold">Terms</th>
              <th className="px-3 py-1.5 font-semibold">Series</th>
              <th className="px-3 py-1.5 text-right font-semibold">Low</th>
              <th className="px-3 py-1.5 text-right font-semibold">High</th>
              <th className="px-3 py-1.5 text-right font-semibold">Mid</th>
              <th className="px-3 py-1.5 font-semibold">Unit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.map((row, index) => {
              const hit = used.has(`${row.product}|${row.incoterm}|${row.series}`);
              return (
                <tr key={index} className={hit ? "bg-[#f1faf4]" : ""}>
                  <td className="px-3 py-1.5 text-ink">
                    {row.product}
                    {hit ? <span className="ml-1.5 font-mono text-[10px] font-semibold uppercase text-[#1f7a45]">benchmark</span> : null}
                  </td>
                  <td className="px-3 py-1.5 text-mid">
                    {row.incoterm} · {row.packaging}
                  </td>
                  <td className="px-3 py-1.5 text-ink">{row.series}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-mid">{row.low || "—"}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-mid">{row.high || "—"}</td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold text-ink">{row.mid}</td>
                  <td className="px-3 py-1.5 text-dim">{row.unit}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-3 py-1.5 text-[11.5px] text-dim">
        {shown.length} of {rows.length} rows · highlighted rows set a benchmark
      </p>
    </div>
  );
}

export function PriceFileCard({ priceFile, benchmarks, blocked, icon }: { priceFile: PriceFile | null; benchmarks: Benchmark[]; blocked: boolean; icon: React.ReactNode }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [pasting, setPasting] = useState(false);
  const [showRows, setShowRows] = useState(false);
  const [showPreviewRows, setShowPreviewRows] = useState(false);
  const [applying, start] = useTransition();

  const preview = useMemo(() => {
    if (!text.trim()) return null;
    const parsed = parseNitrogenFile(text);
    return { parsed, matches: selectBenchmarks(parsed.rows) };
  }, [text]);

  const currentUsed = useMemo(() => new Set(benchmarks.filter((item) => item.source === "file" && item.series).map((item) => `${item.product}|FOB|${item.series}`)), [benchmarks]);
  const previewUsed = useMemo(() => new Set(Object.values(preview?.matches ?? {}).map((row) => `${row.product}|${row.incoterm}|${row.series}`)), [preview]);

  const clear = () => {
    setText("");
    setFileName("");
    setPasting(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_CHARS) {
      toast.error("That file is larger than a weekly price list. Check it is the nitrogen text export.");
      return;
    }
    setFileName(file.name);
    setPasting(false);
    setText(await file.text());
  };

  const apply = () => {
    if (!preview) return;
    start(async () => {
      const result = await applyPriceFile({ text, fileName: fileName || "Pasted price list" });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`Applied ${result.applied} benchmark ${result.applied === 1 ? "price" : "prices"} for week ${result.week}. The hub uses them now.`);
      clear();
      router.refresh();
    });
  };

  const matchCount = preview ? Object.keys(preview.matches).length : 0;
  const missing = preview ? benchmarks.filter((item) => !preview.matches[item.key]) : [];

  return (
    <Panel
      icon={icon}
      title="Weekly price file"
      description="The nitrogen price export. Loading it fills every benchmark it has a FOB urea series for; origins it does not cover keep their current price."
      actions={
        <>
          <input ref={inputRef} type="file" accept=".txt,.csv,.tsv,text/plain" className="hidden" onChange={(event) => void readFile(event.target.files?.[0])} />
          <button type="button" className={btnSecondary} onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Choose file
          </button>
          <button type="button" className={btnGhost} onClick={() => setPasting((value) => !value)}>
            <ClipboardPaste className="h-3.5 w-3.5" />
            Paste
          </button>
        </>
      }
    >
      {priceFile ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border bg-s2/40 px-3.5 py-2.5 text-[12.5px]">
          <span className="flex items-center gap-2 font-semibold text-ink">
            <FileText className="h-4 w-4 text-blue" />
            {priceFile.fileName}
          </span>
          <span className="text-mid">
            Week {priceFile.week || "?"} {priceFile.year} · priced {priceFile.priceDate ? formatDay(priceFile.priceDate) : "—"}
          </span>
          <span className="text-mid">
            {priceFile.rows.length} rows · {priceFile.lineCount} lines
          </span>
          <span className="text-dim">Loaded {formatStamp(priceFile.uploadedAt)}</span>
          <button type="button" className={`${btnGhost} ml-auto`} onClick={() => setShowRows((value) => !value)}>
            {showRows ? "Hide rows" : "View all rows"}
          </button>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-3.5 py-3 text-[12.5px] text-mid">No file loaded yet. The benchmarks show the built-in week 28 prices until you load a file or edit them.</p>
      )}
      {priceFile && showRows ? <RowsTable rows={priceFile.rows} used={currentUsed} /> : null}

      {pasting && !fileName ? (
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, MAX_CHARS))}
          rows={7}
          placeholder={"FileType=WeeklyPriceData|Product=Nitrogen|Week=29|Year=2026|PriceDate=2026-07-16\nPriceDate|Week|Year|Granularity|Product|Packaging|Incoterm|Series|Price_Low|Price_High|Price_Mid|Unit\n2026-07-16|29|2026|Weekly|Granular Urea|Bulk|FOB|Egypt Europe|435|445|440|USD/t"}
          className={`${textarea} mt-3 font-mono text-[11.5px]`}
          aria-label="Paste the price file"
        />
      ) : null}

      {preview ? (
        <div className="mt-4 rounded-xl border border-blue/30 bg-blue-light/30">
          <div className="flex flex-wrap items-center gap-2 border-b border-blue/20 px-3.5 py-2.5">
            <p className="text-[13px] font-semibold text-ink">{fileName || "Pasted text"}</p>
            <Pill tone="blue">
              Week {preview.parsed.week || "?"} {preview.parsed.year}
            </Pill>
            {preview.parsed.priceDate ? <Pill>Priced {formatDay(preview.parsed.priceDate)}</Pill> : <Pill tone="amber">No price date</Pill>}
            <Pill tone={preview.parsed.rows.length ? "teal" : "amber"}>{preview.parsed.rows.length} rows read</Pill>
            {preview.parsed.skipped.length ? <Pill tone="amber">{preview.parsed.skipped.length} skipped</Pill> : null}
            <button type="button" className={`${btnGhost} ml-auto`} onClick={clear} aria-label="Discard preview">
              <X className="h-3.5 w-3.5" />
              Discard
            </button>
          </div>

          {matchCount ? (
            <table className="w-full bg-white text-[12.5px]">
              <thead className="text-left font-mono text-[10px] uppercase tracking-[0.1em] text-dim">
                <tr>
                  <th className="px-3.5 py-1.5 font-semibold">Origin</th>
                  <th className="px-3 py-1.5 font-semibold">Series in the file</th>
                  <th className="px-3 py-1.5 text-right font-semibold">Range</th>
                  <th className="px-3 py-1.5 text-right font-semibold">Now</th>
                  <th className="px-3 py-1.5 text-right font-semibold">New</th>
                  <th className="px-3.5 py-1.5 text-right font-semibold">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {benchmarks.map((item) => {
                  const match = preview.matches[item.key];
                  if (!match) return null;
                  const change = match.mid - item.fob;
                  return (
                    <tr key={item.key}>
                      <td className="px-3.5 py-1.5 font-semibold text-ink">{item.label}</td>
                      <td className="px-3 py-1.5 text-mid">
                        {match.series} <span className="text-dim">· {match.product}</span>
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-dim">{match.low && match.high ? `${match.low}–${match.high}` : "—"}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-mid">{item.fob || "—"}</td>
                      <td className="px-3 py-1.5 text-right font-mono font-semibold text-ink">{match.mid}</td>
                      <td className={`px-3.5 py-1.5 text-right font-mono ${change > 0 ? "text-[#b42318]" : change < 0 ? "text-[#1f7a45]" : "text-dim"}`}>
                        {change ? `${change > 0 ? "+" : "−"}${Math.abs(change).toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="bg-white px-3.5 py-3 text-[12.5px] text-danger">
              {preview.parsed.rows.length ? "None of these rows are FOB urea prices for the nine benchmark origins." : "No rows matched the weekly nitrogen format. Check the header line starts with PriceDate|Week|Year."}
            </p>
          )}

          <div className="space-y-1.5 px-3.5 py-2.5 text-[12px] text-mid">
            {missing.length && matchCount ? <p>Not in this file, keeps its current price: {missing.map((item) => item.label).join(", ")}.</p> : null}
            {preview.parsed.skipped.slice(0, 3).map((line) => (
              <p key={line.line} className="truncate font-mono text-[11px] text-[#9a5b00]" title={line.text}>
                Line {line.line}: {line.reason} — {line.text}
              </p>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-blue/20 px-3.5 py-2.5">
            <button type="button" className={btnPrimary} disabled={!matchCount || applying || blocked} onClick={apply}>
              {applying ? "Applying…" : `Apply ${matchCount} ${matchCount === 1 ? "price" : "prices"}`}
            </button>
            <button type="button" className={btnGhost} onClick={() => setShowPreviewRows((value) => !value)} disabled={!preview.parsed.rows.length}>
              {showPreviewRows ? "Hide rows" : `Check all ${preview.parsed.rows.length} rows`}
            </button>
            {blocked ? <span className="text-[12px] text-[#9a5b00]">Save or discard your edits in the price table first.</span> : null}
          </div>
          {showPreviewRows && preview.parsed.rows.length ? (
            <div className="px-3.5 pb-3.5">
              <RowsTable rows={preview.parsed.rows} used={previewUsed} />
            </div>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}
