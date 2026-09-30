import "server-only";

import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { assertLocalAllowed, databaseError, dataClient, readFallback } from "@/lib/data/db";
import type { DocumentKey } from "@/lib/data/tables";

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

/** Runs one change at a time per document within this server process. */
function serialize<T>(key: DocumentKey, task: () => Promise<T>): Promise<T> {
  const run = (queues.get(key) ?? Promise.resolve()).catch(() => undefined).then(task);
  const tail = run.catch(() => undefined);
  queues.set(key, tail);
  void tail.then(() => queues.get(key) === tail && queues.delete(key));
  return run;
}

/** The stored document, or null when none has been saved yet. Throws when Supabase cannot be read, so a failed read is never mistaken for empty content and saved over. */
export async function readDocument(key: DocumentKey): Promise<unknown> {
  const db = dataClient();
  if (!db) return readLocal(key);
  const { data, error } = await db.from("app_documents").select("data").eq("key", key).maybeSingle();
  if (error) return readFallback("app_documents", error, null);
  return (data?.data as unknown) ?? null;
}

/**
 * Reads, changes and saves a document. The save only lands when nobody else saved in between;
 * otherwise `change` runs again on the fresh copy, so it must not depend on outside state it mutates.
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
      const { data: row, error } = await db.from("app_documents").select("data, updated_at").eq("key", key).maybeSingle();
      if (error) throw databaseError(`read ${key}`, error);
      const next = await change((row?.data as unknown) ?? null);
      const stamp = new Date().toISOString();
      if (!row) {
        const { error: insertError } = await db.from("app_documents").insert({ key, data: next, updated_at: stamp });
        if (!insertError) return next;
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
      if (saved?.length) return next;
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
}

export async function deleteDocument(key: DocumentKey) {
  const db = dataClient();
  if (db) {
    const { error } = await db.from("app_documents").delete().eq("key", key);
    if (error) throw databaseError(`delete ${key}`, error);
    return;
  }
  assertLocalAllowed();
  rmSync(localPath(key), { force: true });
}
