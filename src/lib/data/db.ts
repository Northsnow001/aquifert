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

export function databaseError(action: string, error: { message: string }) {
  const missing = /does not exist|schema cache|relation/i.test(error.message);
  return new Error(missing ? `Could not ${action}: the table is missing. Run supabase/migrations/003_app_data.sql in the Supabase SQL editor.` : `Could not ${action}: ${error.message}`);
}
