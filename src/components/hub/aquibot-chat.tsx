"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { CalendarRange, Check, Copy, FileText, FlaskConical, History, Lock, Newspaper, Send, Sparkles, SquarePen, Square, Trash2, TriangleAlert, User } from "lucide-react";
import { toast } from "sonner";
import { deleteMyAquibotSession } from "@/app/hub/aquibot/actions";
import { AquibotAvatar } from "@/components/app/aquibot-avatar";
import { useI18n } from "@/components/app/i18n";
import { Markdown } from "@/components/hub/markdown";
import { useAquibotChat, type ChatMessage, type ChatStage } from "@/components/hub/use-aquibot-chat";
import type { Usage } from "@/lib/aquibot-engine/chat";
import { describeRange } from "@/lib/aquibot-engine/dates";

export type { ChatMessage };
export type SessionSummary = { id: string; title: string; updatedAt: string };

const SUGGESTIONS = ["bot.s1", "bot.s2", "bot.s3", "bot.s4"];

const JOURNEY = [
  { key: "bot.j1", href: "/hub/account" },
  { key: "bot.j2", href: "/hub/telex" },
  { key: "bot.j3", href: "/hub/netback" },
  { key: "bot.j4", href: "/hub/order-desk?tab=desk" },
  { key: "bot.j5", href: "/hub/account/membership" },
];

const DESK_EMAIL = "enquiry@aquifert.com";

