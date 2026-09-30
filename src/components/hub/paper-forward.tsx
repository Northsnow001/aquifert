"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { HedgeMatrix } from "@/components/hub/hedge-matrix";
import { formatDay, splitParagraphs, type HedgeReport } from "@/lib/content-types";

export function PaperForwardBrief({ reports }: { reports: HedgeReport[] }) {
  const [reportId, setReportId] = useState(reports[0]?.id ?? "");
  const report = reports.find((item) => item.id === reportId) ?? reports[0];
  if (!report) return null;
  const paragraphs = splitParagraphs(report.narrative);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
          <FileText className="h-4 w-4 shrink-0 text-blue" />
          Direct Hedge | Paper Forward Curves
        </h2>
        <label className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wide text-dim">Published</span>
          <select
            value={report.id}
            onChange={(event) => setReportId(event.target.value)}
            className="h-8 rounded-lg border border-border bg-white px-2.5 font-mono text-[12px] text-ink outline-none focus:border-blue/40 focus:ring-2 focus:ring-blue/15"
          >
            {reports.map((item) => (
              <option key={item.id} value={item.id}>
                {formatDay(item.date)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {paragraphs.length ? (
        <div className="space-y-3 border-b border-border px-5 py-4">
          {paragraphs.map((paragraph, i) => (
            <p key={i} className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink">
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}
      <HedgeMatrix sections={report.sections} />
    </section>
  );
}
