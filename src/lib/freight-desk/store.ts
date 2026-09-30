import "server-only";

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import path from "path";
import { PORTS, type PortRecord } from "@/lib/ports";
import {
  BDI_SOURCE,
  BUNKER_SOURCE,
  DEFAULT_BDI_STATE,
  DEFAULT_BUNKER,
  DEFAULT_FREIGHT_SETTINGS,
  type CalcLog,
  type DebugEntry,
  type DebugLevel,
  type FreightDesk,
  type FreightSettings,
  type PortEntry,
} from "@/lib/freight-desk/types";

const deskPath = path.join(process.cwd(), "data", "freight-desk.json");
const logsPath = path.join(process.cwd(), "data", "freight-logs.json");
const MAX_DEBUG = 200;
const MAX_LOGS = 5000;

type StoredDesk = Omit<FreightDesk, "ports" | "portsCustomized"> & { ports: PortEntry[] | null };

export const seedPorts = (): PortEntry[] => PORTS.map((port) => ({ ...port, aliases: port.aliases ?? [], active: true }));

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

function normalizeSettings(raw: unknown): FreightSettings {
  const value = isRecord(raw) ? (raw as Partial<FreightSettings>) : {};
  return {
    ...DEFAULT_FREIGHT_SETTINGS,
    ...value,
    cargoPremiums: isRecord(value.cargoPremiums) ? (value.cargoPremiums as Record<string, number>) : { ...DEFAULT_FREIGHT_SETTINGS.cargoPremiums },
    originPremiums: { ...DEFAULT_FREIGHT_SETTINGS.originPremiums, ...(isRecord(value.originPremiums) ? value.originPremiums : {}) },
    taper: { ...DEFAULT_FREIGHT_SETTINGS.taper, ...(isRecord(value.taper) ? value.taper : {}) },
  };
}

function load(): StoredDesk {
  const raw = readJson(deskPath);
  const value = isRecord(raw) ? (raw as Partial<StoredDesk>) : {};
  return {
    ports: Array.isArray(value.ports) ? value.ports : null,
    fixtures: Array.isArray(value.fixtures) ? value.fixtures : [],
    batches: Array.isArray(value.batches) ? value.batches : [],
    bunker: { ...DEFAULT_BUNKER, ...(isRecord(value.bunker) ? value.bunker : {}), sourceUrl: BUNKER_SOURCE },
    bdi: { ...DEFAULT_BDI_STATE, ...(isRecord(value.bdi) ? value.bdi : {}), sourceUrl: BDI_SOURCE },
    settings: normalizeSettings(value.settings),
    lastExtraction: isRecord(value.lastExtraction) ? (value.lastExtraction as StoredDesk["lastExtraction"]) : null,
    debug: Array.isArray(value.debug) ? value.debug : [],
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
  };
}

export function getFreightDesk(): FreightDesk {
  const stored = load();
  return { ...stored, ports: stored.ports ?? seedPorts(), portsCustomized: stored.ports !== null };
}

/** Mutates a working copy. Setting `ports` keeps an explicit registry; leave it untouched to stay on the seed. */
export function updateFreightDesk(mutate: (desk: FreightDesk) => void) {
  const stored = load();
  const desk: FreightDesk = { ...stored, ports: stored.ports ?? seedPorts(), portsCustomized: stored.ports !== null };
  const before = desk.ports;
  mutate(desk);
  const { ports, portsCustomized, ...rest } = desk;
  const next: StoredDesk = { ...rest, ports: portsCustomized || ports !== before ? ports : null, updatedAt: new Date().toISOString() };
  writeJson(deskPath, next);
  return getFreightDesk();
}

/** Returns the registry to the canonical seed list. */
export function resetPortsToSeed() {
  const stored = load();
  writeJson(deskPath, { ...stored, ports: null, updatedAt: new Date().toISOString() });
  return seedPorts().length;
}

export function logFreightDebug(level: DebugLevel, message: string, context: Record<string, unknown> = {}) {
  updateFreightDesk((desk) => {
    const entry: DebugEntry = { at: new Date().toISOString(), level, message, context };
    desk.debug = [...desk.debug, entry].slice(-MAX_DEBUG);
  });
}

export function activePorts(desk = getFreightDesk()): PortRecord[] {
  return desk.ports
    .filter((port) => port.active)
    .map(({ code, name, country, region, lat, lon, aliases }) => ({ code, name, country, region, lat, lon, ...(aliases.length ? { aliases } : {}) }));
}

export function listCalcLogs(): CalcLog[] {
  const raw = readJson(logsPath);
  return Array.isArray(raw) ? (raw as CalcLog[]) : [];
}

export function recordCalcLog(entry: CalcLog) {
  const month = monthKey(new Date().toISOString());
  writeJson(
    logsPath,
    [entry, ...listCalcLogs()].filter((log, index) => index < MAX_LOGS || monthKey(log.at) === month),
  );
}

export function deleteCalcLogs(ids: string[]) {
  const drop = new Set(ids);
  const logs = listCalcLogs();
  const kept = logs.filter((log) => !drop.has(log.id));
  writeJson(logsPath, kept);
  return logs.length - kept.length;
}

export const monthKey = (iso: string) => iso.slice(0, 7);

export function monthlyUsage(userId: string, now = new Date()) {
  const month = monthKey(now.toISOString());
  return listCalcLogs().filter((log) => log.user.id === userId && monthKey(log.at) === month).length;
}

export function nextReset(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
}
