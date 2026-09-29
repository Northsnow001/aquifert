import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for public (signed-out) writes such as marketing leads.
 * Bypasses RLS, so it must only ever run on the server.
 */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Best-effort in-app alert to every admin in public.users (the desk's notification bell). */
export async function notifyAdmins(
  db: SupabaseClient,
  type: string,
  title: string,
  message: string,
): Promise<void> {
  try {
    const { data: admins } = await db.from("users").select("id").eq("role", "admin");
    if (!admins?.length) return;
    await db
      .from("notifications")
      .insert(admins.map((a) => ({ userId: a.id, type, title, message })));
  } catch {
    // Alerts are secondary; the enquiry itself is already saved.
  }
}
