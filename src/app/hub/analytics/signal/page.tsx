import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowRight, Minus, Newspaper, RadioTower, TrendingDown, TrendingUp } from "lucide-react";
import { momentumOf, num, param, shiftDays, signedPct, TONE_TEXT, type SearchParams } from "@/components/hub/analytics/format";
import { SignalTable } from "@/components/hub/analytics/signal-table";
import { AsOf, RangeBar, SegLinks } from "@/components/hub/analytics/ui";
import { Disclaimer, EmptyPanel, HubPageHeader, Panel, Sparkline, StatTile, Tag, ToneBadge } from "@/components/hub/kit";
import { LockedScreen } from "@/components/hub/locked-screen";
import { getHubAccess } from "@/lib/aq-modules/access";
import { getPrefs } from "@/lib/aq-modules/members";
import { PRO_WINDOWS, signalGroups, windowNarrative } from "@/lib/aq-modules/signal";
import { publishedAnalysis } from "@/lib/aq-modules/store";
import { publishedTelex } from "@/lib/aq-modules/telex";
import { productOf, type Tone } from "@/lib/aq-modules/types";
import { formatDay } from "@/lib/content-types";
import { getHubContent } from "@/lib/hub-content";

export const metadata: Metadata = { title: "AQ Signal" };
export const dynamic = "force-dynamic";

const WINDOWS = PRO_WINDOWS as readonly number[];

type Driver = { id: string; date: string; headline: string; source: "Telex" | "Analysis"; href: string; tone?: Tone };

