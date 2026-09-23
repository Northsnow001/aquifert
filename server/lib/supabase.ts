import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let anonClient: SupabaseClient | null = null;

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
