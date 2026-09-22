import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { fmtDateTime, timeAgo } from "@/lib/format";

export type Freshness = {
  level: "green" | "amber" | "red";
  asOf: string | null;
  ageHours: number | null;
  cadence: string;
  source: string;
  owner: string;
  nextExpected: string | null;
};

const STYLES = {
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  red: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
} as const;

const ICONS = {
  green: CheckCircle2,
  amber: AlertTriangle,
  red: XCircle,
} as const;

/**
 * Freshness badge, "As of {date} · {relative age}", colour-coded
 * green (within cadence) / amber (1–2×) / red (beyond 2×). Hover/focus
 * reveals source, cadence, next expected refresh and owner.
 */
export function FreshnessBadge({ f }: { f: Freshness }) {
  const Icon = ICONS[f.level];
  const label = f.asOf
    ? `As of ${fmtDateTime(f.asOf)} · ${timeAgo(f.asOf)}`
    : "No data received yet";
  return (
    <span className="group/fresh relative inline-flex" tabIndex={0}>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STYLES[f.level]}`}
        aria-label={`${label}. Freshness: ${f.level}. Source: ${f.source}. Refresh cadence: ${f.cadence}.`}
      >
        <Icon className="h-3 w-3" aria-hidden="true" />
        {label}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-40 mt-1 hidden w-56 rounded-lg border border-border bg-popover p-3 text-left text-[11px] leading-relaxed text-popover-foreground shadow-lg group-hover/fresh:block group-focus-within/fresh:block"
      >
        <span className="block"><span className="font-semibold">Source:</span> {f.source}</span>
        <span className="block"><span className="font-semibold">Cadence:</span> every {f.cadence}</span>
        <span className="block">
          <span className="font-semibold">Next expected:</span> {f.nextExpected ? fmtDateTime(f.nextExpected) : "N/A"}
        </span>
        <span className="block"><span className="font-semibold">Owner:</span> {f.owner}</span>
        {f.level === "red" && (
          <span className="mt-1 block font-semibold text-red-600 dark:text-red-400">
            This data is stale, treat as indicative only.
          </span>
        )}
      </span>
    </span>
  );
}

/** Panel header with title + freshness badge. */
export function PanelHeader({
  title, sub, freshness,
}: { title: string; sub?: string; freshness?: Freshness }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-400">
          {title}
        </h2>
        {sub && <p className="mt-0.5 text-[12px] text-muted-foreground">{sub}</p>}
      </div>
      {freshness && <FreshnessBadge f={freshness} />}
    </div>
  );
}

/** Skeleton block matching panel layouts. */
export function PanelSkeleton({ rows = 5, tall = false }: { rows?: number; tall?: boolean }) {
  return (
    <div className="animate-pulse space-y-3" aria-hidden="true">
      <div className="h-3 w-28 rounded bg-muted" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`rounded bg-muted ${tall ? "h-14" : "h-8"}`} />
      ))}
    </div>
  );
}

/** Per-panel error state, never takes sibling panels down. */
export function PanelError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900 dark:bg-red-950/30">
      <p className="font-semibold text-red-800 dark:text-red-300">{label} failed to load</p>
      <p className="mt-1 text-[12px] text-red-700/80 dark:text-red-300/70">
        The rest of the Hub is unaffected. You can retry now or come back shortly.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 rounded-md bg-red-700 px-3 py-1 text-[12px] font-semibold text-white hover:bg-red-800"
      >
        Retry
      </button>
    </div>
  );
}

/** Empty state, always an explanation plus an action. */
export function PanelEmpty({ message, actionLabel, onAction }: { message: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-5 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-2 text-sm font-semibold text-navy-700 underline-offset-4 hover:underline dark:text-navy-200"
      >
        {actionLabel}
      </button>
    </div>
  );
}
