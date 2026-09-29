import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function isSupabaseBrowserConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Cookie-backed browser client, so server components and the proxy see the same session. */
export function getSupabaseBrowser(): SupabaseClient {
  const client = createBrowserSupabase();
  if (!client) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return client;
}

/**
 * Stateless implicit-flow client for emailing reset links. PKCE links only work
 * in the browser that requested them; implicit links (hash tokens) work on any device.
 */
export function getImplicitAuthClient(): SupabaseClient {
  if (!isSupabaseBrowserConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
