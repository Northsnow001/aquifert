import "server-only";

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import path from "path";
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

const deskPath = path.join(process.cwd(), "data", "netback-desk.json");
const logsPath = path.join(process.cwd(), "data", "netback-logs.json");
const MAX_LOGS = 5000;
const DAY = 86_400_000;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function writeJson(file: string, value: unknown) {
  mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temp, file);
}

function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

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

export function getNetbackDesk(): NetbackDesk {
  const raw = readJson(deskPath);
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

export function updateNetbackDesk(mutate: (desk: NetbackDesk) => void) {
  const desk = getNetbackDesk();
  mutate(desk);
  const next = { ...desk, updatedAt: new Date().toISOString() };
  writeJson(deskPath, next);
  return next;
}

export function listNetbackLogs(): NetbackLog[] {
  const raw = readJson(logsPath);
  return Array.isArray(raw) ? (raw as NetbackLog[]) : [];
}

const thisMonth = (log: NetbackLog, now: number) => log.at.startsWith(new Date(now).toISOString().slice(0, 7));

/** Keeps logs inside the retention window, and always the current month's, since usage limits count them. */
const withinRetention = (logs: NetbackLog[], days: number, now = Date.now()) => logs.filter((log) => now - Date.parse(log.at) <= days * DAY || thisMonth(log, now));

export function recordNetbackLog(entry: NetbackLog, retentionDays: number) {
  const now = Date.now();
  writeJson(
    logsPath,
    withinRetention([entry, ...listNetbackLogs()], retentionDays, now).filter((log, index) => index < MAX_LOGS || thisMonth(log, now)),
  );
}

/** Drops logs older than the retention window. Returns how many were removed. */
export function pruneNetbackLogs(retentionDays: number) {
  const logs = listNetbackLogs();
  const kept = withinRetention(logs, retentionDays);
  if (kept.length !== logs.length) writeJson(logsPath, kept);
  return logs.length - kept.length;
}

export function deleteNetbackLogs(ids: string[]) {
  const drop = new Set(ids);
  const logs = listNetbackLogs();
  const kept = logs.filter((log) => !drop.has(log.id));
  writeJson(logsPath, kept);
  return logs.length - kept.length;
}

export function netbackUsage(userId: string, now = new Date()) {
  const month = now.toISOString().slice(0, 7);
  return listNetbackLogs().filter((log) => log.user.id === userId && log.at.startsWith(month)).length;
}
