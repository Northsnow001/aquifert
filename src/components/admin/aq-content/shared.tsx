"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Info, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteAnalysisNote, deleteBriefingIssue } from "@/app/admin/aq-content/actions";
import { btnDanger, btnGhost, label, textarea } from "@/components/admin/ui";
import { Markdown } from "@/components/hub/markdown";
import type { PublishState } from "@/lib/aq-modules/types";

export function MarkdownField({
  id,
  title,
  value,
  onChange,
  rows = 16,
  placeholder,
  meta,
}: {
  id: string;
  title: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  meta?: React.ReactNode;
}) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const words = value.split(/\s+/).filter(Boolean).length;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <label className={label} htmlFor={id}>
          {title}
        </label>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-dim">{meta ?? `${words} words`}</span>
          <div className="grid grid-cols-2 rounded-lg border border-border bg-s2/60 p-0.5" role="tablist" aria-label={`${title} view`}>
            {(["write", "preview"] as const).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`rounded-md px-3 py-1 text-[12px] font-semibold capitalize transition ${tab === key ? "bg-white text-ink shadow-sm" : "text-mid hover:text-ink"}`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      </div>
      {tab === "write" ? (
        <textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          placeholder={placeholder}
          className={`${textarea} mt-1.5 font-[450]`}
        />
      ) : (
        <div className="mt-1.5 min-h-[12rem] rounded-xl border border-border bg-white px-4 py-3">
          {value.trim() ? <Markdown text={value} className="text-[13.5px] text-ink" /> : <p className="text-[13px] text-dim">Nothing to preview yet.</p>}
        </div>
      )}
      <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-relaxed text-dim">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Markdown works: **bold**, *italic*, ## headings, - lists, &gt; quotes, [links](https://…) and | pipe | tables |.
      </p>
    </div>
  );
}

export function StatusToggle({ value, onChange }: { value: PublishState; onChange: (value: PublishState) => void }) {
  return (
    <div className="mt-1.5 grid grid-cols-2 rounded-lg border border-border bg-s2/60 p-0.5" role="radiogroup" aria-label="Status">
      {(
        [
          { value: "draft", label: "Draft" },
          { value: "published", label: "Published" },
        ] as const
      ).map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md py-1.5 text-[12.5px] font-semibold transition ${value === option.value ? "bg-white text-ink shadow-sm" : "text-mid hover:text-ink"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function DeleteEntry({
  kind,
  id,
  name,
  redirectTo,
  compact = false,
}: {
  kind: "analysis" | "briefing";
  id: string;
  name: string;
  redirectTo?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const noun = kind === "analysis" ? "note" : "issue";

  const remove = () => {
    if (!window.confirm(`Delete the ${noun} "${name}"? Members will no longer see it. This cannot be undone.`)) return;
    start(async () => {
      const result = kind === "analysis" ? await deleteAnalysisNote(id) : await deleteBriefingIssue(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(kind === "analysis" ? "Note deleted." : "Issue deleted.");
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  };

  if (compact) {
    return (
      <button type="button" onClick={remove} disabled={pending} className={`${btnGhost} hover:bg-red-50 hover:text-danger`} title="Delete">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    );
  }
  return (
    <button type="button" onClick={remove} disabled={pending} className={btnDanger}>
      <Trash2 className="h-4 w-4" />
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
