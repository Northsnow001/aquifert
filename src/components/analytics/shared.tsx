/**
 * AQ ANALYTICS shared building blocks (PLANS PART 3, Section 3 standards):
 * fixed palette assigned in order (colour follows the entity), freshness
 * badge, tabular-nums, hidden accessible data table, lock teaser.
 */
import { Link } from "react-router";
import { Lock, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/providers/trpc";

/** Fixed assignment order — never cycled; colour follows the entity. */
export const SERIES_COLORS = ["#1D6FA5", "#3FA37A", "#B07D0D", "#8360B8", "#C85A3E"];
export const SERIES_COLORS_DARK = ["#4A8FD8", "#25A87D", "#BE8A1E", "#9578CE", "#D9705A"];
export const seriesColor = (index: number) => SERIES_COLORS[index % SERIES_COLORS.length];

export function Freshness({ asOf, label = "As of" }: { asOf?: string | null; label?: string }) {
  if (!asOf) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
      <RefreshCw className="h-3 w-3" aria-hidden="true" /> {label} {asOf}
    </span>
  );
}

/** Visually hidden, keyboard-accessible data table — every chart exposes one. */
export function DataTableFallback({ caption, headers, rows }: { caption: string; headers: string[]; rows: (string | number)[][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead><tr>{headers.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>)}</tr>)}</tbody>
    </table>
  );
}

/** Attribution + assessment date adjacent to the value, never in a footer. */
export function Attribution({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  return (
    <p className="rounded-md bg-muted/60 px-3 py-2 text-xs leading-snug text-muted-foreground">{text}</p>
  );
}

/** HOW TO panel: plain-English reading guide per view (1.4). */
export function HowTo({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="rounded-md border border-border bg-card px-4 py-3 text-sm">
      <summary className="cursor-pointer font-semibold text-foreground">How to read this — {title}</summary>
      <div className="mt-2 space-y-1.5 text-muted-foreground">{children}</div>
    </details>
  );
}

/** Locked teaser for an absent capability. No real data is requested; the
 *  page renders this and nothing else. */
export function LockedTeaser({ capability, title, children }: { capability: string; title: string; children: ReactNode }) {
  const { data } = trpc.analytics.config.useQuery(undefined, { staleTime: 60_000 });
  const cap = data?.capabilities?.[capability];
  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <div>
        <h1 className="flex items-center text-2xl font-bold text-navy-900 dark:text-white">
          {title} <Lock className="ml-2 h-5 w-5 text-muted-foreground" aria-label="Locked" />
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {cap?.cheapest ? `Included with ${cap.cheapest}.` : "Part of AQ Analytics."} Everything here is built on licensed market data under strict contract terms.
        </p>
      </div>
      <Card><CardContent className="space-y-3 p-5 text-sm text-muted-foreground">{children}</CardContent></Card>
      <div className="grid gap-4 md:grid-cols-3" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="h-24 select-none blur-md">
                <svg viewBox="0 0 200 80" className="h-full w-full">
                  <polyline points={`0,${60 - i * 10} 40,${40 + i * 8} 80,${50 - i * 6} 120,${30 + i * 10} 160,35 200,${20 + i * 12}`} fill="none" stroke={seriesColor(i)} strokeWidth="3" />
                </svg>
              </div>
              <div className="mt-2 space-y-1 blur-sm">
                <div className="h-3 w-3/4 rounded bg-muted" /><div className="h-3 w-1/2 rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Sample visuals are intentionally obscured; subscribers see the live data.</p>
      <div className="flex flex-wrap gap-3">
        <Button asChild><Link to="/buyer/membership">Upgrade to unlock</Link></Button>
        <Button asChild variant="outline"><Link to="/account/contact">Talk to the desk</Link></Button>
      </div>
    </div>
  );
}

/** Thin-sample badge (1.4d): a band from three fixtures is not the market. */
export function SampleSize({ n }: { n: number }) {
  const thin = n < 5;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${thin ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" : "bg-muted text-muted-foreground"}`}
      style={{ fontVariantNumeric: "tabular-nums" }}
      title={thin ? "Thin sample — treat as indicative only" : undefined}
    >
      n={n}{thin ? " · thin sample" : ""}
    </span>
  );
}

/** Direction by arrow AND sign AND colour — never colour alone (Section 3). */
export function Direction({ value, unit = "" }: { value: number; unit?: string }) {
  const up = value > 0;
  const cls = up ? "text-emerald-700 dark:text-emerald-400" : value < 0 ? "text-red-700 dark:text-red-400" : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${cls}`} style={{ fontVariantNumeric: "tabular-nums" }}>
      <span aria-hidden="true">{up ? "▲" : value < 0 ? "▼" : "■"}</span>
      {up ? "+" : ""}{value}{unit}
    </span>
  );
}
