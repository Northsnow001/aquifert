import Link from "next/link";
import { Download } from "lucide-react";
import { STALE_DAYS, marketFreshness } from "@/components/admin/aq-data/freshness";
import { SeriesManager } from "@/components/admin/aq-data/series-manager";
import { WeeklyPrices } from "@/components/admin/aq-data/weekly-prices";
import { Card, CardHeader, PageHeader, btnSecondary } from "@/components/admin/ui";
import { getAqModules } from "@/lib/aq-modules/store";
import { formatDay, formatStamp } from "@/lib/content-types";

export const dynamic = "force-dynamic";

const deskToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export default async function MarketDataAdminPage() {
  const modules = await getAqModules();
  const series = [...modules.series].sort((a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label) || a.basis.localeCompare(b.basis));
  const fresh = marketFreshness(series);
  const lagging = fresh.asOf ? series.filter((item) => !item.points.some((point) => point.date === fresh.asOf)).length : 0;
  const points = series.reduce((sum, item) => sum + item.points.length, 0);

  const stats = [
    { label: "Series", value: series.length.toLocaleString(), meta: `${points.toLocaleString()} prices saved`, tone: "text-ink" },
    {
      label: "Data as of",
      value: fresh.asOf ? formatDay(fresh.asOf) : "No prices",
      meta: fresh.asOf ? (fresh.stale ? `${fresh.age} days old · members see it as stale` : `Week ${fresh.week} · ${fresh.age === 0 ? "today" : `${fresh.age} days ago`}`) : "Enter this week's prices",
      tone: fresh.stale ? "text-[#9a5b00]" : "text-ink",
    },
    {
      label: "Missing the latest date",
      value: lagging.toLocaleString(),
      meta: lagging ? "Series without a price on the latest date" : "Every series is up to date",
      tone: lagging ? "text-[#9a5b00]" : "text-ink",
    },
    { label: "Last saved", value: modules.updatedAt ? formatStamp(modules.updatedAt) : "Built-in data", meta: modules.updatedAt ? "UTC" : "Nothing saved from the admin yet", tone: "text-ink" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Market data"
        description={`The price series behind AQ Signal, Market Data and member alerts. Enter each week's prices below; data older than ${STALE_DAYS} days shows as stale on the hub.`}
        actions={
          <div className="flex items-center gap-3">
            <Link href="/hub/analytics/market-data" className="text-[12.5px] font-semibold text-blue no-underline">
              Open on the hub
            </Link>
            {series.length ? (
              <a href="/admin/market-data/export" className={btnSecondary}>
                <Download className="h-3.5 w-3.5" />
                CSV
              </a>
            ) : null}
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-[0_1px_2px_rgba(26,58,92,0.05)]">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">{stat.label}</p>
            <p className={`mt-1 text-[18px] font-bold tracking-tight ${stat.tone}`}>{stat.value}</p>
            <p className="mt-0.5 text-[12px] text-mid sm:truncate" title={stat.meta}>
              {stat.meta}
            </p>
          </div>
        ))}
      </div>

      <Card className="mb-5 overflow-hidden">
        <CardHeader title="This week's prices" meta="One price per series for the date you pick. The date starts on today, UK time." />
        <WeeklyPrices key={modules.updatedAt ?? "seed"} series={series} today={deskToday()} />
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Series" meta="Edit names and basis, paste a price history from a spreadsheet, or download one series." />
        <SeriesManager series={series} />
      </Card>
    </div>
  );
}
