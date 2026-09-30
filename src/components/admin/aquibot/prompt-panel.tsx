"use client";

import { useMemo, useState, useTransition } from "react";
import { FlaskConical, History, Radio, RotateCcw, Rocket, Save, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { updateAquibotPrompt, type PromptAction } from "@/app/admin/actions";
import { DiffView, useEditorGuards } from "@/components/admin/aquibot/shared";
import { btnDanger, btnGhost, btnPrimary, btnSecondary, textarea } from "@/components/admin/ui";
import { DEFAULT_PROMPT, lineDiff, type AquibotPrompt } from "@/lib/aquibot";
import { formatStamp } from "@/lib/content-types";

type Source = "live" | "default" | "previous";

const SOURCE_LABEL: Record<Source, string> = { live: "Live prompt", default: "Built-in", previous: "Previous" };

function stats(text: string) {
  const trimmed = text.trim();
  return { words: trimmed ? trimmed.split(/\s+/).length : 0, chars: text.length };
}

export function PromptPanel({ initial }: { initial: AquibotPrompt }) {
  const [prompt, setPrompt] = useState(initial);
  const [draft, setDraft] = useState(initial.test);
  const [compare, setCompare] = useState<Source>("live");
  const [pending, start] = useTransition();

  const live = prompt.published || DEFAULT_PROMPT;
  const dirty = draft.trim() !== prompt.test.trim();
  const sources: Record<Source, string> = { live, default: DEFAULT_PROMPT, previous: prompt.previous };
  const base = sources[compare];
  const diff = useMemo(() => lineDiff(base, draft), [base, draft]);
  const added = diff.filter((line) => line.kind === "add").length;
  const removed = diff.filter((line) => line.kind === "remove").length;
  const count = stats(draft);

  const run = (action: PromptAction, success: string) =>
    start(async () => {
      const result = await updateAquibotPrompt(action, draft);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setPrompt(result.prompt);
      setDraft(result.prompt.test);
      toast.success(success);
    });

  const save = () => run("save-test", "Test prompt saved. Members still get the live prompt.");

  useEditorGuards(dirty, save);

  const load = (source: Source) => {
    const text = sources[source];
    if (draft.trim() && draft !== text && !window.confirm(`Replace the draft with the ${SOURCE_LABEL[source].toLowerCase()} text?`)) return;
    setDraft(text);
  };

  const stages = [
    {
      key: "default",
      icon: <Radio className="h-4 w-4" />,
      title: "Built-in",
      body: "Ships with Aquibot. Used whenever nothing is published.",
      meta: `${stats(DEFAULT_PROMPT).words} words`,
      live: !prompt.published,
    },
    {
      key: "test",
      icon: <FlaskConical className="h-4 w-4" />,
      title: "Test draft",
      body: "Used only by admins with test mode switched on in the hub chat.",
      meta: prompt.test ? (prompt.testSavedAt ? `Saved ${formatStamp(prompt.testSavedAt)}` : "Saved") : "Empty",
      live: false,
    },
    {
      key: "published",
      icon: <Rocket className="h-4 w-4" />,
      title: "Published",
      body: "Replaces the built-in prompt for every member.",
      meta: prompt.published ? (prompt.publishedAt ? `Published ${formatStamp(prompt.publishedAt)}` : "Published") : "Not set",
      live: Boolean(prompt.published),
    },
  ];

  return (
    <div className="space-y-5">
      <ol className="grid gap-3 md:grid-cols-3">
        {stages.map((stage, index) => (
          <li
            key={stage.key}
            className={`relative rounded-2xl border bg-surface p-4 shadow-[0_1px_2px_rgba(26,58,92,0.05)] ${stage.live ? "border-[#1f7a45]/40 ring-1 ring-[#1f7a45]/20" : "border-border"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${stage.live ? "bg-[#eaf7ef] text-[#1f7a45]" : "bg-s2 text-mid"}`}>{stage.icon}</span>
                <span className="font-mono text-[10.5px] text-dim">{index + 1}</span>
                {stage.title}
              </span>
              {stage.live ? (
                <span className="flex items-center gap-1.5 rounded-full bg-[#eaf7ef] px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-wide text-[#1f7a45]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1f7a45]" />
                  Live
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-mid">{stage.body}</p>
            <p className="mt-2 font-mono text-[11px] text-dim">{stage.meta}</p>
          </li>
        ))}
      </ol>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="min-w-0 rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(26,58,92,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
            <div>
              <h2 className="text-[14px] font-bold text-ink">Test prompt</h2>
              <p className="mt-0.5 text-[12px] text-dim">Draft here, try it in the hub chat with test mode, then publish.</p>
            </div>
            <div className="flex items-center gap-1 text-[12px] text-mid">
              Start from
              {(["default", "live", "previous"] as Source[])
                .filter((source) => (source === "previous" ? Boolean(prompt.previous) : source === "live" ? Boolean(prompt.published) : true))
                .map((source) => (
                  <button key={source} type="button" onClick={() => load(source)} className={btnGhost}>
                    {SOURCE_LABEL[source]}
                  </button>
                ))}
            </div>
          </div>
          <div className="p-5">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={26}
              spellCheck={false}
              aria-label="Test prompt"
              placeholder="Empty. Start from the built-in prompt above, or write your own."
              className={`${textarea} font-mono text-[12.5px] leading-[1.65]`}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-[11px] text-dim">
                {count.words.toLocaleString()} words · {count.chars.toLocaleString()} characters
                {dirty ? <span className="ml-2 text-[#d97706]">· unsaved</span> : null}
              </span>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={save} disabled={pending || !dirty} className={btnSecondary} title="Save (Ctrl+S)">
                  <Save className="h-4 w-4" />
                  Save draft
                </button>
                <button
                  type="button"
                  disabled={pending || !draft.trim() || (draft.trim() === prompt.published && !dirty)}
                  onClick={() => {
                    if (window.confirm("Publish this prompt to every member? The current live prompt is kept as Previous.")) run("publish", "Published. Every member's Aquibot now uses this prompt.");
                  }}
                  className={btnPrimary}
                >
                  <Rocket className="h-4 w-4" />
                  Publish to all members
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(26,58,92,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
            <div>
              <h2 className="text-[14px] font-bold text-ink">Changes</h2>
              {draft.trim() ? (
                <p className="mt-0.5 font-mono text-[11.5px] text-dim">
                  <span className="text-[#1f7a45]">+{added}</span> <span className="text-[#9b2c2c]">−{removed}</span> lines against {SOURCE_LABEL[compare].toLowerCase()}
                </p>
              ) : (
                <p className="mt-0.5 text-[12px] text-dim">Write a draft to see what it changes.</p>
              )}
            </div>
            <div className="flex rounded-lg border border-border bg-s2/60 p-0.5">
              {(Object.keys(SOURCE_LABEL) as Source[]).map((source) => (
                <button
                  key={source}
                  type="button"
                  disabled={source === "previous" && !prompt.previous}
                  onClick={() => setCompare(source)}
                  className={`rounded-md px-2.5 py-1 text-[12px] font-semibold transition disabled:opacity-40 ${compare === source ? "bg-white text-ink shadow-sm" : "text-mid hover:text-ink"}`}
                >
                  {SOURCE_LABEL[source]}
                </button>
              ))}
            </div>
          </div>
          {draft.trim() ? (
            <DiffView lines={diff} empty={`The draft matches the ${SOURCE_LABEL[compare].toLowerCase()} text.`} />
          ) : (
            <div className="max-h-[600px] overflow-auto">
              <p className="border-b border-border bg-s2/50 px-4 py-2 text-[12px] text-mid">The draft is empty. Showing the {SOURCE_LABEL[compare].toLowerCase()} text.</p>
              <pre className="whitespace-pre-wrap break-words px-4 py-3 font-mono text-[11.5px] leading-[1.6] text-mid">{base || "Nothing here yet."}</pre>
            </div>
          )}
        </section>
      </div>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-5 py-4 shadow-[0_1px_2px_rgba(26,58,92,0.05)]">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-s2 text-mid">
            <History className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-[14px] font-bold text-ink">Roll back</h2>
            <p className="mt-0.5 text-[12px] leading-relaxed text-dim">
              {prompt.previous
                ? `A previous prompt is kept (${stats(prompt.previous).words} words). Restoring swaps it with the live one, so you can switch back again.`
                : prompt.published
                  ? "Before this prompt, members were on the built-in prompt. Reset to go back to it."
                  : "No previous prompt yet. One is kept each time you publish, restore or reset."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || !prompt.previous}
            onClick={() => {
              if (window.confirm("Make the previous prompt live for every member?")) run("restore", "Previous prompt restored and live.");
            }}
            className={btnSecondary}
          >
            <Undo2 className="h-4 w-4" />
            Restore previous
          </button>
          <button
            type="button"
            disabled={pending || !prompt.published}
            onClick={() => {
              if (window.confirm("Go back to the built-in prompt for every member? The published prompt is kept as Previous.")) run("reset", "Members are back on the built-in prompt.");
            }}
            className={btnDanger}
          >
            <RotateCcw className="h-4 w-4" />
            Reset to built-in
          </button>
        </div>
      </section>
    </div>
  );
}
