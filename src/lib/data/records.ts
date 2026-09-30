import "server-only";

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import path from "path";
import { assertLocalAllowed, databaseError, dataClient, readFallback } from "@/lib/data/db";
import { toRow, type RecordSpec } from "@/lib/data/tables";

const PAGE = 1000;

/* ---------------- Local JSON arrays ---------------- */

const localPath = (file: string) => path.join(process.cwd(), "data", file);

function readLocal<T>(spec: RecordSpec<T>): T[] {
  const read = (file: string) => JSON.parse(readFileSync(localPath(file), "utf8")) as unknown;
  try {
    if (existsSync(localPath(spec.file))) {
      const raw = read(spec.file);
      return Array.isArray(raw) ? (raw as T[]) : [];
    }
    return spec.legacy && existsSync(localPath(spec.legacy.file)) ? spec.legacy.pick(read(spec.legacy.file)) : [];
  } catch {
    return [];
  }
}

function writeLocal<T>(spec: RecordSpec<T>, items: T[]) {
  assertLocalAllowed();
  const file = localPath(spec.file);
  const sorted = newestFirst(spec, items);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(`${file}.tmp`, `${JSON.stringify(spec.max ? sorted.slice(0, spec.max) : sorted, null, 2)}\n`, "utf8");
  renameSync(`${file}.tmp`, file);
}

const newestFirst = <T>(spec: RecordSpec<T>, items: T[]) => [...items].sort((a, b) => Date.parse(spec.keys(b).at) - Date.parse(spec.keys(a).at));

/* ---------------- Queries ---------------- */

type Filter = { userId?: string | null; email?: string | null; since?: string; before?: string };

function matches<T>(spec: RecordSpec<T>, item: T, filter: Filter) {
  const keys = spec.keys(item);
  const at = Date.parse(keys.at);
  if (filter.since && at < Date.parse(filter.since)) return false;
  if (filter.before && at >= Date.parse(filter.before)) return false;
  if (filter.userId !== undefined || filter.email !== undefined) {
    const byUser = Boolean(filter.userId) && keys.userId === filter.userId;
    const byEmail = Boolean(filter.email) && keys.email === filter.email?.trim().toLowerCase();
    if (!byUser && !byEmail) return false;
  }
  return true;
}

/** Rows newest first. */
export async function listRecords<T>(spec: RecordSpec<T>, options: Filter & { limit?: number } = {}): Promise<T[]> {
  const db = dataClient();
  if (!db) {
    const rows = newestFirst(spec, readLocal(spec)).filter((item) => matches(spec, item, options));
    return options.limit ? rows.slice(0, options.limit) : rows;
  }
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  const rows: T[] = [];
  while (rows.length < limit) {
    let query = db.from(spec.table).select("data").order("at", { ascending: false }).order("id", { ascending: true });
    if (options.since) query = query.gte("at", options.since);
    if (options.before) query = query.lt("at", options.before);
    const or = ownerFilter(options);
    if (or) query = query.or(or);
    const size = Math.min(PAGE, limit - rows.length);
    const { data, error } = await query.range(rows.length, rows.length + size - 1);
    if (error) return readFallback(spec.table, error, rows);
    rows.push(...(data ?? []).map((row) => row.data as T));
    if (!data || data.length < size) break;
  }
  return rows;
}

