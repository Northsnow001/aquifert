"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveSupplyDemand } from "@/app/admin/aq-content/actions";
import { MarkdownField } from "@/components/admin/aq-content/shared";
import { CardHeader, btnGhost, btnPrimary, btnSecondary, field } from "@/components/admin/ui";
import type { BalanceRow, SupplyDemand, Trend } from "@/lib/aq-modules/types";
import { formatStamp, newId } from "@/lib/content-types";

const NUMBERS = [
  { key: "production", label: "Production" },
  { key: "consumption", label: "Consumption" },
  { key: "imports", label: "Imports" },
  { key: "exports", label: "Exports" },
  { key: "stocks", label: "Stocks" },
] as const;

type NumberKey = (typeof NUMBERS)[number]["key"];
type Draft = Omit<BalanceRow, NumberKey> & Record<NumberKey, string>;

const TRENDS: { value: Trend; label: string }[] = [
  { value: "up", label: "Tightening ↑" },
  { value: "flat", label: "Steady →" },
  { value: "down", label: "Loosening ↓" },
];

const cell = `${field} h-8 w-full px-2 text-[12.5px]`;
const num = (value: string) => (value.trim() === "" ? 0 : Number(value));
const fmt = (value: number) => value.toLocaleString("en-GB", { maximumFractionDigits: 2 });

function toDraft(row: BalanceRow): Draft {
  return { ...row, production: String(row.production), consumption: String(row.consumption), imports: String(row.imports), exports: String(row.exports), stocks: String(row.stocks) };
}

function toRow(draft: Draft): BalanceRow {
  return {
    ...draft,
    production: num(draft.production),
    consumption: num(draft.consumption),
    imports: num(draft.imports),
    exports: num(draft.exports),
    stocks: num(draft.stocks),
  };
}

function derived(draft: Draft) {
  const row = toRow(draft);
  const valid = NUMBERS.every((item) => Number.isFinite(row[item.key]));
  if (!valid) return { surplus: null, stocksToUse: null };
  return {
    surplus: row.production + row.imports - row.consumption - row.exports,
    stocksToUse: row.consumption > 0 ? (row.stocks / row.consumption) * 100 : null,
  };
}

