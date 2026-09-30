import type { MarketSeries, SeriesGroup, Trend } from "@/lib/aq-modules/types";

export const SIGNAL_WINDOWS = [7, 30, 60, 90] as const;
export const PRO_WINDOWS = [7, 30, 60, 90, 180] as const;

export type SignalItem = {
  id: string;
  label: string;
  basis: string;
  unit: string;
  group: SeriesGroup;
  insufficient: boolean;
  start: number;
  current: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  /** Where the latest price sits between the window low (0) and high (100). */
  rangePosition: number;
  direction: Trend;
  points: number[];
  from: string;
  to: string;
};

const DAY = 86_400_000;
const round = (value: number, places = 2) => Math.round(value * 10 ** places) / 10 ** places;

/** Latest date across every series, the day the window is measured back from. */
export function dataAsOf(series: MarketSeries[]): string | null {
  let latest: string | null = null;
  for (const item of series) for (const point of item.points) if (!latest || point.date > latest) latest = point.date;
  return latest;
}

/** A price is "flat" when it moved less than half a percent across the window. */
export function signalFor(series: MarketSeries, days: number, asOf: string): SignalItem {
  const end = Date.parse(asOf);
  const sorted = [...series.points].filter((point) => Number.isFinite(point.value)).sort((a, b) => a.date.localeCompare(b.date));
  const inWindow = sorted.filter((point) => {
    const at = Date.parse(point.date);
    return at <= end && at >= end - days * DAY;
  });
  const base = { id: series.id, label: series.label, basis: series.basis, unit: series.unit, group: series.group };
  if (inWindow.length < 2) {
    return { ...base, insufficient: true, start: 0, current: 0, change: 0, changePct: 0, high: 0, low: 0, rangePosition: 0, direction: "flat", points: [], from: "", to: "" };
  }
  const values = inWindow.map((point) => point.value);
  const start = values[0];
  const current = values[values.length - 1];
  const high = Math.max(...values);
  const low = Math.min(...values);
  const change = current - start;
  const changePct = start ? (change / start) * 100 : 0;
  return {
    ...base,
    insufficient: false,
    start,
    current,
    change: round(change),
    changePct: round(changePct, 1),
    high,
    low,
    rangePosition: high === low ? 50 : Math.round(((current - low) / (high - low)) * 100),
    direction: Math.abs(changePct) < 0.5 ? "flat" : change > 0 ? "up" : "down",
    points: values,
    from: inWindow[0].date,
    to: inWindow[inWindow.length - 1].date,
  };
}

export function signalGroups(series: MarketSeries[], days: number) {
  const asOf = dataAsOf(series);
  const groups = new Map<SeriesGroup, SignalItem[]>();
  if (asOf) {
    for (const item of series) {
      const list = groups.get(item.group) ?? [];
      list.push(signalFor(item, days, asOf));
      groups.set(item.group, list);
    }
  }
  return { asOf, groups: [...groups.entries()].map(([group, items]) => ({ group, items })) };
}

/** One paragraph a member can read in ten seconds. */
export function windowNarrative(items: SignalItem[], days: number) {
  const live = items.filter((item) => !item.insufficient);
  if (!live.length) return "";
  const up = live.filter((item) => item.direction === "up");
  const down = live.filter((item) => item.direction === "down");
  const biggest = [...live].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))[0];
  const lean = up.length > down.length ? "firmer" : down.length > up.length ? "softer" : "mixed";
  const move = `${biggest.label} (${biggest.basis}) moved the most, ${biggest.changePct >= 0 ? "+" : ""}${biggest.changePct}% to ${biggest.current} ${biggest.unit}`;
  return `Over the last ${days} days the market leaned ${lean}: ${up.length} series rose, ${down.length} fell and ${live.length - up.length - down.length} held steady. ${move}.`;
}

export function toCsv(series: MarketSeries[]) {
  const rows = [["Series", "Group", "Basis", "Unit", "Date", "Value"]];
  for (const item of series) for (const point of [...item.points].sort((a, b) => a.date.localeCompare(b.date))) rows.push([item.label, item.group, item.basis, item.unit, point.date, String(point.value)]);
  return rows.map((row) => row.map((cell) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(",")).join("\n");
}

/** Parses pasted `date,value` lines (tabs, commas or semicolons). Returns the points and the lines it skipped. */
export function parsePoints(text: string) {
  const points: { date: string; value: number }[] = [];
  const skipped: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const [date, value] = line.split(/[\t,;]+/).map((cell) => cell.trim());
    const cleaned = String(value ?? "").replace(/[$£€\s]/g, "");
    const number = Number(cleaned);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") && cleaned !== "" && Number.isFinite(number)) points.push({ date, value: number });
    else skipped.push(line);
  }
  const byDate = new Map(points.map((point) => [point.date, point]));
  return { points: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)), skipped };
}
