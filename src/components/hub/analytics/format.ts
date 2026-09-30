import type { MarketSeries, PricePoint, Tone } from "@/lib/aq-modules/types";

const DAY = 86_400_000;

export const MAX_ALERTS = 25;

export type SearchParams = Record<string, string | string[] | undefined>;

export const param = (params: SearchParams, key: string) => {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
};

export function sortedPoints(series: Pick<MarketSeries, "points">): PricePoint[] {
  return series.points.filter((point) => Number.isFinite(point.value) && /^\d{4}-\d{2}-\d{2}/.test(point.date)).sort((a, b) => a.date.localeCompare(b.date));
}

/** Two decimals under 100, one under 1,000, whole numbers above. */
export function num(value: number) {
  const abs = Math.abs(value);
  return value.toLocaleString("en-GB", { maximumFractionDigits: abs >= 1000 ? 0 : abs >= 100 ? 1 : 2 });
}

export const signedPct = (value: number | null) => (value === null ? "–" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`);
export const signedNum = (value: number | null) => (value === null ? "–" : `${value > 0 ? "+" : ""}${num(value)}`);

export const toneFor = (pct: number | null): Tone => (pct === null || Math.abs(pct) < 0.5 ? "flat" : pct > 0 ? "up" : "down");

export const TONE_TEXT: Record<Tone, string> = { up: "text-[#1b7a47]", down: "text-[#b53a2f]", flat: "text-mid" };

export const shiftDays = (date: string, days: number) => new Date(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);

function pctFrom(base: PricePoint | null, latest: PricePoint) {
  if (!base || base.date === latest.date || !base.value) return null;
  return Math.round(((latest.value - base.value) / base.value) * 1000) / 10;
}

export type SeriesStats = {
  latest: PricePoint;
  first: PricePoint;
  weekPct: number | null;
  monthPct: number | null;
  high: PricePoint;
  low: PricePoint;
  values: number[];
};

/** Latest price, week-on-week and four-week change, and the high and low across the series. */
export function seriesStats(series: Pick<MarketSeries, "points">): SeriesStats | null {
  const points = sortedPoints(series);
  const latest = points.at(-1);
  if (!latest) return null;
  const before = (days: number) => points.filter((point) => point.date <= shiftDays(latest.date, -days)).at(-1) ?? null;
  const high = points.reduce((best, point) => (point.value > best.value ? point : best), points[0]);
  const low = points.reduce((best, point) => (point.value < best.value ? point : best), points[0]);
  return { latest, first: points[0], weekPct: pctFrom(before(7), latest), monthPct: pctFrom(before(28), latest), high, low, values: points.map((point) => point.value) };
}

export type Momentum = { label: "Building" | "Fading" | "Turning" | "Steady"; hint: string };

/** Compares the move in the second half of a window with the first half. */
export function momentumOf(values: number[]): Momentum {
  if (values.length < 3) return { label: "Steady", hint: "Not enough prices in the window to judge momentum." };
  const mid = Math.floor((values.length - 1) / 2);
  const first = values[mid] - values[0];
  const second = values[values.length - 1] - values[mid];
  const scale = Math.abs(values[0]) || 1;
  if (Math.abs(first) / scale < 0.0025 && Math.abs(second) / scale < 0.0025) return { label: "Steady", hint: "Little movement in either half of the window." };
  if (Math.sign(first) !== 0 && Math.sign(second) !== 0 && Math.sign(first) !== Math.sign(second)) return { label: "Turning", hint: "The recent half moved against the earlier half." };
  if (Math.abs(second) > Math.abs(first)) return { label: "Building", hint: "The move is larger in the recent half of the window." };
  return { label: "Fading", hint: "The move is smaller in the recent half of the window." };
}

export function csvCell(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function csvResponse(body: string, filename: string) {
  return new Response(`\uFEFF${body}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
