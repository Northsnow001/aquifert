"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveBriefingIssue } from "@/app/admin/aq-content/actions";
import { SUMMARY_LIMIT } from "@/components/admin/aq-content/options";
import { MarkdownField, StatusToggle } from "@/components/admin/aq-content/shared";
import { btnPrimary, field, input, label, textarea } from "@/components/admin/ui";
import type { BriefingIssue, PublishState } from "@/lib/aq-modules/types";

const panel = "rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(26,58,92,0.05)]";

export function BriefingEditor({ issue, defaultDate }: { issue?: BriefingIssue; defaultDate: string }) {
  const router = useRouter();
  const [saving, start] = useTransition();
  const [title, setTitle] = useState(issue?.title ?? "");
  const [date, setDate] = useState(issue?.date ?? defaultDate);
  const [summary, setSummary] = useState(issue?.summary ?? "");
  const [body, setBody] = useState(issue?.body ?? "");
  const [status, setStatus] = useState<PublishState>(issue?.status ?? "draft");
  const over = summary.length > SUMMARY_LIMIT;

  const save = () =>
    start(async () => {
      const result = await saveBriefingIssue({ id: issue?.id, title, date, summary, body, status });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(status === "published" ? "Published. Members see this issue on the hub now." : "Draft saved. Members do not see it until you publish.");
      if (issue) router.refresh();
      else router.replace(`/admin/briefing/${result.id}`);
    });

  const primaryLabel = status === "published" ? (issue?.status === "published" ? "Update" : "Publish") : "Save draft";

  return (
    <form
      className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <section className={`${panel} min-w-0`}>
        <label className={label} htmlFor="title">
          Title
        </label>
        <input
          id="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          placeholder="The Briefing, week 40: …"
          className={`${field} mt-1.5 h-11 w-full text-[15px] font-semibold`}
        />

        <div className="mt-4 flex items-end justify-between">
          <label className={label} htmlFor="summary">
            Summary
          </label>
          <span className={`font-mono text-[11px] ${over ? "text-[#9a5b00]" : "text-dim"}`}>
            {summary.length}/{SUMMARY_LIMIT}
          </span>
        </div>
        <textarea
          id="summary"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          rows={3}
          placeholder="One or two sentences members read in the issue list."
          className={`${textarea} mt-1.5`}
        />
        {over ? <p className="mt-1 text-[12px] text-[#9a5b00]">Long summaries are cut short in the issue list.</p> : null}

        <div className="mt-5">
          <MarkdownField
            id="body"
            title="Issue"
            value={body}
            onChange={setBody}
            rows={22}
            placeholder={"## Nitrogen\n…\n\n## Phosphate\n…\n\n## What to do this week\n- …"}
          />
        </div>
      </section>

      <aside className="flex flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
        <section className={panel}>
          <p className={label}>Status</p>
          <StatusToggle value={status} onChange={setStatus} />

          <label className={`${label} mt-4`} htmlFor="date">
            Issue date
          </label>
          <input id="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required className={`${input} mt-1.5 font-mono text-[12.5px]`} />

          <div className="mt-5 border-t border-border pt-4">
            <button type="submit" disabled={saving} className={`${btnPrimary} w-full`}>
              {saving ? "Saving…" : primaryLabel}
            </button>
          </div>
        </section>
      </aside>
    </form>
  );
}
