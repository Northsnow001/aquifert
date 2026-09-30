"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ClipboardPaste, Copy, Eye, FilePlus2, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { deleteHedgeReport, saveHedgeReport } from "@/app/admin/actions";
import { btnDanger, btnPrimary, btnSecondary, field, input, label, textarea } from "@/components/admin/ui";
import { HedgeMatrix } from "@/components/hub/hedge-matrix";
import {
  deskNow,
  formatDay,
  hedgeRowCount,
  newId,
  parseHedgeReport,
  type CurveDirection,
  type HedgeCommodity,
  type HedgeReport,
  type HedgeRow,
  type HedgeSection,
} from "@/lib/content-types";

type ReportOption = { id: string; title: string; date: string; status: HedgeReport["status"] };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

function nextPeriod(previous: string | undefined) {
  if (!previous) return MONTHS[new Date().getMonth()];
  const index = MONTHS.findIndex((month) => month.slice(0, 3).toLowerCase() === previous.trim().slice(0, 3).toLowerCase());
  if (index < 0) return "";
  const next = MONTHS[(index + 1) % 12];
  return previous === previous.toUpperCase() ? next.toUpperCase() : next;
}

const DIRS: { value: CurveDirection; mark: string; label: string; active: string }[] = [
  { value: "up", mark: "↑", label: "Higher", active: "bg-[#eaf5f0] text-teal ring-teal/40" },
  { value: "flat", mark: "→", label: "Unchanged", active: "bg-s2 text-ink ring-border" },
  { value: "down", mark: "↓", label: "Lower", active: "bg-red-50 text-danger ring-red-200" },
];

const cellBase =
  "h-9 rounded-md border border-transparent bg-white px-2 font-mono text-[12.5px] text-ink outline-none transition hover:border-border focus:border-blue/50 focus:ring-2 focus:ring-blue/15";
const cell = `${cellBase} w-full`;