export function SupplyDemandEditor({ data }: { data: SupplyDemand }) {
  const [rows, setRows] = useState<Draft[]>(() => data.balances.map(toDraft));
  const [commentary, setCommentary] = useState(data.commentary);
  const [updatedAt, setUpdatedAt] = useState(data.updatedAt);
  const [savedJson, setSavedJson] = useState(() => JSON.stringify({ rows: data.balances.map(toDraft), commentary: data.commentary }));
  const [saving, start] = useTransition();
  const dirty = JSON.stringify({ rows, commentary }) !== savedJson;

  const patch = (id: string, change: Partial<Draft>) => setRows((current) => current.map((row) => (row.id === id ? { ...row, ...change } : row)));
  const move = (index: number, by: number) =>
    setRows((current) => {
      const target = index + by;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const addRow = () =>
    setRows((current) => [
      ...current,
      {
        id: newId("sd"),
        product: "",
        region: current.at(-1)?.region ?? "World",
        season: current.at(-1)?.season ?? "",
        unit: current.at(-1)?.unit ?? "Mt",
        production: "",
        consumption: "",
        imports: "",
        exports: "",
        stocks: "",
        trend: "flat",
        note: "",
      },
    ]);
  const removeRow = (row: Draft) => {
    if ((row.product || row.note) && !window.confirm(`Remove the ${row.product || "untitled"} row?`)) return;
    setRows((current) => current.filter((item) => item.id !== row.id));
  };

  const save = () =>
    start(async () => {
      const snapshot = JSON.stringify({ rows, commentary });
      const result = await saveSupplyDemand({ balances: rows.map(toRow), commentary });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setSavedJson(snapshot);
      setUpdatedAt(result.updatedAt);
      toast.success("Saved. The hub is showing these balances now.");
    });

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 px-4 py-2.5 shadow-sm backdrop-blur">
        <p className="text-[12.5px] text-mid">
          {dirty ? "Unsaved changes." : updatedAt ? `Live on the hub · updated ${formatStamp(updatedAt)}` : "Live on the hub · not updated from the admin yet"}
        </p>
        <button type="button" onClick={save} disabled={saving || !dirty} className={btnPrimary}>
          {saving ? "Saving…" : "Save balances"}
        </button>
      </div>

      <section className="overflow-hidden aq-card">
        <CardHeader
          title="Balances"
          meta="Surplus is production plus imports, less consumption and exports. Stocks-to-use is stocks as a share of consumption."
          actions={
            <button type="button" onClick={addRow} className={btnSecondary}>
              <Plus className="h-4 w-4" />
              Add row
            </button>
          }
        />
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1380px] text-left">
              <thead>
                <tr className="border-b border-border font-mono text-[10px] uppercase tracking-[0.1em] text-dim">
                  <th className="w-14 px-3 py-2.5" />
                  <th className="w-32 py-2.5 pr-2 font-medium">Product</th>
                  <th className="w-28 py-2.5 pr-2 font-medium">Region</th>
                  <th className="w-20 py-2.5 pr-2 font-medium">Season</th>
                  <th className="w-16 py-2.5 pr-2 font-medium">Unit</th>
                  {NUMBERS.map((item) => (
                    <th key={item.key} className="w-24 py-2.5 pr-2 font-medium">
                      {item.label}
                    </th>
                  ))}
                  <th className="w-20 py-2.5 pr-2 text-right font-medium">Surplus</th>
                  <th className="w-20 py-2.5 pr-3 text-right font-medium">Stocks/use</th>
                  <th className="w-32 py-2.5 pr-2 font-medium">Trend</th>
                  <th className="py-2.5 pr-2 font-medium">Note</th>
                  <th className="w-10 py-2.5 pr-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const { surplus, stocksToUse } = derived(row);
                  return (
                    <tr key={row.id} className="border-b border-border align-middle last:border-b-0">
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="rounded p-0.5 text-dim hover:text-ink disabled:opacity-30" aria-label="Move up">
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => move(index, 1)} disabled={index === rows.length - 1} className="rounded p-0.5 text-dim hover:text-ink disabled:opacity-30" aria-label="Move down">
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-2 pr-2">
                        <input value={row.product} onChange={(event) => patch(row.id, { product: event.target.value })} placeholder="Urea" aria-label="Product" className={`${cell} font-semibold ${row.product.trim() ? "" : "border-red-300"}`} />
                      </td>
                      <td className="py-2 pr-2">
                        <input value={row.region} onChange={(event) => patch(row.id, { region: event.target.value })} placeholder="World" aria-label="Region" className={cell} />
                      </td>
                      <td className="py-2 pr-2">
                        <input value={row.season} onChange={(event) => patch(row.id, { season: event.target.value })} placeholder="2026/27" aria-label="Season" className={`${cell} font-mono`} />
                      </td>
                      <td className="py-2 pr-2">
                        <input value={row.unit} onChange={(event) => patch(row.id, { unit: event.target.value })} placeholder="Mt" aria-label="Unit" className={cell} />
                      </td>
                      {NUMBERS.map((item) => {
                        const value = row[item.key];
                        const bad = value.trim() !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0);
                        return (
                          <td key={item.key} className="py-2 pr-2">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              inputMode="decimal"
                              value={value}
                              onChange={(event) => patch(row.id, { [item.key]: event.target.value })}
                              placeholder="0"
                              aria-label={item.label}
                              className={`${cell} text-right font-mono ${bad ? "border-red-300" : ""}`}
                            />
                          </td>
                        );
                      })}
                      <td className={`py-2 pr-2 text-right font-mono text-[12.5px] font-semibold ${surplus === null ? "text-dim" : surplus < 0 ? "text-danger" : "text-[#1f7a45]"}`}>
                        {surplus === null ? "—" : `${surplus > 0 ? "+" : ""}${fmt(surplus)}`}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-[12.5px] text-ink">{stocksToUse === null ? "—" : `${stocksToUse.toFixed(1)}%`}</td>
                      <td className="py-2 pr-2">
                        <select value={row.trend} onChange={(event) => patch(row.id, { trend: event.target.value as Trend })} aria-label="Trend" className={cell}>
                          {TRENDS.map((trend) => (
                            <option key={trend.value} value={trend.value}>
                              {trend.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-2">
                        <input value={row.note} onChange={(event) => patch(row.id, { note: event.target.value })} placeholder="What decides the balance" aria-label="Note" className={cell} />
                      </td>
                      <td className="py-2 pr-3">
                        <button type="button" onClick={() => removeRow(row)} className={`${btnGhost} hover:bg-red-50 hover:text-danger`} aria-label="Delete row" title="Delete row">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] text-mid">No balance rows. Members see only the commentary.</p>
            <button type="button" onClick={addRow} className={`${btnSecondary} mt-3`}>
              <Plus className="h-4 w-4" />
              Add the first row
            </button>
          </div>
        )}
      </section>

      <section className="aq-card p-5">
        <MarkdownField
          id="commentary"
          title="Desk commentary"
          value={commentary}
          onChange={setCommentary}
          rows={8}
          placeholder="What would change the balance, and what the desk is watching."
        />
      </section>
    </div>
  );
}
