import type { Metadata } from "next";
import { Gauge, MessageSquareText, Scale, TrendingUp } from "lucide-react";
import { InfoTip } from "@/components/app/info-tip";
import { num } from "@/components/hub/analytics/format";
import { AsOf } from "@/components/hub/analytics/ui";
import { Disclaimer, EmptyPanel, HubPageHeader, Panel, StatTile, Tag, type TagTone } from "@/components/hub/kit";
import { LockedScreen } from "@/components/hub/locked-screen";
import { Markdown } from "@/components/hub/markdown";
import { getHubAccess } from "@/lib/aq-modules/access";
import type { BalanceRow, Trend } from "@/lib/aq-modules/types";
import { formatDay } from "@/lib/content-types";

export const metadata: Metadata = { title: "Supply & Demand" };
export const dynamic = "force-dynamic";

const TREND: Record<Trend, { label: string; tone: TagTone }> = {
  up: { label: "Tightening", tone: "red" },
  down: { label: "Easing", tone: "green" },
  flat: { label: "Stable", tone: "neutral" },
};

const TIPS = {
  surplus: "Production plus imports, minus consumption and exports. A positive number means the season adds to stocks; a negative one means it draws them down.",
  stocksToUse: "Closing stocks as a share of the season's consumption. At 10%, stocks would cover roughly five weeks of demand. Under about 8% reads as tight; over 15% is comfortable.",
  trend: "The desk's view of where the balance is heading. Tightening means supply is getting shorter against demand, which usually supports prices. Easing means the reverse.",
};

function figures(row: BalanceRow) {
  const surplus = row.production + row.imports - row.consumption - row.exports;
  const stocksToUse = row.consumption ? (row.stocks / row.consumption) * 100 : null;
  return { surplus: Math.round(surplus * 100) / 100, stocksToUse: stocksToUse === null ? null : Math.round(stocksToUse * 10) / 10 };
}