function day(iso: string | null, lang = "en-GB") {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(lang, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
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
  firstName,
  upgraded,
  draft = "",
}: {
  sessions: SessionSummary[];
  session: { id: string; title: string; messages: ChatMessage[] } | null;
  usage: Usage;
  intro: string;
  engine: { ready: boolean; problem: string | null };
  isAdmin: boolean;
  hasTestPrompt: boolean;
  firstName: string;
  /** On a paid plan, so the last journey step shows as done. */
  upgraded: boolean;
  /** Question handed over from the home prompt bar or search; filled in, not sent. */
  draft?: string;
}) {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [sessions, setSessions] = useState(initialSessions);
  const [input, setInput] = useState(draft);
  const [testMode, setTestMode] = useState(false);
  const [deleting, startDelete] = useTransition();
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stepsRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = stepsRef.current;
    const step = list?.querySelector<HTMLElement>('[aria-current="step"]');
    if (list && step && list.scrollWidth > list.clientWidth) list.scrollLeft = (step.parentElement?.offsetLeft ?? 0) - 44;
  }, []);

  const chat = useAquibotChat({
    sessionId: session?.id ?? null,
    messages: session?.messages ?? [],
    usage: initialUsage,
    onDone: ({ sessionId, title, isNew }) => {
      if (isNew) window.history.replaceState(null, "", `/hub/aquibot?chat=${sessionId}`);
      setSessions((current) => [{ id: sessionId, title, updatedAt: new Date().toISOString() }, ...current.filter((item) => item.id !== sessionId)]);
    },
  });
  const usage = chat.usage ?? initialUsage;
  const canSend = engine.ready && !chat.busy && !chat.limitReached && input.trim().length > 0;
  const introLines = intro.split("\n").filter((line) => line.trim());

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTo({ top: log.scrollHeight, behavior: chat.messages.length > 2 ? "smooth" : "auto" });
  }, [chat.messages]);

  useEffect(() => {
    const box = inputRef.current;
    if (!box) return;
    box.style.height = "auto";
    box.style.height = `${Math.min(Math.max(box.scrollHeight, 44), 160)}px`;
  }, [input]);

  function send(text: string) {
    if (!engine.ready || chat.busy || chat.limitReached || !text.trim()) return;
    setInput("");
    void chat.send(text, { testMode: testMode && isAdmin }).then(() => inputRef.current?.focus());
  }

  function newChat() {
    if (chat.busy) return;
    chat.reset();
    setInput("");
    window.history.pushState(null, "", "/hub/aquibot");
    inputRef.current?.focus();
  }

  function removeSession(id: string) {
    if (!window.confirm(t("bot.deleteConfirm"))) return;
    startDelete(async () => {
      const result = await deleteMyAquibotSession(id);
      if (!result.ok) {
        toast.error(result.message ?? "Could not delete the chat.");
        return;
      }
      setSessions((current) => current.filter((item) => item.id !== id));
      toast.success(t("bot.deleted"));
      if (id === chat.sessionId) newChat();
      router.refresh();
    });
  }

  const usagePercent = usage.unlimited || usage.limit === 0 ? 0 : Math.min(100, Math.round((usage.used / usage.limit) * 100));
  const journey = JOURNEY.map((step, index) => ({ ...step, done: index === 0 || (index === JOURNEY.length - 1 && upgraded) }));
  const current = journey.findIndex((step) => !step.done);
  const [footerBefore, footerAfter = ""] = t("bot.footer").split("{email}");

  return (
    <div className="mx-auto w-full max-w-4xl">
      <header className="mb-5">
        <h1 className="text-[26px] font-black tracking-tight text-ink sm:text-[30px]">Aquibot Trader AI</h1>
        <p className="mt-1 max-w-2xl text-[15.5px] leading-6 text-mid">{t("bot.subtitle")}</p>
      </header>

      <section className="aq-card mb-5 px-4 py-4 sm:px-5" aria-label={t("bot.journey")}>
        <p className="mb-3 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.12em] text-mid">
          <Sparkles className="h-3.5 w-3.5 text-teal-500" /> {t("bot.journey")}
        </p>
        <ol
          ref={stepsRef}
          className="-mx-4 flex snap-x scroll-px-4 items-center overflow-x-auto px-4 py-0.5 [mask-image:linear-gradient(to_right,transparent,#000_16px,#000_calc(100%-28px),transparent)] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:gap-y-2 sm:overflow-visible sm:px-0 sm:[mask-image:none] [&::-webkit-scrollbar]:hidden"
        >
          {journey.map((step, index) => (
            <li key={step.key} className="flex shrink-0 snap-start items-center">
              <Link
                href={step.href}
                aria-current={index === current ? "step" : undefined}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold no-underline transition ${
                  step.done
                    ? "bg-teal-500 text-white hover:bg-teal-600"
                    : index === current
                      ? "border border-teal-500/50 bg-teal-50 text-teal-700 hover:bg-teal-100"
                      : "border border-border bg-s2/70 text-mid hover:text-ink"
                }`}
              >
                <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[11px] ${step.done ? "bg-white/25" : "bg-ink/10"}`}>
                  {step.done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : index + 1}
                </span>
                {t(step.key)}
              </Link>
              {index < journey.length - 1 ? <span className="mx-1.5 h-px w-4 bg-border sm:w-6" aria-hidden /> : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="aq-card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border bg-s2/50 px-4 py-3.5 sm:px-5">
          <AquibotAvatar size={40} active={chat.busy} />
          <div className="min-w-0 flex-1">
            <p className="text-[15.5px] font-semibold text-ink">Aquibot</p>
            <p className="truncate text-[13px] text-mid">{t("bot.cardSub")}</p>
          </div>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => setTestMode((value) => !value)}
              disabled={!hasTestPrompt}
              title={hasTestPrompt ? "Answer with the draft test prompt instead of the live one" : "Save a test prompt in Admin → Aquibot first"}
              className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 sm:flex ${
                testMode ? "border-[#f5c46b] bg-[#fff6e5] text-[#9a5b00]" : "border-border bg-white text-mid hover:text-ink"
              }`}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              {testMode ? "Test prompt on" : "Test prompt"}
            </button>
          ) : null}
          <HistoryMenu sessions={sessions} activeId={chat.sessionId} deleting={deleting} onDelete={removeSession} />
          <button
            type="button"
            onClick={newChat}
            disabled={chat.busy}
            title={t("bot.newChat")}
            aria-label={t("bot.newChat")}
            className="flex h-8 w-8 items-center justify-center rounded-full text-mid transition hover:bg-white hover:text-ink disabled:opacity-40"
          >
            <SquarePen className="h-4 w-4" />
          </button>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
              engine.ready ? "bg-emerald-50 text-emerald-700" : "bg-[#fff6e5] text-[#9a5b00]"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${engine.ready ? "bg-emerald-500" : "bg-[#d97706]"}`} />
            {engine.ready ? t("bot.online") : t("bot.offline")}
          </span>
        </div>

        <div ref={logRef} className="h-[min(56vh,540px)] min-h-[320px] space-y-4 overflow-y-auto px-4 py-5 sm:px-5" aria-live="polite">
          <div className="flex gap-3">
            <AquibotAvatar size={32} className="mt-0.5" />
            <div className="max-w-[80%] space-y-1.5 rounded-2xl rounded-ss-md bg-s2 px-4 py-3 text-[15.5px] leading-relaxed text-ink shadow-[0_1px_2px_rgb(14_32_49/0.06)]">
              {firstName ? <p className="font-semibold">{t("bot.hello", { name: firstName })}</p> : null}
              {introLines.map((line, index) => (
                <p key={index} className={index === introLines.length - 1 && introLines.length > 1 ? "text-[13px] text-mid" : ""}>
                  {line}
                </p>
              ))}
            </div>
          </div>

          {chat.messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="flex flex-row-reverse gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-600 text-white">
                  <User className="h-4 w-4" aria-hidden />
                </span>
                <p translate="no" className="max-w-[75%] whitespace-pre-wrap rounded-2xl rounded-se-md bg-navy-600 px-4 py-3 text-[15.5px] leading-relaxed text-white shadow-[0_1px_2px_rgb(14_32_49/0.08)]">
                  {message.content}
                </p>
              </div>
            ) : (
              <AssistantMessage key={message.id} message={message} stage={message.pending ? chat.stage : null} isAdmin={isAdmin} />
            ),
          )}
        </div>

        <div className="border-t border-border px-4 py-4 sm:px-5">
          {!engine.ready ? (
            <Notice>
              {isAdmin ? (
                <>
                  {t("bot.setupAdmin", { problem: engine.problem ?? "" })}{" "}
                  <Link href="/admin/aquibot?tab=knowledge" className="font-semibold text-[#9a5b00] underline">
                    {t("bot.openSetup")}
                  </Link>
                </>
              ) : (
                t("bot.setup")
              )}
            </Notice>
          ) : chat.limitReached ? (
            <Notice>{t("bot.limit", { limit: usage.limit.toLocaleString(lang), date: day(`${usage.resetsOn}T00:00:00Z`, lang) })}</Notice>
          ) : null}

          {chat.messages.length < 6 ? (
            <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 [mask-image:linear-gradient(to_right,transparent,#000_16px,#000_calc(100%-28px),transparent)] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:[mask-image:none] [&::-webkit-scrollbar]:hidden">
              {SUGGESTIONS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => send(t(key))}
                  disabled={!engine.ready || chat.busy || chat.limitReached}
                  className="shrink-0 whitespace-nowrap rounded-full border border-border bg-white px-3.5 py-2 text-start text-[13px] font-medium text-navy-800 transition hover:border-teal-500/40 hover:bg-teal-50 disabled:opacity-50 sm:shrink sm:whitespace-normal sm:py-1.5"
                >
                  {t(key)}
                </button>
              ))}
            </div>
          ) : null}

          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSend) send(input);
            }}
          >
            <textarea
              id="aquibot-input"
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
              disabled={!engine.ready || chat.limitReached}
              placeholder={t("bot.inputPage")}
              aria-label={t("bot.inputPage")}
              className="min-h-11 flex-1 resize-none rounded-xl border border-border bg-white px-4 py-[11px] text-[15.5px] leading-5 outline-none transition disabled:cursor-not-allowed"
            />
            {chat.busy ? (
              <button type="button" onClick={chat.stop} aria-label={t("bot.stop")} title={t("bot.stop")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink text-white">
                <Square className="h-4 w-4" fill="currentColor" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSend}
                aria-label={t("bot.send")}
                title={t("bot.send")}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-500 text-white shadow-[0_6px_16px_-8px_rgb(79_127_114/0.9)] transition hover:bg-teal-600 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </form>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-1 text-[12px] text-dim">
            <span className="pointer-coarse:hidden">
              {t("bot.enterHint")}
              {testMode ? " · answering with the test prompt" : ""}
            </span>
            {usage.unlimited ? (
              <span className="font-mono text-[11.5px]">
                {t("bot.unlimited")}
                {isAdmin ? " (admin)" : ""}
              </span>
            ) : (
              <span className="flex items-center gap-2 font-mono text-[11.5px]">
                {t("bot.usage", { used: usage.used.toLocaleString(lang), limit: usage.limit.toLocaleString(lang) })}
                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-s2">
                  <span className={`block h-full rounded-full ${usagePercent >= 90 ? "bg-[#d97706]" : "bg-teal-500"}`} style={{ width: `${usagePercent}%` }} />
                </span>
                {t("bot.resets", { date: day(`${usage.resetsOn}T00:00:00Z`, lang) })}
              </span>
            )}
          </div>
        </div>
      </section>

      <p className="mt-4 text-center text-[13px] text-mid">
        {footerBefore}
        <a href={`mailto:${DESK_EMAIL}`} className="font-semibold text-teal-700 hover:underline">
          {DESK_EMAIL}
        </a>
        {footerAfter}
      </p>
    </div>
  );
}

