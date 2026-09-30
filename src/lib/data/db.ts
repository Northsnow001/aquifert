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

export function dataClient(): SupabaseClient | null {
  if (client === undefined) client = process.env.AQUIFERT_DATA_BACKEND === "local" ? null : createAdminClient();
  return client;
}

/** Hosted deployments have a read-only disk, so they must reach Supabase. */
export function assertLocalAllowed() {
  if (process.env.VERCEL) {
    throw new Error("Supabase is not configured on this deployment. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
}

export const isMissingTable = (error: { message: string; code?: string }) =>
  error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache|relation/i.test(error.message);

export function databaseError(action: string, error: { message: string; code?: string }) {
  return new Error(
    isMissingTable(error) ? `Could not ${action}: the table is missing. Run the SQL files in supabase/migrations (003 onwards) in the Supabase SQL editor.` : `Could not ${action}: ${error.message}`,
  );
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
