import type { Plan } from "@/lib/session-shared";

/** Active seconds on a flash's full view before the visit counts as read. */
export const READ_SECONDS = 10;
/** One visit never counts for more than this, however long the tab stays open. */
export const MAX_VISIT_SECONDS = 4 * 60 * 60;

/** One member opening one flash's full view. Re-sent while they read, so `seconds` and `depth` only grow. */
export type TelexVisit = {
  /** `${userId}:${visit}`, where the visit id is made fresh by the browser on each open. */
  id: string;
  /** Last time the browser reported in. */
  at: string;
  startedAt: string;
  userId: string;
  email: string;
  name: string;
  plan: Plan;
  admin: boolean;
  telexId: string;
  /** The headline when the visit started, so the report still reads well if the flash is later deleted. */
  headline: string;
  /** Seconds the page was visible, focused and in use. */
  seconds: number;
  /** How far down the story the reader got, 0 to 100. */
  depth: number;
  /** When `seconds` first reached READ_SECONDS; null while it is only opened. */
  readAt: string | null;
};

export type TelexReader = {
  userId: string;
  email: string;
  name: string;
  plan: Plan;
  admin: boolean;
  visits: number;
  seconds: number;
  depth: number;
  firstAt: string;
  lastAt: string;
  readAt: string | null;
};

export type TelexReadStats = {
  /** Members who opened the full view. */
  opened: number;
  /** Members with at least one visit of READ_SECONDS or more. */
  read: number;
  visits: number;
  /** Mean total active seconds per member who read it. */
  avgSeconds: number;
  medianSeconds: number;
  /** Mean furthest scroll, 0 to 100, across members who opened it. */
  avgDepth: number;
  lastAt: string | null;
};

const EMPTY: TelexReadStats = { opened: 0, read: 0, visits: 0, avgSeconds: 0, medianSeconds: 0, avgDepth: 0, lastAt: null };

const earliest = (a: string | null, b: string | null) => (!a ? b : !b ? a : a < b ? a : b);

/** One row per member, most recent reader first. */
export function readersOf(visits: TelexVisit[]): TelexReader[] {
  const byMember = new Map<string, TelexReader>();
  for (const visit of visits) {
    const current = byMember.get(visit.userId);
    if (!current) {
      byMember.set(visit.userId, {
        userId: visit.userId,
        email: visit.email,
        name: visit.name,
        plan: visit.plan,
        admin: visit.admin,
        visits: 1,
        seconds: visit.seconds,
        depth: visit.depth,
        firstAt: visit.startedAt,
        lastAt: visit.at,
        readAt: visit.readAt,
      });
      continue;
    }
    current.visits += 1;
    current.seconds += visit.seconds;
    current.depth = Math.max(current.depth, visit.depth);
    current.readAt = earliest(current.readAt, visit.readAt);
    if (visit.startedAt < current.firstAt) current.firstAt = visit.startedAt;
    if (visit.at > current.lastAt) {
      current.lastAt = visit.at;
      current.name = visit.name;
      current.email = visit.email;
      current.plan = visit.plan;
    }
  }
  return [...byMember.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function statsFor(visits: TelexVisit[]): TelexReadStats {
  if (!visits.length) return EMPTY;
  const readers = readersOf(visits);
  const finished = readers.filter((reader) => reader.readAt);
  const times = finished.map((reader) => reader.seconds);
  return {
    opened: readers.length,
    read: finished.length,
    visits: visits.length,
    avgSeconds: times.length ? Math.round(times.reduce((sum, value) => sum + value, 0) / times.length) : 0,
    medianSeconds: median(times),
    avgDepth: Math.round(readers.reduce((sum, reader) => sum + reader.depth, 0) / readers.length),
    lastAt: readers[0]?.lastAt ?? null,
  };
}

/** Stats for every flash that has visits, keyed by flash id. */
export function statsByTelex(visits: TelexVisit[]): Map<string, TelexReadStats> {
  const grouped = new Map<string, TelexVisit[]>();
  for (const visit of visits) grouped.set(visit.telexId, [...(grouped.get(visit.telexId) ?? []), visit]);
  return new Map([...grouped].map(([id, rows]) => [id, statsFor(rows)]));
}

export type MemberActivity = Omit<TelexReader, "visits" | "depth" | "firstAt" | "readAt"> & { opened: number; read: number };

/** Across all flashes: how many each member opened and read, and their total reading time. Most flashes read first. */
export function membersOf(visits: TelexVisit[]): MemberActivity[] {
  const byMember = new Map<string, MemberActivity & { openedIds: Set<string>; readIds: Set<string> }>();
  for (const visit of visits) {
    let row = byMember.get(visit.userId);
    if (!row) {
      row = { userId: visit.userId, email: visit.email, name: visit.name, plan: visit.plan, admin: visit.admin, opened: 0, read: 0, seconds: 0, lastAt: visit.at, openedIds: new Set(), readIds: new Set() };
      byMember.set(visit.userId, row);
    }
    row.openedIds.add(visit.telexId);
    if (visit.readAt) row.readIds.add(visit.telexId);
    row.seconds += visit.seconds;
    if (visit.at > row.lastAt) {
      row.lastAt = visit.at;
      row.name = visit.name;
      row.email = visit.email;
      row.plan = visit.plan;
    }
  }
  return [...byMember.values()]
    .map(({ openedIds, readIds, ...row }) => ({ ...row, opened: openedIds.size, read: readIds.size }))
    .sort((a, b) => b.read - a.read || b.seconds - a.seconds || b.lastAt.localeCompare(a.lastAt));
}

/**
 * Folds a browser report into the stored visit. Time and depth never go backwards, time can never
 * exceed the wall-clock time since the visit started (plus a little slack for clock jitter), and
 * the read moment is fixed the first time the threshold is crossed.
 */
export function mergeVisit(current: TelexVisit, report: { seconds: number; depth: number }, now: string): TelexVisit {
  const elapsed = Math.max(0, (Date.parse(now) - Date.parse(current.startedAt)) / 1000) + 5;
  const seconds = Math.round(Math.min(MAX_VISIT_SECONDS, elapsed, Math.max(current.seconds, report.seconds)));
  const depth = Math.round(Math.min(100, Math.max(current.depth, report.depth)));
  return { ...current, at: now, seconds, depth, readAt: current.readAt ?? (seconds >= READ_SECONDS ? now : null) };
}

/** `95` to `1m 35s`; under a minute stays in seconds. */
export function formatDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total}s`;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  return hours ? `${hours}h ${minutes}m` : rest ? `${minutes}m ${rest}s` : `${minutes}m`;
}
