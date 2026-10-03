"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { HedgeMatrix } from "@/components/hub/hedge-matrix";
import { formatDay, splitParagraphs, type HedgeReport } from "@/lib/content-types";

export function PaperForwardBrief({ reports, className = "" }: { reports: HedgeReport[]; className?: string }) {
  const [reportId, setReportId] = useState(reports[0]?.id ?? "");
  const report = reports.find((item) => item.id === reportId) ?? reports[0];
  if (!report) return null;
  const paragraphs = splitParagraphs(report.narrative);

  return (
    <section aria-labelledby="hedge-title" className={`aq-card flex min-w-0 flex-col overflow-hidden ${className}`}>
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-5 py-3.5">
        <div className="min-w-0">
          <h2 id="hedge-title" className="flex items-center gap-2 text-[16.5px] font-semibold text-ink">
            <FileText className="h-4 w-4 shrink-0 text-blue" />
            Direct Hedge
          </h2>
          <p className="font-mono text-[12px] uppercase tracking-wide text-dim">Paper forward curves</p>
        </div>
        <label className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wide text-dim">Published</span>
          <select
            value={report.id}
            onChange={(event) => setReportId(event.target.value)}
            className="h-8 rounded-lg border border-border bg-white px-2.5 font-mono text-[13px] text-ink outline-none focus:border-blue/40 focus:ring-2 focus:ring-blue/15"
          >
            {reports.map((item) => (
              <option key={item.id} value={item.id}>
                {formatDay(item.date)}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <HedgeMatrix sections={report.sections} fit />
        {paragraphs.length ? (
          <div className="space-y-3 border-t border-border px-5 py-4">
            {paragraphs.map((paragraph, i) => (
              <p key={i} className="whitespace-pre-line text-[15px] leading-relaxed text-ink">
                {paragraph}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