export function HedgeEditor({ initial, reports, openPaste }: { initial: HedgeReport; reports: ReportOption[]; openPaste?: boolean }) {
  const router = useRouter();
  const [report, setReport] = useState<HedgeReport>(initial);
  const [dirty, setDirty] = useState(!initial.id);
  const [filter, setFilter] = useState<string>("all");
  const [pasteOpen, setPasteOpen] = useState(Boolean(openPaste));
  const [showPreview, setShowPreview] = useState(true);
  const [pending, startTransition] = useTransition();

  const update = (mutate: (draft: HedgeReport) => HedgeReport) => {
    setReport((current) => mutate(current));
    setDirty(true);
  };
  const updateSection = (sectionId: string, mutate: (section: HedgeSection) => HedgeSection) =>
    update((draft) => ({ ...draft, sections: draft.sections.map((s) => (s.id === sectionId ? mutate(s) : s)) }));
  const updateCommodity = (sectionId: string, commodityId: string, mutate: (commodity: HedgeCommodity) => HedgeCommodity) =>
    updateSection(sectionId, (section) => ({ ...section, commodities: section.commodities.map((c) => (c.id === commodityId ? mutate(c) : c)) }));
  const updateRow = (sectionId: string, commodityId: string, rowId: string, patch: Partial<HedgeRow>) =>
    updateCommodity(sectionId, commodityId, (commodity) => ({ ...commodity, rows: commodity.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) }));

  const save = () => {
    startTransition(async () => {
      const result = await saveHedgeReport(report);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setDirty(false);
      toast.success(report.status === "published" ? "Saved. Members see this report on the hub." : "Draft saved. Members do not see it yet.");
      if (result.id !== report.id) setReport((current) => ({ ...current, id: result.id }));
      router.replace(`/admin/hedge?id=${result.id}`);
      router.refresh();
    });
  };

  const remove = () => {
    if (!report.id || !window.confirm(`Delete “${report.title || formatDay(report.date)}”? Members will no longer see it.`)) return;
    startTransition(async () => {
      await deleteHedgeReport(report.id);
      toast.success("Report deleted.");
      router.replace("/admin/hedge");
      router.refresh();
    });
  };

  const duplicate = () => {
    const today = deskNow().slice(0, 10);
    setReport((current) => ({
      ...current,
      id: "",
      date: today,
      status: "draft",
      title: `Daily Hedge Update – ${today}`,
      sections: current.sections.map((section) => ({
        ...section,
        id: newId("sec"),
        commodities: section.commodities.map((commodity) => ({
          ...commodity,
          id: newId("com"),
          rows: commodity.rows.map((row) => ({ ...row, id: newId("row") })),
        })),
      })),
    }));
    setDirty(true);
    toast.message("Copy ready. Adjust the prices, then save to create the new report.");
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        save();
      }
    };
    const onLeave = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  });

  const loadReport = (id: string) => {
    if (dirty && !window.confirm("Leave this report? Unsaved changes will be lost.")) return;
    router.push(id ? `/admin/hedge?id=${id}` : "/admin/hedge?new=1");
  };

  const shown = filter === "all" ? report.sections : report.sections.filter((s) => s.id === filter);
  const totalRows = report.sections.reduce((n, s) => n + hedgeRowCount(s), 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center gap-2 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <select
          aria-label="Load a report"
          value={report.id}
          onChange={(event) => loadReport(event.target.value)}
          className={`${field} h-9 min-w-[15rem] text-[13px] font-semibold`}
        >
          {!report.id ? <option value="">Unsaved report</option> : null}
          {reports.map((option) => (
            <option key={option.id} value={option.id} title={option.title}>
              {formatDay(option.date)}
              {option.status === "draft" ? " · Draft" : " · Published"}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => loadReport("")} className={btnSecondary}>
          <FilePlus2 className="h-4 w-4" />
          New
        </button>
        <button type="button" onClick={() => setPasteOpen(true)} className={btnSecondary}>
          <ClipboardPaste className="h-4 w-4" />
          Paste report
        </button>
        <button type="button" onClick={duplicate} disabled={!report.id} className={btnSecondary}>
          <Copy className="h-4 w-4" />
          Duplicate
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 font-mono text-[11.5px] ${dirty ? "text-[#9a5b00]" : "text-dim"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dirty ? "bg-[#d98a00]" : "bg-teal"}`} />
            {dirty ? "Unsaved" : "Saved"}
          </span>
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            aria-pressed={showPreview}
            title={showPreview ? "Hide the hub preview" : "Show the hub preview"}
            className={`${btnSecondary} hidden xl:inline-flex ${showPreview ? "bg-blue-light text-blue" : ""}`}
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          {report.id ? (
            <button type="button" onClick={remove} disabled={pending} className={btnDanger}>
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          ) : null}
          <button type="button" onClick={save} disabled={pending} className={btnPrimary}>
            <Save className="h-4 w-4" />
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className={`grid gap-5 ${showPreview ? "xl:grid-cols-2" : ""}`}>
        <div className="flex min-w-0 flex-col gap-5">
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(26,58,92,0.05)]">
            <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,12rem)]">
              <div className="sm:col-span-2">
                <label className={label} htmlFor="report-title">
                  Title
                </label>
                <input
                  id="report-title"
                  value={report.title}
                  onChange={(event) => update((draft) => ({ ...draft, title: event.target.value }))}
                  placeholder={`Daily Hedge Update – ${report.date}`}
                  className={`${input} mt-1.5`}
                />
              </div>
              <div>
                <p className={label}>Status</p>
                <div className="mt-1.5 grid grid-cols-2 rounded-lg border border-border bg-s2/60 p-0.5">
                  {(["published", "draft"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => update((draft) => ({ ...draft, status }))}
                      className={`rounded-md px-3 py-1.5 text-[12.5px] font-semibold capitalize transition ${
                        report.status === status ? "bg-white text-ink shadow-sm" : "text-mid hover:text-ink"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={label} htmlFor="report-date">
                  Report date
                </label>
                <input
                  id="report-date"
                  type="date"
                  value={report.date}
                  onChange={(event) => update((draft) => ({ ...draft, date: event.target.value }))}
                  className={`${input} mt-1.5 font-mono text-[12.5px]`}
                />
              </div>
            </div>
            <label className={`${label} mt-4`} htmlFor="narrative">
              Market narrative
            </label>
            <textarea
              id="narrative"
              rows={5}
              value={report.narrative}
              onChange={(event) => update((draft) => ({ ...draft, narrative: event.target.value }))}
              placeholder="What paper is saying this week. Leave a blank line between paragraphs."
              className={`${textarea} mt-1.5`}
            />
          </section>

          <section className="aq-card">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-3">
              {[{ id: "all", label: "All", count: totalRows }, ...report.sections.map((s) => ({ id: s.id, label: s.label || "Section", count: hedgeRowCount(s) }))].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-wide transition ${
                    filter === tab.id ? "bg-blue text-white" : "bg-s2 text-mid hover:text-ink"
                  }`}
                >
                  {tab.label}
                  <span className={`rounded-full px-1.5 font-mono text-[10.5px] ${filter === tab.id ? "bg-white/20" : "bg-white text-dim"}`}>{tab.count}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-4 p-4">
              {shown.map((section) => {
                const position = report.sections.findIndex((s) => s.id === section.id);
                return (
                  <div key={section.id} className="rounded-xl border border-border bg-s2/30">
                    <div className="flex items-center gap-2 border-b border-border bg-s3/70 px-3 py-2">
                      <input
                        aria-label="Section name"
                        value={section.label}
                        onChange={(event) => updateSection(section.id, (s) => ({ ...s, label: event.target.value }))}
                        className="h-8 flex-1 rounded-md border border-transparent bg-transparent px-2 text-[13px] font-bold uppercase tracking-wide text-ink outline-none hover:border-border focus:border-blue/50 focus:bg-white"
                      />
                      <button
                        type="button"
                        title="Move section up"
                        disabled={position === 0}
                        onClick={() =>
                          update((draft) => {
                            const sections = [...draft.sections];
                            [sections[position - 1], sections[position]] = [sections[position], sections[position - 1]];
                            return { ...draft, sections };
                          })
                        }
                        className="rounded p-1.5 text-dim hover:bg-white hover:text-ink disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Move section down"
                        disabled={position === report.sections.length - 1}
                        onClick={() =>
                          update((draft) => {
                            const sections = [...draft.sections];
                            [sections[position + 1], sections[position]] = [sections[position], sections[position + 1]];
                            return { ...draft, sections };
                          })
                        }
                        className="rounded p-1.5 text-dim hover:bg-white hover:text-ink disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Delete section"
                        onClick={() => {
                          if (!window.confirm(`Delete the ${section.label || "section"} section and its prices?`)) return;
                          update((draft) => ({ ...draft, sections: draft.sections.filter((s) => s.id !== section.id) }));
                          setFilter("all");
                        }}
                        className="rounded p-1.5 text-dim hover:bg-red-50 hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-col gap-3 p-3">
                      {section.commodities.map((commodity) => (
                        <div key={commodity.id} className="rounded-lg border border-border bg-white">
                          <div className="flex items-center gap-2 border-b border-border px-2 py-2">
                            <input
                              aria-label="Commodity"
                              value={commodity.label}
                              onChange={(event) => updateCommodity(section.id, commodity.id, (c) => ({ ...c, label: event.target.value }))}
                              placeholder="Commodity, e.g. MAP CFR Brazil"
                              className={`${cellBase} min-w-0 flex-1 font-sans text-[13px] font-semibold`}
                            />
                            <input
                              aria-label="Index value"
                              value={commodity.index}
                              onChange={(event) => updateCommodity(section.id, commodity.id, (c) => ({ ...c, index: event.target.value }))}
                              placeholder="Index value"
                              className={`${cellBase} w-32 shrink-0`}
                            />
                            <button
                              type="button"
                              title="Delete commodity"
                              onClick={() =>
                                updateSection(section.id, (s) => ({ ...s, commodities: s.commodities.filter((c) => c.id !== commodity.id) }))
                              }
                              className="rounded p-1.5 text-dim hover:bg-red-50 hover:text-danger"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="px-2 py-1.5">
                            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] gap-x-2 px-1 pb-1 font-mono text-[10px] uppercase tracking-wide text-dim">
                              <span>Period</span>
                              <span>Bid</span>
                              <span>Ask</span>
                              <span className="w-[6.5rem] text-center">Direction</span>
                              <span className="w-7" />
                            </div>
                            {commodity.rows.map((row) => (
                              <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center gap-x-2 py-0.5">
                                <input
                                  aria-label="Period"
                                  value={row.period}
                                  onChange={(event) => updateRow(section.id, commodity.id, row.id, { period: event.target.value })}
                                  className={`${cell} bg-s2/50`}
                                />
                                <input
                                  aria-label="Bid"
                                  inputMode="decimal"
                                  value={row.bid}
                                  onChange={(event) => updateRow(section.id, commodity.id, row.id, { bid: event.target.value })}
                                  className={`${cell} bg-s2/50 text-right`}
                                />
                                <input
                                  aria-label="Ask"
                                  inputMode="decimal"
                                  value={row.ask}
                                  onChange={(event) => updateRow(section.id, commodity.id, row.id, { ask: event.target.value })}
                                  className={`${cell} bg-s2/50 text-right`}
                                />
                                <div className="flex w-[6.5rem] overflow-hidden rounded-md border border-border" role="radiogroup" aria-label="Direction">
                                  {DIRS.map((dir) => (
                                    <button
                                      key={dir.value}
                                      type="button"
                                      role="radio"
                                      aria-checked={row.dir === dir.value}
                                      title={dir.label}
                                      onClick={() => updateRow(section.id, commodity.id, row.id, { dir: dir.value })}
                                      className={`h-8 flex-1 text-[14px] font-bold transition ${row.dir === dir.value ? `${dir.active} ring-1 ring-inset` : "bg-white text-dim hover:text-ink"}`}
                                    >
                                      {dir.mark}
                                    </button>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  title="Delete month"
                                  onClick={() => updateCommodity(section.id, commodity.id, (c) => ({ ...c, rows: c.rows.filter((r) => r.id !== row.id) }))}
                                  className="flex h-7 w-7 items-center justify-center rounded text-dim hover:bg-red-50 hover:text-danger"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() =>
                                updateCommodity(section.id, commodity.id, (c) => {
                                  const last = c.rows[c.rows.length - 1];
                                  return {
                                    ...c,
                                    rows: [...c.rows, { id: newId("row"), period: nextPeriod(last?.period), bid: last?.bid ?? "", ask: last?.ask ?? "", dir: "flat" }],
                                  };
                                })
                              }
                              className="mt-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold text-blue hover:bg-blue-light"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add month
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          updateSection(section.id, (s) => ({
                            ...s,
                            commodities: [
                              ...s.commodities,
                              { id: newId("com"), label: "", index: "", rows: [{ id: newId("row"), period: nextPeriod(undefined), bid: "", ask: "", dir: "flat" }] },
                            ],
                          }))
                        }
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-[12.5px] font-semibold text-mid transition hover:border-blue/40 hover:text-blue"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add commodity
                      </button>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  const id = newId("sec");
                  update((draft) => ({ ...draft, sections: [...draft.sections, { id, label: "New section", commodities: [] }] }));
                  setFilter("all");
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border py-3 text-[13px] font-semibold text-mid transition hover:border-blue/40 hover:text-blue"
              >
                <Plus className="h-4 w-4" />
                Add section
              </button>
            </div>
          </section>
        </div>

        {showPreview ? (
          <aside className="min-w-0 xl:sticky xl:top-20 xl:self-start">
            <div className="overflow-hidden aq-card">
              <div className="flex items-center justify-between border-b border-border bg-s2/50 px-4 py-2.5">
                <p className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
                  <Eye className="h-4 w-4 text-blue" />
                  Hub preview
                </p>
                <span className="font-mono text-[11px] text-dim">
                  {formatDay(report.date)} · {report.status === "published" ? "live" : "draft"}
                </span>
              </div>
              <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto">
                {report.narrative ? (
                  <div className="space-y-2 border-b border-border px-4 py-3">
                    {report.narrative
                      .split(/\n\s*\n/)
                      .filter(Boolean)
                      .map((paragraph, i) => (
                        <p key={i} className="text-[12.5px] leading-relaxed text-ink">
                          {paragraph}
                        </p>
                      ))}
                  </div>
                ) : null}
                <HedgeMatrix sections={report.sections} dense />
              </div>
            </div>
          </aside>
        ) : null}
      </div>

      {pasteOpen ? (
        <PasteDialog
          onClose={() => setPasteOpen(false)}
          onApply={(result, mode, useNarrative) => {
            update((draft) => ({
              ...draft,
              narrative: useNarrative && result.narrative ? result.narrative : draft.narrative,
              sections: mode === "replace" ? result.sections : [...draft.sections, ...result.sections],
            }));
            setFilter("all");
            setPasteOpen(false);
            toast.success(`Parsed ${result.prices} prices across ${result.sections.reduce((n, s) => n + s.commodities.length, 0)} commodities.`);
          }}
        />
      ) : null}
    </div>
  );
}

const PASTE_EXAMPLE = `PHOSPHATE
MAP CFR Brazil – latest index 890
Aug 820/870 →
Sept 820/870 →

INTERNATIONAL UREA & AMSUL
Urea FOB AG – latest index 405
Aug 420/440 ↑
Oct 410/440`;

function PasteDialog({
  onClose,
  onApply,
}: {
  onClose: () => void;
  onApply: (result: ReturnType<typeof parseHedgeReport>, mode: "replace" | "append", useNarrative: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"replace" | "append">("replace");
  const [useNarrative, setUseNarrative] = useState(true);
  const result = useMemo(() => parseHedgeReport(text), [text]);
  const commodities = result.sections.reduce((n, s) => n + s.commodities.length, 0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Paste a hedge report">
      <div className="flex max-h-[90dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div>
            <h2 className="text-[15px] font-bold text-ink">Paste a hedge report</h2>
            <p className="text-[12.5px] text-mid">Paste the desk report as text. The tables fill in as you paste.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-dim hover:bg-s2 hover:text-ink" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-2">
          <div className="flex min-h-0 flex-col border-b border-border p-4 md:border-b-0 md:border-r">
            <textarea
              autoFocus
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={PASTE_EXAMPLE}
              className={`${textarea} min-h-[18rem] flex-1 font-mono text-[12.5px]`}
            />
            <p className="mt-2 text-[11.5px] leading-relaxed text-dim">
              Section headings on their own line, then a commodity with an optional “– latest index 890”, then months as “Aug 820/870 ↑”. Offers like “Oct $430 offered” work too.
              Sentences before the first table become the narrative.
            </p>
          </div>
          <div className="flex min-h-0 flex-col">
            <div className="flex items-center gap-3 border-b border-border px-4 py-2.5 font-mono text-[11.5px]">
              <span className={result.prices ? "text-teal" : "text-dim"}>
                {result.sections.length} sections · {commodities} commodities · {result.prices} prices
              </span>
              {result.narrative ? <span className="text-mid">· narrative found</span> : null}
            </div>
            <div className="min-h-[12rem] flex-1 overflow-y-auto">
              {result.prices ? <HedgeMatrix sections={result.sections} dense /> : <p className="px-4 py-10 text-center text-[12.5px] text-dim">The parsed tables show here.</p>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-border bg-s2/40 px-5 py-3">
          <div className="grid grid-cols-2 rounded-lg border border-border bg-white p-0.5">
            {(["replace", "append"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded-md px-3 py-1 text-[12.5px] font-semibold transition ${mode === value ? "bg-blue text-white" : "text-mid hover:text-ink"}`}
              >
                {value === "replace" ? "Replace tables" : "Add to tables"}
              </button>
            ))}
          </div>
          {result.narrative ? (
            <label className="flex items-center gap-2 text-[12.5px] text-ink">
              <input type="checkbox" checked={useNarrative} onChange={(event) => setUseNarrative(event.target.checked)} className="h-4 w-4 accent-[#2e6da4]" />
              Use the pasted narrative
            </label>
          ) : null}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className={btnSecondary}>
              Cancel
            </button>
            <button type="button" disabled={!result.prices} onClick={() => onApply(result, mode, useNarrative)} className={btnPrimary}>
              Apply {result.prices ? `${result.prices} prices` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
