"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteAnalysisNote, deleteBriefingIssue } from "@/app/admin/aq-content/actions";
import { DocEditor } from "@/components/admin/doc-editor";
import { btnDanger, btnGhost } from "@/components/admin/ui";
import type { PublishState } from "@/lib/aq-modules/types";

/** An article body in the word-processor editor. The value stays Markdown. */
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
  return <DocEditor id={id} title={title} value={value} onChange={onChange} placeholder={placeholder} meta={meta} minHeight={Math.max(180, rows * 24)} />;
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
