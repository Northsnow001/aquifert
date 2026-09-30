"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Anchor,
  ArrowUpRight,
  BookOpen,
  Bot,
  Calculator,
  CalendarCheck,
  Compass,
  FolderTree,
  Gauge,
  Import,
  Inbox,
  Lightbulb,
  Library,
  Radio,
  Scale,
  Search,
  Settings,
  ShieldBan,
  Ship,
  Table2,
  X,
  Zap,
} from "lucide-react";
import { Card, field } from "@/components/admin/ui";
import { GUIDE_GROUPS, sectionText, type GuideIcon, type GuideSection } from "@/lib/admin-guide";

const ICONS: Record<GuideIcon, typeof Radio> = {
  start: Compass,
  routine: CalendarCheck,
  telex: Radio,
  indicators: Gauge,
  hedge: Table2,
  freight: Ship,
  tools: BookOpen,
  library: Library,
  collections: FolderTree,
  calculator: Calculator,
  scale: Scale,
  anchor: Anchor,
  inbox: Inbox,
  zero: Zap,
  aquibot: Bot,
  banned: ShieldBan,
  settings: Settings,
  import: Import,
};

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {parts.map((part, index) =>
        index % 2 ? (
          <mark key={index} className="rounded bg-[#fff1c2] px-0.5 text-ink">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function GuideBrowser({ sections }: { sections: GuideSection[] }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const term = query.trim();

  const visible = useMemo(() => {
    const needle = term.toLowerCase();
    return needle ? sections.filter((section) => sectionText(section).includes(needle)) : sections;
  }, [sections, term]);

  useEffect(() => {
    let frame = 0;
    const track = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let current = visible[0]?.id ?? "";
        for (const section of visible) {
          const node = document.getElementById(section.id);
          if (node && node.getBoundingClientRect().top <= 120) current = section.id;
        }
        setActive(current);
      });
    };
    track();
    window.addEventListener("scroll", track, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", track);
    };
  }, [visible]);

  return (
    <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100dvh-9rem)] lg:self-start lg:overflow-y-auto">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the guide"
            aria-label="Search the guide"
            className={`${field} h-9 w-full pl-8 pr-8`}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-dim hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <p className="mt-2 px-1 font-mono text-[10.5px] uppercase tracking-wider text-dim">
          {term ? `${visible.length} of ${sections.length} sections match` : `${sections.length} sections`}
        </p>
        <nav className="mt-3 hidden space-y-4 lg:block">
          {GUIDE_GROUPS.map((group) => {
            const items = visible.filter((section) => section.group === group);
            if (!items.length) return null;
            return (
              <div key={group}>
                <p className="px-2 pb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-dim">{group}</p>
                {items.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className={`block rounded-md px-2 py-1.5 text-[13px] no-underline transition ${
                      active === section.id ? "bg-blue-light font-semibold text-blue" : "text-mid hover:bg-s2 hover:text-ink"
                    }`}
                  >
                    {section.title}
                  </a>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 space-y-5">
        {visible.length ? null : (
          <Card className="px-6 py-14 text-center">
            <p className="text-[14px] font-semibold text-ink">Nothing matches “{term}”</p>
            <p className="mt-1 text-[13px] text-mid">Try a module name, or a word from the screen you are on.</p>
          </Card>
        )}
        {visible.map((section, index) => {
          const Icon = ICONS[section.icon];
          const newGroup = index === 0 || visible[index - 1].group !== section.group;
          return (
            <div key={section.id}>
              {newGroup ? (
                <h2 className="mb-3 mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-dim first:mt-0">{section.group}</h2>
              ) : null}
              <Card className="overflow-hidden">
                <section id={section.id} className="scroll-mt-6">
                  <header className="flex items-start gap-3 border-b border-border px-5 py-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-light text-blue">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[16px] font-bold text-ink">
                        <Highlight text={section.title} query={term} />
                      </h3>
                      <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-mid">
                        <Highlight text={section.summary} query={term} />
                      </p>
                    </div>
                    {section.href ? (
                      <Link
                        href={section.href}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-semibold text-ink no-underline transition hover:border-blue/40 hover:text-blue"
                      >
                        Open
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                  </header>
                  <div className={`grid gap-x-8 gap-y-5 px-5 py-4 ${section.tasks.length > 1 ? "xl:grid-cols-2" : ""}`}>
                    {section.tasks.map((task) => (
                      <div key={task.title}>
                        <h4 className="text-[13px] font-semibold text-ink">
                          <Highlight text={task.title} query={term} />
                        </h4>
                        <ol className="mt-2 space-y-2">
                          {task.steps.map((step, stepIndex) => (
                            <li key={stepIndex} className="flex gap-2.5 text-[13px] leading-relaxed text-mid">
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-s2 font-mono text-[10.5px] font-semibold text-mid">
                                {stepIndex + 1}
                              </span>
                              <span>
                                <Highlight text={step} query={term} />
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                  {section.tips?.length ? (
                    <div className="border-t border-border bg-[#fffbeb]/60 px-5 py-3">
                      {section.tips.map((tip) => (
                        <p key={tip} className="flex gap-2 py-0.5 text-[12.5px] leading-relaxed text-mid">
                          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b7791f]" />
                          <span>
                            <Highlight text={tip} query={term} />
                          </span>
                        </p>
                      ))}
                    </div>
                  ) : null}
                </section>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
