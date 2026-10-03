"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { ToneBadge } from "@/components/hub/kit";
import { num, signedPct, TONE_TEXT } from "@/components/hub/analytics/format";
import { RangeBar } from "@/components/hub/analytics/ui";
import type { SignalItem } from "@/lib/aq-modules/signal";

type SortKey = "label" | "group" | "changePct" | "rangePosition";
type Row = Pick<SignalItem, "id" | "label" | "basis" | "unit" | "group" | "insufficient" | "current" | "start" | "changePct" | "rangePosition" | "direction" | "high" | "low">;

const COLUMNS: { key: SortKey; label: string; className: string }[] = [
  { key: "label", label: "Series", className: "text-left" },
  { key: "group", label: "Group", className: "hidden text-left sm:table-cell" },
  { key: "changePct", label: "Change", className: "text-right" },
  { key: "rangePosition", label: "Range position", className: "text-left" },
];

/** Every series in one table; sort by change or by where the price sits in its window range. */
export function SignalTable({ rows, days }: { rows: Row[]; days: number }) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "changePct", desc: true });

  const live = rows.filter((row) => !row.insufficient);
  const sorted = [...live].sort((a, b) => {
    const diff = sort.key === "label" ? `${a.label} ${a.basis}`.localeCompare(`${b.label} ${b.basis}`) : sort.key === "group" ? a.group.localeCompare(b.group) : a[sort.key] - b[sort.key];
    return sort.desc ? -diff : diff;
  });
  const missing = rows.filter((row) => row.insufficient);

  const toggle = (key: SortKey) => setSort((current) => (current.key === key ? { key, desc: !current.desc } : { key, desc: key === "changePct" || key === "rangePosition" }));

  if (!live.length) return <p className="px-5 py-10 text-center text-[14.5px] text-mid">No series has two prices inside the last {days} days yet. Try a longer window.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[360px] text-[14.5px]">
        <caption className="sr-only">
          Every series over the last {days} days. Column headers sort the table.
        </caption>
        <thead>
          <tr className="border-b border-border bg-s2 font-mono text-[11px] uppercase tracking-wider text-mid">
            {COLUMNS.map((column) => {
              const active = sort.key === column.key;
              const Icon = !active ? ArrowUpDown : sort.desc ? ArrowDown : ArrowUp;
              return (
                <th key={column.key} scope="col" aria-sort={active ? (sort.desc ? "descending" : "ascending") : "none"} className={`px-3 py-2 font-semibold first:pl-4 ${column.className}`}>
                  <button type="button" onClick={() => toggle(column.key)} className={`aq-nopress inline-flex items-center gap-1 rounded-md py-1 uppercase tracking-wider transition hover:text-ink ${active ? "text-ink" : ""}`}>
                    {column.label}
                    <Icon className="h-3 w-3" aria-hidden />
                  </button>
                </th>
              );
            })}
            <th scope="col" className="hidden px-4 py-2 text-left font-semibold md:table-cell">
              Direction
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((row) => (
            <tr key={row.id} className="transition-colors hover:bg-s2/60">
              <th scope="row" className="py-3 pl-4 pr-3 text-left font-normal">
                <span className="block font-semibold text-ink">{row.label}</span>
                <span className="block text-[13px] text-dim">{row.basis}</span>
              </th>
              <td className="hidden px-3 py-3 text-mid sm:table-cell">{row.group}</td>
              <td className="px-3 py-3 text-right">
                <span className={`block font-semibold tabular-nums ${TONE_TEXT[row.direction]}`}>{signedPct(row.changePct)}</span>
                <span className="block text-[12.5px] tabular-nums text-dim">
                  {num(row.start)} → {num(row.current)}
                </span>
              </td>
              <td className="min-w-[132px] px-3 py-3">
                <RangeBar value={row.rangePosition} />
                <span className="mt-1.5 flex justify-between text-[11.5px] tabular-nums text-dim">
                  <span>{num(row.low)}</span>
                  <span className="font-semibold text-mid">{row.rangePosition}</span>
                  <span>{num(row.high)}</span>
                </span>
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                <ToneBadge tone={row.direction} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {missing.length ? (
        <p className="border-t border-border px-4 py-2.5 text-[13px] text-dim">
          Not enough prices in this window for {missing.map((row) => `${row.label} (${row.basis})`).join(", ")}.
        </p>
      ) : null}
    </div>
  );
}
