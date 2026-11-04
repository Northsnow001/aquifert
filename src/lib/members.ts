import "server-only";
import type { User } from "@supabase/supabase-js";
import { isAdminUser, isAllowlistedAdminEmail } from "@/lib/admin-access";
import { classifyEmail, type EmailClass } from "@/lib/desk-settings/email-rules";
import { listBans } from "@/lib/member-access";
import type { Plan } from "@/lib/session-shared";
import { createAdminClient } from "@/lib/supabase/admin";

export type MemberRow = {
  id: string;
  email: string;
  name: string;
  company: string;
  country: string;
  plan: Plan;
  createdAt: string;
  lastSignIn: string | null;
  verified: boolean;
  banned: boolean;
  admin: boolean;
  /** True when the address is in the code/env allowlist and cannot be demoted from the admin UI. */
  lockedAdmin: boolean;
  kind: EmailClass;
};

export type MemberList = { available: true; members: MemberRow[] } | { available: false; members: []; reason: string };

const PAGE = 1000;
const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Every member account, newest first, each labelled by email type. Read with the service key, on the server only. */
export async function listMembers(): Promise<MemberList> {
  const db = createAdminClient();
  if (!db) return { available: false, members: [], reason: "The member list needs the Supabase service key on the server." };

  const users: User[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: PAGE });
    if (error) return { available: false, members: [], reason: `Supabase did not return the member list: ${error.message}` };
    users.push(...data.users);
    if (data.users.length < PAGE) break;
  }

  const profiles = new Map<string, { full_name: string | null; plan: string | null }>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("profiles")
      .select("id, full_name, plan")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error || !data?.length) break;
    for (const row of data) profiles.set(row.id as string, row as { full_name: string | null; plan: string | null });
    if (data.length < PAGE) break;
  }

  const bans = await listBans().catch(() => []);
  const bannedIds = new Set(bans.map((ban) => ban.userId).filter(Boolean));
  const bannedEmails = new Set(bans.map((ban) => ban.email?.toLowerCase()).filter(Boolean));

  const members = users
    .filter((user) => Boolean(user.email))
    .map((user): MemberRow => {
      const email = user.email!.toLowerCase();
      const meta = user.user_metadata ?? {};
      const profile = profiles.get(user.id);
      const fullName = text(profile?.full_name) || text(meta.name) || [text(meta.first_name), text(meta.last_name)].filter(Boolean).join(" ");
      const admin = isAdminUser({ email, admin: user.app_metadata?.role === "admin" });
      return {
        id: user.id,
        email,
        name: fullName && fullName.toLowerCase() !== email ? fullName : "",
        company: text(meta.company),
        country: text(meta.country),
        plan: (profile?.plan as Plan | null) ?? "core",
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at ?? null,
        verified: Boolean(user.email_confirmed_at),
        banned: bannedIds.has(user.id) || bannedEmails.has(email),
        admin,
        lockedAdmin: isAllowlistedAdminEmail(email),
        kind: classifyEmail(email),
      };
    })
    .sort((a, b) => Number(b.admin) - Number(a.admin) || b.createdAt.localeCompare(a.createdAt));

  return { available: true, members };
}

export type MemberAdminResult = { ok: true } | { ok: false; message: string };

/** Grant or revoke admin by writing Supabase app_metadata.role. Allowlisted emails cannot be demoted. */
export async function setMemberAdmin(input: { userId: string; admin: boolean; actorId: string }): Promise<MemberAdminResult> {
  const db = createAdminClient();
  if (!db) return { ok: false, message: "Admin changes need the Supabase service key on the server." };

  const { data, error } = await db.auth.admin.getUserById(input.userId);
  const target = data.user;
  if (error || !target?.email) return { ok: false, message: error?.message || "That account was not found." };

  const email = target.email.toLowerCase();
  if (isAllowlistedAdminEmail(email) && !input.admin) {
    return { ok: false, message: `${email} is a built-in admin and cannot be removed here.` };
  }
  if (input.userId === input.actorId && !input.admin) {
    return { ok: false, message: "You cannot remove your own admin access." };
  }

  const bans = await listBans().catch(() => []);
  const banned =
    bans.some((ban) => ban.userId === target.id) || bans.some((ban) => ban.email?.toLowerCase() === email);
  if (input.admin && banned) return { ok: false, message: "Reinstate this member before making them an admin." };

  const { error: updateError } = await db.auth.admin.updateUserById(target.id, {
    app_metadata: { role: input.admin ? "admin" : "" },
  });
  if (updateError) return { ok: false, message: updateError.message };

  try {
    await db.from("users").update({ role: input.admin ? "admin" : "user" }).eq("id", target.id);
  } catch {
    // Optional desk users table; Auth app_metadata is the source of truth.
  }

  return { ok: true };
}