function HistoryMenu({
  sessions,
  activeId,
  deleting,
  onDelete,
}: {
  sessions: SessionSummary[];
  activeId: string | null;
  deleting: boolean;
  onDelete: (id: string) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t("bot.history")}
        aria-label={t("bot.history")}
        className={`flex h-8 items-center gap-1 rounded-full px-2 text-mid transition hover:bg-white hover:text-ink ${open ? "bg-white text-ink" : ""}`}
      >
        <History className="h-4 w-4" />
        {sessions.length ? <span className="font-mono text-[11.5px] font-semibold">{sessions.length}</span> : null}
      </button>
      {open ? (
        <div role="menu" className="aq-drop aq-float absolute end-0 top-[calc(100%+8px)] z-50 w-[min(80vw,300px)] rounded-2xl border border-border bg-white p-1.5">
          <p className="px-2.5 pb-1 pt-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-mid">{t("bot.history")}</p>
          <div className="max-h-[320px] overflow-y-auto">
            {sessions.length === 0 ? <p className="px-2.5 py-3 text-[13.5px] text-dim">{t("bot.noHistory")}</p> : null}
            {sessions.map((item) => {
              const active = item.id === activeId;
              return (
                <div key={item.id} className={`group flex items-center gap-1 rounded-xl ${active ? "bg-blue-light" : "hover:bg-s2"}`}>
                  <Link
                    href={`/hub/aquibot?chat=${item.id}`}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className={`min-w-0 flex-1 px-2.5 py-2 no-underline ${active ? "text-blue" : "text-ink"}`}
                  >
                    <span className="block truncate text-[14.5px] font-medium">{item.title}</span>
                    <span className="block text-[12px] text-dim">{relative(item.updatedAt)}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    disabled={deleting}
                    aria-label={`${t("bot.delete")}: ${item.title}`}
                    title={t("bot.delete")}
                    className="me-1 rounded-lg p-1.5 text-dim opacity-100 transition hover:bg-white hover:text-[#b42318] focus:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 flex items-start gap-2 rounded-xl border border-[#f5dfb3] bg-[#fffaf0] px-3 py-2 text-[13.5px] text-[#7a4a00]">
      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function AssistantMessage({ message, stage, isAdmin }: { message: ChatMessage; stage: ChatStage | null; isAdmin: boolean }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const meta = message.meta;
  const ranges = meta?.dateRanges ?? [];
  const sources = meta?.sources ?? [];

  return (
    <div className="flex gap-3">
      <AquibotAvatar size={32} active={message.pending} className="mt-0.5" />
      <div className="min-w-0 max-w-[85%] flex-1">
        {message.content ? (
          <div translate="no" className="rounded-2xl rounded-ss-md bg-s2 px-4 py-3 shadow-[0_1px_2px_rgb(14_32_49/0.06)]">
            <Markdown text={message.content} className="text-[15.5px] text-ink" />
          </div>
        ) : message.pending ? (
          <p className="inline-flex items-center gap-2 rounded-2xl rounded-ss-md bg-s2 px-4 py-3 text-[14.5px] text-mid">
            <span className="flex gap-1">
              {[0, 1, 2].map((dot) => (
                <span key={dot} className="h-1.5 w-1.5 animate-pulse rounded-full bg-mid" style={{ animationDelay: `${dot * 150}ms` }} />
              ))}
            </span>
            {t(stage ? `bot.stage.${stage}` : "bot.thinking")}…
          </p>
        ) : null}

        {message.error ? (
          <p className="mt-1.5 flex items-start gap-2 rounded-xl border border-[#f3c9c5] bg-[#fdf2f1] px-3 py-2 text-[13.5px] text-[#b42318]">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {message.error}
          </p>
        ) : null}

        {!message.pending && message.content ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12.5px] text-mid">
            {meta?.stopped ? <span className="rounded-full bg-s2 px-2 py-0.5">{t("bot.stopped")}</span> : null}
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
              className="ms-auto flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-s2 hover:text-ink"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? t("bot.copied") : t("bot.copy")}
            </button>
          </div>
        ) : null}

        {isAdmin && !message.pending && meta?.rewrittenQuery ? <p className="mt-1 text-[12px] text-dim">Searched for: {meta.rewrittenQuery}</p> : null}
      </div>
    </div>
  );
}
