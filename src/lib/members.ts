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

export type InviteMemberInput = {
  email: string;
  name: string;
  company: string;
  country: string;
  phone?: string;
  plan?: Plan;
  admin: boolean;
};

export type InviteMemberResult = { ok: true; email: string } | { ok: false; message: string };

function publicSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://aquifert.com").replace(/\/$/, "");
}

async function findAuthUserByEmail(db: NonNullable<ReturnType<typeof createAdminClient>>, email: string) {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: PAGE });
    if (error) return { user: null as User | null, error: error.message };
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return { user: match, error: null };
    if (data.users.length < PAGE) break;
  }
  return { user: null as User | null, error: null };
}

async function applyInvitedProfile(
  db: NonNullable<ReturnType<typeof createAdminClient>>,
  userId: string,
  input: InviteMemberInput,
) {
  const { error } = await db.auth.admin.updateUserById(userId, {
    app_metadata: { role: input.admin ? "admin" : "" },
    user_metadata: {
      name: input.name,
      full_name: input.name,
      company: input.company,
      country: input.country,
      phone: input.phone || null,
    },
  });
  if (error) return error.message;

  const { error: profileError } = await db.from("profiles").upsert({
    id: userId,
    full_name: input.name,
    plan: input.plan ?? "core",
  });
  if (profileError) return profileError.message;

  try {
    await db.from("users").upsert({ id: userId, role: input.admin ? "admin" : "user" });
  } catch {
    // Optional desk users table; Auth app_metadata is the source of truth.
  }
  return null;
}

/** Create a member (or admin) and send the Supabase invitation so they set a password and sign in. */
export async function inviteMember(input: InviteMemberInput): Promise<InviteMemberResult> {
  const db = createAdminClient();
  if (!db) return { ok: false, message: "Invites need the Supabase service key on the server." };

  const email = input.email.trim().toLowerCase();
  const bans = await listBans().catch(() => []);
  if (bans.some((ban) => ban.email?.toLowerCase() === email)) {
    return { ok: false, message: "This address is banned. Reinstate it before inviting." };
  }

  const redirectTo = `${publicSiteUrl()}/set-password`;
  const { data, error } = await db.auth.admin.inviteUserByEmail(email, {
    data: {
      name: input.name,
      full_name: input.name,
      company: input.company,
      country: input.country,
      phone: input.phone || null,
    },
    redirectTo,
  });

  if (!error && data.user?.id) {
    const applied = await applyInvitedProfile(db, data.user.id, input);
    if (applied) return { ok: false, message: applied };
    return { ok: true, email };
  }

  if (!error || !/already|registered|exists/i.test(error.message)) {
    return { ok: false, message: error?.message || "Supabase did not return the new account." };
  }

  const existing = await findAuthUserByEmail(db, email);
  if (existing.error) return { ok: false, message: existing.error };
  if (!existing.user) return { ok: false, message: error.message };

  const applied = await applyInvitedProfile(db, existing.user.id, input);
  if (applied) return { ok: false, message: applied };
  if (existing.user.last_sign_in_at) {
    return {
      ok: false,
      message: `${email} already has an account. Their profile and ${input.admin ? "admin" : "member"} access were updated. Ask them to sign in, or use Forgot password if they need a new password.`,
    };
  }
  return {
    ok: false,
    message: `${email} already has a pending invitation. Their details were updated. Ask them to open the original email and set a password.`,
  };
}
