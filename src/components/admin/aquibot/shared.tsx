"use client";

import { useEffect } from "react";
import { Save } from "lucide-react";
import { btnPrimary, field, label as labelClass } from "@/components/admin/ui";
import { formatStamp } from "@/lib/content-types";

/** Ctrl+S saves and leaving with unsaved edits asks first. */
export function useEditorGuards(dirty: boolean, onSave: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (dirty) onSave();
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
}

export function SaveBar({
  dirty,
  saving,
  savedAt,
  onSave,
  saveLabel = "Save changes",
  children,
}: {
  dirty: boolean;
  saving: boolean;
  savedAt: string | null;
  onSave: () => void;
  saveLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 px-4 py-2.5 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-[12px] text-mid">
          <span className={`h-2 w-2 rounded-full ${dirty ? "bg-[#d97706]" : "bg-[#1f7a45]"}`} />
          {dirty ? "Unsaved changes" : savedAt ? `Saved ${formatStamp(savedAt)}` : "No unsaved changes"}
        </span>
        <button type="button" onClick={onSave} disabled={saving || !dirty} className={btnPrimary} title="Save (Ctrl+S)">
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : saveLabel}
        </button>
      </div>
    </div>
  );
}

export function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (value: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold text-ink">{label}</span>
        {description ? <span className="mt-0.5 block text-[12px] leading-relaxed text-dim">{description}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-[#1f7a45]" : "bg-[#cfd9e2]"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  unit,
  hint,
  disabled,
  step = 1,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  hint?: React.ReactNode;
  disabled?: boolean;
  step?: number;
}) {
  return (
    <div className={disabled ? "opacity-50" : ""}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="mt-1.5 flex items-center overflow-hidden rounded-lg border border-border bg-white focus-within:border-blue/50 focus-within:ring-2 focus-within:ring-blue/15">
        <input
          id={id}
          type="number"
          min={0}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value === "" ? 0 : Number(event.target.value))}
          className={`${field} h-10 w-full border-0 font-mono focus:ring-0`}
        />
        {unit ? <span className="shrink-0 border-l border-border bg-s2/60 px-3 py-2.5 text-[12px] text-mid">{unit}</span> : null}
      </div>
      {hint ? <p className="mt-1 text-[11.5px] leading-relaxed text-dim">{hint}</p> : null}
    </div>
  );
}

export function Panel({ title, description, icon, actions, children }: { title: string; description?: string; icon?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(26,58,92,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="flex min-w-0 items-start gap-3">
          {icon ? <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-light text-blue">{icon}</span> : null}
          <div className="min-w-0">
            <h2 className="text-[14px] font-bold text-ink">{title}</h2>
            {description ? <p className="mt-0.5 text-[12px] leading-relaxed text-dim">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function DiffView({ lines, empty = "No differences." }: { lines: { kind: "same" | "add" | "remove"; text: string }[]; empty?: string }) {
  if (!lines.some((line) => line.kind !== "same")) return <p className="px-4 py-6 text-center text-[12.5px] text-dim">{empty}</p>;
  return (
    <pre className="max-h-[560px] overflow-auto py-2 font-mono text-[11.5px] leading-[1.6]">
      {lines.map((line, index) => (
        <div
          key={index}
          className={`whitespace-pre-wrap break-words px-3 ${
            line.kind === "add" ? "bg-[#eaf7ef] text-[#1f5c38]" : line.kind === "remove" ? "bg-[#fdecec] text-[#9b2c2c] line-through decoration-[#9b2c2c]/40" : "text-mid"
          }`}
        >
          <span className="mr-2 inline-block w-3 select-none text-dim">{line.kind === "add" ? "+" : line.kind === "remove" ? "−" : " "}</span>
          {line.text || " "}
        </div>
      ))}
    </pre>
  );
}
