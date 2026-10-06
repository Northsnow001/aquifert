"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CirclePlay, Lightbulb, Search } from "lucide-react";
import { AquibotAvatar } from "@/components/app/aquibot-avatar";
import { btnPrimary, fieldClass } from "@/components/app/form";
import { startTour } from "@/components/app/tour";
import { GUIDE_SECTIONS, type GuideSection } from "@/components/hub/guide-content";

type Plan = "core" | "growth" | "enterprise";
export type GuideLimits = { label: string; core: number; growth: number; enterprise: number }[];

const PLANS: { key: Plan; label: string }[] = [
  { key: "core", label: "AQ ONE" },
  { key: "growth", label: "AQ Analytics" },
  { key: "enterprise", label: "AQ ZERO" },
];

function SectionIcon({ icon, size = 36 }: { icon: GuideSection["icon"]; size?: number }) {
  if (icon === "aquibot") return <AquibotAvatar size={size} />;
  const Icon = icon;
  return (
    <span className="aq-chip inline-flex shrink-0 items-center justify-center rounded-[11px] text-white" style={{ width: size, height: size }}>
      <Icon className="h-[17px] w-[17px]" strokeWidth={2.1} />
    </span>
  );
}

function sectionText(section: GuideSection) {
  return [section.title, section.summary, ...section.body, ...(section.points ?? []).flatMap((p) => [p.term, p.text]), section.tip ?? ""].join(" ").toLowerCase();
}

function LimitsTable({ limits, plan }: { limits: GuideLimits; plan: Plan | null }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[420px] text-left text-[15px]">
        <thead>
          <tr className="bg-s2 text-[13px] text-mid">
            <th className="px-4 py-2.5 font-medium">Per month</th>
            {PLANS.map((p) => (
              <th key={p.key} className={`px-4 py-2.5 font-semibold ${p.key === plan ? "bg-blue-light text-blue" : "text-ink"}`}>
                {p.label}
                {p.key === plan ? <span className="ml-1.5 text-[12px] font-medium">· yours</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {limits.map((row) => (
            <tr key={row.label} className="border-t border-border">
              <td className="px-4 py-2.5 text-mid">{row.label}</td>
              {PLANS.map((p) => (
                <td key={p.key} className={`px-4 py-2.5 font-medium tabular-nums text-ink ${p.key === plan ? "bg-blue-light/50" : ""}`}>
                  {row[p.key] === 0 ? "Unlimited" : row[p.key].toLocaleString("en-US")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GuideBrowser({ limits, plan }: { limits: GuideLimits; plan: Plan | null }) {
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(GUIDE_SECTIONS[0].id);

  const sections = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? GUIDE_SECTIONS.filter((section) => sectionText(section).includes(needle)) : GUIDE_SECTIONS;
  }, [query]);

  useEffect(() => {
    const scroller = document.getElementById("aq-scroll");
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setCurrent(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    for (const section of sections) {
      const node = document.getElementById(section.id);
      if (node) observer.observe(node);
    }
    const onScroll = () => {
      if (scroller && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 8) setCurrent(sections[sections.length - 1]?.id ?? "");
    };
    scroller?.addEventListener("scroll", onScroll, { passive: true });
    const frame = requestAnimationFrame(onScroll);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scroller?.removeEventListener("scroll", onScroll);
    };
  }, [sections]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-blue">Help</p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.02em] text-ink md:text-[30px]">User Guide</h1>
          <p className="mt-1 max-w-xl text-[15.5px] leading-relaxed text-mid">
            Every part of Aquifert ONE explained, including what the numbers mean, not just where the buttons are.
          </p>
        </div>
        <button type="button" onClick={startTour} className={`${btnPrimary} shrink-0 self-start sm:self-auto`}>
          <CirclePlay className="h-4 w-4" />
          Take the tour
        </button>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-8">
        <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
          <label className="relative block">
            <span className="sr-only">Search the guide</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search, e.g. FOB, limits, Telex"
              className={`${fieldClass} pl-10`}
            />
          </label>
          <nav aria-label="Guide contents" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0">
            {sections.map((section) => {
              const active = current === section.id;
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  onClick={() => setCurrent(section.id)}
                  aria-current={active ? "location" : undefined}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[14.5px] no-underline transition-colors lg:rounded-xl lg:px-3 ${
                    active ? "bg-white font-semibold text-ink shadow-[0_1px_2px_rgb(16_38_59/0.08)]" : "bg-white/60 text-mid hover:bg-white hover:text-ink lg:bg-transparent"
                  }`}
                >
                  {section.title}
                </a>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          {sections.length === 0 ? (
            <div className="aq-card flex flex-col items-center gap-3 px-6 py-12 text-center">
              <AquibotAvatar size={44} />
              <p className="text-[16.5px] font-semibold text-ink">Nothing in the guide matches “{query}”.</p>
              <p className="text-[15px] text-mid">Aquibot can answer questions about the market and the platform.</p>
              <Link href={`/hub/aquibot?q=${encodeURIComponent(query)}`} className={`${btnPrimary} mt-1`}>
                Ask Aquibot
              </Link>
            </div>
          ) : (
            sections.map((section) => (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="aq-card relative scroll-mt-24 p-5 sm:p-6">
                {section.aliases?.map((alias) => (
                  <span key={alias} id={alias} aria-hidden className="absolute top-0 scroll-mt-24" />
                ))}
                <div className="flex items-start gap-3.5">
                  <SectionIcon icon={section.icon} />
                  <div className="min-w-0 flex-1">
                    <h2 id={`${section.id}-title`} className="text-[18px] font-semibold tracking-[-0.01em] text-ink">
                      {section.title}
                    </h2>
                    <p className="mt-0.5 text-[15px] text-mid">{section.summary}</p>
                  </div>
                  {section.href ? (
                    <Link
                      href={section.href}
                      aria-label={`Open ${section.title}`}
                      className="hidden shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[13.5px] font-semibold text-ink no-underline transition hover:border-blue/35 hover:text-blue sm:inline-flex"
                    >
                      Open
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : null}
                </div>

                <div className="mt-4 space-y-3 text-[16px] leading-[1.7] text-ink/85">
                  {section.body.map((paragraph) => (
                    <p key={paragraph.slice(0, 32)}>{paragraph}</p>
                  ))}
                </div>

                {section.points ? (
                  <dl className="mt-4 grid gap-2 sm:grid-cols-3">
                    {section.points.map((point) => (
                      <div key={point.term} className="rounded-xl bg-s2 px-3.5 py-3">
                        <dt className="text-[14.5px] font-semibold text-ink">{point.term}</dt>
                        <dd className="mt-0.5 text-[14.5px] leading-relaxed text-mid">{point.text}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                {section.id === "plans" ? <LimitsTable limits={limits} plan={plan} /> : null}

                {section.tip ? (
                  <p className="mt-4 flex items-start gap-2.5 rounded-xl bg-blue-light px-3.5 py-3 text-[15px] leading-relaxed text-ink">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
                    {section.tip}
                  </p>
                ) : null}

                {section.href ? (
                  <Link href={section.href} className="mt-4 inline-flex items-center gap-1 text-[15px] font-semibold text-blue no-underline sm:hidden">
                    Open {section.title}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
              </section>
            ))
          )}
          <p className="px-1 text-[13.5px] text-dim">
            Still stuck?{" "}
            <Link href="/hub/contact" className="font-semibold text-blue no-underline">
              Contact the desk
            </Link>{" "}
            and a person will help.
          </p>
        </div>
      </div>
    </div>
  );
}
