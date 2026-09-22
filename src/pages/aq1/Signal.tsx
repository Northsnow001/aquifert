import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { InfoTip } from "@/components/aq1/InfoTip";
import { useAq1Tips } from "@/components/aq1/tips";
import { SIGNAL_WINDOWS } from "@contracts/aq1";

type Window = 7 | 30 | 60 | 90;

function Sparkline({ points, up }: { points: number[]; up: boolean }) {
  if (points.length < 2) return null;
  const w = 120; const h = 32;
  const min = Math.min(...points); const max = Math.max(...points);
  const span = max - min || 1;
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${((i / (points.length - 1)) * w).toFixed(1)},${(h - ((p - min) / span) * (h - 4) - 2).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} role="img" aria-label={`Trend across the window: from ${points[0]} to ${points[points.length - 1]}`} className="shrink-0">
      <path d={d} fill="none" strokeWidth={2} className={up ? "stroke-emerald-600" : "stroke-red-600"} />
    </svg>
  );
}

/** AQ Signal — rolling market windows from the market price tables. */
export default function Aq1Signal() {
  const tips = useAq1Tips();
  const [window_, setWindow_] = useState<Window>(() => {
    const saved = Number(localStorage.getItem("aq_signal_window"));
    return (SIGNAL_WINDOWS as readonly number[]).includes(saved) ? (saved as Window) : 7;
  });
  const q = trpc.aq1.signal.useQuery({ window: window_ });
  useEffect(() => { localStorage.setItem("aq_signal_window", String(window_)); }, [window_]);

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <PageHeader
        title={<span className="inline-flex items-center">AQ Signal <InfoTip label="AQ Signal" text={tips.signal} /></span>}
        description={q.data?.dataAsOf
          ? `Underlying data as of ${new Date(q.data.dataAsOf).toLocaleDateString("en-GB")}${Date.now() - +new Date(q.data.dataAsOf) > 14 * 864e5 ? " — this data is older than its expected refresh." : ""}`
          : "Rolling market snapshots."}
      />
      <div role="tablist" aria-label="Window" className="inline-flex rounded-lg border border-border p-1">
        {SIGNAL_WINDOWS.map((w) => (
          <button key={w} role="tab" aria-selected={window_ === w} onClick={() => setWindow_(w)}
            className={`min-h-11 rounded-md px-4 text-sm font-semibold ${window_ === w ? "bg-navy-700 text-white dark:bg-navy-300 dark:text-navy-900" : "text-muted-foreground hover:text-foreground"}`}>
            {w} days
          </button>
        ))}
      </div>

      {q.isLoading && <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>}
      {q.isError && <EmptyState title="Could not load AQ Signal" description="Something went wrong on our side. Retry in a moment." actionLabel="Retry" onAction={() => q.refetch()} />}

      {q.data && q.data.groups.map((g) => (
        <section key={g.group} aria-label={g.group}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{g.group}</h2>
          {g.items.length === 0 && (
            <Card><CardContent className="p-4 text-sm text-muted-foreground">Insufficient data for this group in the selected window.</CardContent></Card>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {g.items.map((it) => (
              <Card key={it.label}>
                <CardContent className="p-4">
                  {it.insufficient ? (
                    <p className="text-sm text-muted-foreground">{it.label}: insufficient data for the {window_}-day window.</p>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{it.label} <span className="text-xs font-normal text-muted-foreground">({it.region})</span></p>
                        <p className="mt-1 text-sm tabular-nums">
                          {it.startPrice} → <strong>{it.currentPrice}</strong> {it.currency}/t
                        </p>
                        <p className={`mt-1 inline-flex items-center gap-1 text-sm font-semibold tabular-nums ${it.direction === "UP" ? "text-emerald-700 dark:text-emerald-400" : it.direction === "DOWN" ? "text-red-700 dark:text-red-400" : "text-muted-foreground"}`}>
                          {it.direction === "UP" ? <ArrowUp className="h-4 w-4" aria-hidden /> : it.direction === "DOWN" ? <ArrowDown className="h-4 w-4" aria-hidden /> : <ArrowRight className="h-4 w-4" aria-hidden />}
                          {it.changeAbs >= 0 ? "+" : ""}{it.changeAbs} ({it.changePct >= 0 ? "+" : ""}{it.changePct}%)
                          <span className="sr-only">{it.direction === "UP" ? "up" : it.direction === "DOWN" ? "down" : "flat"}</span>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground tabular-nums">High {it.high} · Low {it.low}</p>
                        {/* visually hidden data table for the sparkline */}
                        <table className="sr-only"><caption>{it.label} prices across the window</caption><tbody>{it.points.map((p, i) => <tr key={i}><td>Point {i + 1}</td><td>{p}</td></tr>)}</tbody></table>
                      </div>
                      <Sparkline points={it.points} up={it.direction !== "DOWN"} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}

      {q.data && (
        <section aria-label="What drove it">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">What drove it</h2>
          <Card><CardContent className="p-4">
            {q.data.drivers.length === 0
              ? <p className="text-sm text-muted-foreground">No notable events in this window. The desk publishes most weekday mornings.</p>
              : <ul className="space-y-2">{q.data.drivers.map((d, i) => (
                  <li key={i} className="text-sm">
                    <span className="mr-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold">{d.kind}</span>
                    <a href={d.href} className="underline underline-offset-2 hover:text-teal-700 dark:hover:text-teal-300" {...(d.kind === "NEWS" ? { target: "_blank", rel: "noreferrer" } : {})}>{d.title}</a>
                    <span className="ml-2 text-xs text-muted-foreground">{new Date(d.date).toLocaleDateString("en-GB")}</span>
                  </li>
                ))}</ul>}
          </CardContent></Card>
        </section>
      )}

      {q.data?.narrative && (
        <section aria-label="Window summary">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Window summary</h2>
          <Card><CardContent className="p-4 text-sm leading-relaxed">{q.data.narrative}</CardContent></Card>
        </section>
      )}
    </div>
  );
}
