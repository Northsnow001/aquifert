import type { Metadata } from "next";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Lock, Newspaper, Radio, Sparkles } from "lucide-react";
import { SignalWindow } from "@/components/hub/aq1/signal-window";
import { Disclaimer, EmptyPanel, HubPageHeader, Panel, Sparkline, Tag, ToneBadge } from "@/components/hub/kit";
import { getHubAccess } from "@/lib/aq-modules/access";
import { getPrefs } from "@/lib/aq-modules/members";
import { signalGroups, SIGNAL_WINDOWS, windowNarrative, type SignalItem } from "@/lib/aq-modules/signal";
import { publishedAnalysis } from "@/lib/aq-modules/store";
import { publishedTelex } from "@/lib/aq-modules/telex";
import { PLAN_LABEL, SERIES_GROUPS, toneOf, type Tone } from "@/lib/aq-modules/types";
import { formatDay, plainText } from "@/lib/content-types";
import { getHubContent } from "@/lib/hub-content";

export const metadata: Metadata = { title: "AQ Signal" };
export const dynamic = "force-dynamic";

const DAY = 86_400_000;
const STALE_DAYS = 14;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const isWindow = (value: number) => (SIGNAL_WINDOWS as readonly number[]).includes(value);
const daysSince = (date: string) => Math.floor((Date.now() - Date.parse(date)) / DAY);
const fmt = (value: number) => value.toLocaleString("en-GB", { maximumFractionDigits: 2 });
const signed = (value: number, suffix = "") => `${value > 0 ? "+" : value < 0 ? "−" : "±"}${fmt(Math.abs(value))}${suffix}`;

const MOVE_CLASS: Record<Tone, string> = { up: "text-[#1b7a47]", down: "text-[#b53a2f]", flat: "text-mid" };
const MOVE_WORD: Record<Tone, string> = { up: "up", down: "down", flat: "flat" };

type Driver = { id: string; kind: "Telex" | "Analysis"; title: string; at: string; tone: Tone; href: string };

function SignalCard({ item, days }: { item: SignalItem; days: number }) {
  if (item.insufficient) {
    return (
      <article className="aq-card flex flex-col p-4">
        <p className="text-[14px] font-semibold text-ink">{item.label}</p>
        <p className="text-[12px] text-dim">{item.basis}</p>
        <p className="mt-3 rounded-xl border border-dashed border-border bg-s2/60 px-3 py-2.5 text-[12.5px] leading-relaxed text-mid">
          Not enough prices in the last {days} days to measure a move. Try a longer window.
        </p>
      </article>
    );
  }
  const Icon = item.direction === "up" ? ArrowUpRight : item.direction === "down" ? ArrowDownRight : ArrowRight;
  const position = Math.min(100, Math.max(0, item.rangePosition));
  return (
    <article className="aq-card aq-lift flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink">{item.label}</p>
          <p className="text-[12px] text-dim">{item.basis}</p>
        </div>
        <Sparkline points={item.points} tone={item.direction} width={104} height={34} label={`${item.label} ${item.basis}: ${fmt(item.start)} to ${fmt(item.current)} ${item.unit} over ${days} days`} />
      </div>

      <p className="mt-3 text-[13px] text-mid tabular-nums">
        {fmt(item.start)} <span aria-hidden>→</span>
        <span className="sr-only">to</span> <strong className="text-[22px] font-semibold tracking-[-0.02em] text-ink">{fmt(item.current)}</strong> <span className="text-[12px] text-dim">{item.unit}</span>
      </p>
      <p className={`mt-0.5 inline-flex items-center gap-1 text-[13px] font-semibold tabular-nums ${MOVE_CLASS[item.direction]}`}>
        <Icon className="h-4 w-4" strokeWidth={2.4} aria-hidden />
        {signed(item.change)} ({signed(item.changePct, "%")})<span className="sr-only">, {MOVE_WORD[item.direction]}</span>
      </p>

      <div className="mt-3">
        <div className="flex justify-between text-[11px] text-dim tabular-nums">
          <span>Low {fmt(item.low)}</span>
          <span>High {fmt(item.high)}</span>
        </div>
        <div
          className="relative mt-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#f6d9d5] via-s3 to-[#cfeedd]"
          role="img"
          aria-label={`Current price sits ${position}% of the way from the window low to the high`}
        >
          <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-navy-700 shadow" style={{ left: `${position}%` }} />
        </div>
      </div>
      <p className="mt-2.5 text-[11px] text-dim">
        {formatDay(item.from)} to {formatDay(item.to)}
      </p>
    </article>
  );
}

