import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let anonClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

/** True when Supabase Auth env is present (URL + anon key). */
export function isSupabaseAuthConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

/** Shared anon client for verifying user access tokens on the server. */
export function getSupabaseAnon(): SupabaseClient {
  if (!isSupabaseAuthConfigured()) {
    throw new Error("Supabase Auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  if (!anonClient) {
    anonClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return anonClient;
}

/**
 * Service-role client for server-side table access over HTTPS (PostgREST).
 * Avoids DATABASE_URL / direct Postgres DNS on Vercel.
 */
export function getSupabaseService(): SupabaseClient {
  if (!env.supabaseUrl) {
    throw new Error("SUPABASE_URL is required.");
  }
  const key = env.supabaseServiceRoleKey || env.supabaseAnonKey;
  if (!key) {
    throw new Error("Set SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) for server data access.");
  }
  if (!serviceClient) {
    serviceClient = createClient(env.supabaseUrl, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return serviceClient;
}
