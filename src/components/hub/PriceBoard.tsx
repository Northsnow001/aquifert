import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { PanelHeader, PanelSkeleton, PanelError, PanelEmpty } from "./FreshnessBadge";
import { fmtDateTime } from "@/lib/format";

type PriceRow = {
  id: number; product: string; grade: string | null; basis: string; location: string;
  currency: string; unit: string; value: number; changeAbs: number | null;
  changePct: number | null; direction: "UP" | "DOWN" | "FLAT";
};

const NITROGEN = ["Urea", "Ammonium Nitrate", "Ammonium Sulphate", "Calcium Ammonium Nitrate", "UAN 32"];
const PHOSPHATES = ["DAP", "MAP", "TSP", "SSP"];
const POTASH = ["MOP", "SOP"];
const FEEDSTOCK = ["Ammonia", "Phosphoric Acid", "Sulphur"];

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

function Rows({ rows }: { rows: PriceRow[] }) {
  return (
    <>
      {rows.map((r) => {
        const color =
          r.direction === "UP" ? "text-emerald-700 dark:text-emerald-400"
          : r.direction === "DOWN" ? "text-red-700 dark:text-red-400" : "text-muted-foreground";
        const arrow = r.direction === "UP" ? "▲" : r.direction === "DOWN" ? "▼" : "–";
        return (
          <tr key={r.id} className="border-b border-border/60 last:border-0">
            <td className="py-2 pr-2 text-[13px] text-foreground">
              {r.product}{r.grade ? ` ${r.grade}` : ""}
              <span className="block text-[10px] text-muted-foreground">{r.basis} {r.location}</span>
            </td>
            <td className="py-2 pr-2 text-right font-mono text-[12px] tabular-nums text-foreground">{fmt(r.value)}</td>
            <td className={`py-2 text-right font-mono text-[12px] tabular-nums ${color}`}>
              <span aria-hidden="true">{arrow} </span>
              {r.changeAbs != null && r.changePct != null
                ? `${r.changeAbs > 0 ? "+" : ""}${r.changeAbs.toFixed(2)} (${r.changePct > 0 ? "+" : ""}${r.changePct.toFixed(2)}%)`
                : "N/A"}
            </td>
          </tr>
        );
      })}
    </>
  );
}

export function PriceBoard() {
  const main = trpc.prices.slider.useQuery({ region: "Middle East" });
  const freight = trpc.prices.slider.useQuery({ region: "Freight" });
  const loading = main.isLoading || freight.isLoading;
  const failed = main.isError && freight.isError;

  const items = (main.data?.items ?? []) as PriceRow[];
  const pick = (names: string[], max: number) =>
    names.map((n) => items.filter((i) => i.product === n).slice(0, n === "Urea" ? 2 : 1)).flat().slice(0, max);
  const groups: { label: string; rows: PriceRow[] }[] = [
    { label: "Nitrogen", rows: pick(NITROGEN, 5) },
    { label: "Phosphates", rows: pick(PHOSPHATES, 4) },
    { label: "Potash", rows: pick(POTASH, 3) },
    { label: "Freight & Feedstock", rows: [...((freight.data?.items ?? []) as PriceRow[]), ...pick(FEEDSTOCK, 2)].slice(0, 5) },
  ];
  const asOf = [main.data?.asOf, freight.data?.asOf]
    .filter(Boolean)
    .map((d) => new Date(d as string))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const empty = main.isSuccess && items.length === 0;

  return (
    <Card>
      <CardContent className="p-5">
        <PanelHeader
          title="Price Board"
          sub={asOf ? `As of ${fmtDateTime(asOf)}` : "Indicative values"}
          freshness={asOf ? {
            level: Date.now() - asOf.getTime() > 14 * 864e5 ? "red" : Date.now() - asOf.getTime() > 7 * 864e5 ? "amber" : "green",
            asOf: asOf.toISOString(), ageHours: Math.round((Date.now() - asOf.getTime()) / 3.6e5) / 10,
            cadence: "7 days", source: "Aquifert desk assessments + open datasets", owner: "Aquifert Market Data",
            nextExpected: new Date(asOf.getTime() + 7 * 864e5).toISOString(),
          } : undefined}
        />
        {loading && <div className="mt-4"><PanelSkeleton rows={6} /></div>}
        {failed && <div className="mt-4"><PanelError label="Price board" onRetry={() => { main.refetch(); freight.refetch(); }} /></div>}
        {empty && (
          <div className="mt-4">
            <PanelEmpty
              message="No price indications are currently available for this board."
              actionLabel="Retry loading prices"
              onAction={() => { main.refetch(); freight.refetch(); }}
            />
          </div>
        )}
        {!loading && !failed && !empty && (
          <div className="mt-4 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {groups.map((g) => (
              <div key={g.label}>
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-400">{g.label}</h3>
                <table className="mt-2 w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th className="py-1.5 pr-2 font-medium">Description</th>
                      <th className="py-1.5 pr-2 text-right font-medium">Last</th>
                      <th className="py-1.5 text-right font-medium">Change (%)</th>
                    </tr>
                  </thead>
                  <tbody><Rows rows={g.rows} /></tbody>
                </table>
              </div>
            ))}
          </div>
        )}
        {!loading && !failed && !empty && (
          <p className="mt-4 border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground">
            Price indications compiled from public sources and Aquifert desk assessments. May be delayed.
            Not a price assessment, an offer, or advice.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
