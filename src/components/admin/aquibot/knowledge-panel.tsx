"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, CircleDashed, Database, FileText, Loader2, Newspaper, RefreshCw, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { indexKnowledge, knowledgeChunks, removeKnowledge, searchIndexText } from "@/app/admin/aquibot/actions";
import { btnGhost, btnPrimary, btnSecondary, field } from "@/components/admin/ui";
import type { KnowledgeRow, KnowledgeState } from "@/lib/aquibot-engine/indexer";
import type { EngineStatus } from "@/lib/aquibot-engine/store";
import { Panel } from "./shared";

type Filter = "all" | "pending" | "errors" | "telex" | "file";

const STATE: Record<KnowledgeState, { label: string; className: string }> = {
  indexed: { label: "Indexed", className: "bg-[#eaf7ef] text-[#1f5c38]" },
  outdated: { label: "Changed since indexing", className: "bg-[#fff6e5] text-[#9a5b00]" },
  not_indexed: { label: "Not indexed", className: "bg-s2 text-mid" },
  error: { label: "Failed", className: "bg-[#fdecec] text-[#9b2c2c]" },
  unsupported: { label: "Can't be read", className: "bg-s2 text-dim" },
};

const ACCESS_LABEL = { public: "All members", growth: "Growth+", enterprise: "Enterprise" } as const;

