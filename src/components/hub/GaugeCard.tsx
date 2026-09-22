import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FreshnessBadge, type Freshness } from "./FreshnessBadge";
import { timeAgo } from "@/lib/format";

export type Indicator = {
  id: number;
  nutrient: "NITROGEN" | "PHOSPHATE" | "POTASSIUM";
  score: number;
  label: string;
  rationale: string;
  history: { date: string; score: number }[];
  updatedBy: string;
  updatedAt: string | Date;
  freshness: Freshness;
};

const NAMES = { NITROGEN: "Nitrogen", PHOSPHATE: "Phosphate", POTASSIUM: "Potassium" } as const;

function sparklinePath(history: { score: number }[], w: number, h: number): string {
  if (history.length < 2) return "";
  const step = w / (history.length - 1);
  return history
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - (p.score / 100) * h).toFixed(1)}`)
    .join(" ");
}

function GaugeArc({ score }: { score: number }) {
  // Semicircle gauge, 0–100, brand palette
  const r = 52;
  const cx = 60, cy = 62;
  const angle = Math.PI - (score / 100) * Math.PI;
  const x = cx + r * Math.cos(angle);
  const y = cy - r * Math.sin(angle);
  const large = score > 50 ? 1 : 0;
  const color = score < 40 ? "#B4544A" : score > 60 ? "#3E8E6E" : "#8A7A3C";
  return (
    <svg viewBox="0 0 120 70" className="w-full" role="img" aria-label={`Gauge score ${score} out of 100`}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" strokeWidth="9"
        className="stroke-muted" strokeLinecap="round" />
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${large} 1 ${x.toFixed(1)} ${y.toFixed(1)}`}
        fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" />
      <text x={cx} y={cy - 8} textAnchor="middle" className="fill-foreground text-[26px] font-bold tabular-nums"
        style={{ fontSize: 26, fontWeight: 700 }}>
        {score}
      </text>
    </svg>
  );
}

export function GaugeCard({ ind }: { ind: Indicator }) {
  const spark = useMemo(() => sparklinePath(ind.history, 200, 36), [ind.history]);
  const labelColor =
    ind.label === "Bullish" ? "text-emerald-700 dark:text-emerald-400"
    : ind.label === "Bearish" ? "text-red-700 dark:text-red-400"
    : "text-amber-700 dark:text-amber-400";
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground">{NAMES[ind.nutrient]}</h3>
            <p className={`text-[11px] font-semibold uppercase tracking-wide ${labelColor}`}>{ind.label}</p>
          </div>
          <FreshnessBadge f={ind.freshness} />
        </div>
        <div className="mx-auto mt-1 max-w-[180px]">
          <GaugeArc score={ind.score} />
        </div>
        <div className="mt-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">90-day trend</p>
          <svg viewBox="0 0 200 36" className="mt-1 h-9 w-full" role="img" aria-label="90-day score sparkline">
            <path d={spark} fill="none" className="stroke-teal-600 dark:stroke-teal-400" strokeWidth="1.8" />
          </svg>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Desk rationale:</span> {ind.rationale}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {ind.updatedBy} · updated {timeAgo(ind.updatedAt)}
        </p>
      </CardContent>
    </Card>
  );
}
