export type LiveScreen = { name: string; users: number; views: number };
export type LiveEvent = { name: string; count: number };
export type LiveDevice = { name: string; users: number };
export type LiveMinute = { ago: number; users: number };

export type LiveAnalytics = {
  ok: true;
  at: string;
  activeUsers: number;
  events: number;
  views: number;
  minutes: LiveMinute[];
  screens: LiveScreen[];
  eventNames: LiveEvent[];
  devices: LiveDevice[];
};

export type LiveAnalyticsFailure = { ok: false; reason: "not_configured" | "denied" | "failed"; message: string };

export type RealtimeReport = {
  dimensionHeaders?: { name?: string }[];
  metricHeaders?: { name?: string }[];
  rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[];
};

const num = (value: string | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function metricMap(report: RealtimeReport | undefined) {
  const names = report?.metricHeaders?.map((header) => header.name ?? "") ?? [];
  const row = report?.rows?.[0]?.metricValues ?? [];
  return Object.fromEntries(names.map((name, index) => [name, num(row[index]?.value)]));
}

export function rowsOf(report: RealtimeReport | undefined) {
  const dimensions = report?.dimensionHeaders?.map((header) => header.name ?? "") ?? [];
  const metrics = report?.metricHeaders?.map((header) => header.name ?? "") ?? [];
  return (report?.rows ?? []).map((row) => {
    const record: Record<string, string | number> = {};
    dimensions.forEach((name, index) => {
      record[name] = row.dimensionValues?.[index]?.value ?? "";
    });
    metrics.forEach((name, index) => {
      record[name] = num(row.metricValues?.[index]?.value);
    });
    return record;
  });
}

/** Thirty bars, oldest on the left. Missing minutes stay at zero. */
export function minutesFrom(report: RealtimeReport | undefined): LiveMinute[] {
  const found = new Map<number, number>();
  for (const row of rowsOf(report)) {
    const ago = num(String(row.minutesAgo));
    if (ago >= 0 && ago <= 29) found.set(ago, num(String(row.activeUsers)));
  }
  return Array.from({ length: 30 }, (_, index) => {
    const ago = 29 - index;
    return { ago, users: found.get(ago) ?? 0 };
  });
}
