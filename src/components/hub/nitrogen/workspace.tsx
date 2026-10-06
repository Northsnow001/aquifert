"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, Crown, FileText, FlaskConical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteReport } from "@/app/hub/nitrogen-report/actions";
import { btnPrimary, btnSecondary } from "@/components/app/form";
import { EmptyPanel, Panel } from "@/components/hub/kit";
import { NitrogenBriefForm } from "@/components/hub/nitrogen/brief-form";
import type { PortRecord } from "@/lib/ports";

export type ReportRow = { id: string; refNo: string; topic: string; country: string; date: string };

function ReportItem({ row }: { row: ReportRow }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <Link href={`/hub/nitrogen-report/${row.id}`} className="group flex min-w-0 items-center gap-3 no-underline">
        <span className="aq-chip flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-white">
          <FileText className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block font-mono text-[14.5px] font-semibold text-ink group-hover:text-blue">{row.refNo}</span>
          <span className="block truncate text-[13.5px] text-mid">{[row.topic, row.country, row.date].filter(Boolean).join(" · ")}</span>
        </span>
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        {confirming ? (
          <>
            <span className="text-[13.5px] text-mid">Delete this report?</span>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteReport(row.id);
                  if (result.ok) toast.success(`${row.refNo} deleted.`);
                  else {
                    toast.error(result.message);
                    setConfirming(false);
                  }
                })
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-danger px-3.5 text-[14.5px] font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
            >
              {pending ? "Deleting…" : "Delete"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="inline-flex h-9 items-center rounded-full px-3 text-[14.5px] font-semibold text-mid hover:text-ink">
              Keep
            </button>
          </>
        ) : (
          <>
            <Link href={`/hub/nitrogen-report/${row.id}`} className="inline-flex h-9 items-center gap-1 rounded-full border border-border bg-white px-3.5 text-[14.5px] font-semibold text-ink no-underline transition hover:border-blue/35 hover:text-blue">
              View <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Delete ${row.refNo}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-dim transition hover:bg-red-50 hover:text-danger"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </li>
  );
}

export function NitrogenWorkspace({
  reports,
  ports,
  limitReached,
  limitNote,
  keepNote,
  startOpen = false,
}: {
  reports: ReportRow[];
  ports: PortRecord[];
  limitReached: boolean;
  limitNote: string;
  keepNote: string;
  startOpen?: boolean;
}) {
  const [view, setView] = useState<"list" | "form">(startOpen ? "form" : "list");
  const [draft, setDraft] = useState(0);

  const start = (
    <button type="button" onClick={() => setView("form")} disabled={limitReached} className={btnPrimary}>
      <FlaskConical className="h-4 w-4" /> New report
    </button>
  );

  return (
    <>
      <div hidden={view !== "form"}>
        <NitrogenBriefForm key={draft} ports={ports} blocked={limitReached ? limitNote : null} onClose={() => setView("list")} onReset={() => setDraft((value) => value + 1)} />
      </div>

      <div hidden={view !== "list"} className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-[15px] leading-relaxed text-mid">Six questions on one page, about two minutes. Your answers stay put if you step back to check something.</p>
          {limitReached ? (
            <div className="flex flex-wrap items-center gap-2">
              {start}
              <Link href="/hub/account/membership?from=nitrogen-report" className={btnSecondary}>
                <Crown className="h-4 w-4" /> Upgrade for more
              </Link>
            </div>
          ) : (
            start
          )}
        </div>
        {limitReached ? <p className="text-[13.5px] text-[#9a5b00]">{limitNote}</p> : null}

        <Panel title="Previous reports" sub={keepNote} icon={FileText} bodyClassName={reports.length ? "" : "p-4"}>
          {reports.length ? (
            <ul className="divide-y divide-border">
              {reports.map((row) => (
                <ReportItem key={row.id} row={row} />
              ))}
            </ul>
          ) : (
            <EmptyPanel
              title="No reports yet"
              body="Your finished briefs appear here, ready to open, download as a PDF or send to the desk for a quote."
              action={
                limitReached ? null : (
                  <button type="button" onClick={() => setView("form")} className={btnPrimary}>
                    <FlaskConical className="h-4 w-4" /> Start your first report
                  </button>
                )
              }
            />
          )}
        </Panel>
      </div>
    </>
  );
}
