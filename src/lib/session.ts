import { cookies } from "next/headers";
import { cache } from "react";
import { isAdminUser } from "@/lib/admin-access";
import { findBan, type BanRecord } from "@/lib/member-access";
import { createClient } from "@/lib/supabase/server";
import type { Plan, SessionUser } from "@/lib/session-shared";

export type { Plan, SessionUser };

const DEMO_COOKIE = "aq_demo";

/** The signed-in member plus any ban on their account. Admins are never treated as banned. */
export async function getSessionAccess(): Promise<{ user: SessionUser | null; ban: BanRecord | null }> {
  const user = await readSession();
  if (!user || isAdminUser(user)) return { user, ban: null };
  return { user, ban: await banFor(user.id, user.email) };
}

const banFor = cache((id: string, email: string) => findBan({ id, email }));

/** The signed-in member, or null when signed out or banned, so every guarded page and action refuses a banned account. */
export async function getSession(): Promise<SessionUser | null> {
  const { user, ban } = await getSessionAccess();
  return ban ? null : user;
}

async function readSession(): Promise<SessionUser | null> {
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
    const plan = (profile?.plan as Plan | undefined) ?? "core";
    const meta = user.user_metadata ?? {};
    const text = (value: unknown) => (typeof value === "string" ? value : undefined);
    return {
      id: user.id,
      email: user.email ?? "",
      name: profile?.full_name || user.email || "Member",
      plan,
      firstName: text(meta.first_name),
      lastName: text(meta.last_name),
      address1: text(meta.address_line_1),
      address2: text(meta.address_line_2),
      city: text(meta.city),
      country: text(meta.country),
      admin: user.app_metadata?.role === "admin",
    };
  }

  const jar = await cookies();
  const raw = jar.get(DEMO_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed.email) return null;
    return { ...parsed, admin: false };
  } catch {
    return null;
  }
}

export { DEMO_COOKIE };
