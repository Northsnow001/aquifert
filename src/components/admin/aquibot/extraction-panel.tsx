"use client";

import { useState, useTransition } from "react";
import { FileText, Image as ImageIcon, Radio, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { saveAquibotExtraction } from "@/app/admin/actions";
import { DiffView, SaveBar, useEditorGuards } from "@/components/admin/aquibot/shared";
import { btnGhost, textarea } from "@/components/admin/ui";
import { DEFAULT_EXTRACTION, lineDiff, type ExtractionRules } from "@/lib/aquibot";

const RULES: { key: keyof ExtractionRules; title: string; description: string; icon: React.ReactNode }[] = [
  { key: "pdf", title: "PDF files", description: "Reading library PDFs, including tables and charts.", icon: <FileText className="h-4 w-4" /> },
  { key: "image", title: "Images", description: "Describing images, charts and scanned pages.", icon: <ImageIcon className="h-4 w-4" /> },
  { key: "telex", title: "Telex posts", description: "Structuring market intelligence messages.", icon: <Radio className="h-4 w-4" /> },
];

export function ExtractionPanel({ initial }: { initial: ExtractionRules }) {
  const [rules, setRules] = useState(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [compare, setCompare] = useState<Partial<Record<keyof ExtractionRules, boolean>>>({});
  const [saving, start] = useTransition();
  const dirty = JSON.stringify(rules) !== baseline;
  const modified = RULES.filter((rule) => rules[rule.key].trim() !== DEFAULT_EXTRACTION[rule.key]).length;

  const save = () =>
    start(async () => {
      const result = await saveAquibotExtraction(rules);
      setRules(result.extraction);
      setBaseline(JSON.stringify(result.extraction));
      setSavedAt(result.savedAt);
      toast.success("Extraction rules saved. They apply the next time a file or telex is indexed.");
    });

  useEditorGuards(dirty, save);

  return (
    <div className="space-y-5">
      <SaveBar dirty={dirty} saving={saving} savedAt={savedAt} onSave={save}>
        <span className={`rounded-full px-2.5 py-1 font-mono text-[11.5px] font-semibold ${modified ? "bg-blue-light text-blue" : "bg-s2 text-mid"}`}>
          {modified ? `${modified} of 3 customised` : "All built-in"}
        </span>
        <span className="text-[12px] text-dim">Changes apply to content indexed after saving. Re-index to update existing content.</span>
      </SaveBar>

      <div className="grid gap-5 xl:grid-cols-3">
        {RULES.map((rule) => {
          const value = rules[rule.key];
          const custom = value.trim() !== DEFAULT_EXTRACTION[rule.key];
          const showing = compare[rule.key] && custom;
          return (
            <section key={rule.key} className="flex min-w-0 flex-col rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(26,58,92,0.05)]">
              <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-light text-blue">{rule.icon}</span>
                  <div className="min-w-0">
                    <h2 className="text-[14px] font-bold text-ink">{rule.title}</h2>
                    <p className="mt-0.5 text-[12px] text-dim">{rule.description}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-wide ${custom ? "bg-blue-light text-blue" : "bg-s2 text-mid"}`}>
                  {custom ? "Custom" : "Built-in"}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                {showing ? (
                  <div className="flex-1 overflow-hidden rounded-lg border border-border">
                    <DiffView lines={lineDiff(DEFAULT_EXTRACTION[rule.key], value)} />
                  </div>
                ) : (
                  <textarea
                    value={value}
                    onChange={(event) => setRules((current) => ({ ...current, [rule.key]: event.target.value }))}
                    rows={14}
                    spellCheck={false}
                    aria-label={`${rule.title} extraction rules`}
                    className={`${textarea} flex-1 font-mono text-[12px] leading-[1.6]`}
                  />
                )}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-dim">{value.length.toLocaleString()} chars</span>
                  {custom ? (
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setCompare((current) => ({ ...current, [rule.key]: !current[rule.key] }))} className={btnGhost}>
                        {showing ? "Edit" : "Compare with built-in"}
                      </button>
                      <button type="button" onClick={() => setRules((current) => ({ ...current, [rule.key]: DEFAULT_EXTRACTION[rule.key] }))} className={btnGhost}>
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
