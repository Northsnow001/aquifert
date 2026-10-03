"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Check, Copy, Expand, Factory, FileText, Newspaper, Radio, Ship, SquarePen, Square, TrendingUp, TriangleAlert, X } from "lucide-react";
import { getAquibotDockState, type AquibotDockState } from "@/app/hub/aquibot/actions";
import { AquibotAvatar } from "@/components/app/aquibot-avatar";
import { closeAquibot } from "@/components/app/aquibot-dock-store";
import { useI18n } from "@/components/app/i18n";
import { Markdown } from "@/components/hub/markdown";
import { useAquibotChat, type ChatMessage, type ChatStage } from "@/components/hub/use-aquibot-chat";

const FEATURES = [
  { icon: Radio, title: "bot.f1", desc: "bot.f1d" },
  { icon: TrendingUp, title: "bot.f2", desc: "bot.f2d" },
  { icon: Ship, title: "bot.f3", desc: "bot.f3d" },
  { icon: Factory, title: "bot.f4", desc: "bot.f4d" },
];

const SUGGESTIONS = ["bot.s1", "bot.s2", "bot.s3", "bot.s4"];

function day(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang, { day: "numeric", month: "short", timeZone: "UTC" });
}

export function AquibotDock({ open }: { open: boolean }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [info, setInfo] = useState<AquibotDockState | null>(null);
  const [chatting, setChatting] = useState(false);
  const [input, setInput] = useState("");
  const chat = useAquibotChat();
  const { setUsage } = chat;
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    let live = true;
    getAquibotDockState()
      .then((state) => {
        if (!live || !state) return;
        setInfo(state);
        setUsage(state.usage);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [open, setUsage]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) closeAquibot();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [chat.messages, chatting]);

  useEffect(() => {
    const box = inputRef.current;
    if (!box) return;
    box.style.height = "auto";
    box.style.height = `${Math.min(box.scrollHeight, 160)}px`;
  }, [input]);

  const ready = info?.ready ?? false;
  const usage = chat.usage;
  const canSend = ready && !chat.busy && !chat.limitReached && input.trim().length > 0;
  const introLines = (info?.intro ?? "").split("\n").filter((line) => line.trim());
  const showWelcome = !chatting && chat.messages.length === 0;

  function send(text: string) {
    if (!ready || chat.busy || chat.limitReached || !text.trim()) return;
    setChatting(true);
    setInput("");
    void chat.send(text).then(() => inputRef.current?.focus());
  }

  function startChatting() {
    setChatting(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function newChat() {
    if (chat.busy) return;
    chat.reset();
    setInput("");
    setChatting(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function expand() {
    closeAquibot();
    router.push(chat.sessionId ? `/hub/aquibot?chat=${chat.sessionId}` : "/hub/aquibot");
  }

  const iconBtn = "flex h-8 w-8 items-center justify-center rounded-full text-mid transition hover:bg-black/[.05] hover:text-ink disabled:opacity-40";

  return (
    <aside
      id="aquibot-dock"
      aria-label="Aquibot"
      className={`aq-dock fixed inset-0 z-[60] ${open ? "flex" : "hidden"} flex-col overflow-hidden bg-white sm:start-auto sm:w-[400px] sm:border-s sm:border-black/[.08] sm:shadow-[0_24px_64px_-16px_rgb(11_30_45/0.45)] lg:inset-y-2.5 lg:end-2.5 lg:rounded-[22px] lg:border xl:static xl:h-full xl:shrink-0 xl:shadow-[0_24px_64px_-24px_rgb(0_0_0/0.55)]`}
    >
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-black/[.07] px-3 lg:h-16">
        <AquibotAvatar size={32} active={chat.busy} />
        <span className="text-[16.5px] font-bold text-ink">Aquibot</span>
        <div className="ms-auto flex items-center gap-0.5">
          <button type="button" onClick={newChat} disabled={chat.busy} title={t("bot.newChat")} aria-label={t("bot.newChat")} className={iconBtn}>
            <SquarePen className="h-4 w-4" />
          </button>
          <button type="button" onClick={expand} title={t("bot.expand")} aria-label={t("bot.expand")} className={iconBtn}>
            <Expand className="h-4 w-4" />
          </button>
          <button type="button" onClick={closeAquibot} title={t("bot.close")} aria-label={t("bot.close")} className={iconBtn}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {showWelcome ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-6 py-8 text-center">
          <AquibotAvatar size={84} />
          <div>
            <h2 className="text-[22px] font-bold tracking-tight text-ink">{t("bot.meet")}</h2>
            <p className="mx-auto mt-1.5 max-w-[300px] text-[14.5px] leading-5 text-mid">{t("bot.tagline")}</p>
          </div>
          <ul className="aq-stagger w-full space-y-1 text-start">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-s2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-light text-blue">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold text-ink">{t(title)}</span>
                  <span className="block text-[13px] leading-4 text-mid">{t(desc)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div ref={listRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
          <div className="flex items-start gap-2">
            <AquibotAvatar size={26} className="mt-0.5" />
            <div className="min-w-0 max-w-[88%] space-y-1.5 rounded-2xl rounded-ss-md bg-s2 px-3.5 py-2.5 text-[15px] leading-6 text-ink">
              {info?.firstName ? <p className="font-semibold">{t("bot.hello", { name: info.firstName })}</p> : null}
              {introLines.map((line, index) => (
                <p key={index} className={index === introLines.length - 1 && introLines.length > 1 ? "text-[12.5px] leading-5 text-mid" : ""}>
                  {line}
                </p>
              ))}
              {!info ? <p className="text-mid">{t("bot.loading")}</p> : null}
            </div>
          </div>

          {chat.messages.length === 0 && ready ? (
            <div className="flex flex-wrap gap-1.5 ps-[34px]">
              {SUGGESTIONS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => send(t(key))}
                  disabled={chat.limitReached}
                  className="rounded-full border border-border bg-white px-3 py-1.5 text-start text-[13px] font-medium text-navy-800 transition hover:border-teal-500/40 hover:bg-teal-50 disabled:opacity-50"
                >
                  {t(key)}
                </button>
              ))}
            </div>
          ) : null}

          {chat.messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="flex justify-end">
                <p translate="no" className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-se-md bg-blue-light px-3.5 py-2.5 text-[15px] font-medium leading-6 text-[#25598f]">{message.content}</p>
              </div>
            ) : (
              <DockAnswer key={message.id} message={message} stage={message.pending ? chat.stage : null} />
            ),
          )}
        </div>
      )}

      <div className="aq-safe-bottom shrink-0 border-t border-black/[.07] px-3 pt-3">
        {showWelcome ? null : info && !ready ? (
          <Notice>
            {info.isAdmin && info.problem ? (
              <>
                {t("bot.setupAdmin", { problem: info.problem })}{" "}
                <Link href="/admin/aquibot?tab=knowledge" className="font-semibold underline" onClick={closeAquibot}>
                  {t("bot.openSetup")}
                </Link>
              </>
            ) : (
              t("bot.setup")
            )}
          </Notice>
        ) : chat.limitReached && usage ? (
          <Notice>{t("bot.limit", { limit: usage.limit.toLocaleString(lang), date: day(`${usage.resetsOn}T00:00:00Z`, lang) })}</Notice>
        ) : null}

        {showWelcome ? (
          <button
            type="button"
            onClick={startChatting}
            className="h-11 w-full rounded-xl bg-blue text-[15.5px] font-bold text-white shadow-[0_8px_20px_-10px_rgb(47_111_179/0.8)] transition hover:bg-[#25598f]"
          >
            {t("bot.start")}
          </button>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (canSend) send(input);
            }}
            className="rounded-[20px] border border-black/10 bg-white p-2 shadow-sm transition focus-within:border-blue/50 focus-within:ring-4 focus-within:ring-blue/10"
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
              rows={2}
              maxLength={4000}
              disabled={!ready || chat.limitReached}
              placeholder={t("bot.placeholder")}
              aria-label={t("bot.placeholder")}
              className="block max-h-40 w-full resize-none border-0 bg-transparent px-2 py-1 text-[15px] leading-5 shadow-none outline-none focus:shadow-none disabled:cursor-not-allowed"
            />
            <div className="flex items-center gap-2 px-1">
              <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-dim">
                {usage ? (usage.unlimited ? t("bot.unlimited") : t("bot.usage", { used: usage.used.toLocaleString(lang), limit: usage.limit.toLocaleString(lang) })) : null}
              </span>
              {chat.busy ? (
                <button type="button" onClick={chat.stop} aria-label={t("bot.stop")} title={t("bot.stop")} className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white">
                  <Square className="h-3.5 w-3.5" fill="currentColor" />
                </button>
              ) : (
                <button type="submit" disabled={!canSend} aria-label={t("bot.send")} title={t("bot.send")} className="flex h-8 w-8 items-center justify-center rounded-full bg-blue text-white transition hover:bg-[#25598f] disabled:opacity-40">
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
        )}
        <p className="py-2 text-center text-[11.5px] text-dim">{t("bot.disclaimer")}</p>
      </div>
    </aside>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 flex items-start gap-2 rounded-xl border border-[#f5dfb3] bg-[#fffaf0] px-3 py-2 text-[13px] text-[#7a4a00]">
      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function DockAnswer({ message, stage }: { message: ChatMessage; stage: ChatStage | null }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const sources = message.meta?.sources ?? [];

  return (
    <div className="group flex items-start gap-2">
      <AquibotAvatar size={26} active={message.pending} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        {message.content ? (
          <div translate="no">
            <Markdown text={message.content} className="text-[15px] text-ink" />
          </div>
        ) : message.pending ? (
          <p className="flex items-center gap-2 py-1 text-[14.5px] font-medium text-mid">
            <span className="flex gap-1">
              {[0, 1, 2].map((dot) => (
                <span key={dot} className="h-1.5 w-1.5 animate-pulse rounded-full bg-mid" style={{ animationDelay: `${dot * 150}ms` }} />
              ))}
            </span>
            {t(stage ? `bot.stage.${stage}` : "bot.thinking")}…
          </p>
        ) : null}

        {message.error ? (
          <p className="mt-1.5 flex items-start gap-2 rounded-xl border border-[#f3c9c5] bg-[#fdf2f1] px-3 py-2 text-[13px] text-[#b42318]">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {message.error}
          </p>
        ) : null}

        {!message.pending && message.content ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px] text-mid">
            {message.meta?.stopped ? <span className="rounded-full bg-s2 px-2 py-0.5">{t("bot.stopped")}</span> : null}
            {sources.slice(0, 3).map((source, index) => (
              <span key={index} className="flex max-w-[180px] items-center gap-1 rounded-full border border-border bg-s2/60 px-2 py-0.5" title={source.title}>
                {source.sourceType === "telex" ? <Newspaper className="h-3 w-3 shrink-0" /> : <FileText className="h-3 w-3 shrink-0" />}
                <span className="truncate">{source.title}</span>
              </span>
            ))}
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(message.content).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
              className="ms-auto flex items-center gap-1 rounded-full px-1.5 py-0.5 opacity-100 transition hover:bg-s2 hover:text-ink lg:opacity-0 lg:group-hover:opacity-100"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? t("bot.copied") : t("bot.copy")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