export default async function SignalProPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { user, admin, modules, can } = await getHubAccess();
  if (!can("aq-signal-pro")) return <LockedScreen module="aq-signal-pro" required={modules.access["aq-signal-pro"]} plan={user.plan} />;

  const params = await searchParams;
  const requested = Number(param(params, "w"));
  const saved = WINDOWS.includes(requested) ? null : await getPrefs(user).catch(() => null);
  const days = WINDOWS.includes(requested) ? requested : saved && WINDOWS.includes(saved.signalWindow) ? saved.signalWindow : 30;
  const { asOf, groups } = signalGroups(modules.series, days);

  if (!asOf) {
    return (
      <div className="flex flex-col gap-5 pb-2">
        <HubPageHeader eyebrow="AQ Analytics" title="AQ Signal" tip="Signal windows measure each price series back from the latest desk price." />
        <EmptyPanel title="Signals start with the first prices" body="Once the desk publishes benchmark prices, every series gets 7 to 180-day windows with momentum and the drivers behind each move." />
      </div>
    );
  }

  const from = shiftDays(asOf, -days);
  const fullWire = admin || can("aq-telex");
  const telex = publishedTelex((await getHubContent()).telex, fullWire ? "all" : user.plan).filter((item) => item.readable && item.publishedAt.slice(0, 10) >= from && item.publishedAt.slice(0, 10) <= asOf);
  const notes = publishedAnalysis(modules).filter((note) => note.publishedAt.slice(0, 10) >= from && note.publishedAt.slice(0, 10) <= asOf);
  const telexHref = (group: string) => (fullWire ? `/hub/analytics/telex?product=${encodeURIComponent(group)}&from=${from}&to=${asOf}` : "/hub/telex");

  const driversFor = (group: string): Driver[] =>
    [
      ...telex.filter((item) => item.product === group).map((item): Driver => ({ id: `t-${item.id}`, date: item.publishedAt, headline: item.headline, source: "Telex", href: telexHref(group), tone: item.tone })),
      ...notes
        .filter((note) => productOf(`${note.products.join(" ")} ${note.title}`) === group)
        .map((note): Driver => ({ id: `a-${note.id}`, date: note.publishedAt, headline: note.title, source: "Analysis", href: `/hub/analysis/${note.slug}` })),
    ].sort((a, b) => b.date.localeCompare(a.date));

  const items = groups.flatMap((entry) => entry.items);
  const live = items.filter((item) => !item.insufficient);
  const rising = live.filter((item) => item.direction === "up").length;
  const falling = live.filter((item) => item.direction === "down").length;
  const mover = [...live].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))[0];

  return (
    <div className="flex flex-col gap-5 pb-2">
      <HubPageHeader
        eyebrow="AQ Analytics"
        title="AQ Signal"
        description="Rolling windows up to 180 days on every tracked series: how far each price moved, whether the move is building or fading, and what drove it."
        tip="Each window runs back from the latest desk price. Range position shows where today's price sits between the window low (0) and high (100). Momentum compares the move in the recent half of the window with the earlier half."
        actions={<SegLinks label="Signal window" items={PRO_WINDOWS.map((w) => ({ href: `?w=${w}`, label: `${w}D`, title: `${w} days`, active: w === days }))} />}
      />

      <AsOf>
        {days}-day window · {formatDay(from)} to {formatDay(asOf)}
      </AsOf>

      <div className="aq-stagger grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile label="Series rising" value={rising} icon={TrendingUp} hint={`Up more than 0.5% in ${days} days`} />
        <StatTile label="Series falling" value={falling} icon={TrendingDown} tone="rose" hint={`Down more than 0.5% in ${days} days`} />
        <StatTile label="Holding steady" value={live.length - rising - falling} icon={Minus} tone="amber" hint="Moved less than 0.5%" />
        <StatTile
          label="Biggest mover"
          value={mover ? <span className={TONE_TEXT[mover.direction]}>{signedPct(mover.changePct)}</span> : "–"}
          icon={Activity}
          tone="blue"
          hint={mover ? `${mover.label} · ${mover.basis}` : "Not enough prices yet"}
        />
      </div>

      <Panel title="Every series, side by side" sub="Select a column heading to sort" icon={Activity} tone="blue">
        <SignalTable rows={items} days={days} />
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {groups.map(({ group, items: groupItems }) => {
          const narrative = windowNarrative(groupItems, days);
          const drivers = driversFor(group);
          return (
            <section key={group} className="aq-card aq-rise flex min-w-0 flex-col overflow-hidden">
              <header className="border-b border-border px-5 py-4">
                <h2 className="text-[17px] font-semibold text-ink">{group}</h2>
                <p className="mt-1 text-[14.5px] leading-relaxed text-mid">{narrative || `Not enough prices inside the last ${days} days to read this group yet.`}</p>
              </header>

              <ul className="divide-y divide-border">
                {groupItems.map((item) => {
                  const momentum = momentumOf(item.points);
                  return (
                    <li key={item.id} className="px-5 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[15.5px] font-semibold text-ink">{item.label}</p>
                          <p className="text-[13px] text-dim">{item.basis}</p>
                        </div>
                        {item.insufficient ? (
                          <span className="text-[13px] text-dim">Not enough prices</span>
                        ) : (
                          <div className="text-right">
                            <p className="text-[16.5px] font-semibold tabular-nums text-ink">
                              {num(item.current)} <span className="text-[12px] font-medium text-dim">{item.unit}</span>
                            </p>
                            <p className={`text-[13.5px] font-semibold tabular-nums ${TONE_TEXT[item.direction]}`}>{signedPct(item.changePct)}</p>
                          </div>
                        )}
                      </div>
                      {item.insufficient ? null : (
                        <div className="mt-2.5 flex items-center gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                              <ToneBadge tone={item.direction} />
                              <span title={momentum.hint}>
                                <Tag tone={momentum.label === "Building" ? "blue" : momentum.label === "Turning" ? "amber" : "neutral"}>{momentum.label}</Tag>
                              </span>
                              <span className="sr-only">{momentum.hint}</span>
                            </div>
                            <RangeBar value={item.rangePosition} />
                            <p className="mt-1 flex justify-between text-[11.5px] tabular-nums text-dim">
                              <span>Low {num(item.low)}</span>
                              <span>High {num(item.high)}</span>
                            </p>
                          </div>
                          <Sparkline points={item.points} tone={item.direction} width={96} height={34} label={`${item.label} ${item.basis}, ${days}-day trend`} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className="mt-auto border-t border-border bg-s2/50 px-5 py-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-teal-700">What drove it</p>
                {drivers.length ? (
                  <ul className="mt-2 space-y-2">
                    {drivers.slice(0, 4).map((driver) => (
                      <li key={driver.id} className="flex items-start gap-2.5">
                        {driver.source === "Telex" ? <RadioTower className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue" aria-hidden /> : <Newspaper className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-700" aria-hidden />}
                        <div className="min-w-0">
                          <Link href={driver.href} className="text-[14.5px] font-medium leading-snug text-ink no-underline hover:text-blue hover:underline">
                            {driver.headline}
                          </Link>
                          <p className="text-[12.5px] text-dim">
                            {driver.source} · {formatDay(driver.date)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1.5 text-[13.5px] text-mid">No {group.toLowerCase()} Telex or analysis in this window. A longer window may show what set the trend.</p>
                )}
                {drivers.length > 4 || drivers.some((driver) => driver.source === "Telex") ? (
                  <Link href={telexHref(group)} className="mt-3 inline-flex items-center gap-1 text-[13.5px] font-semibold text-blue no-underline hover:underline">
                    All {group.toLowerCase()} flashes in this window <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      <Disclaimer />
    </div>
  );
}
