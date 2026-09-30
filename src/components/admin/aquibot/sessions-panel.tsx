"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, FlaskConical, MessagesSquare, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteAquibotSession } from "@/app/admin/aquibot/actions";
import { Markdown } from "@/components/hub/markdown";
import { btnGhost, btnSecondary, field } from "@/components/admin/ui";
import { planName } from "@/lib/aq-modules/types";
import type { MessageRow, SessionRow } from "@/lib/aquibot-engine/store";

function stamp(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function SessionsPanel({
  rows,
  total,
  page,
  pageSize,
  search,
  stats,
  selected,
}: {
  rows: SessionRow[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  stats: { sessions: number; month: number; questions: number; users: number };
  selected: { session: SessionRow; messages: MessageRow[] } | null;
}) {
  const router = useRouter();
  const [term, setTerm] = useState(search);
  const [pending, startTransition] = useTransition();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (params: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams({ tab: "sessions" });
    const merged = { q: search || undefined, page: page > 1 ? page : undefined, ...params };
    Object.entries(merged).forEach(([key, value]) => {
      if (value !== undefined && value !== "") query.set(key, String(value));
    });
    return `?${query.toString()}`;
  };

  function remove(session: SessionRow) {
    if (!window.confirm(`Delete “${session.title}” from ${session.user_email}? This can't be undone.`)) return;
    startTransition(async () => {
      const result = await deleteAquibotSession(session.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Session deleted");
      router.push(href({ session: undefined }));
      router.refresh();
    });
  }

  const cards = [
    { label: "Sessions stored", value: stats.sessions.toLocaleString() },
    { label: "Active this month", value: stats.month.toLocaleString() },
    { label: "Questions this month", value: stats.questions.toLocaleString() },
    { label: "Members asking this month", value: stats.users.toLocaleString() },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-[0_1px_2px_rgba(26,58,92,0.05)]">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">{card.label}</p>
            <p className="mt-1 text-[20px] font-bold tracking-tight text-ink">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section className="aq-card">
          <form
            className="flex gap-2 border-b border-border p-3"
            onSubmit={(event) => {
              event.preventDefault();
              router.push(href({ q: term.trim() || undefined, page: undefined, session: undefined }));
            }}
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dim" />
              <input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Member email, name or chat title" className={`${field} h-9 w-full pl-8`} />
            </div>
            <button type="submit" className={btnSecondary}>
              Search
            </button>
          </form>
          {rows.length === 0 ? (
            <p className="px-4 py-10 text-center text-[12.5px] text-dim">{search ? `No sessions match “${search}”.` : "No member has chatted with Aquibot yet."}</p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((row) => {
                const active = selected?.session.id === row.id;
                return (
                  <li key={row.id}>
                    <Link href={href({ session: row.id })} scroll={false} className={`block px-4 py-2.5 no-underline transition ${active ? "bg-blue-light" : "hover:bg-s2/60"}`}>
                      <span className="flex items-center gap-1.5">
                        <span className={`min-w-0 flex-1 truncate text-[13px] font-semibold ${active ? "text-blue" : "text-ink"}`}>{row.title}</span>
                        {row.test_mode ? <FlaskConical className="h-3.5 w-3.5 shrink-0 text-[#9a5b00]" aria-label="Test prompt session" /> : null}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2 text-[11.5px] text-mid">
                        <span className="truncate">{row.user_email || row.user_name}</span>
                        <span className="shrink-0">· {row.message_count / 2} Q</span>
                        <span className="ml-auto shrink-0 text-dim">{stamp(row.updated_at)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {pages > 1 ? (
            <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[12px] text-mid">
              <span>
                Page {page} of {pages} · {total.toLocaleString()} sessions
              </span>
              <span className="flex gap-1">
                {page > 1 ? (
                  <Link href={href({ page: page - 1, session: undefined })} className={btnGhost}>
                    Previous
                  </Link>
                ) : null}
                {page < pages ? (
                  <Link href={href({ page: page + 1, session: undefined })} className={btnGhost}>
                    Next
                  </Link>
                ) : null}
              </span>
            </div>
          ) : null}
        </section>

        <section className="min-h-[420px] aq-card">
          {selected ? (
            <>
              <header className="flex flex-wrap items-start gap-3 border-b border-border px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[14px] font-bold text-ink">{selected.session.title}</h2>
                  <p className="mt-0.5 text-[12px] text-mid">
                    {selected.session.user_name} · {selected.session.user_email} · {planName(selected.session.user_plan)} · started {stamp(selected.session.created_at)}
                    {selected.session.test_mode ? " · test prompt" : ""}
                  </p>
                </div>
                <a href={`/admin/aquibot/sessions/${selected.session.id}/export?format=md`} className={btnGhost}>
                  <Download className="h-3.5 w-3.5" />
                  Markdown
                </a>
                <a href={`/admin/aquibot/sessions/${selected.session.id}/export?format=json`} className={btnGhost}>
                  <Download className="h-3.5 w-3.5" />
                  JSON
                </a>
                <button type="button" className={`${btnGhost} hover:text-[#b42318]`} disabled={pending} onClick={() => remove(selected.session)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </header>
              <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
                {selected.messages.map((message) =>
                  message.role === "user" ? (
                    <div key={message.id} className="flex justify-end">
                      <div className="max-w-[80%]">
                        <p className="whitespace-pre-wrap rounded-xl bg-blue-light px-3.5 py-2 text-[13.5px]">{message.content}</p>
                        <p className="mt-0.5 text-right text-[10.5px] text-dim">{stamp(message.created_at)}</p>
                      </div>
                    </div>
                  ) : (
                    <div key={message.id}>
                      <div className="rounded-xl bg-s2 px-3.5 py-2.5">
                        <Markdown text={message.content} className="text-[13.5px]" />
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-dim">
                        {message.meta?.intent ? <span>intent {message.meta.intent}</span> : null}
                        {message.meta?.rewrittenQuery ? <span>searched “{message.meta.rewrittenQuery}”</span> : null}
                        {message.meta?.sources?.length ? <span>{message.meta.sources.length} sources</span> : null}
                        {message.meta?.privateSources ? <span>{message.meta.privateSources} private</span> : null}
                        {message.meta?.timings?.totalMs ? <span>{(message.meta.timings.totalMs / 1000).toFixed(1)}s</span> : null}
                        {message.meta?.model ? <span>{message.meta.model}</span> : null}
                        {message.meta?.stopped ? <span>stopped early</span> : null}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-2 px-6 text-center">
              <MessagesSquare className="h-6 w-6 text-dim" />
              <p className="text-[13px] text-mid">Choose a session to read the conversation, export it or delete it.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
