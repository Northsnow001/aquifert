import "server-only";

import { cache } from "react";
import { readDocument, updateDocument } from "@/lib/data/documents";
import { clearRecords, countRecords, listRecords, putRecords, removeRecords, trimRecords } from "@/lib/data/records";
import { FREIGHT_DEBUG, FREIGHT_LOGS } from "@/lib/data/tables";
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

const MAX_LOGS = 5000;

type StoredDesk = Omit<FreightDesk, "ports" | "portsCustomized" | "debug"> & { ports: PortEntry[] | null };

export const seedPorts = (): PortEntry[] => PORTS.map((port) => ({ ...port, aliases: port.aliases ?? [], active: true }));

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

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

const load = async () => fromStored(await readDocument("freight-desk"));

function fromStored(raw: unknown): StoredDesk {
  const value = isRecord(raw) ? (raw as Partial<StoredDesk>) : {};
  return {
    ports: Array.isArray(value.ports) ? value.ports : null,
    fixtures: Array.isArray(value.fixtures) ? value.fixtures : [],
    batches: Array.isArray(value.batches) ? value.batches : [],
    bunker: { ...DEFAULT_BUNKER, ...(isRecord(value.bunker) ? value.bunker : {}), sourceUrl: BUNKER_SOURCE },
    bdi: { ...DEFAULT_BDI_STATE, ...(isRecord(value.bdi) ? value.bdi : {}), sourceUrl: BDI_SOURCE },
    settings: normalizeSettings(value.settings),
    lastExtraction: isRecord(value.lastExtraction) ? (value.lastExtraction as StoredDesk["lastExtraction"]) : null,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
  };
}

const expand = (stored: StoredDesk, debug: DebugEntry[]): FreightDesk => ({ ...stored, ports: stored.ports ?? seedPorts(), portsCustomized: stored.ports !== null, debug });

const cachedDesk = cache(async () => expand(await load(), await listFreightDebug()));

/** Read once per request; each caller gets its own copy. `debug` runs oldest to newest. */
export async function getFreightDesk(): Promise<FreightDesk> {
  return structuredClone(await cachedDesk());
}

/** Mutates a working copy. Setting `ports` keeps an explicit registry; leave it untouched to stay on the seed. Debug entries are written through `logFreightDebug`. */
export async function updateFreightDesk(mutate: (desk: FreightDesk) => void) {
  const next = await updateDocument("freight-desk", (raw): StoredDesk => {
    const desk = expand(fromStored(raw), []);
    const before = desk.ports;
    mutate(desk);
    const { ports, portsCustomized, debug: _debug, ...rest } = desk;
    void _debug;
    return { ...rest, ports: portsCustomized || ports !== before ? ports : null, updatedAt: new Date().toISOString() };
  });
  return expand(next, await listFreightDebug());
}

/** Returns the registry to the canonical seed list. */
export async function resetPortsToSeed() {
  await updateDocument("freight-desk", (raw): StoredDesk => ({ ...fromStored(raw), ports: null, updatedAt: new Date().toISOString() }));
  return seedPorts().length;
}

async function listFreightDebug() {
  return (await listRecords(FREIGHT_DEBUG, { limit: FREIGHT_DEBUG.max })).reverse();
}

export async function logFreightDebug(level: DebugLevel, message: string, context: Record<string, unknown> = {}) {
  await putRecords(FREIGHT_DEBUG, [{ at: new Date().toISOString(), level, message, context }]);
}

export const clearFreightDebug = () => clearRecords(FREIGHT_DEBUG);

export function activePorts(desk: FreightDesk): PortRecord[] {
  return desk.ports
    .filter((port) => port.active)
    .map(({ code, name, country, region, lat, lon, aliases }) => ({ code, name, country, region, lat, lon, ...(aliases.length ? { aliases } : {}) }));
}

export const listCalcLogs = (): Promise<CalcLog[]> => listRecords(FREIGHT_LOGS, { limit: MAX_LOGS });

export async function recordCalcLog(entry: CalcLog) {
  await putRecords(FREIGHT_LOGS, [entry]);
  await trimRecords(FREIGHT_LOGS, MAX_LOGS, monthStart());
}

export const deleteCalcLogs = (ids: string[]) => removeRecords(FREIGHT_LOGS, ids);

export const monthKey = (iso: string) => iso.slice(0, 7);

const monthStart = (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

export function monthlyUsage(userId: string, now = new Date()) {
  return countRecords(FREIGHT_LOGS, { userId, since: monthStart(now) });
}

export function nextReset(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
}
