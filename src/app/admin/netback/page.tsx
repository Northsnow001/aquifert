import Link from "next/link";
import { NetbackDutiesPanel } from "@/components/admin/netback/duties-panel";
import { NetbackLogsPanel } from "@/components/admin/netback/logs-panel";
import { NetbackPricingPanel } from "@/components/admin/netback/pricing-panel";
import { NetbackSettingsPanel } from "@/components/admin/netback/settings-panel";
import { PageHeader } from "@/components/admin/ui";
import { formatDay } from "@/lib/content-types";
import { activePorts, getFreightDesk } from "@/lib/freight-desk/store";
import { ageInDays } from "@/lib/freight-desk/types";
import { COUNTRIES } from "@/lib/flags";
import { filterNetbackLogs, readNetbackFilters } from "@/lib/netback-desk/logs";
import { getNetbackDesk, listNetbackLogs } from "@/lib/netback-desk/store";
import { findDuty, liveOrigins, weekLabel } from "@/lib/netback-desk/types";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "pricing", label: "Benchmark prices" },
  { key: "duties", label: "Import duties" },
  { key: "settings", label: "Costs & limits" },
  { key: "logs", label: "Calculation logs" },
] as const;

type Tab = (typeof TABS)[number]["key"];
type Params = { tab?: string; q?: string; plan?: string; month?: string; mode?: string; page?: string };

const LOG_PAGE = 50;
const STALE_DAYS = 14;

