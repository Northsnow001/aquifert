import "server-only";

import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { assertLocalAllowed, databaseError, dataClient, readFallback } from "@/lib/data/db";
import type { DocumentKey } from "@/lib/data/tables";
import { versionedReader } from "@/lib/data/versioned-reader";

const localPath = (key: DocumentKey) => path.join(process.cwd(), "data", `${key}.json`);
const MAX_ATTEMPTS = 6;

function readLocal(key: DocumentKey): unknown {
  try {
    return JSON.parse(readFileSync(localPath(key), "utf8"));
  } catch {
    return null;
  }
}

function writeLocal(key: DocumentKey, value: object) {
  assertLocalAllowed();
  const file = localPath(key);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(`${file}.tmp`, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(`${file}.tmp`, file);
}

const queues = new Map<DocumentKey, Promise<unknown>>();

/**
 * Warm copies of documents. Pages are force-dynamic, which skips Next's data cache,
 * so this map is what stops every click from downloading the whole JSON blob again.
 * Each read checks `updated_at` first. A save clears the copy on this instance, and
 * any other instance reloads as soon as that timestamp changes.
 */
const memory = new Map<string, { updatedAt: string | null; data: unknown }>();

function copy<T>(value: T): T {
  return structuredClone(value);
}

function remember(key: string, updatedAt: string | null, data: unknown) {
  memory.set(key, { updatedAt, data });
  return copy(data);
}

function forget(key: string) {
  memory.delete(key);
}

/** Runs one change at a time per document within this server process. */
function serialize<T>(key: DocumentKey, task: () => Promise<T>): Promise<T> {
  const run = (queues.get(key) ?? Promise.resolve()).catch(() => undefined).then(task);
  const tail = run.catch(() => undefined);
  queues.set(key, tail);
  void tail.then(() => queues.get(key) === tail && queues.delete(key));
  return run;
}

/**
 * Hub content is one large JSON document shared by every hub page. Unchanged
 * reads select only updated_at, avoiding repeated JSON serialization/transfer in
 * Postgres. Keep this separate from mutation reads, which must always be fresh.
 * The caller (getHubContent) clones the returned snapshot before exposing it.
 */
const readHubSnapshot = versionedReader<unknown>(
  async () => {
    const { data, error } = await dataClient()!.from("app_documents").select("updated_at").eq("key", "hub-content").maybeSingle();
    if (error) return readFallback("app_documents", error, null);
    return (data?.updated_at as string | undefined) ?? null;
  },
  async () => {
    const { data, error } = await dataClient()!.from("app_documents").select("data, updated_at").eq("key", "hub-content").maybeSingle();
    if (error) return readFallback("app_documents", error, { version: null, value: null });
    return { version: (data?.updated_at as string | undefined) ?? null, value: (data?.data as unknown) ?? null };
  },
);

/** Read-only hub snapshot; local development still reads its JSON file each time. */
export function readHubDocument(): Promise<unknown> {
  return dataClient() ? readHubSnapshot() : Promise.resolve(readLocal("hub-content"));
}

/** The stored document, or null when none has been saved yet. Throws when Supabase cannot be read, so a failed read is never mistaken for empty content and saved over. */
export async function readDocument(key: DocumentKey): Promise<unknown> {
  const db = dataClient();
  if (!db) return readLocal(key);
  const kept = memory.get(key);
  if (kept) {
    const { data: stamp, error: stampError } = await db.from("app_documents").select("updated_at").eq("key", key).maybeSingle();
    if (stampError) return readFallback("app_documents", stampError, null);
    const updatedAt = (stamp?.updated_at as string | null) ?? null;
    if (updatedAt === kept.updatedAt) return copy(kept.data);
  }
  const { data, error } = await db.from("app_documents").select("data, updated_at").eq("key", key).maybeSingle();
  if (error) return readFallback("app_documents", error, null);
  const updatedAt = (data?.updated_at as string | null) ?? null;
  return remember(key, updatedAt, (data?.data as unknown) ?? null);
}

/**
 * Reads, changes and saves a document. The save only lands when nobody else saved in between;
 * otherwise `change` runs again on the fresh copy, so it must not depend on outside state it mutates.
 * Retries wait a short, random time so saves from different servers stop colliding.
 */
export function updateDocument<T extends object>(key: DocumentKey, change: (current: unknown) => T | Promise<T>): Promise<T> {
  return serialize(key, async () => {
    const db = dataClient();
    if (!db) {
      const next = await change(readLocal(key));
      writeLocal(key, next);
      return next;
    }
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 150 * attempt + Math.random() * 350));
      const { data: row, error } = await db.from("app_documents").select("data, updated_at").eq("key", key).maybeSingle();
      if (error) throw databaseError(`read ${key}`, error);
      const next = await change((row?.data as unknown) ?? null);
      const stamp = new Date().toISOString();
      if (!row) {
        const { error: insertError } = await db.from("app_documents").insert({ key, data: next, updated_at: stamp });
        if (!insertError) {
          forget(key);
          return next;
        }
        if (insertError.code === "23505") continue;
        throw databaseError(`save ${key}`, insertError);
      }
      const { data: saved, error: updateError } = await db
        .from("app_documents")
        .update({ data: next, updated_at: stamp })
        .eq("key", key)
        .eq("updated_at", row.updated_at as string)
        .select("key");
      if (updateError) throw databaseError(`save ${key}`, updateError);
      if (saved?.length) {
        forget(key);
        return next;
      }
    }
    throw new Error(`Could not save ${key}: it kept changing while saving. Try again.`);
  });
}

/** Replaces a document outright. For staging data nobody edits concurrently. */
export async function writeDocument(key: DocumentKey, value: object) {
  const db = dataClient();
  if (!db) return writeLocal(key, value);
  const { error } = await db.from("app_documents").upsert({ key, data: value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw databaseError(`save ${key}`, error);
  forget(key);
}

export async function deleteDocument(key: DocumentKey) {
  const db = dataClient();
  if (db) {
    const { error } = await db.from("app_documents").delete().eq("key", key);
    if (error) throw databaseError(`delete ${key}`, error);
    forget(key);
    return;
  }
  assertLocalAllowed();
  rmSync(localPath(key), { force: true });
}
