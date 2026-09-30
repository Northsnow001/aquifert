"use client";

import { useState } from "react";
import { ChevronDown, Copy, FileSearch, Loader2, Lock, Play } from "lucide-react";
import { toast } from "sonner";
import { traceAquibot } from "@/app/admin/aquibot/actions";
import { btnPrimary, btnGhost, field, label as labelClass } from "@/components/admin/ui";
import type { TraceResult } from "@/lib/aquibot-engine/chat";
import { describeRange } from "@/lib/aquibot-engine/dates";
import { Panel, Switch } from "./shared";

const AUDIENCES = [
  { value: "admin", label: "Admin (all content)" },
  { value: "enterprise", label: "AQ Zero member" },
  { value: "growth", label: "Growth member" },
  { value: "core", label: "Core member" },
] as const;

const SAMPLES = ["Urea prices last week", "How is DAP made and what is its spec?", "Latest news on Egypt granular urea", "Compare DAP CFR India this time last year"];

const BOOST_LABEL: Record<string, string> = {
  telex: "telex",
  file: "file",
  benchmark: "benchmark",
  recency: "recent week file",
  weekMatch: "week match",
  keywords: "keywords",
  title: "title",
  geo: "place",
  technical: "technical source",
};

function day(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function DebugPanel({ hasTestPrompt }: { hasTestPrompt: boolean }) {
  const [question, setQuestion] = useState("");
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]["value"]>("admin");
  const [testMode, setTestMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [trace, setTrace] = useState<TraceResult | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showDropped, setShowDropped] = useState(true);

  async function run(text = question) {
    if (!text.trim()) return;
    setQuestion(text);
    setBusy(true);
    const result = await traceAquibot({ question: text, testMode, plan: audience });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setTrace(result.trace);
    setExpanded(null);
  }

  const retrieval = trace?.retrieval;
  const candidates = retrieval ? retrieval.candidates.filter((candidate) => showDropped || candidate.selected) : [];
  const selected = retrieval?.candidates.filter((candidate) => candidate.selected).length ?? 0;

  return (
    <div className="space-y-5">
      <Panel title="Trace a question" description="Runs retrieval exactly as a first question in a new chat, without calling the answer model or counting usage." icon={<FileSearch className="h-4 w-4" />}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            run();
          }}
          className="space-y-3"
        >
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) run();
            }}
            rows={2}
            placeholder="Ask what a member would ask…"
            className={`${field} w-full py-2.5`}
          />
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="trace-audience" className={labelClass}>
                Search as
              </label>
              <select id="trace-audience" value={audience} onChange={(event) => setAudience(event.target.value as typeof audience)} className={`${field} mt-1.5 h-9`}>
                {AUDIENCES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[220px] pb-1">
              {hasTestPrompt ? <Switch checked={testMode} onChange={setTestMode} label="Use the test prompt" /> : <p className="text-[12px] text-dim">Save a test prompt to trace with it.</p>}
            </div>
            <button type="submit" className={`${btnPrimary} ml-auto`} disabled={busy || !question.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {busy ? "Tracing…" : "Trace"}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLES.map((sample) => (
              <button key={sample} type="button" onClick={() => run(sample)} disabled={busy} className="rounded-full border border-border px-2.5 py-1 text-[12px] text-mid transition hover:border-blue/40 hover:text-blue">
                {sample}
              </button>
            ))}
          </div>
        </form>
      </Panel>

      {trace && retrieval ? (
        <>
          <div className="grid gap-3 lg:grid-cols-3">
            <Fact title="Understanding">
              <Row label="Intent">
                {retrieval.intent}
                {retrieval.technicalSubtype ? ` · ${retrieval.technicalSubtype.replace(/_/g, " ")}` : ""}
              </Row>
              <Row label="Prompt">{trace.promptSource === "built-in" ? "Built-in" : trace.promptSource === "published" ? "Published" : "Test draft"}</Row>
              <Row label="Searched">
                {retrieval.searchQueries.map((query) => (
                  <span key={query} className="block">
                    “{query}”
                  </span>
                ))}
              </Row>
              {trace.replaced.length ? (
                <Row label="Synonyms">
                  {trace.replaced.map((item) => (
                    <span key={item.from} className="mr-1.5 inline-block">
                      {item.from} → <strong>{item.to}</strong>
                    </span>
                  ))}
                </Row>
              ) : null}
            </Fact>
            <Fact title="Dates and keywords">
              <Row label="Dates">
                {trace.ranges.length
                  ? trace.ranges.map((range) => (
                      <span key={range.label} className="block">
                        {describeRange(range)} <span className="text-dim">“{range.phrase}”{range.ambiguous ? " · assumed" : ""}</span>
                      </span>
                    ))
                  : "None detected"}
              </Row>
              {trace.ranges.length ? <Row label="Telex">{retrieval.dateFallback ? `None in window; nearest within ±${trace.graceDays} days` : "Found inside the window"}</Row> : null}
              <Row label="Keywords">{retrieval.keywords.length ? retrieval.keywords.join(", ") : "—"}</Row>
              {retrieval.geo.length ? <Row label="Places">{retrieval.geo.join(", ")}</Row> : null}
            </Fact>
            <Fact title="Context budget">
              <Budget label="Total" used={retrieval.budgets.used} total={retrieval.budgets.total} />
              <Budget label="Public" used={retrieval.budgets.publicUsed} total={retrieval.budgets.public} />
              <Budget label="Private" used={retrieval.budgets.privateUsed} total={retrieval.budgets.private} />
              <Row label="Chunks">
                {selected} of max {retrieval.budgets.maxChunks}
              </Row>
              <Row label="Timing">
                embed {retrieval.timings.embedMs}ms · search {retrieval.timings.searchMs}ms · rank {retrieval.timings.rankMs}ms
              </Row>
            </Fact>
          </div>

          <Panel
            title={`Ranked candidates (${retrieval.candidates.length})`}
            description="Score = cosine similarity + boosts. Selected chunks go into the prompt in this order until the budget or chunk cap is reached."
            actions={
              <label className="flex items-center gap-2 text-[12.5px] text-mid">
                <input type="checkbox" checked={showDropped} onChange={(event) => setShowDropped(event.target.checked)} />
                Show dropped
              </label>
            }
          >
            {candidates.length === 0 ? (
              <p className="text-[12.5px] text-dim">Nothing was retrieved. Check that content is indexed on the Knowledge base tab.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[820px] text-left text-[12.5px]">
                  <thead className="bg-s2/70 text-[10.5px] uppercase tracking-[0.08em] text-mid">
                    <tr>
                      <th className="px-3 py-2 font-semibold">#</th>
                      <th className="px-3 py-2 font-semibold">Score</th>
                      <th className="px-3 py-2 font-semibold">Source</th>
                      <th className="px-3 py-2 font-semibold">Boosts</th>
                      <th className="px-3 py-2 font-semibold">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {candidates.map((candidate, index) => (
                      <tr key={candidate.id} className={`cursor-pointer align-top ${candidate.selected ? "" : "text-mid"} hover:bg-s2/40`} onClick={() => setExpanded(expanded === candidate.id ? null : candidate.id)}>
                        <td className="px-3 py-2 font-mono text-[11.5px] text-dim">{index + 1}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono">
                          <span className="font-semibold text-ink">{candidate.score.toFixed(3)}</span>
                          <span className="block text-[10.5px] text-dim">cos {candidate.similarity.toFixed(3)}</span>
                        </td>
                        <td className="max-w-[380px] px-3 py-2">
                          <span className="flex items-center gap-1.5 font-semibold text-ink">
                            {candidate.visibility === "private" ? <Lock className="h-3 w-3 shrink-0 text-dim" /> : null}
                            <span className="truncate">{candidate.title}</span>
                          </span>
                          <span className="text-[11px] text-dim">
                            {candidate.sourceType === "telex" ? "Telex" : "File"} · {day(candidate.publishedAt)} · chunk {candidate.chunkIndex + 1}
                            {candidate.dateMatch ? ` · ${candidate.dateMatch === "in" ? "in window" : candidate.dateMatch === "grace" ? "grace window" : "outside window"}` : ""}
                          </span>
                          {expanded === candidate.id ? <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-s2 p-2 font-sans text-[12px] leading-relaxed text-ink">{candidate.content}</pre> : null}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(candidate.boosts).map(([key, value]) => (
                              <span key={key} className={`rounded px-1.5 py-px font-mono text-[10.5px] ${value >= 0 ? "bg-[#eaf7ef] text-[#1f5c38]" : "bg-[#fdecec] text-[#9b2c2c]"}`}>
                                {value >= 0 ? "+" : ""}
                                {value.toFixed(2)} {BOOST_LABEL[key] ?? key}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          {candidate.selected ? <span className="rounded-full bg-blue-light px-2 py-0.5 text-[11px] font-semibold text-blue">In prompt</span> : <span className="text-[11.5px]">{candidate.dropped ?? "Not used"}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <details className="group aq-card">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5">
              <ChevronDown className="h-4 w-4 text-dim transition group-open:rotate-180" />
              <span className="text-[14px] font-bold text-ink">Full system prompt sent to Gemini</span>
              <span className="font-mono text-[11px] text-dim">{trace.system.length.toLocaleString()} characters</span>
              <button
                type="button"
                className={`${btnGhost} ml-auto`}
                onClick={(event) => {
                  event.preventDefault();
                  navigator.clipboard.writeText(trace.system).then(() => toast.success("Prompt copied"));
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
            </summary>
            <pre className="max-h-[640px] overflow-auto whitespace-pre-wrap break-words border-t border-border px-5 py-4 font-mono text-[11.5px] leading-relaxed text-ink">{trace.system}</pre>
          </details>
        </>
      ) : null}
    </div>
  );
}

function Fact({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-[0_1px_2px_rgba(26,58,92,0.05)]">
      <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">{title}</p>
      <dl className="space-y-1.5">{children}</dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2 text-[12.5px]">
      <dt className="text-dim">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

function Budget({ label, used, total }: { label: string; used: number; total: number }) {
  const percent = total ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-2 text-[12.5px]">
      <span className="text-dim">{label}</span>
      <div>
        <div className="h-1.5 overflow-hidden rounded-full bg-s2">
          <div className="h-full rounded-full bg-blue" style={{ width: `${percent}%` }} />
        </div>
        <span className="font-mono text-[10.5px] text-mid">
          {used.toLocaleString()} / {total.toLocaleString()} chars
        </span>
      </div>
    </div>
  );
}
