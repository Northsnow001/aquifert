import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

let client: SupabaseClient | null | undefined;

/**
 * Where admin data lives. Supabase whenever the service-role key is set; local JSON files
 * under `data/` otherwise, which only works on a machine with a writable disk.
 */
export function dataBackend(): "supabase" | "local" {
  return dataClient() ? "supabase" : "local";
}

/** Shown when a screen cannot reach the records store. The technical detail stays in the server log. */
export const DATA_OFFLINE = "The records store is not connected. Wait a moment and try again. If it keeps happening, ask the desk to check the data connection.";

export function dataClient(): SupabaseClient | null {
  if (client === undefined) client = process.env.AQUIFERT_DATA_BACKEND === "local" ? null : createAdminClient();
  return client;
}

/** Hosted deployments have a read-only disk, so they must reach Supabase. */
export function assertLocalAllowed() {
  if (process.env.VERCEL) {
    console.error("[data] Supabase is not configured on this deployment.");
    throw new Error(DATA_OFFLINE);
  }
}

export const isMissingTable = (error: { message: string; code?: string }) =>
  error.code === "42P01" ||
  error.code === "PGRST205" ||
  /schema cache/i.test(error.message) ||
  /relation .+ does not exist/i.test(error.message) ||
  /could not find the table/i.test(error.message);

export function databaseError(action: string, error: { message: string; code?: string }) {
  console.error(`[data] ${action}`, error.code ?? "", error.message);
  if (isMissingTable(error)) {
    return new Error("A records list is not ready yet. Ask the desk to finish the database setup, then try again.");
  }
  if (/timeout|canceling statement|statement_timeout|57014/i.test(`${error.code ?? ""} ${error.message}`)) {
    return new Error("This is taking too long to load. Go back, wait a moment, and open it again.");
  }
  return new Error("The records could not be read just now. Wait a moment and try again.");
}

const warned = new Set<string>();

/**
 * Reads treat a table that does not exist yet as empty, so pages keep working with built-in
 * defaults until the migration runs. Writes to it still fail, so nothing is saved over real data.
 */
export function readFallback<T>(table: string, error: { message: string; code?: string }, fallback: T): T {
  if (!isMissingTable(error)) throw databaseError(`read ${table}`, error);
  if (!warned.has(table)) {
    warned.add(table);
    console.error(`[data] ${table} is missing. Run the SQL files in supabase/migrations in the Supabase SQL editor.`);
  }
  return fallback;
}