function stamp(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function day(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

const needsWork = (row: KnowledgeRow) => row.state === "not_indexed" || row.state === "outdated" || row.state === "error";

export function KnowledgePanel({
  status,
  rows: initialRows,
  orphans: initialOrphans,
  chunkTotal,
}: {
  status: EngineStatus;
  rows: KnowledgeRow[];
  orphans: { id: string; title: string; chunk_count: number }[];
  chunkTotal: number;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [orphans, setOrphans] = useState(initialOrphans);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [running, setRunning] = useState<{ done: number; total: number; current: string } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [viewing, setViewing] = useState<{ key: string; title: string; chunks: { chunk_index: number; content: string }[] | null } | null>(null);
  const cancelRef = useRef(false);

  const counts = useMemo(
    () => ({
      indexed: rows.filter((row) => row.state === "indexed").length,
      pending: rows.filter((row) => row.state === "not_indexed" || row.state === "outdated").length,
      errors: rows.filter((row) => row.state === "error").length,
      readable: rows.filter((row) => row.state !== "unsupported").length,
    }),
    [rows],
  );

  const visible = rows.filter((row) => {
    if (filter === "pending" && !(row.state === "not_indexed" || row.state === "outdated")) return false;
    if (filter === "errors" && !(row.state === "error" || row.state === "unsupported")) return false;
    if ((filter === "telex" || filter === "file") && row.sourceType !== filter) return false;
    return !query.trim() || row.title.toLowerCase().includes(query.trim().toLowerCase());
  });

  function apply(key: string, result: Awaited<ReturnType<typeof indexKnowledge>>) {
    setRows((current) =>
      current.map((row) =>
        row.key === key
          ? {
              ...row,
              state: result.state,
              chunkCount: result.ok ? result.chunkCount : 0,
              indexedAt: result.ok ? new Date().toISOString() : row.indexedAt,
              error: result.ok ? null : result.message,
            }
          : row,
      ),
    );
  }

  async function runBatch(keys: string[], force: boolean) {
    if (keys.length === 0) return;
    cancelRef.current = false;
    let failed = 0;
    for (let i = 0; i < keys.length; i += 1) {
      if (cancelRef.current) break;
      const row = rows.find((item) => item.key === keys[i]);
      setRunning({ done: i, total: keys.length, current: row?.title ?? keys[i] });
      try {
        const result = await indexKnowledge(keys[i], force);
        apply(keys[i], result);
        if (!result.ok) failed += 1;
      } catch {
        failed += 1;
      }
    }
    const cancelled = cancelRef.current;
    setRunning(null);
    if (cancelled) toast.message("Indexing stopped");
    else if (failed) toast.error(`${failed} of ${keys.length} could not be indexed. See the Failed filter and the Logs tab.`);
    else toast.success(`Indexed ${keys.length} ${keys.length === 1 ? "item" : "items"}`);
    router.refresh();
  }

  async function indexOne(row: KnowledgeRow) {
    setBusyKey(row.key);
    try {
      const result = await indexKnowledge(row.key, true);
      apply(row.key, result);
      if (result.ok) toast.success(`Indexed “${row.title}” (${result.chunkCount} chunks)`);
      else toast.error(result.message);
    } finally {
      setBusyKey(null);
    }
  }

  async function remove(key: string, title: string) {
    if (!window.confirm(`Remove “${title}” from the knowledge base? Aquibot stops using it until it is indexed again.`)) return;
    setBusyKey(key);
    const result = await removeKnowledge(key);
    setBusyKey(null);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setRows((current) => current.map((row) => (row.key === key ? { ...row, state: row.unsupported ? "unsupported" : "not_indexed", chunkCount: 0, indexedAt: null, error: row.unsupported } : row)));
    setOrphans((current) => current.filter((item) => item.id !== key));
    toast.success("Removed from the knowledge base");
  }

  async function view(row: { key: string; title: string }) {
    setViewing({ key: row.key, title: row.title, chunks: null });
    const result = await knowledgeChunks(row.key);
    if (!result.ok) {
      toast.error(result.message);
      setViewing(null);
      return;
    }
    setViewing({ key: row.key, title: row.title, chunks: result.chunks });
  }

  if (!status.ready) return <SetupCard status={status} sources={rows.length} />;

  const pendingKeys = rows.filter(needsWork).map((row) => row.key);
  const allKeys = rows.filter((row) => row.state !== "unsupported").map((row) => row.key);
  const filters: { key: Filter; label: string; count?: number }[] = [
    { key: "all", label: "All", count: rows.length },
    { key: "pending", label: "Needs indexing", count: counts.pending },
    { key: "errors", label: "Failed", count: counts.errors + rows.filter((row) => row.state === "unsupported").length },
    { key: "telex", label: "Telex" },
    { key: "file", label: "Files" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Indexed" value={`${counts.indexed} / ${counts.readable}`} meta="Readable telex and files" tone={counts.indexed === counts.readable ? "good" : undefined} />
        <Stat label="Needs indexing" value={String(counts.pending)} meta="New or changed since last run" tone={counts.pending ? "warn" : undefined} />
        <Stat label="Failed" value={String(counts.errors)} meta="Retry, or check the Logs tab" tone={counts.errors ? "bad" : undefined} />
        <Stat label="Chunks stored" value={chunkTotal.toLocaleString()} meta="Searchable passages in pgvector" />
      </div>

      <Panel
        title="Knowledge sources"
        description="Published telex and uploaded library files. Saving a telex or uploading a file indexes it automatically; use these controls to backfill or retry."
        icon={<Database className="h-4 w-4" />}
        actions={
          <>
            <button type="button" className={btnSecondary} disabled={Boolean(running) || allKeys.length === 0} onClick={() => window.confirm(`Re-index all ${allKeys.length} sources? Files are read again with Gemini.`) && runBatch(allKeys, true)}>
              <RefreshCw className="h-4 w-4" />
              Re-index all
            </button>
            <button type="button" className={btnPrimary} disabled={Boolean(running) || pendingKeys.length === 0} onClick={() => runBatch(pendingKeys, false)}>
              <Database className="h-4 w-4" />
              {pendingKeys.length ? `Index ${pendingKeys.length} pending` : "All up to date"}
            </button>
          </>
        }
      >
        {running ? (
          <div className="mb-4 rounded-xl border border-blue/20 bg-blue-light/50 px-4 py-3">
            <div className="flex items-center justify-between gap-3 text-[12.5px]">
              <span className="flex min-w-0 items-center gap-2 text-ink">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-blue" />
                <span className="truncate">
                  Indexing {running.done + 1} of {running.total}: {running.current}
                </span>
              </span>
              <button type="button" className={btnGhost} onClick={() => (cancelRef.current = true)}>
                Stop after this one
              </button>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-blue transition-all" style={{ width: `${Math.round((running.done / running.total) * 100)}%` }} />
            </div>
          </div>
        ) : null}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 rounded-lg bg-s2 p-0.5">
            {filters.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`rounded-md px-2.5 py-1 text-[12.5px] font-semibold transition ${filter === item.key ? "bg-white text-ink shadow-sm" : "text-mid hover:text-ink"}`}
              >
                {item.label}
                {item.count !== undefined ? <span className="ml-1 font-mono text-[11px] text-dim">{item.count}</span> : null}
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dim" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter by title" className={`${field} h-9 w-full pl-8`} />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead className="bg-s2/70 text-[11px] uppercase tracking-[0.08em] text-mid">
              <tr>
                <th className="px-3 py-2 font-semibold">Source</th>
                <th className="px-3 py-2 font-semibold">Who sees it</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Indexed</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-[12.5px] text-dim">
                    Nothing matches this filter.
                  </td>
                </tr>
              ) : null}
              {visible.map((row) => {
                const busy = busyKey === row.key || running?.current === row.title;
                return (
                  <tr key={row.key} className="align-top">
                    <td className="max-w-[360px] px-3 py-2.5">
                      <div className="flex items-start gap-2">
                        {row.sourceType === "telex" ? <Newspaper className="mt-0.5 h-4 w-4 shrink-0 text-dim" /> : <FileText className="mt-0.5 h-4 w-4 shrink-0 text-dim" />}
                        <div className="min-w-0">
                          <Link href={row.editHref} className="block truncate font-semibold text-ink no-underline hover:text-blue" title={row.title}>
                            {row.title}
                          </Link>
                          <span className="text-[11.5px] text-dim">
                            {row.sourceType === "telex" ? "Telex" : row.fileType}
                            {row.publishedAt ? ` · ${day(row.publishedAt)}` : ""}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[12.5px]">
                      {row.visibility === "private" ? (
                        <span title="Used silently: Aquibot answers from it but never names it">Private · used silently</span>
                      ) : (
                        ACCESS_LABEL[row.access]
                      )}
                    </td>
                    <td className="max-w-[260px] px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${STATE[row.state].className}`}>
                        {row.state === "indexed" ? <CheckCircle2 className="h-3 w-3" /> : row.state === "error" ? <CircleAlert className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />}
                        {STATE[row.state].label}
                        {row.state === "indexed" || row.state === "outdated" ? ` · ${row.chunkCount}` : ""}
                      </span>
                      {row.error ? <p className="mt-1 text-[11.5px] leading-snug text-dim">{row.error}</p> : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-mid">{stamp(row.indexedAt)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        {row.state !== "unsupported" ? (
                          <button type="button" className={btnGhost} disabled={busy || Boolean(running)} onClick={() => indexOne(row)}>
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            {row.state === "not_indexed" ? "Index" : "Re-index"}
                          </button>
                        ) : null}
                        {row.chunkCount > 0 ? (
                          <>
                            <button type="button" className={btnGhost} onClick={() => view(row)}>
                              Chunks
                            </button>
                            <button type="button" className={`${btnGhost} hover:text-[#b42318]`} disabled={busy} onClick={() => remove(row.key, row.title)} aria-label={`Remove ${row.title} from the index`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {orphans.length ? (
          <div className="mt-4 rounded-xl border border-[#f5dfb3] bg-[#fffaf0] px-4 py-3">
            <p className="text-[13px] font-semibold text-ink">Still in the index but no longer published or uploaded</p>
            <ul className="mt-2 space-y-1">
              {orphans.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                  <span className="truncate">
                    {item.title || item.id} <span className="text-dim">· {item.chunk_count} chunks</span>
                  </span>
                  <button type="button" className={btnGhost} onClick={() => remove(item.id, item.title || item.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Panel>

      <IndexSearch />

      {viewing ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/30" onClick={() => setViewing(null)}>
          <aside className="flex h-full w-full max-w-2xl flex-col bg-surface shadow-xl" onClick={(event) => event.stopPropagation()}>
            <header className="flex items-center gap-3 border-b border-border px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-dim">Stored chunks</p>
                <h2 className="truncate text-[14px] font-bold text-ink">{viewing.title}</h2>
              </div>
              <button type="button" className={btnGhost} onClick={() => setViewing(null)} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {viewing.chunks === null ? <p className="text-[12.5px] text-dim">Loading…</p> : null}
              {viewing.chunks?.map((chunk) => (
                <div key={chunk.chunk_index} className="rounded-lg border border-border">
                  <p className="border-b border-border bg-s2/60 px-3 py-1 font-mono text-[10.5px] text-mid">
                    #{chunk.chunk_index + 1} · {chunk.content.length.toLocaleString()} characters
                  </p>
                  <pre className="whitespace-pre-wrap break-words px-3 py-2 font-sans text-[12.5px] leading-relaxed text-ink">{chunk.content}</pre>
                </div>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function IndexSearch() {
  const [term, setTerm] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<{ id: number; title: string; content: string; source_type: string; visibility: string; published_at: string | null }[] | null>(null);

  async function run(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await searchIndexText(term);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setRows(result.rows);
  }

  const highlight = (text: string) => {
    const at = text.toLowerCase().indexOf(term.trim().toLowerCase());
    const start = Math.max(0, at - 160);
    const snippet = `${start > 0 ? "…" : ""}${text.slice(start, start + 420)}${start + 420 < text.length ? "…" : ""}`;
    const index = snippet.toLowerCase().indexOf(term.trim().toLowerCase());
    if (index < 0) return snippet;
    return (
      <>
        {snippet.slice(0, index)}
        <mark className="rounded bg-[#fff0b3] px-0.5">{snippet.slice(index, index + term.trim().length)}</mark>
        {snippet.slice(index + term.trim().length)}
      </>
    );
  };

  return (
    <Panel title="Find text in the index" description="Check exactly what Aquibot has stored for a phrase, price or company name." icon={<Search className="h-4 w-4" />}>
      <form onSubmit={run} className="flex gap-2">
        <input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="e.g. granular urea Egypt" className={`${field} h-9 flex-1`} />
        <button type="submit" className={btnSecondary} disabled={busy || term.trim().length < 2}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </button>
      </form>
      {rows ? (
        rows.length === 0 ? (
          <p className="mt-3 text-[12.5px] text-dim">No stored passage contains “{term}”.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {rows.map((row) => (
              <li key={row.id} className="px-3 py-2.5">
                <p className="flex flex-wrap items-center gap-2 text-[12px] text-mid">
                  <span className="font-semibold text-ink">{row.title}</span>
                  <span>{row.source_type === "telex" ? "Telex" : "File"}</span>
                  {row.published_at ? <span>{day(row.published_at)}</span> : null}
                  {row.visibility === "private" ? <span className="rounded-full bg-s2 px-1.5">private</span> : null}
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink">{highlight(row.content)}</p>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </Panel>
  );
}

function Stat({ label, value, meta, tone }: { label: string; value: string; meta: string; tone?: "good" | "warn" | "bad" }) {
  const color = tone === "good" ? "text-[#1f7a45]" : tone === "warn" ? "text-[#9a5b00]" : tone === "bad" ? "text-[#b42318]" : "text-ink";
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-[0_1px_2px_rgba(26,58,92,0.05)]">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">{label}</p>
      <p className={`mt-1 text-[20px] font-bold tracking-tight ${color}`}>{value}</p>
      <p className="mt-0.5 truncate text-[12px] text-mid">{meta}</p>
    </div>
  );
}

export function SetupCard({ status, sources }: { status: EngineStatus; sources?: number }) {
  const steps = [
    {
      done: status.gemini,
      title: "Add a Gemini API key",
      body: (
        <>
          Set <code className="rounded bg-s2 px-1 font-mono text-[12px]">GEMINI_API_KEY</code> in the server environment (Google AI Studio → API keys).
        </>
      ),
    },
    {
      done: status.supabase,
      title: "Connect Supabase with the service role key",
      body: (
        <>
          Set <code className="rounded bg-s2 px-1 font-mono text-[12px]">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="rounded bg-s2 px-1 font-mono text-[12px]">SUPABASE_SERVICE_ROLE_KEY</code>. The key stays on the server.
        </>
      ),
    },
    {
      done: status.tables,
      title: "Create the Aquibot tables",
      body: (
        <>
          Run <code className="rounded bg-s2 px-1 font-mono text-[12px]">supabase/migrations/002_aquibot.sql</code> in the Supabase SQL editor. It enables pgvector and creates the index, sessions, usage and logs tables.
        </>
      ),
    },
  ];
  return (
    <section className="rounded-2xl border border-[#f5dfb3] bg-[#fffaf0] px-5 py-4">
      <h2 className="text-[14px] font-bold text-ink">Finish connecting the chat engine</h2>
      <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-mid">
        The engine is built into this app: Gemini reads and embeds content, Supabase pgvector stores it, and members chat on the hub.
        {typeof sources === "number" ? ` ${sources} published ${sources === 1 ? "source is" : "telex and files are"} ready to index once setup is done.` : ""} Restart the server after changing environment variables.
      </p>
      <ol className="mt-3 space-y-2.5">
        {steps.map((step, index) => (
          <li key={step.title} className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3">
            {step.done ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1f7a45]" /> : <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#d9b36c] font-mono text-[10px] text-[#9a5b00]">{index + 1}</span>}
            <div>
              <p className={`text-[13.5px] font-semibold ${step.done ? "text-mid line-through decoration-mid/40" : "text-ink"}`}>{step.title}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-mid">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      {status.problem && status.supabase && status.gemini ? <p className="mt-3 text-[12px] text-[#9a5b00]">{status.problem}</p> : null}
    </section>
  );
}
