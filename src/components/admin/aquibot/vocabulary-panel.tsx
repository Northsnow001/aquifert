"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { ArrowRight, ChevronDown, CircleAlert, CopyPlus, FlaskConical, Replace, RotateCcw, TextSearch, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { saveAquibotVocabulary } from "@/app/admin/actions";
import { Panel, SaveBar, useEditorGuards } from "@/components/admin/aquibot/shared";
import { btnGhost, input, textarea } from "@/components/admin/ui";
import { DEFAULT_STOP_WORDS, DEFAULT_SYNONYMS, effectiveSynonyms, parseStopWords, parseSynonyms, previewQuery } from "@/lib/aquibot";

const SAMPLES = ["dap egypt price last week", "urea fob middle east this month", "what's the difference between MOP and potassium chloride", "germany inland CAN offer"];

export function VocabularyPanel({ synonyms: initialSynonyms, stopWords: initialStopWords }: { synonyms: string; stopWords: string }) {
  const [synonyms, setSynonyms] = useState(initialSynonyms);
  const [stopWords, setStopWords] = useState(initialStopWords);
  const [baseline, setBaseline] = useState({ synonyms: initialSynonyms, stopWords: initialStopWords });
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [query, setQuery] = useState(SAMPLES[0]);
  const [showDefaults, setShowDefaults] = useState(false);
  const [saving, start] = useTransition();
  const synonymsRef = useRef<HTMLTextAreaElement>(null);

  const dirty = synonyms !== baseline.synonyms || stopWords !== baseline.stopWords;
  const parsed = useMemo(() => parseSynonyms(synonyms), [synonyms]);
  const effective = useMemo(() => effectiveSynonyms(synonyms), [synonyms]);
  const defaults = useMemo(() => parseSynonyms(DEFAULT_SYNONYMS).entries, []);
  const liveKeys = useMemo(() => new Set(parsed.entries.map((entry) => entry.key)), [parsed]);
  const missingDefaults = defaults.filter((entry) => !liveKeys.has(entry.key));
  const stops = useMemo(() => parseStopWords(stopWords.trim() ? stopWords : DEFAULT_STOP_WORDS), [stopWords]);
  const preview = useMemo(() => previewQuery(query, effective.entries, stops.words), [query, effective, stops]);

  const save = () =>
    start(async () => {
      const result = await saveAquibotVocabulary({ synonyms, stopWords });
      setSynonyms(result.synonyms);
      setStopWords(result.stopWords);
      setBaseline({ synonyms: result.synonyms, stopWords: result.stopWords });
      setSavedAt(result.savedAt);
      toast.success("Vocabulary saved.");
    });

  useEditorGuards(dirty, save);

  const jumpTo = (line: number) => {
    const area = synonymsRef.current;
    if (!area) return;
    const lines = area.value.split("\n");
    const start = lines.slice(0, line - 1).reduce((total, item) => total + item.length + 1, 0);
    area.focus();
    area.setSelectionRange(start, start + (lines[line - 1]?.length ?? 0));
    const lineHeight = parseFloat(getComputedStyle(area).lineHeight) || 20;
    area.scrollTop = Math.max(0, (line - 4) * lineHeight);
  };

  const warnings = parsed.issues.length;

  return (
    <div className="space-y-5">
      <SaveBar dirty={dirty} saving={saving} savedAt={savedAt} onSave={save}>
        <span className="rounded-full bg-blue-light px-2.5 py-1 font-mono text-[11.5px] font-semibold text-blue">{parsed.entries.length} synonyms</span>
        <span className="rounded-full bg-s2 px-2.5 py-1 font-mono text-[11.5px] font-semibold text-mid">{stops.words.length} stop words</span>
        {warnings ? (
          <span className="flex items-center gap-1 rounded-full bg-[#fff6e5] px-2.5 py-1 font-mono text-[11.5px] font-semibold text-[#9a5b00]">
            <TriangleAlert className="h-3 w-3" />
            {warnings} to check
          </span>
        ) : null}
      </SaveBar>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-5">
          <Panel
            icon={<Replace className="h-4 w-4" />}
            title="Query synonyms"
            description="Rewrites a member's question before searching. One mapping per line: phrase = canonical phrase. The longest phrase wins."
            actions={
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Replace the live list with the built-in synonyms? Nothing changes until you save.")) setSynonyms(DEFAULT_SYNONYMS);
                }}
                className={btnGhost}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Use built-in list
              </button>
            }
          >
            <textarea
              ref={synonymsRef}
              value={synonyms}
              onChange={(event) => setSynonyms(event.target.value)}
              rows={18}
              spellCheck={false}
              aria-label="Query synonyms"
              placeholder="Blank uses the built-in list."
              className={`${textarea} font-mono text-[12.5px] leading-[1.6]`}
            />

            {parsed.issues.length ? (
              <ul className="mt-3 divide-y divide-[#f5dfb3] overflow-hidden rounded-xl border border-[#f5dfb3] bg-[#fffaf0]">
                {parsed.issues.map((issue) => (
                  <li key={`${issue.line}-${issue.kind}`}>
                    <button type="button" onClick={() => jumpTo(issue.line)} className="flex w-full items-start gap-2.5 px-3.5 py-2 text-left text-[12.5px] text-[#7a4a00] transition hover:bg-[#fff3dc]">
                      {issue.kind === "invalid" ? <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" /> : <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                      <span className="shrink-0 font-mono text-[11.5px] font-semibold">Line {issue.line}</span>
                      <span>{issue.message}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[12px] text-[#1f7a45]">Every line is valid, with no duplicates or two-way loops.</p>
            )}

            <div className="mt-4 rounded-xl border border-border">
              <button type="button" onClick={() => setShowDefaults((value) => !value)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                <span>
                  <span className="block text-[13px] font-semibold text-ink">Built-in synonyms ({defaults.length})</span>
                  <span className="mt-0.5 block text-[12px] text-dim">
                    Built-in mappings still apply to any phrase your list does not map.
                    {missingDefaults.length === 1
                      ? " One of them is filling a gap right now."
                      : missingDefaults.length
                        ? ` ${missingDefaults.length} of them are filling gaps right now.`
                        : " Your list maps all of them."}
                  </span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-dim transition ${showDefaults ? "rotate-180" : ""}`} />
              </button>
              {showDefaults ? (
                <div className="border-t border-border">
                  {missingDefaults.length ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-s2/50 px-4 py-2.5">
                      <span className="text-[12px] text-mid">
                        Filling gaps: {missingDefaults.map((entry) => <code key={entry.key} className="mr-1.5 rounded bg-white px-1 font-mono text-[11.5px] text-ink">{entry.phrase} = {entry.canonical}</code>)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSynonyms((current) => `${current.trimEnd()}\n${missingDefaults.map((entry) => `${entry.phrase} = ${entry.canonical}`).join("\n")}`)}
                        className={btnGhost}
                      >
                        <CopyPlus className="h-3.5 w-3.5" />
                        Copy into my list
                      </button>
                    </div>
                  ) : null}
                  <ul className="grid max-h-72 gap-x-6 overflow-y-auto px-4 py-3 font-mono text-[11.5px] sm:grid-cols-2">
                    {defaults.map((entry) => (
                      <li key={entry.key} className={`flex items-center gap-1.5 py-0.5 ${liveKeys.has(entry.key) ? "text-dim" : "text-ink"}`}>
                        <span className="truncate">{entry.phrase}</span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-dim" />
                        <span className="truncate">{entry.canonical}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel
            icon={<TextSearch className="h-4 w-4" />}
            title="Stop words"
            description="Words skipped by the keyword boost (up to +0.25 body, +0.20 title). They do not change the meaning search. Three-letter product codes like DAP, MAP and MOP are always kept."
            actions={
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Replace the list with the built-in stop words? Nothing changes until you save.")) setStopWords(DEFAULT_STOP_WORDS);
                }}
                className={btnGhost}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Use built-in list
              </button>
            }
          >
            <textarea
              value={stopWords}
              onChange={(event) => setStopWords(event.target.value)}
              rows={5}
              spellCheck={false}
              aria-label="Stop words"
              placeholder="Blank uses the built-in list. Separate with commas or new lines."
              className={`${textarea} font-mono text-[12.5px] leading-[1.6]`}
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {stops.words.map((word) => (
                <span key={word} className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] ${/\s/.test(word) ? "bg-blue-light text-blue" : "bg-s2 text-mid"}`}>
                  {word}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11.5px] text-dim">
              {stopWords.trim() ? `${stops.words.length} words` : `Blank, so the ${stops.words.length} built-in words apply`}
              {stops.phrases.length ? ` · ${stops.phrases.length} multi-word phrases (blue)` : ""}
              {stops.duplicates ? ` · ${stops.duplicates} duplicates removed on save` : ""}
            </p>
          </Panel>
        </div>

        <aside className="min-w-0 xl:sticky xl:top-20 xl:self-start">
          <Panel icon={<FlaskConical className="h-4 w-4" />} title="Query tester" description="See how a question is rewritten with your unsaved lists.">
            <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Test query" placeholder="Type a member question" className={input} />
            <div className="mt-2 flex flex-wrap gap-1">
              {SAMPLES.map((sample) => (
                <button key={sample} type="button" onClick={() => setQuery(sample)} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-mid transition hover:border-blue/40 hover:text-blue">
                  {sample}
                </button>
              ))}
            </div>

            <dl className="mt-5 space-y-4 text-[12.5px]">
              <div>
                <dt className="font-mono text-[10px] font-semibold uppercase tracking-wider text-dim">Searched as</dt>
                <dd className="mt-1 rounded-lg bg-s2/70 px-3 py-2 font-mono text-[12.5px] text-ink">{preview.rewritten || "—"}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] font-semibold uppercase tracking-wider text-dim">Synonyms applied</dt>
                <dd className="mt-1.5 space-y-1">
                  {preview.replaced.length ? (
                    preview.replaced.map((hit, index) => (
                      <p key={index} className="flex flex-wrap items-center gap-1.5 font-mono text-[11.5px]">
                        <span className="rounded bg-[#fdecec] px-1.5 text-[#9b2c2c]">{hit.from}</span>
                        <ArrowRight className="h-3 w-3 text-dim" />
                        <span className="rounded bg-[#eaf7ef] px-1.5 text-[#1f5c38]">{hit.to}</span>
                        {liveKeys.has(hit.from) ? null : <span className="text-[10.5px] text-dim">built-in</span>}
                      </p>
                    ))
                  ) : (
                    <span className="text-dim">None</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] font-semibold uppercase tracking-wider text-dim">Keyword boost terms</dt>
                <dd className="mt-1.5 flex flex-wrap gap-1">
                  {preview.keywords.length ? preview.keywords.map((word, index) => <span key={index} className="rounded-md bg-blue-light px-1.5 py-0.5 font-mono text-[11px] text-blue">{word}</span>) : <span className="text-dim">None</span>}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] font-semibold uppercase tracking-wider text-dim">Skipped as stop words</dt>
                <dd className="mt-1.5 flex flex-wrap gap-1">
                  {preview.ignored.length ? preview.ignored.map((word, index) => <span key={index} className="rounded-md bg-s2 px-1.5 py-0.5 font-mono text-[11px] text-dim line-through">{word}</span>) : <span className="text-dim">None</span>}
                </dd>
              </div>
            </dl>
            <p className="mt-5 border-t border-border pt-3 text-[11.5px] leading-relaxed text-dim">
              Date words like “last week” still set the date range. Stop words only leave the keyword boost.
            </p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
