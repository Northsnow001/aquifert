"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { savePersona } from "@/app/hub/prefs-actions";
import { AquibotAvatar } from "@/components/app/aquibot-avatar";
import { FeedThumb, ToneBadge } from "@/components/hub/kit";
import { interpret, PERSONAS, type Persona, type TelexProduct, type Tone } from "@/lib/aq-modules/types";

export type BriefRow = { id: string; headline: string; product: TelexProduct; tone: Tone; source: string; href?: string };

/** Restates the latest desk flashes in plain language for how the reader buys. */
export function AquibotBriefing({ rows, persona: initial }: { rows: BriefRow[]; persona: Persona }) {
  const [persona, setPersona] = useState<Persona>(initial);
  const [, startTransition] = useTransition();

  const choose = (next: Persona) => {
    setPersona(next);
    startTransition(async () => {
      await savePersona(next);
    });
  };

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
        {PERSONAS.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={persona === item.key}
            onClick={() => choose(item.key)}
            className={`min-h-8 rounded-full border px-3 py-1 text-[13px] font-semibold transition-colors ${
              persona === item.key ? "border-teal-600 bg-teal-600 text-white shadow-sm" : "border-border bg-white text-mid hover:border-teal-500/60 hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
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
        <Link href="/hub/aquibot" className="inline-flex shrink-0 items-center gap-1 text-[13.5px] font-semibold text-blue no-underline hover:underline">
          Ask Aquibot <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </footer>
    </section>
  );
}
