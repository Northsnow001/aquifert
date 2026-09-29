import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Plan, SessionUser } from "@/lib/session-shared";

export type { Plan, SessionUser };

const DEMO_COOKIE = "aq_demo";

export async function getSession(): Promise<SessionUser | null> {
  const supabase = await createClient();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, plan")
      .eq("id", user.id)
      .maybeSingle();
    const plan = (profile?.plan as Plan | undefined) ?? "growth";
    return {
      id: user.id,
      email: user.email ?? "",
      name: profile?.full_name || user.email || "Member",
      plan,
    };
  }

  const jar = await cookies();
  const raw = jar.get(DEMO_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export { DEMO_COOKIE };
