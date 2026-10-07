"use client";

/**
 * Help, public help centre with the Aquibot assistant. Aquibot answers from
 * the answers kept in the admin's Public website editor; anything it can't
 * answer routes to the human desk.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Bot, Send, User } from "lucide-react";
import { isShown, type SiteContent } from "@/lib/site-content/schema";
import { pickAnswer, splitLines } from "@/lib/site-content/normalize";
import { MarketingLayout } from "@/marketing/components/MarketingLayout";
import { Seo } from "@/marketing/components/shared/Seo";
import { Reveal } from "@/marketing/components/shared/Reveal";
import { SiteLink } from "@/marketing/components/shared/SiteLink";

type Help = SiteContent["help"];
type Msg = { from: "bot" | "user"; text: string };

function Aquibot({ c }: { c: Help["assistant"] }) {
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: c.greeting }]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs]);

  const send = (text: string) => {
    const q = text.trim();
    if (!q) return;
    setMsgs((m) => [...m, { from: "user", text: q }, { from: "bot", text: pickAnswer(q, c.answers, c.fallback) }]);
    setInput("");
  };

  const suggestions = splitLines(c.suggestions);

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_2px_4px_rgb(14_32_49/0.08),0_28px_60px_-20px_rgb(37_79_118/0.35)]">
      <div className="flex items-center gap-3 bg-navy-900 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500">
          <Bot className="h-5 w-5 text-white" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">Aquibot</p>
          <p className="text-[11px] text-slate-300">Aquifert help assistant, human desk one click away</p>
        </div>
      </div>
      <div ref={scrollRef} className="h-[340px] space-y-4 overflow-y-auto px-5 py-5" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`flex items-start gap-2.5 ${m.from === "user" ? "flex-row-reverse" : ""}`}>
            <span
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                m.from === "bot" ? "bg-teal-100 text-teal-700" : "bg-navy-100 text-navy-700"
              }`}
            >
              {m.from === "bot" ? <Bot className="h-4 w-4" aria-hidden="true" /> : <User className="h-4 w-4" aria-hidden="true" />}
            </span>
            <p
              className={`max-w-[80%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed ${
                m.from === "bot" ? "rounded-tl-sm bg-muted text-navy-900" : "rounded-tr-sm bg-navy-700 text-white"
              }`}
            >
              {m.text}
            </p>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-4 py-3">
        {suggestions.length ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-slate-300 px-3 py-1 text-[12px] font-medium text-slate-600 transition-colors hover:border-teal-600 hover:text-teal-700"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <label htmlFor="aquibot-input" className="sr-only">Ask Aquibot a question</label>
          <input
            id="aquibot-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about membership, freight, quotes…"
            className="h-10 w-full rounded-full border border-slate-300 bg-white px-4 text-sm text-navy-900 placeholder:text-slate-400 focus:border-navy-700 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-500 text-white transition-colors hover:bg-teal-400"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Help({ content }: { content: Help }) {
  const { seo, hero, assistant, topics, desk } = content;
  const showBot = isShown(assistant);
  const showSide = isShown(topics) || isShown(desk);
  return (
    <MarketingLayout>
      <Seo
        title={seo.title}
        description={seo.description}
        keywords="aquifert help, aquibot, fertilizer trading support, membership questions, freight tracking help"
        path="/help"
      />

      {isShown(hero) ? (
        <section className="bg-navy-900" aria-labelledby="help-heading">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <Reveal>
              {hero.kicker ? <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-teal-300">{hero.kicker}</p> : null}
              <h1 id="help-heading" className="mt-4 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
                {hero.title}
                {hero.highlight ? <> <span className="text-teal-300">{hero.highlight}</span></> : null}
              </h1>
              {hero.body ? <p className="mt-5 max-w-xl whitespace-pre-line text-lg leading-relaxed text-slate-300">{hero.body}</p> : null}
            </Reveal>
          </div>
        </section>
      ) : null}

      {showBot || showSide ? (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-label={showBot ? "Aquibot assistant" : "Help topics"}>
          <div className={`grid items-start gap-10 ${showBot && showSide ? "lg:grid-cols-[1fr_380px]" : showSide ? "max-w-2xl" : ""}`}>
            {showBot ? (
              <Reveal>
                <Aquibot c={assistant} />
              </Reveal>
            ) : null}
            {showSide ? (
              <Reveal delay={100}>
                <div className="space-y-4">
                  {isShown(topics) ? (
                    <>
                      <h2 className="text-lg font-bold text-navy-900 dark:text-white">{topics.title}</h2>
                      {topics.items.map((t, i) => (
                        <SiteLink
                          key={i}
                          href={t.link || "/"}
                          className="group block rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <p className="flex items-center justify-between text-sm font-semibold text-navy-900 dark:text-white">
                            {t.title}
                            <ArrowRight className="h-4 w-4 text-teal-600 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                          </p>
                          {t.body ? <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">{t.body}</p> : null}
                        </SiteLink>
                      ))}
                    </>
                  ) : null}
                  {isShown(desk) ? (
                    <div className="rounded-2xl bg-navy-900 p-5">
                      <p className="text-sm font-semibold text-white">{desk.title}</p>
                      {desk.body ? <p className="mt-1.5 text-[13px] leading-relaxed text-slate-300">{desk.body}</p> : null}
                      {desk.primaryLabel ? (
                        <SiteLink
                          href={desk.primaryLink || "/contact"}
                          className="mt-4 inline-flex items-center rounded-full bg-teal-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-teal-400"
                        >
                          {desk.primaryLabel} <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                        </SiteLink>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </Reveal>
            ) : null}
          </div>
        </section>
      ) : null}
    </MarketingLayout>
  );
}
