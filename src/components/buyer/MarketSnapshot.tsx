/**
 * MarketSnapshot, free-tier buyer dashboard block. Brings the desk's market
 * data tables and latest market commentary into the account in the dashboard's
 * card grammar. Rendered for buyers without an active membership; members use
 * the full Hub (/hub).
 */
import { useState } from "react";
import { Link } from "react-router";
import { ChevronDown, LineChart, Newspaper } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type PriceRow = {
  id: number;
  product: string;
  grade: string | null;
  basis: string;
  location: string;
  unit: string;
  value: number;
  changeAbs: number | null;
  changePct: number | null;
  direction: "UP" | "DOWN" | "FLAT";
};

const NITROGEN = ["Urea", "Ammonium Nitrate", "Ammonium Sulphate", "Calcium Ammonium Nitrate", "UAN 32"];
const PHOSPHATES = ["DAP", "MAP", "TSP", "SSP"];
const POTASH = ["MOP", "SOP"];
const FEEDSTOCK = ["Ammonia", "Phosphoric Acid", "Sulphur"];

const COMMENTARY_PARAS = [
  "Urea markets firmed again this week as Middle East producers reported limited spot availability for October loading, while Indian tender expectations continued to set a floor under CFR values into West Coast India. Granular urea out of the Arabian Gulf is now commanding a premium over prilled product we have not seen since the spring.",
  "Phosphates remain the quiet outperformer. DAP values into Brazil are holding above $660/t CFR on tight Chinese export availability, and our desk sees little relief before Q1 as the seasonal South American programme draws down remaining prompt tonnage.",
  "Freight is the variable to watch. Handysize rates in the Atlantic basket have firmed for a third consecutive week, adding roughly $3–4/t to landed costs on transatlantic potash movements. Buyers fixing November tonnage should budget accordingly.",
  "Our base case into year-end: nitrogen supported by gas costs and Indian demand, phosphates structurally tight, potash rangebound with an upward bias. Members can find the full regional breakdowns and hedge indications in this week's AQ VIEW.",
];

function fmt(v: number) {
  return "$" + v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function MiniTable({ label, rows }: { label: string; rows: PriceRow[] }) {
  return (
    <div className="min-w-0">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-700">{label}</h3>
      <table className="mt-2 w-full text-sm">
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="py-2 text-xs text-muted-foreground">No indications published.</td>
            </tr>
          ) : (
            rows.map((r) => {
              const color =
                r.direction === "UP" ? "text-emerald-700" : r.direction === "DOWN" ? "text-red-700" : "text-muted-foreground";
              const arrow = r.direction === "UP" ? "▲" : r.direction === "DOWN" ? "▼" : "–";
              return (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-2">
                    {r.product}
                    {r.grade ? ` ${r.grade}` : ""}
                    <span className="block text-[11px] text-muted-foreground">
                      {r.basis} {r.location}
                    </span>
                  </td>
                  <td className="py-2 pr-2 text-right font-data text-[13px] font-semibold tabular-nums">
                    {fmt(r.value)}
                  </td>
                  <td className={`py-2 text-right font-data text-[12px] tabular-nums ${color}`}>
                    <span aria-hidden="true">{arrow} </span>
                    <span className="sr-only">
                      {r.direction === "UP" ? "up" : r.direction === "DOWN" ? "down" : "unchanged"}
                    </span>
                    {r.changeAbs != null && r.changePct != null
                      ? `${r.changeAbs > 0 ? "+" : ""}${r.changeAbs.toFixed(2)} (${r.changePct > 0 ? "+" : ""}${r.changePct.toFixed(2)}%)`
                      : "N/A"}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export function MarketSnapshot() {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading } = trpc.prices.slider.useQuery({ region: "Middle East" });
  const { data: freight } = trpc.prices.slider.useQuery({ region: "Freight" });

  const items = (data?.items ?? []) as PriceRow[];
  const pick = (names: string[], max: number) =>
    names
      .map((n) => items.filter((i) => i.product === n).slice(0, n === "Urea" ? 2 : 1))
      .flat()
      .slice(0, max);
  const groups: { label: string; rows: PriceRow[] }[] = [
    { label: "Nitrogen", rows: pick(NITROGEN, 5) },
    { label: "Phosphates", rows: pick(PHOSPHATES, 4) },
    { label: "Potash", rows: pick(POTASH, 3) },
    {
      label: "Freight & Feedstock",
      rows: [...((freight?.items ?? []) as PriceRow[]), ...pick(FEEDSTOCK, 2)].slice(0, 5),
    },
  ];
  const shown = expanded ? COMMENTARY_PARAS : COMMENTARY_PARAS.slice(0, 2);

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Market snapshot
        </h2>
        <Link to="/hub" className="text-xs font-semibold text-teal-600 hover:underline">
          Full market hub →
        </Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Market data */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChart className="h-4 w-4 text-teal-600" aria-hidden="true" /> Market data
            </CardTitle>
            <span className="text-[11px] text-muted-foreground">
              As of {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : (
              <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
                {groups.map((g) => (
                  <MiniTable key={g.label} label={g.label} rows={g.rows} />
                ))}
              </div>
            )}
            <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">
              Price indications compiled from public sources and Aquifert desk assessments. May be
              delayed. Not a price assessment.
            </p>
          </CardContent>
        </Card>

        {/* Commentary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Newspaper className="h-4 w-4 text-teal-600" aria-hidden="true" /> Market commentary
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">Aquifert Trading Desk</p>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold leading-snug">
              Nitrogen firms on tight prompt supply; phosphates hold their premium into Brazil
            </p>
            <div className="mt-3 space-y-3 text-[13px] leading-relaxed text-muted-foreground">
              {shown.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 underline-offset-4 hover:underline"
            >
              {expanded ? "Collapse article" : "Expand article"}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
