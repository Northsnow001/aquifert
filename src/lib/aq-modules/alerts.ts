import type { MemberAlert } from "@/lib/aq-modules/member-types";
import type { MarketSeries } from "@/lib/aq-modules/types";

export type AlertState = {
  alert: MemberAlert;
  series: MarketSeries | null;
  latest: { date: string; value: number } | null;
  triggered: boolean;
  /** How far the latest price is from the threshold, in the series unit. Negative means past it. */
  distance: number | null;
};

export function latestPoint(series: MarketSeries) {
  return [...series.points].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}

/** An alert is triggered while the latest desk price is on the wrong side of the threshold. */
export function evaluateAlerts(alerts: MemberAlert[], series: MarketSeries[]): AlertState[] {
  return alerts.map((alert) => {
    const match = series.find((item) => item.id === alert.seriesId) ?? null;
    const latest = match ? latestPoint(match) : null;
    if (!latest) return { alert, series: match, latest, triggered: false, distance: null };
    const triggered = alert.active && (alert.direction === "above" ? latest.value >= alert.threshold : latest.value <= alert.threshold);
    const distance = alert.direction === "above" ? alert.threshold - latest.value : latest.value - alert.threshold;
    return { alert, series: match, latest, triggered, distance: Math.round(distance * 100) / 100 };
  });
}
