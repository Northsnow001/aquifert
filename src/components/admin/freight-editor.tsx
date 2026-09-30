"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Copy, Eye, EyeOff, GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveFreightBoard } from "@/app/admin/actions";
import { btnGhost, btnPrimary, btnSecondary, field, label, textarea } from "@/components/admin/ui";
import { FreightCommentary, FreightTable } from "@/components/hub/freight-board";
import { formatStamp, newId, type FreightBoard, type FreightFixture } from "@/lib/content-types";

type Column = { key: keyof Omit<FreightFixture, "id" | "visible">; label: string; placeholder: string; width: string; mono?: boolean };

const COLUMNS: Column[] = [
  { key: "account", label: "Account", placeholder: "MISC", width: "min-w-20 w-24" },
  { key: "product", label: "Product", placeholder: "BHF", width: "min-w-20 w-24" },
  { key: "qty", label: "Qty (Mts)", placeholder: "12,000", width: "min-w-24 w-28", mono: true },
  { key: "origin", label: "Origin", placeholder: "Port, Country", width: "min-w-40" },
  { key: "destination", label: "Destination", placeholder: "Port or region", width: "min-w-40" },
  { key: "laycan", label: "Laycan", placeholder: "DD–DD Mon", width: "min-w-32 w-32" },
];

const blank = (): FreightFixture => ({ id: newId("fx"), account: "", product: "", qty: "", origin: "", destination: "", laycan: "", visible: true });

