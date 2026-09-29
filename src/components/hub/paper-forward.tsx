"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { hedgeBriefs, type CurveDirection } from "@/data/library";

function Move({ dir }: { dir: CurveDirection }) {
  const label = dir === "up" ? "Higher" : dir === "down" ? "Lower" : "Unchanged";
  const mark = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
  const color = dir === "up" ? "text-teal" : dir === "down" ? "text-danger" : "text-dim";
  return (
    <span className={`font-semibold ${color}`} title={label}>
      {mark}
      <span className="sr-only"> {label}</span>
    </span>
  );
}

export function PaperForwardBrief() {
  const [briefId, setBriefId] = useState(hedgeBriefs[0]?.id ?? "");
  const brief = hedgeBriefs.find((item) => item.id === briefId) ?? hedgeBriefs[0];
  if (!brief) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
          <FileText className="h-4 w-4 shrink-0 text-blue" />
          {brief.title}
        </h2>
        <label className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wide text-dim">Published</span>
          <select
            value={brief.id}
            onChange={(event) => setBriefId(event.target.value)}
            className="h-8 rounded-lg border border-border bg-white px-2.5 font-mono text-[12px] text-ink outline-none focus:border-blue/40 focus:ring-2 focus:ring-blue/15"
          >
            {hedgeBriefs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.date}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="space-y-3 border-b border-border px-5 py-4">
        {brief.paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 32)} className="text-[13.5px] leading-relaxed text-ink">
            {paragraph}
          </p>
        ))}
      </div>
      <div className="px-5 pb-2 pt-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-mid">
          Forward curve <span className="font-normal normal-case text-dim">(USD/t, bid / ask)</span>
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-[12.5px]">
          <thead>
            <tr className="border-y border-border bg-s3 font-mono text-[10px] uppercase tracking-wide text-dim">
              <th className="px-5 py-2 font-medium">Period</th>
              <th className="px-3 py-2 font-medium">Market</th>
              <th className="px-3 py-2 text-right font-medium">Bid</th>
              <th className="px-3 py-2 text-right font-medium">Ask</th>
              <th className="px-5 py-2 text-center font-medium">Move</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {brief.rows.map((row) => (
              <tr key={`${row.period}-${row.market}`} className="border-b border-border last:border-b-0">
                <td className="px-5 py-2.5 text-mid">{row.period}</td>
                <td className="px-3 py-2.5 font-sans text-ink">{row.market}</td>
                <td className="px-3 py-2.5 text-right text-ink">{row.bid}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-teal">{row.ask}</td>
                <td className="px-5 py-2.5 text-center">
                  <Move dir={row.dir} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
