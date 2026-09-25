import { Card, CardContent } from "@/components/ui/card";
import { PanelHeader } from "./FreshnessBadge";
import { fmtDateTime } from "@/lib/format";
import { HUB_AS_OF, SAMPLE_PRICES_FREIGHT, SAMPLE_PRICES_ME } from "@contracts/hub-sample";

type PriceRow = {
  id: number; product: string; grade: string | null; basis: string; location: string;
  currency: string; unit: string; value: number; changeAbs: number | null;
  changePct: number | null; direction: "UP" | "DOWN" | "FLAT";
};

const NITROGEN = ["Urea", "Ammonium Nitrate", "Ammonium Sulphate", "UAN 32"];
const PHOSPHATES = ["DAP", "MAP", "TSP", "SSP"];
const POTASH = ["MOP", "SOP"];
const FEEDSTOCK = ["Ammonia", "Phosphoric Acid", "Sulphur"];

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

function changeLabel(r: PriceRow) {
  if (r.changePct == null) return "—";
  const arrow = r.direction === "UP" ? "▲" : r.direction === "DOWN" ? "▼" : "–";
  const sign = r.changePct > 0 ? "+" : "";
  return `${arrow} ${sign}${r.changePct.toFixed(2)}%`;
}

function Rows({ rows }: { rows: PriceRow[] }) {
  return (
    <>
      {rows.map((r) => {
        const color =
          r.direction === "UP" ? "text-emerald-700 dark:text-emerald-400"
          : r.direction === "DOWN" ? "text-red-700 dark:text-red-400" : "text-muted-foreground";
        return (
          <tr key={r.id} className="border-b border-border/60 last:border-0">
            <td className="w-[52%] py-2 pr-3 align-top text-[13px] text-foreground">
              <span className="block truncate font-medium">
                {r.product}{r.grade ? ` ${r.grade}` : ""}
              </span>
              <span className="block truncate text-[10px] text-muted-foreground">{r.basis} {r.location}</span>
            </td>
            <td className="w-[22%] py-2 pr-2 text-right align-top font-mono text-[12px] tabular-nums text-foreground">
              {fmt(r.value)}
            </td>
            <td className={`w-[26%] py-2 text-right align-top font-mono text-[11px] tabular-nums whitespace-nowrap ${color}`}>
              {changeLabel(r)}
            </td>
          </tr>
        );
      })}
    </>
  );
}

function Group({ label, rows }: { label: string; rows: PriceRow[] }) {
  if (!rows.length) return null;
  return (
    <div className="min-w-0 overflow-hidden">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-400">{label}</h3>
      <table className="mt-2 w-full table-fixed">
        <thead>
          <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
            <th className="w-[52%] py-1.5 pr-3 font-medium">Description</th>
            <th className="w-[22%] py-1.5 pr-2 text-right font-medium">Last</th>
            <th className="w-[26%] py-1.5 text-right font-medium">Chg</th>
          </tr>
        </thead>
        <tbody><Rows rows={rows} /></tbody>
      </table>
    </div>
  );
}

/** Sample price board — no network required; layout stays readable at any width. */
export function PriceBoard() {
  const items = SAMPLE_PRICES_ME as PriceRow[];
  const freightItems = SAMPLE_PRICES_FREIGHT as PriceRow[];
  const pick = (names: string[], max: number) =>
    names.map((n) => items.filter((i) => i.product === n).slice(0, n === "Urea" ? 2 : 1)).flat().slice(0, max);
  const groups = [
    { label: "Nitrogen", rows: pick(NITROGEN, 5) },
    { label: "Phosphates", rows: pick(PHOSPHATES, 4) },
    { label: "Potash", rows: pick(POTASH, 3) },
    { label: "Freight & Feedstock", rows: [...freightItems, ...pick(FEEDSTOCK, 2)].slice(0, 5) },
  ];
  const asOf = new Date(HUB_AS_OF);

  return (
    <Card>
      <CardContent className="p-5">
        <PanelHeader
          title="Price Board"
          sub={`As of ${fmtDateTime(asOf)}`}
          freshness={{
            level: "amber",
            asOf: asOf.toISOString(),
            ageHours: Math.round((Date.now() - asOf.getTime()) / 3.6e5) / 10,
            cadence: "7 days",
            source: "Aquifert desk assessments + open datasets",
            owner: "Aquifert Market Data",
            nextExpected: new Date(asOf.getTime() + 7 * 864e5).toISOString(),
          }}
        />
        <div className="mt-4 grid grid-cols-1 gap-8 md:grid-cols-2">
          {groups.map((g) => (
            <Group key={g.label} label={g.label} rows={g.rows} />
          ))}
        </div>
        <p className="mt-4 border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground">
          Price indications compiled from public sources and Aquifert desk assessments. May be delayed.
          Not a price assessment, an offer, or advice.
        </p>
      </CardContent>
    </Card>
  );
}