export function FreightEditor({ initial }: { initial: FreightBoard }) {
  const [board, setBoard] = useState(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [armed, setArmed] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const focusRef = useRef<string | null>(null);
  const [saving, startSaving] = useTransition();
  const tableRef = useRef<HTMLTableSectionElement>(null);

  const dirty = JSON.stringify(board) !== baseline;
  const visible = useMemo(() => board.fixtures.filter((row) => row.visible), [board.fixtures]);

  const setFixtures = (update: (rows: FreightFixture[]) => FreightFixture[]) => setBoard((current) => ({ ...current, fixtures: update(current.fixtures) }));
  const patch = (id: string, change: Partial<FreightFixture>) => setFixtures((rows) => rows.map((row) => (row.id === id ? { ...row, ...change } : row)));

  const add = (after?: FreightFixture) => {
    const row = after ? { ...after, id: newId("fx") } : blank();
    setFixtures((rows) => {
      if (!after) return [...rows, row];
      const index = rows.findIndex((item) => item.id === after.id);
      return [...rows.slice(0, index + 1), row, ...rows.slice(index + 1)];
    });
    focusRef.current = row.id;
  };

  const move = (fromId: string, toId: string) =>
    setFixtures((rows) => {
      const from = rows.findIndex((row) => row.id === fromId);
      const to = rows.findIndex((row) => row.id === toId);
      if (from < 0 || to < 0 || from === to) return rows;
      const next = [...rows];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

  const save = () => {
    if (saving) return;
    startSaving(async () => {
      const result = await saveFreightBoard(board);
      const saved = { ...board, fixtures: board.fixtures.filter((row) => COLUMNS.some((column) => row[column.key].trim())), updatedAt: result.savedAt };
      setBoard(saved);
      setBaseline(JSON.stringify(saved));
      toast.success(saved.showOnHome ? "Freight board saved. The hub home shows it now." : "Freight board saved. It stays hidden on the hub home until you switch it on.");
    });
  };

  useEffect(() => {
    if (!focusRef.current) return;
    tableRef.current?.querySelector<HTMLInputElement>(`[data-row="${focusRef.current}"] input`)?.focus();
    focusRef.current = null;
  }, [board.fixtures]);

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

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 px-4 py-2.5 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-blue-light px-2.5 py-1 font-mono text-[11.5px] font-semibold text-blue">
            {visible.length} of {board.fixtures.length} visible
          </span>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-ink">
            <button
              type="button"
              role="switch"
              aria-checked={board.showOnHome}
              onClick={() => setBoard((current) => ({ ...current, showOnHome: !current.showOnHome }))}
              className={`relative h-5 w-9 rounded-full transition ${board.showOnHome ? "bg-[#1f7a45]" : "bg-[#cfd9e2]"}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${board.showOnHome ? "left-[18px]" : "left-0.5"}`} />
            </button>
            Show on hub home
          </label>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[12px] text-mid">
            <span className={`h-2 w-2 rounded-full ${dirty ? "bg-[#d97706]" : "bg-[#1f7a45]"}`} />
            {dirty ? "Unsaved changes" : board.updatedAt ? `Saved ${formatStamp(board.updatedAt)}` : "Saved"}
          </span>
          <button type="button" onClick={save} disabled={saving || !dirty} className={btnPrimary} title="Save (Ctrl+S)">
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-5">
          <section className="aq-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
              <div>
                <h2 className="text-[14px] font-bold text-ink">Vessel fixtures</h2>
                <p className="mt-0.5 text-[12px] text-dim">Drag the handle to reorder. The eye controls whether members see the row.</p>
              </div>
              <button type="button" onClick={() => add()} className={btnSecondary}>
                <Plus className="h-4 w-4" />
                Add vessel
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-s2/70">
                    <th className="w-8" aria-label="Reorder" />
                    {COLUMNS.map((column) => (
                      <th key={column.key} className="whitespace-nowrap px-1.5 py-2 text-left font-mono text-[10px] font-semibold uppercase tracking-wider text-mid">
                        {column.label}
                      </th>
                    ))}
                    <th className="w-[104px]" aria-label="Row actions" />
                  </tr>
                </thead>
                <tbody ref={tableRef}>
                  {board.fixtures.map((row) => (
                    <tr
                      key={row.id}
                      data-row={row.id}
                      draggable={armed === row.id}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        setDragging(row.id);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (dragging && dragging !== row.id) move(dragging, row.id);
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setArmed(null);
                      }}
                      className={`border-b border-border last:border-b-0 ${dragging === row.id ? "bg-blue-light/60" : ""} ${row.visible ? "" : "bg-s2/40"}`}
                    >
                      <td className="pl-2">
                        <span
                          onPointerDown={() => setArmed(row.id)}
                          onPointerUp={() => setArmed(null)}
                          className="flex h-8 w-6 cursor-grab items-center justify-center rounded text-dim hover:bg-s2 hover:text-ink active:cursor-grabbing"
                          title="Drag to reorder"
                        >
                          <GripVertical className="h-4 w-4" />
                        </span>
                      </td>
                      {COLUMNS.map((column) => (
                        <td key={column.key} className={`px-1 py-1.5 ${column.width}`}>
                          <input
                            value={row[column.key]}
                            onChange={(event) => patch(row.id, { [column.key]: event.target.value })}
                            placeholder={column.placeholder}
                            aria-label={column.label}
                            className={`${field} h-9 w-full ${column.mono ? "font-mono" : ""} ${row.visible ? "" : "text-mid"}`}
                          />
                        </td>
                      ))}
                      <td className="pr-2">
                        <div className="flex justify-end gap-0.5">
                          <button
                            type="button"
                            onClick={() => patch(row.id, { visible: !row.visible })}
                            className={`${btnGhost} ${row.visible ? "text-blue" : "text-dim"}`}
                            title={row.visible ? "Visible on the hub. Click to hide." : "Hidden from members. Click to show."}
                            aria-pressed={row.visible}
                          >
                            {row.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </button>
                          <button type="button" onClick={() => add(row)} className={btnGhost} title="Duplicate row">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => setFixtures((rows) => rows.filter((item) => item.id !== row.id))} className={`${btnGhost} hover:bg-red-50 hover:text-danger`} title="Delete row">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={() => add()}
              className="flex w-full items-center justify-center gap-1.5 border-t border-dashed border-border py-3 text-[13px] font-semibold text-blue transition hover:bg-blue-light/40"
            >
              <Plus className="h-4 w-4" />
              {board.fixtures.length ? "Add vessel fixture" : "Add the first vessel fixture"}
            </button>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(26,58,92,0.05)]">
            <label className={label} htmlFor="freight-commentary">
              Freight commentary
            </label>
            <p className="mt-1 text-[12px] text-dim">A blank line starts a new paragraph. A line wrapped in **double asterisks** becomes a heading.</p>
            <textarea
              id="freight-commentary"
              rows={12}
              value={board.commentary}
              onChange={(event) => setBoard((current) => ({ ...current, commentary: event.target.value }))}
              placeholder="**AQUIFERT FREIGHT INTELLIGENCE — DATA TO 4 SEPTEMBER 2026**"
              className={`${textarea} mt-2 font-[inherit]`}
            />
          </section>
        </div>

        <aside className="min-w-0 xl:sticky xl:top-20 xl:self-start">
          <div className="overflow-hidden aq-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h2 className="text-[13px] font-bold text-ink">Hub preview</h2>
              <span className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wide text-[#1f7a45]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#1f7a45]" />
                Live
              </span>
            </div>
            {board.showOnHome ? null : (
              <p className="border-b border-border bg-[#fff6e5] px-4 py-2 text-[12px] text-[#9a5b00]">Hidden on the hub home. Switch on “Show on hub home” to publish it.</p>
            )}
            <div className={board.showOnHome ? "" : "opacity-60"}>
              <p className="px-4 pt-3 text-[12.5px] font-bold text-ink">Freight Analytics - Open Freight Enquiries</p>
              <div className="mt-2 border-y border-border">
                <FreightTable fixtures={visible} compact />
              </div>
              <div className="max-h-[420px] overflow-y-auto px-4 py-3">
                <FreightCommentary text={board.commentary} compact />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
