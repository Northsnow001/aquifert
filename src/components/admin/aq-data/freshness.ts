import { dataAsOf } from "@/lib/aq-modules/signal";
import type { MarketSeries } from "@/lib/aq-modules/types";
import { ageInDays } from "@/lib/freight-desk/types";

export const STALE_DAYS = 14;

/** ISO 8601 week number of a `YYYY-MM-DD` date. */
export function isoWeek(date: string) {
  const day = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(day.getTime())) return null;
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1);
  return Math.ceil(((day.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

export function marketFreshness(series: MarketSeries[], now = Date.now()) {
  const asOf = dataAsOf(series);
  const age = ageInDays(asOf, now);
  const stale = age === null || age > STALE_DAYS;
  const week = asOf ? isoWeek(asOf) : null;
  const badge = !asOf ? "no data" : stale ? "stale" : week ? `wk ${week}` : undefined;
  return { asOf, age: age === null ? null : Math.floor(age), stale, week, badge };
}