function ownerFilter(filter: Filter) {
  if (filter.userId === undefined && filter.email === undefined) return null;
  const parts = [
    filter.userId ? `user_id.eq.${quote(filter.userId)}` : null,
    filter.email ? `email.eq.${quote(filter.email.trim().toLowerCase())}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(",") : "id.is.null";
}

/** PostgREST filter values containing commas, dots or parentheses must be double-quoted. */
const quote = (value: string) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

/** The newest row owned by this account id or email. */
export async function findRecord<T>(spec: RecordSpec<T>, owner: { userId?: string | null; email?: string | null }): Promise<T | null> {
  if (!owner.userId && !owner.email) return null;
  return (await listRecords(spec, { ...owner, limit: 1 }))[0] ?? null;
}

export async function getRecord<T>(spec: RecordSpec<T>, id: string): Promise<T | null> {
  const db = dataClient();
  if (!db) return readLocal(spec).find((item) => spec.keys(item).id === id) ?? null;
  const { data, error } = await db.from(spec.table).select("data").eq("id", id).maybeSingle();
  if (error) return readFallback(spec.table, error, null);
  return (data?.data as T | undefined) ?? null;
}

export async function countRecords<T>(spec: RecordSpec<T>, filter: Filter = {}): Promise<number> {
  const db = dataClient();
  if (!db) return readLocal(spec).filter((item) => matches(spec, item, filter)).length;
  let query = db.from(spec.table).select("id", { count: "exact", head: true });
  if (filter.since) query = query.gte("at", filter.since);
  if (filter.before) query = query.lt("at", filter.before);
  const or = ownerFilter(filter);
  if (or) query = query.or(or);
  const { count, error } = await query;
  if (error) return readFallback(spec.table, error, 0);
  return count ?? 0;
}

/* ---------------- Writes ---------------- */

/** Inserts rows, replacing any with the same id, then applies the table's row limit. */
export async function putRecords<T>(spec: RecordSpec<T>, items: T[]) {
  if (!items.length) return;
  const db = dataClient();
  if (!db) {
    const ids = new Set(items.map((item) => spec.keys(item).id));
    writeLocal(spec, [...items, ...readLocal(spec).filter((item) => !ids.has(spec.keys(item).id))]);
    return;
  }
  for (let i = 0; i < items.length; i += 500) {
    const { error } = await db.from(spec.table).upsert(items.slice(i, i + 500).map((item) => toRow(spec, item)), { onConflict: "id" });
    if (error) throw databaseError(`save to ${spec.table}`, error);
  }
  if (spec.max) await trimRecords(spec, spec.max);
}

export async function removeRecords<T>(spec: RecordSpec<T>, ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const db = dataClient();
  if (!db) {
    const drop = new Set(ids);
    const rows = readLocal(spec);
    const kept = rows.filter((item) => !drop.has(spec.keys(item).id));
    if (kept.length !== rows.length) writeLocal(spec, kept);
    return rows.length - kept.length;
  }
  let removed = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const { count, error } = await db.from(spec.table).delete({ count: "exact" }).in("id", ids.slice(i, i + 100));
    if (error) throw databaseError(`delete from ${spec.table}`, error);
    removed += count ?? 0;
  }
  return removed;
}

/** Deletes rows older than `before`. Returns how many went. */
export async function pruneRecords<T>(spec: RecordSpec<T>, before: string): Promise<number> {
  const db = dataClient();
  if (!db) {
    const rows = readLocal(spec);
    const kept = rows.filter((item) => Date.parse(spec.keys(item).at) >= Date.parse(before));
    if (kept.length !== rows.length) writeLocal(spec, kept);
    return rows.length - kept.length;
  }
  const { count, error } = await db.from(spec.table).delete({ count: "exact" }).lt("at", before);
  if (error) throw databaseError(`prune ${spec.table}`, error);
  return count ?? 0;
}

/** Keeps the newest `keep` rows, plus any at or after `protectSince`. */
export async function trimRecords<T>(spec: RecordSpec<T>, keep: number, protectSince?: string) {
  const db = dataClient();
  if (!db) {
    const rows = newestFirst(spec, readLocal(spec));
    const kept = rows.filter((item, index) => index < keep || (protectSince !== undefined && Date.parse(spec.keys(item).at) >= Date.parse(protectSince)));
    if (kept.length !== rows.length) writeLocal(spec, kept);
    return;
  }
  const { data, error } = await db.from(spec.table).select("id, at").order("at", { ascending: false }).order("id", { ascending: true }).range(keep, keep + PAGE - 1);
  if (error) throw databaseError(`trim ${spec.table}`, error);
  const ids = (data ?? []).filter((row) => protectSince === undefined || Date.parse(row.at as string) < Date.parse(protectSince)).map((row) => row.id as string);
  await removeRecords(spec, ids);
}

export async function clearRecords<T>(spec: RecordSpec<T>) {
  const db = dataClient();
  if (!db) {
    writeLocal(spec, []);
    return;
  }
  const { error } = await db.from(spec.table).delete().not("id", "is", null);
  if (error) throw databaseError(`clear ${spec.table}`, error);
}
