import "server-only";

import { cache } from "react";
import { readDocument, updateDocument } from "@/lib/data/documents";
import { countRecords, listRecords, pruneRecords, putRecords, removeRecords, trimRecords } from "@/lib/data/records";
import { NETBACK_LOGS } from "@/lib/data/tables";
import { NETBACK_CONSTANTS } from "@/lib/netback/calculate";
import {
  DEFAULT_DUTIES,
  DEFAULT_NETBACK_SETTINGS,
  DEFAULT_WEEK,
  seedBenchmarks,
  type Benchmark,
  type NetbackDesk,
  type NetbackLog,
  type NetbackSettings,
} from "@/lib/netback-desk/types";

const MAX_LOGS = 5000;
const DAY = 86_400_000;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function normalizeSettings(raw: unknown): NetbackSettings {
  const value = isRecord(raw) ? (raw as Partial<NetbackSettings>) : {};
  return {
    ...DEFAULT_NETBACK_SETTINGS,
    ...value,
    costs: { ...NETBACK_CONSTANTS, ...(isRecord(value.costs) ? value.costs : {}) },
  };
}

/** Keeps the nine origins fixed; stored rows only override their price and switches. */
function normalizeBenchmarks(raw: unknown): Benchmark[] {
  const stored = Array.isArray(raw) ? (raw as Partial<Benchmark>[]) : [];
  return seedBenchmarks().map((seed) => {
    const saved = stored.find((item) => item?.key === seed.key);
    return saved ? { ...seed, ...saved, lat: seed.lat, lon: seed.lon, region: seed.region, port: seed.port } : seed;
  });
}

function fromStored(raw: unknown): NetbackDesk {
  const value = isRecord(raw) ? (raw as Partial<NetbackDesk>) : {};
  return {
    benchmarks: normalizeBenchmarks(value.benchmarks),
    week: typeof value.week === "string" ? value.week : DEFAULT_WEEK.week,
    date: typeof value.date === "string" ? value.date : DEFAULT_WEEK.date,
    priceFile: isRecord(value.priceFile) ? (value.priceFile as NetbackDesk["priceFile"]) : null,
    history: Array.isArray(value.history) ? value.history : [],
    duties: Array.isArray(value.duties) ? value.duties : DEFAULT_DUTIES.map((item) => ({ ...item })),
    settings: normalizeSettings(value.settings),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
  };
}

const cachedDesk = cache(async () => fromStored(await readDocument("netback-desk")));

/** Read once per request; each caller gets its own copy. */
export async function getNetbackDesk(): Promise<NetbackDesk> {
  return structuredClone(await cachedDesk());
}

export function updateNetbackDesk(mutate: (desk: NetbackDesk) => void) {
  return updateDocument("netback-desk", (raw) => {
    const desk = fromStored(raw);
    mutate(desk);
    return { ...desk, updatedAt: new Date().toISOString() };
  });
}

export const listNetbackLogs = (): Promise<NetbackLog[]> => listRecords(NETBACK_LOGS, { limit: MAX_LOGS });

const monthStart = (now: number) => {
  const date = new Date(now);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString();
};

/** Logs inside the retention window stay, and always the current month's, since usage limits count them. */
const retentionCutoff = (days: number, now = Date.now()) => new Date(Math.min(now - days * DAY, Date.parse(monthStart(now)))).toISOString();

export async function recordNetbackLog(entry: NetbackLog, retentionDays: number) {
  const now = Date.now();
  await putRecords(NETBACK_LOGS, [entry]);
  await pruneRecords(NETBACK_LOGS, retentionCutoff(retentionDays, now));
  await trimRecords(NETBACK_LOGS, MAX_LOGS, monthStart(now));
}

/** Drops logs older than the retention window. Returns how many were removed. */
export const pruneNetbackLogs = (retentionDays: number) => pruneRecords(NETBACK_LOGS, retentionCutoff(retentionDays));

export const deleteNetbackLogs = (ids: string[]) => removeRecords(NETBACK_LOGS, ids);

export function netbackUsage(userId: string, now = new Date()) {
  return countRecords(NETBACK_LOGS, { userId, since: monthStart(now.getTime()) });
}