export default async function NetbackAdminPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const tab: Tab = TABS.some((item) => item.key === params.tab) ? (params.tab as Tab) : "pricing";
  const desk = await getNetbackDesk();
  const logs = await listNetbackLogs();
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const monthLogs = logs.filter((log) => log.at.startsWith(thisMonth));
  const monthMembers = new Set(monthLogs.map((log) => log.user.id)).size;
  const live = liveOrigins(desk.benchmarks);
  const age = ageInDays(desk.date, now.getTime());
  const stale = age === null || age > STALE_DAYS;
  const applied = desk.duties.filter((item) => item.active).length;
  const gaps = new Map<string, number>();
  for (const log of logs) {
    const country = log.destination.country;
    if (country && !findDuty(desk.duties, country)) gaps.set(country, (gaps.get(country) ?? 0) + 1);
  }

  const stats = [
    {
      label: "Benchmark week",
      value: weekLabel(desk.week, desk.date) || "No week set",
      meta: desk.date ? `Priced ${formatDay(desk.date)}${age !== null ? ` · ${Math.floor(age)} days ago` : ""}` : "Set the data date",
      href: "?tab=pricing",
      tone: stale ? "text-[#9a5b00]" : "text-ink",
    },
    {
      label: "Origins ranked",
      value: `${live.length} of ${desk.benchmarks.length}`,
      meta: live.length === desk.benchmarks.length ? "Every origin is priced" : `${desk.benchmarks.filter((item) => !(item.active && item.fob > 0)).map((item) => item.label).join(", ")} left out`,
      href: "?tab=pricing",
      tone: live.length ? "text-ink" : "text-[#b42318]",
    },
    {
      label: "Price file",
      value: desk.priceFile ? `${desk.priceFile.rows.length} rows` : "None loaded",
      meta: desk.priceFile ? desk.priceFile.fileName : "Showing the built-in week 28 prices",
      href: "?tab=pricing",
      tone: "text-ink",
    },
    {
      label: "Import duties",
      value: `${desk.duties.length} ${desk.duties.length === 1 ? "country" : "countries"}`,
      meta: gaps.size ? `${gaps.size} looked-up ${gaps.size === 1 ? "country has" : "countries have"} no record` : `${applied} applied by default`,
      href: "?tab=duties",
      tone: gaps.size ? "text-[#9a5b00]" : "text-ink",
    },
    {
      label: "Calculations",
      value: `${monthLogs.length.toLocaleString()} this month`,
      meta: `${monthMembers} ${monthMembers === 1 ? "member" : "members"} · kept ${desk.settings.retentionDays} days`,
      href: "?tab=logs",
      tone: "text-ink",
    },
  ];

  const badge: Partial<Record<Tab, string>> = {
    pricing: !live.length ? "!" : stale ? "stale" : undefined,
    duties: gaps.size ? String(gaps.size) : undefined,
  };

  const current = `${desk.week}|${desk.date}`;
  const previous = [...desk.history].reverse().find((entry) => `${entry.week}|${entry.date}` !== current) ?? null;
  const freight = await getFreightDesk();

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Netback Calculator"
        description="The FOB benchmarks origins are ranked against, the import duty each destination carries, the trade costs in every landed price, and every calculation members run."
        crumbs={[{ href: "/admin/freight-calculator", label: "Calculators" }]}
        actions={
          <Link href="/hub/netback" className="text-[12.5px] font-semibold text-blue no-underline">
            Open on the hub
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-2xl border border-border bg-surface px-4 py-3.5 no-underline shadow-[0_1px_2px_rgba(26,58,92,0.05)] transition hover:border-blue/40"
          >
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">{stat.label}</p>
            <p className={`mt-1 text-[18px] font-bold tracking-tight ${stat.tone}`}>{stat.value}</p>
            <p className="mt-0.5 truncate text-[12px] text-mid" title={stat.meta}>
              {stat.meta}
            </p>
          </Link>
        ))}
      </div>

      <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-border" aria-label="Netback sections">
        {TABS.map((item) => {
          const active = item.key === tab;
          return (
            <Link
              key={item.key}
              href={`?tab=${item.key}`}
              aria-current={active ? "page" : undefined}
              className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[13.5px] font-semibold no-underline transition ${
                active ? "border-blue text-blue" : "border-transparent text-mid hover:text-ink"
              }`}
            >
              {item.label}
              {badge[item.key] ? (
                <span className={`rounded-full px-1.5 py-px font-mono text-[10.5px] ${badge[item.key] === "!" ? "bg-[#fdecec] text-[#b42318]" : "bg-[#fff6e5] text-[#9a5b00]"}`}>
                  {badge[item.key]}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {tab === "pricing" ? (
        <NetbackPricingPanel
          key={desk.updatedAt ?? "seed"}
          benchmarks={desk.benchmarks}
          week={desk.week}
          date={desk.date}
          priceFile={desk.priceFile}
          previous={previous}
          history={desk.history.slice(-8).reverse()}
          ports={activePorts(freight)}
          costs={desk.settings.costs}
          savedAt={desk.updatedAt}
          today={now.toISOString().slice(0, 10)}
        />
      ) : null}
      {tab === "duties" ? (
        <NetbackDutiesPanel
          key={desk.updatedAt ?? "seed"}
          initial={desk.duties}
          gaps={[...gaps.entries()].sort((a, b) => b[1] - a[1]).map(([country, count]) => ({ country, count }))}
          countries={COUNTRIES}
          savedAt={desk.updatedAt}
        />
      ) : null}
      {tab === "settings" ? (
        <NetbackSettingsPanel
          initial={desk.settings}
          savedAt={desk.updatedAt}
          live={{ bdi: freight.bdi.source === "default" ? null : { value: freight.bdi.value, date: freight.bdi.tradeDate }, vlsfo: freight.bunker.prices[0] ?? null }}
          origins={live}
        />
      ) : null}
      {tab === "logs" ? logsTab(params, logs) : null}
    </div>
  );
}

function logsTab(params: Params, logs: Awaited<ReturnType<typeof listNetbackLogs>>) {
  const filters = readNetbackFilters(params);
  const matching = filterNetbackLogs(logs, filters);
  const pages = Math.max(1, Math.ceil(matching.length / LOG_PAGE));
  const page = Math.min(pages, Math.max(1, Number(params.page) || 1));
  const months = Array.from(new Set(logs.map((log) => log.at.slice(0, 7)))).sort().reverse();
  return (
    <NetbackLogsPanel
      key={`${filters.q}|${filters.plan}|${filters.month}|${filters.mode}`}
      rows={matching.slice((page - 1) * LOG_PAGE, page * LOG_PAGE)}
      total={matching.length}
      page={page}
      pages={pages}
      filters={filters}
      months={months}
    />
  );
}