export default async function SignalPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { user, admin, modules, can } = await getHubAccess();
  const [prefs, content] = await Promise.all([getPrefs(user), getHubContent()]);

  const fallback = isWindow(prefs.signalWindow) ? prefs.signalWindow : 30;
  const asked = Number(first(params.w));
  const days = isWindow(asked) ? asked : fallback;

  const { asOf, groups } = signalGroups(modules.series, days);
  const ordered = [...groups].sort((a, b) => SERIES_GROUPS.indexOf(a.group) - SERIES_GROUPS.indexOf(b.group));
  const items = ordered.flatMap((group) => group.items);
  const narrative = windowNarrative(items, days);
  const age = asOf ? daysSince(asOf) : 0;
  const pro = can("aq-signal-pro");

  let drivers: Driver[] = [];
  if (asOf) {
    const from = new Date(Date.parse(asOf) - days * DAY).toISOString().slice(0, 10);
    const inWindow = (at: string) => at.slice(0, 10) >= from && at.slice(0, 10) <= asOf;
    const telex: Driver[] = publishedTelex(content.telex, admin ? "all" : user.plan)
      .filter((item) => item.readable && inWindow(item.publishedAt))
      .map((item) => ({ id: `t-${item.id}`, kind: "Telex", title: item.headline, at: item.publishedAt, tone: item.tone, href: `/hub/telex?p=all&q=${encodeURIComponent(item.headline.slice(0, 80))}` }));
    const notes: Driver[] = publishedAnalysis(modules)
      .filter((note) => inWindow(note.publishedAt))
      .map((note) => ({ id: `a-${note.id}`, kind: "Analysis", title: note.title, at: note.publishedAt, tone: toneOf(`${note.title} ${plainText(note.body)}`), href: `/hub/analysis/${note.slug}` }));
    drivers = [...telex, ...notes].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  }

  return (
    <div className="mx-auto max-w-5xl pb-2">
      <HubPageHeader
        eyebrow="AQ ONE Free plan"
        title="AQ Signal"
        description="Rolling windows on benchmark fertilizer and freight prices: where each series started, where it is now, how far it moved and where it sits in its range."
        tip="Pick a 7, 30, 60 or 90-day window. Each card compares the first and latest price in the window. The bar shows where today's price sits between the window's low and high. A move under half a percent counts as flat."
        guide="signal"
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SignalWindow windows={SIGNAL_WINDOWS} value={days} />
        {asOf ? (
          <p className="text-[12.5px] text-mid">
            Data as of <strong className="font-semibold text-ink">{formatDay(asOf)}</strong>
          </p>
        ) : null}
      </div>

      {asOf && age > STALE_DAYS ? (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-[#f3dca9] bg-[#fff8ea] px-4 py-3 text-[13px] leading-relaxed text-[#8a5300]" role="status">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            These prices are {age} days old, older than the desk&apos;s usual weekly refresh. Treat the moves as a guide and check the{" "}
            <Link href="/hub/telex" className="font-semibold text-[#8a5300] underline underline-offset-2">
              Telex
            </Link>{" "}
            for anything since.
          </p>
        </div>
      ) : null}

      {!asOf || !ordered.length ? (
        <EmptyPanel
          title="No price series to measure yet"
          body="The desk loads benchmark prices weekly. Once they are in, every window fills in here with the start, current, change and range."
          action={
            <Link href="/hub/telex" className="font-semibold text-blue no-underline hover:underline">
              Read the latest Telex instead
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {ordered.map((group) => (
            <section key={group.group} aria-labelledby={`group-${group.group}`}>
              <h2 id={`group-${group.group}`} className="mb-2.5 flex items-center gap-2 px-1 text-[12px] font-bold uppercase tracking-[0.12em] text-dim">
                {group.group}
                <span className="rounded-full bg-s3 px-1.5 text-[10.5px] tabular-nums text-mid">{group.items.length}</span>
              </h2>
              <div className="aq-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => (
                  <SignalCard key={item.id} item={item} days={days} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {asOf ? (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Panel title="What drove it" sub={`Desk flashes and notes from the ${days} days to ${formatDay(asOf)}`} icon={Radio} tone="blue" className="lg:col-span-3">
            {drivers.length ? (
              <ul className="divide-y divide-border">
                {drivers.map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} className="flex items-start gap-3 px-5 py-3 no-underline transition-colors hover:bg-s2/60">
                      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.kind === "Telex" ? "bg-blue-light text-blue" : "bg-teal-100 text-teal-800"}`}>
                        {item.kind === "Telex" ? <Radio className="h-3.5 w-3.5" aria-hidden /> : <Newspaper className="h-3.5 w-3.5" aria-hidden />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Tag tone={item.kind === "Telex" ? "blue" : "teal"}>{item.kind}</Tag>
                          <ToneBadge tone={item.tone} />
                          <span className="text-[11.5px] text-dim">{formatDay(item.at)}</span>
                        </div>
                        <p className="mt-1 text-[13.5px] font-semibold leading-snug text-ink">{item.title}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-[13px] leading-relaxed text-mid">
                No flashes or notes landed in this window. Try a longer window, or open the{" "}
                <Link href="/hub/telex" className="font-semibold text-blue no-underline hover:underline">
                  Telex
                </Link>{" "}
                for the latest.
              </p>
            )}
          </Panel>

          <div className="flex flex-col gap-4 lg:col-span-2">
            <Panel title="Window summary" sub={`The last ${days} days in one paragraph`} icon={Activity} bodyClassName="px-5 py-4">
              <p className="text-[14px] leading-relaxed text-ink">{narrative || "Not enough prices in this window to summarise. Pick a longer window."}</p>
            </Panel>

            <Link href="/hub/analytics/signal" className="aq-card aq-lift flex items-start gap-3 p-5 no-underline">
              <span className="aq-chip aq-chip-blue flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-white">
                {pro ? <Sparkles className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              </span>
              <div className="min-w-0">
                <p className="text-[14.5px] font-semibold text-ink">AQ Signal in AQ Analytics</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-mid">180-day windows and every series, with momentum and the drivers behind each move.</p>
                <span className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-blue">
                  {pro ? "Open it now" : `Included from ${PLAN_LABEL[modules.access["aq-signal-pro"]]}. See what it adds`} <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <Disclaimer />
      </div>
    </div>
  );
}
