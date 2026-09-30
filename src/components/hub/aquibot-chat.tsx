"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowUp, Bot, CalendarRange, Check, Copy, FileText, FlaskConical, Lock, MessageSquarePlus, Newspaper, Square, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { deleteMyAquibotSession } from "@/app/hub/aquibot/actions";
import { Markdown } from "@/components/hub/markdown";
import type { ChatEvent, Usage } from "@/lib/aquibot-engine/chat";
import { describeRange } from "@/lib/aquibot-engine/dates";
import type { MessageMeta } from "@/lib/aquibot-engine/store";

export type ChatMessage = { id: string; role: "user" | "assistant"; content: string; meta?: MessageMeta; pending?: boolean; error?: string };
export type SessionSummary = { id: string; title: string; updatedAt: string };

const STAGE_LABEL = { rewriting: "Reading the conversation", searching: "Searching the knowledge base", writing: "Writing" } as const;

const SUGGESTIONS = ["What's the latest on urea prices?", "Summarise this week's market news", "How is DAP made?", "Where are granular urea FOB prices heading?"];

function day(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days < 7 ? `${days}d ago` : day(iso);
}

export function AquibotChat({
  sessions: initialSessions,
  session,
  usage: initialUsage,
  intro,
  engine,
  isAdmin,
  hasTestPrompt,
}: {
  sessions: SessionSummary[];
  session: { id: string; title: string; messages: ChatMessage[] } | null;
  usage: Usage;
  intro: string;
  engine: { ready: boolean; problem: string | null };
  isAdmin: boolean;
  hasTestPrompt: boolean;
}) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [sessionId, setSessionId] = useState(session?.id ?? null);
  const [title, setTitle] = useState(session?.title ?? "New chat");
  const [messages, setMessages] = useState<ChatMessage[]>(session?.messages ?? []);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<keyof typeof STAGE_LABEL | null>(null);
  const [usage, setUsage] = useState(initialUsage);
  const [testMode, setTestMode] = useState(false);
  const [deleting, startDelete] = useTransition();
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const limitReached = !usage.unlimited && usage.used >= usage.limit;
  const canSend = engine.ready && !busy && !limitReached && input.trim().length > 0;
  const introLines = intro.split("\n").filter((line) => line.trim());

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: messages.length > 2 ? "smooth" : "auto" });
  }, [messages]);

  useEffect(() => {
    const box = inputRef.current;
    if (!box) return;
    box.style.height = "auto";
    box.style.height = `${Math.min(box.scrollHeight, 200)}px`;
  }, [input]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const patchLast = (patch: (message: ChatMessage) => ChatMessage) =>
    setMessages((current) => current.map((message, index) => (index === current.length - 1 ? patch(message) : message)));

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy || !engine.ready || limitReached) return;
    setInput("");
    setBusy(true);
    setStage(null);
    const stamp = Date.now().toString(36);
    setMessages((current) => [...current, { id: `u-${stamp}`, role: "user", content: question }, { id: `a-${stamp}`, role: "assistant", content: "", pending: true }]);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch("/api/aquibot/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: question, sessionId, testMode: testMode && isAdmin }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const json = (await response.json().catch(() => null)) as { message?: string; usage?: Usage } | null;
        if (json?.usage) setUsage(json.usage);
        patchLast((message) => ({ ...message, pending: false, error: json?.message ?? "Aquibot could not answer. Please try again." }));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf("\n\n");
        while (boundary >= 0) {
          const raw = buffer.slice(0, boundary).replace(/^data:\s?/, "");
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf("\n\n");
          if (!raw) continue;
          const event = JSON.parse(raw) as ChatEvent;
          if (event.type === "status") setStage(event.stage);
          else if (event.type === "meta") patchLast((message) => ({ ...message, meta: event.meta }));
          else if (event.type === "delta") patchLast((message) => ({ ...message, content: message.content + event.text }));
          else if (event.type === "error") patchLast((message) => ({ ...message, pending: false, error: event.message }));
          else if (event.type === "done") {
            patchLast((message) => ({ ...message, id: String(event.messageId ?? message.id), content: event.content, meta: event.meta, pending: false }));
            setUsage(event.usage);
            if (!sessionId) {
              setSessionId(event.sessionId);
              setTitle(event.title);
              window.history.replaceState(null, "", `/hub/aquibot?chat=${event.sessionId}`);
            }
            setSessions((current) => [
              { id: event.sessionId, title: event.title, updatedAt: new Date().toISOString() },
              ...current.filter((item) => item.id !== event.sessionId),
            ]);
          }
        }
      }
    } catch (error) {
      if (controller.signal.aborted) patchLast((message) => ({ ...message, pending: false, meta: { ...message.meta, stopped: true } }));
      else patchLast((message) => ({ ...message, pending: false, error: error instanceof Error ? "The connection dropped. Please try again." : "Aquibot could not answer." }));
    } finally {
      patchLast((message) => (message.pending ? { ...message, pending: false, error: message.content ? undefined : message.error ?? "No answer was returned." } : message));
      abortRef.current = null;
      setBusy(false);
      setStage(null);
      inputRef.current?.focus();
    }
  }

  function newChat() {
    if (busy) return;
    setSessionId(null);
    setTitle("New chat");
    setMessages([]);
    setInput("");
    window.history.pushState(null, "", "/hub/aquibot");
    inputRef.current?.focus();
  }

  function removeSession(id: string) {
    if (!window.confirm("Delete this chat? This can't be undone.")) return;
    startDelete(async () => {
      const result = await deleteMyAquibotSession(id);
      if (!result.ok) {
        toast.error(result.message ?? "Could not delete the chat.");
        return;
      }
      setSessions((current) => current.filter((item) => item.id !== id));
      toast.success("Chat deleted");
      if (id === sessionId) newChat();
      router.refresh();
    });
  }

  const usagePercent = usage.unlimited || usage.limit === 0 ? 0 : Math.min(100, Math.round((usage.used / usage.limit) * 100));

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="flex max-h-[calc(100vh-150px)] flex-col rounded-xl border border-border bg-surface lg:sticky lg:top-4">
        <div className="border-b border-border p-3">
          <button
            type="button"
            onClick={newChat}
            disabled={busy}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-blue text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <MessageSquarePlus className="h-4 w-4" />
            New chat
          </button>
        </div>
        <p className="px-4 pb-1 pt-3 font-mono text-[10px] uppercase tracking-wider text-mid">Your chats</p>
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {sessions.length === 0 ? <p className="px-2 py-3 text-[12.5px] text-dim">Your conversations appear here.</p> : null}
          {sessions.map((item) => {
            const active = item.id === sessionId;
            return (
              <div key={item.id} className={`group flex items-center gap-1 rounded-lg ${active ? "bg-blue-light" : "hover:bg-s2"}`}>
                <Link href={`/hub/aquibot?chat=${item.id}`} className={`min-w-0 flex-1 px-2.5 py-2 no-underline ${active ? "text-blue" : "text-ink"}`}>
                  <span className="block truncate text-[13px] font-medium">{item.title}</span>
                  <span className="block text-[11px] text-dim">{relative(item.updatedAt)}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => removeSession(item.id)}
                  disabled={deleting}
                  aria-label={`Delete ${item.title}`}
                  className="mr-1 rounded p-1.5 text-dim opacity-0 transition hover:bg-surface hover:text-[#b42318] focus:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </nav>
        <div className="border-t border-border px-4 py-3">
          {usage.unlimited ? (
            <p className="font-mono text-[10.5px] text-mid">Unlimited questions{isAdmin ? " (admin)" : " on your plan"}</p>
          ) : (
            <>
              <div className="flex items-baseline justify-between font-mono text-[10.5px] text-mid">
                <span>
                  {usage.used.toLocaleString()} / {usage.limit.toLocaleString()} this month
                </span>
                <span>resets {day(`${usage.resetsOn}T00:00:00Z`)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-s2">
                <div className={`h-full rounded-full ${usagePercent >= 90 ? "bg-[#d97706]" : "bg-blue"}`} style={{ width: `${usagePercent}%` }} />
              </div>
            </>
          )}
        </div>
      </aside>

      <section className="flex min-h-[calc(100vh-150px)] flex-col rounded-xl border border-border bg-surface">
        <header className="flex items-center gap-3 border-b border-border px-5 py-3">
          <h1 className="min-w-0 flex-1 truncate text-[16px] font-black">{title}</h1>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => setTestMode((value) => !value)}
              disabled={!hasTestPrompt}
              title={hasTestPrompt ? "Answer with the draft test prompt instead of the live one" : "Save a test prompt in Admin → Aquibot first"}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                testMode ? "border-[#f5c46b] bg-[#fff6e5] text-[#9a5b00]" : "border-border text-mid hover:text-ink"
              }`}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              {testMode ? "Test prompt on" : "Test prompt"}
            </button>
          ) : null}
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {introLines.length ? (
            <div className="flex gap-2.5">
              <Avatar />
              <div className="max-w-[720px] space-y-1.5 rounded-xl bg-s2 px-3.5 py-2.5 text-[14px]">
                {introLines.map((line, index) => (
                  <p key={index} className={index === introLines.length - 1 && introLines.length > 1 ? "text-[12px] text-mid" : ""}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {messages.length === 0 && engine.ready ? (
            <div className="flex flex-wrap gap-2 pl-[38px]">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  disabled={limitReached}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-[12.5px] text-mid transition hover:border-blue/40 hover:text-blue disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}

          {messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="flex justify-end">
                <p className="max-w-[80%] whitespace-pre-wrap rounded-xl bg-blue-light px-3.5 py-2.5 text-[14px] text-ink">{message.content}</p>
              </div>
            ) : (
              <AssistantMessage key={message.id} message={message} stage={message.pending ? stage : null} isAdmin={isAdmin} />
            ),
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border p-3">
          {!engine.ready ? (
            <Notice>
              {isAdmin ? (
                <>
                  Aquibot is not connected yet: {engine.problem}{" "}
                  <Link href="/admin/aquibot?tab=knowledge" className="font-semibold text-[#9a5b00] underline">
                    Open setup
                  </Link>
                </>
              ) : (
                "Aquibot is being set up and will be ready shortly."
              )}
            </Notice>
          ) : limitReached ? (
            <Notice>
              You have used all {usage.limit.toLocaleString()} questions for this month. Your allowance resets on {day(`${usage.resetsOn}T00:00:00Z`)}.
            </Notice>
          ) : null}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (canSend) send(input);
            }}
            className="flex items-end gap-2 rounded-xl border border-border bg-surface px-3 py-2 focus-within:border-blue/50"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  if (canSend) send(input);
                }
              }}
              rows={1}
              maxLength={4000}
              disabled={!engine.ready || limitReached}
              placeholder={engine.ready ? "Ask about prices, freight, market news or how a product is made…" : "Aquibot is not available yet"}
              aria-label="Message Aquibot"
              className="max-h-[200px] min-h-[24px] flex-1 resize-none bg-transparent py-1 text-[14px] outline-none placeholder:text-dim disabled:cursor-not-allowed"
            />
            {busy ? (
              <button type="button" onClick={() => abortRef.current?.abort()} className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white" aria-label="Stop answering">
                <Square className="h-3.5 w-3.5" fill="currentColor" />
              </button>
            ) : (
              <button type="submit" disabled={!canSend} className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue text-white transition disabled:opacity-40" aria-label="Send">
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </form>
          <p className="mt-1.5 px-1 text-[11px] text-dim">
            Enter to send · Shift+Enter for a new line{testMode ? " · answering with the test prompt" : ""}
          </p>
        </div>
      </section>
    </div>
  );
}

function Avatar() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue text-white">
      <Bot className="h-4 w-4" />
    </span>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 flex items-start gap-2 rounded-lg border border-[#f5dfb3] bg-[#fffaf0] px-3 py-2 text-[12.5px] text-[#7a4a00]">
      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function AssistantMessage({ message, stage, isAdmin }: { message: ChatMessage; stage: keyof typeof STAGE_LABEL | null; isAdmin: boolean }) {
  const [copied, setCopied] = useState(false);
  const meta = message.meta;
  const ranges = meta?.dateRanges ?? [];
  const sources = meta?.sources ?? [];

  return (
    <div className="flex gap-2.5">
      <Avatar />
      <div className="min-w-0 max-w-[760px] flex-1">
        {message.content ? (
          <div className="rounded-xl bg-s2 px-3.5 py-2.5">
            <Markdown text={message.content} />
          </div>
        ) : message.pending ? (
          <p className="flex items-center gap-2 rounded-xl bg-s2 px-3.5 py-2.5 text-[13px] text-mid">
            <span className="flex gap-1">
              {[0, 1, 2].map((dot) => (
                <span key={dot} className="h-1.5 w-1.5 animate-pulse rounded-full bg-mid" style={{ animationDelay: `${dot * 150}ms` }} />
              ))}
            </span>
            {stage ? STAGE_LABEL[stage] : "Thinking"}…
          </p>
        ) : null}

        {message.error ? (
          <p className="mt-1.5 flex items-start gap-2 rounded-lg border border-[#f3c9c5] bg-[#fdf2f1] px-3 py-2 text-[12.5px] text-[#b42318]">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {message.error}
          </p>
        ) : null}

        {!message.pending && message.content ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-mid">
            {meta?.stopped ? <span className="rounded-full bg-s2 px-2 py-0.5">Stopped early</span> : null}
            {ranges.length ? (
              <span className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5" title={ranges.map((range) => `“${range.phrase}”`).join(", ")}>
                <CalendarRange className="h-3 w-3" />
                {ranges
                  .slice(0, 2)
                  .map((range) => describeRange(range))
                  .join(" · ")}
              </span>
            ) : null}
            {meta?.dateFallback ? <span className="rounded-full bg-[#fff6e5] px-2 py-0.5 text-[#9a5b00]">No telex in that window, nearest entries used</span> : null}
            {sources.map((source, index) => (
              <span key={index} className="flex max-w-[260px] items-center gap-1 rounded-full border border-border px-2 py-0.5" title={source.title}>
                {source.sourceType === "telex" ? <Newspaper className="h-3 w-3 shrink-0" /> : <FileText className="h-3 w-3 shrink-0" />}
                <span className="truncate">
                  {source.sourceType === "telex" ? `${day(source.publishedAt)} · ` : ""}
                  {source.title}
                </span>
              </span>
            ))}
            {isAdmin && meta?.privateSources ? (
              <span className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5" title="Private files are used silently and never shown to members">
                <Lock className="h-3 w-3" />
                {meta.privateSources} private
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(message.content).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
              className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-s2 hover:text-ink"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        ) : null}

        {isAdmin && !message.pending && meta?.rewrittenQuery ? <p className="mt-1 text-[11px] text-dim">Searched for: {meta.rewrittenQuery}</p> : null}
      </div>
    </div>
  );
}
