"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { savePersona } from "@/app/hub/prefs-actions";
import { AquibotAvatar } from "@/components/app/aquibot-avatar";
import { FeedThumb, FreshnessBadge, TONE_LABEL, ToneBadge } from "@/components/hub/kit";
import { interpret, PERSONAS, type Persona, type TelexProduct, type Tone } from "@/lib/aq-modules/types";

export type BriefRow = { id: string; headline: string; product: TelexProduct; tone: Tone; source: string; href?: string; thumb?: string | null; pick?: number };

const TONE_PILL: Record<Tone, string> = {
  up: "bg-emerald-100 text-emerald-800",
  down: "bg-red-100 text-red-800",
  flat: "bg-s2 text-dim",
};

/** Restates the latest desk flashes in plain language for how the reader buys. `hub` is the panel on the hub page. */
export function AquibotBriefing({
  rows,
  persona: initial,
  variant = "dashboard",
  latest,
  now,
}: {
  rows: BriefRow[];
  persona: Persona;
  variant?: "dashboard" | "hub";
  latest?: string;
  now?: string;
}) {
  const [persona, setPersona] = useState<Persona>(initial);
  const [, startTransition] = useTransition();

  const choose = (next: Persona) => {
    setPersona(next);
    startTransition(async () => {
      await savePersona(next);
    });
  };

  const chips = (small: boolean) =>
    PERSONAS.map((item) => (
      <button
        key={item.key}
        type="button"
        aria-pressed={persona === item.key}
        onClick={() => choose(item.key)}
        className={`min-h-8 rounded-full border px-3 py-1 font-semibold transition-colors ${small ? "text-[12px]" : "text-[13px]"} ${
          persona === item.key ? "border-teal-600 bg-teal-600 text-white shadow-sm" : "border-border bg-white text-mid hover:border-teal-500/60 hover:text-ink"
        }`}
      >
        {item.label}
      </button>
    ));

  if (variant === "hub") {
    return (
      <section aria-labelledby="aquibot-brief-title" className="aq-card min-w-0 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="aquibot-brief-title" className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-teal-700">
              Aquibot briefing
            </h2>
            <p className="mt-0.5 text-[12.5px] text-mid">Today&apos;s TELEX and analysis, translated into plain language</p>
          </div>
          {now ? <FreshnessBadge stamp={latest} now={now} /> : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Interpret updates for">
          <span className="mr-1 inline-flex items-center gap-1 text-[12px] font-semibold text-mid">
            <AquibotAvatar size={18} /> I am a
          </span>
          {chips(true)}
        </div>
        {rows.length ? (
          <ul className="mt-1 divide-y divide-border">
            {rows.map((row) => {
              const body = (
                <>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TONE_PILL[row.tone]}`}>{TONE_LABEL[row.tone]}</span>
                    <span className="text-[10.5px] font-semibold uppercase tracking-wide text-dim">{row.source}</span>
                  </div>
                  <p className="mt-1 text-[13.5px] font-semibold leading-snug text-ink">{row.headline}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-navy-700">{interpret(row.tone, row.product, persona)}</p>
                </>
              );
              return (
                <li key={row.id} className="flex items-start gap-3 py-3">
                  <FeedThumb product={row.product} src={row.thumb} pick={row.pick} size={48} />
                  <div className="min-w-0 flex-1">
                    {row.href ? (
                      <Link href={row.href} className="block text-inherit no-underline hover:opacity-90">
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-[13.5px] text-mid">No fresh flashes to interpret yet. The desk publishes through the trading day.</p>
        )}
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
          <p className="text-[11px] leading-relaxed text-dim">Aquibot restates desk content in plain language. Indicative only, not advice.</p>
          <Link href="/hub/aquibot" className="-my-2 inline-flex shrink-0 items-center gap-1 py-2 text-[12.5px] font-semibold text-teal-700 no-underline hover:underline">
            Ask Aquibot <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="aq-card flex min-w-0 flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-border px-5 py-3.5">
        <AquibotAvatar size={32} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[16.5px] font-semibold text-ink">Aquibot briefing</h2>
          <p className="text-[13px] text-dim">Today&apos;s Telex and analysis, in plain language</p>
        </div>
      </header>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-s2/60 px-5 py-2.5" role="group" aria-label="Interpret updates for">
        <span className="mr-1 text-[13px] font-semibold text-mid">I am a</span>
        {chips(false)}
      </div>
      {rows.length ? (
        <ul className="divide-y divide-border">
          {rows.map((row) => {
            const body = (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  <ToneBadge tone={row.tone} />
                  <span className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-dim">{row.source}</span>
                </div>
                <p className="mt-1 text-[15px] font-semibold leading-snug text-ink">{row.headline}</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-navy-600">{interpret(row.tone, row.product, persona)}</p>
              </>
            );
            return (
              <li key={row.id} className="flex items-start gap-3 px-5 py-3.5">
                <FeedThumb product={row.product} size={46} />
                <div className="min-w-0 flex-1">
                  {row.href ? (
                    <Link href={row.href} className="block text-inherit no-underline hover:opacity-90">
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-5 py-10 text-center text-[14.5px] text-mid">No fresh flashes to interpret yet. The desk publishes through the trading day.</p>
      )}
      <footer className="mt-auto flex items-center justify-between gap-3 border-t border-border px-5 py-3">
        <p className="text-[12px] leading-relaxed text-dim">Aquibot restates desk content. Indicative only, not advice.</p>
        <Link href="/hub/aquibot" className="-my-2 inline-flex shrink-0 items-center gap-1 py-2 text-[13.5px] font-semibold text-blue no-underline hover:underline">
          Ask Aquibot <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </footer>
    </section>
  );
}