function Bars({ row }: { row: BalanceRow }) {
  const top = Math.max(row.production, row.consumption, 1);
  const bars = [
    { label: "Production", value: row.production, color: "bg-teal-500" },
    { label: "Consumption", value: row.consumption, color: "bg-navy-500" },
  ];
  return (
    <div className="mt-2 space-y-1" role="img" aria-label={`Production ${num(row.production)} ${row.unit} against consumption ${num(row.consumption)} ${row.unit}`}>
      {bars.map((bar) => (
        <div key={bar.label} className="flex items-center gap-2">
          <span className="w-8 shrink-0 text-[10px] font-semibold uppercase text-dim">{bar.label.slice(0, 4)}</span>
          <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-s3">
            <span className={`block h-full rounded-full ${bar.color}`} style={{ width: `${Math.max(3, (bar.value / top) * 100)}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}

function stuTone(value: number | null) {
  if (value === null) return "text-mid";
  return value < 8 ? "text-[#b53a2f]" : value > 15 ? "text-[#1b7a47]" : "text-ink";
}

export default async function SupplyDemandPage() {
  const { user, modules, can } = await getHubAccess();
  if (!can("supply-demand")) return <LockedScreen module="supply-demand" required={modules.access["supply-demand"]} plan={user.plan} />;

  const { balances, commentary, updatedAt } = modules.supplyDemand;
  const rows = balances.map((row) => ({ row, ...figures(row) }));
  const tightest = [...rows].filter((item) => item.stocksToUse !== null).sort((a, b) => (a.stocksToUse ?? 0) - (b.stocksToUse ?? 0))[0];
  const tightening = rows.filter((item) => item.row.trend === "up").length;
  const updated = updatedAt ?? modules.updatedAt;

  return (
    <div className="flex flex-col gap-5 pb-2">
      <HubPageHeader
        eyebrow="AQ Analytics"
        title="Supply & Demand"
        description="Season balance sheets for the major nutrients: production, consumption, trade and stocks, with the direction of travel and what would change it."
        tip="Each row is one product and region for a season. Surplus and stocks-to-use are worked out from the desk's figures, so you can see at a glance which balances are tight."
      />

      {updated ? <AsOf>Balances updated {formatDay(updated)}</AsOf> : null}

      {!rows.length ? (
        <EmptyPanel title="Balance sheets arrive soon" body="The desk is compiling season balances. Each product will show production, consumption, trade, stocks and the direction of travel." />
      ) : (
        <>
          <div className="aq-stagger grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile label="Balances tracked" value={rows.length} icon={Scale} tone="blue" hint={[...new Set(rows.map((item) => item.row.season))].join(", ")} />
            <StatTile label="Tightening" value={tightening} icon={TrendingUp} tone="rose" hint={tightening ? rows.filter((item) => item.row.trend === "up").map((item) => item.row.product).join(", ") : "No balance is tightening"} />
            <StatTile
              label="Tightest stocks-to-use"
              value={tightest ? `${tightest.stocksToUse}%` : "–"}
              icon={Gauge}
              tone="amber"
              hint={tightest ? `${tightest.row.product} · ${tightest.row.region}` : "Needs consumption figures"}
            />
          </div>

          <Panel title="Balances" sub="Production, trade and stocks by season" icon={Scale} tone="blue">
            <ul className="divide-y divide-border md:hidden">
              {rows.map(({ row, surplus, stocksToUse }) => (
                <li key={row.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14.5px] font-semibold text-ink">{row.product}</p>
                      <p className="text-[12px] text-dim">
                        {row.region} · {row.season} · {row.unit}
                      </p>
                    </div>
                    <Tag tone={TREND[row.trend]?.tone ?? "neutral"}>{TREND[row.trend]?.label ?? "Stable"}</Tag>
                  </div>
                  <Bars row={row} />
                  <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2 text-[12px]">
                    {[
                      ["Production", num(row.production)],
                      ["Consumption", num(row.consumption)],
                      ["Stocks", num(row.stocks)],
                      ["Imports", num(row.imports)],
                      ["Exports", num(row.exports)],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-dim">{label}</dt>
                        <dd className="font-semibold tabular-nums text-ink">{value}</dd>
                      </div>
                    ))}
                    <div>
                      <dt className="text-dim">Surplus</dt>
                      <dd className={`font-semibold tabular-nums ${surplus < 0 ? "text-[#b53a2f]" : surplus > 0 ? "text-[#1b7a47]" : "text-ink"}`}>
                        {surplus > 0 ? "+" : ""}
                        {num(surplus)}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-3 flex items-center gap-1 text-[12.5px] text-mid">
                    Stocks-to-use <strong className={`font-semibold tabular-nums ${stuTone(stocksToUse)}`}>{stocksToUse === null ? "–" : `${stocksToUse}%`}</strong>
                    <InfoTip label="Stocks-to-use" text={TIPS.stocksToUse} href="/hub/guide#supply-demand" />
                  </p>
                  {row.note ? <p className="mt-1 text-[12.5px] leading-snug text-mid">{row.note}</p> : null}
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-[13px]">
                <caption className="sr-only">Supply and demand balances with computed surplus and stocks-to-use</caption>
                <thead>
                  <tr className="border-b border-border bg-s2 text-left font-mono text-[10px] uppercase tracking-wider text-mid">
                    <th scope="col" className="px-4 py-2.5 font-semibold">Product</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Production</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Consumption</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Imports</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Exports</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Stocks</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      <span className="inline-flex items-center gap-0.5">
                        Surplus <InfoTip label="Surplus" text={TIPS.surplus} href="/hub/guide#supply-demand" />
                      </span>
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      <span className="inline-flex items-center gap-0.5">
                        Stocks-to-use <InfoTip label="Stocks-to-use" text={TIPS.stocksToUse} href="/hub/guide#supply-demand" />
                      </span>
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">
                      <span className="inline-flex items-center gap-0.5">
                        Direction <InfoTip label="Direction" text={TIPS.trend} href="/hub/guide#supply-demand" />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map(({ row, surplus, stocksToUse }) => (
                    <tr key={row.id} className="align-top transition-colors hover:bg-s2/60">
                      <th scope="row" className="w-[220px] px-4 py-3.5 text-left font-normal">
                        <span className="block text-[14px] font-semibold text-ink">{row.product}</span>
                        <span className="block text-[12px] text-dim">
                          {row.region} · {row.season} · {row.unit}
                        </span>
                        <Bars row={row} />
                      </th>
                      <td className="px-3 py-3.5 text-right tabular-nums">{num(row.production)}</td>
                      <td className="px-3 py-3.5 text-right tabular-nums">{num(row.consumption)}</td>
                      <td className="px-3 py-3.5 text-right tabular-nums text-mid">{num(row.imports)}</td>
                      <td className="px-3 py-3.5 text-right tabular-nums text-mid">{num(row.exports)}</td>
                      <td className="px-3 py-3.5 text-right tabular-nums">{num(row.stocks)}</td>
                      <td className={`px-3 py-3.5 text-right font-semibold tabular-nums ${surplus < 0 ? "text-[#b53a2f]" : surplus > 0 ? "text-[#1b7a47]" : "text-ink"}`}>
                        {surplus > 0 ? "+" : ""}
                        {num(surplus)}
                        <span className="block text-[11px] font-medium text-dim">{surplus < 0 ? "Stock draw" : surplus > 0 ? "Stock build" : "Balanced"}</span>
                      </td>
                      <td className={`px-3 py-3.5 text-right font-semibold tabular-nums ${stuTone(stocksToUse)}`}>{stocksToUse === null ? "–" : `${stocksToUse}%`}</td>
                      <td className="px-4 py-3.5">
                        <Tag tone={TREND[row.trend]?.tone ?? "neutral"}>{TREND[row.trend]?.label ?? "Stable"}</Tag>
                        {row.note ? <p className="mt-1.5 max-w-[260px] text-[12.5px] leading-snug text-mid">{row.note}</p> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-2.5 text-[11.5px] text-dim">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-4 rounded-full bg-teal-500" /> Production
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-4 rounded-full bg-navy-500" /> Consumption
              </span>
              <span>Stocks-to-use under 8% reads as tight, over 15% as comfortable.</span>
            </p>
          </Panel>
        </>
      )}

      {commentary.trim() ? (
        <Panel title="Desk commentary" sub="What would change the balance" icon={MessageSquareText} bodyClassName="px-5 py-4">
          <Markdown text={commentary} className="text-[14px] text-ink" />
        </Panel>
      ) : null}

      <Disclaimer />
    </div>
  );
}
