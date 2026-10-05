import Link from "next/link";
import { DebugPanel } from "@/components/admin/freight/debug-panel";
import { FixturesPanel } from "@/components/admin/freight/fixtures-panel";
import { LogsPanel } from "@/components/admin/freight/logs-panel";
import { MarketDataPanel } from "@/components/admin/freight/market-data-panel";
import { PricingPanel } from "@/components/admin/freight/pricing-panel";
import { PageHeader } from "@/components/admin/ui";
import { formatStamp } from "@/lib/content-types";
import { filterLogs, readLogFilters } from "@/lib/freight-desk/logs";
import { auditPorts } from "@/lib/freight-desk/port-quality";
import { activePorts, getFreightDesk, listCalcLogs, monthKey } from "@/lib/freight-desk/store";
import { ageInDays } from "@/lib/freight-desk/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TABS = [
  { key: "data", label: "Market data" },
  { key: "fixtures", label: "Fixtures" },
  { key: "pricing", label: "Pricing" },
  { key: "logs", label: "Calculation logs" },
  { key: "debug", label: "Debug" },
] as const;

type Tab = (typeof TABS)[number]["key"];
type Params = { tab?: string; q?: string; plan?: string; month?: string; page?: string };

const LOG_PAGE = 50;

export default async function FreightCalculatorAdminPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const tab: Tab = TABS.some((item) => item.key === params.tab) ? (params.tab as Tab) : "data";
  const desk = await getFreightDesk();
  const logs = await listCalcLogs();
  const now = new Date();
  const thisMonth = monthKey(now.toISOString());
  const monthLogs = logs.filter((log) => monthKey(log.at) === thisMonth);
  const activeFixtures = desk.fixtures.filter((fixture) => fixture.status === "active").length;
  const liveCount = desk.ports.filter((port) => port.active).length;
  const portIssues = auditPorts(desk.ports).size;
  const bdiAge = ageInDays(desk.bdi.tradeDate, now.getTime());
  const bdiStale = desk.bdi.source === "default" || bdiAge === null || bdiAge > 7;
  const errors = desk.debug.filter((entry) => entry.level === "error").length;
  const first = desk.bunker.prices[0];

  const stats = [
    {
      label: "Baltic Dry Index",
      value: desk.bdi.value.toLocaleString(),
      meta: desk.bdi.source === "default" ? "Built-in fallback value" : `${desk.bdi.tradeDate ?? "No trade date"} · ${desk.bdi.source === "manual" ? "manual" : "Trading Economics"}`,
      href: "?tab=data",
      tone: bdiStale ? "text-[#9a5b00]" : "text-ink",
    },
    {
      label: "VLSFO",
      value: first ? `$${first.price.toLocaleString()}` : "—",
      meta: desk.bunker.lastError ? "Last refresh failed" : `${first?.city ?? ""} · ${desk.bunker.lastSuccessAt ? `updated ${formatStamp(desk.bunker.lastSuccessAt)}` : "built-in prices"}`,
      href: "?tab=data",
      tone: desk.bunker.lastError ? "text-[#9a5b00]" : "text-ink",
    },
    {
      label: "Fixtures",
      value: `${activeFixtures.toLocaleString()} active`,
      meta: `${desk.fixtures.length.toLocaleString()} total · ${desk.batches.length} import ${desk.batches.length === 1 ? "batch" : "batches"}`,
      href: "?tab=fixtures",
      tone: activeFixtures ? "text-ink" : "text-[#9a5b00]",
    },
    {
      label: "Calculations",
      value: `${monthLogs.length.toLocaleString()} this month`,
      meta: `${new Set(monthLogs.map((log) => log.user.id)).size} members · ${logs.length.toLocaleString()} logged`,
      href: "?tab=logs",
      tone: "text-ink",
    },
    {
      label: "Port registry",
      value: `${liveCount} live`,
      meta: portIssues ? `${portIssues} to review` : `${desk.ports.length} ports, all checks pass`,
      href: "/admin/ports",
      tone: portIssues ? "text-[#9a5b00]" : "text-ink",
    },
  ];

  const badge: Partial<Record<Tab, string>> = {
    data: desk.bunker.lastError || desk.bdi.lastError ? "!" : bdiStale ? "stale" : undefined,
    debug: errors ? String(errors) : undefined,
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Freight Calculator"
        description="The live inputs behind member freight quotes: BDI and bunker prices, verified fixtures that anchor the rate, pricing rules and usage limits, and every calculation members run."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-5 max-xl:[&>:last-child]:col-span-2">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-2xl border border-border bg-surface px-4 py-3.5 no-underline shadow-[0_1px_2px_rgba(26,58,92,0.05)] transition hover:border-blue/40"
          >
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">{stat.label}</p>
            <p className={`mt-1 text-[18px] font-bold tracking-tight ${stat.tone}`}>{stat.value}</p>
            <p className="mt-0.5 text-[12px] text-mid sm:truncate">{stat.meta}</p>
          </Link>
        ))}
      </div>

      <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-border" aria-label="Freight calculator sections">
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
                <span className={`rounded-full px-1.5 py-px font-mono text-[10.5px] ${item.key === "debug" || badge[item.key] === "!" ? "bg-[#fdecec] text-[#b42318]" : "bg-[#fff6e5] text-[#9a5b00]"}`}>
                  {badge[item.key]}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {tab === "data" ? <MarketDataPanel key={desk.updatedAt ?? "seed"} bdi={desk.bdi} bunker={desk.bunker} bdiAgeDays={bdiAge} ports={{ live: liveCount, total: desk.ports.length, issues: portIssues, customized: desk.portsCustomized }} /> : null}
      {tab === "fixtures" ? (
        <FixturesPanel
          fixtures={desk.fixtures}
          batches={desk.batches}
          ports={activePorts(desk)}
          cargoTypes={Object.keys(desk.settings.cargoPremiums)}
          lastExtraction={desk.lastExtraction ? { fileName: desk.lastExtraction.fileName, at: desk.lastExtraction.at, count: desk.lastExtraction.rows.length } : null}
          today={now.toISOString().slice(0, 10)}
        />
      ) : null}
      {tab === "pricing" ? <PricingPanel initial={desk.settings} savedAt={desk.updatedAt} /> : null}
      {tab === "logs" ? logsTab(params, logs) : null}
      {tab === "debug" ? <DebugPanel entries={[...desk.debug].reverse()} /> : null}
    </div>
  );
}

function logsTab(params: Params, logs: Awaited<ReturnType<typeof listCalcLogs>>) {
  const filters = readLogFilters(params);
  const matching = filterLogs(logs, filters);
  const pages = Math.max(1, Math.ceil(matching.length / LOG_PAGE));
  const page = Math.min(pages, Math.max(1, Number(params.page) || 1));
  const months = Array.from(new Set(logs.map((log) => monthKey(log.at)))).sort().reverse();
  return (
    <LogsPanel
      key={`${filters.q}|${filters.plan}|${filters.month}`}
      rows={matching.slice((page - 1) * LOG_PAGE, page * LOG_PAGE)}
      total={matching.length}
      page={page}
      pages={pages}
      filters={filters}
      months={months}
    />
  );
}
