import * as cookie from "cookie";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./cookies";
import { getSupabaseAnon, getSupabaseService } from "./supabase";
import { dbErrorMessage, upsertUser } from "../queries/users";
import { signSessionToken } from "../kimi/session";
import { env } from "./env";
import type { User } from "@db/schema";

export function supabaseUnionId(supabaseUserId: string): string {
  return `supabase:${supabaseUserId}`;
}

export type SupabaseProfileExtras = {
  name?: string;
  company?: string;
  country?: string;
  phone?: string;
};

/**
 * Verify Supabase access token, sync public.users via Supabase API, set app cookie.
 * Does not use Drizzle or DATABASE_URL (avoids db.*.supabase.co DNS on Vercel).
 */
export async function establishAppSessionFromSupabase(opts: {
  accessToken: string;
  reqHeaders: Headers;
  resHeaders: Headers;
  profile?: SupabaseProfileExtras;
}): Promise<{ user: User; unionId: string }> {
  if (!env.appSecret) {
    throw new Error("APP_SECRET is required to create an app session cookie.");
  }
  if (!env.supabaseUrl || !(env.supabaseServiceRoleKey || env.supabaseAnonKey)) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for session sync.");
  }

  const supabase = getSupabaseAnon();
  const { data, error } = await supabase.auth.getUser(opts.accessToken);
  if (error || !data.user) {
    throw new Error(error?.message || "Invalid or expired Supabase session.");
  }

  const sbUser = data.user;
  const unionId = supabaseUnionId(sbUser.id);
  const meta = (sbUser.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    opts.profile?.name?.trim() ||
    (typeof meta.name === "string" ? meta.name : null) ||
    (typeof meta.full_name === "string" ? meta.full_name : null) ||
    sbUser.email?.split("@")[0] ||
    "User";
  const email = sbUser.email?.toLowerCase() ?? null;
  const phone =
    opts.profile?.phone?.trim() ||
    (typeof meta.phone === "string" ? meta.phone : null) ||
    null;

  let user: User;
  try {
    user = await upsertUser({
      unionId,
      name,
      email,
      phone,
      lastSignInAt: new Date(),
    });
  } catch (err) {
    throw new Error(dbErrorMessage(err));
  }

  const company =
    opts.profile?.company?.trim() ||
    (typeof meta.company === "string" ? meta.company : undefined);
  const country =
    opts.profile?.country?.trim() ||
    (typeof meta.country === "string" ? meta.country : undefined);

  if (email) {
    try {
      await syncUserCredentials({
        userId: user.id,
        email,
        emailVerified: Boolean(sbUser.email_confirmed_at),
        company: company ?? null,
        country: country ?? null,
        phone: phone ?? null,
      });
    } catch (err) {
      console.error("[auth] user_credentials sync:", dbErrorMessage(err));
    }
  }

  const token = await signSessionToken({
    unionId,
    clientId: env.appId || "aquifert",
  });
  const cookieOpts = getSessionCookieOptions(opts.reqHeaders);
  opts.resHeaders.append(
    "set-cookie",
    cookie.serialize(Session.cookieName, token, {
      httpOnly: cookieOpts.httpOnly,
      path: cookieOpts.path,
      sameSite: cookieOpts.sameSite?.toLowerCase() as "lax" | "none",
      secure: cookieOpts.secure,
      maxAge: Session.maxAgeMs / 1000,
    }),
  );

  return { user, unionId };
}

async function syncUserCredentials(opts: {
  userId: number;
  email: string;
  emailVerified: boolean;
  company: string | null;
  country: string | null;
  phone: string | null;
}) {
  const db = getSupabaseService();

  const { data: byUser } = await db
    .from("user_credentials")
    .select("*")
    .eq("userId", opts.userId)
    .limit(1)
    .maybeSingle();

  const payload = {
    email: opts.email,
    emailVerified: opts.emailVerified,
    company: opts.company,
    country: opts.country,
    phone: opts.phone,
    passwordHash: "supabase:managed",
  };

  if (byUser?.id) {
    const { error } = await db
      .from("user_credentials")
      .update({
        ...payload,
        company: opts.company ?? byUser.company,
        country: opts.country ?? byUser.country,
        phone: opts.phone ?? byUser.phone,
      })
      .eq("id", byUser.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { data: byEmail } = await db
    .from("user_credentials")
    .select("*")
    .eq("email", opts.email)
    .limit(1)
    .maybeSingle();

  if (byEmail?.id) {
    const { error } = await db
      .from("user_credentials")
      .update({
        userId: opts.userId,
        ...payload,
        company: opts.company ?? byEmail.company,
        country: opts.country ?? byEmail.country,
        phone: opts.phone ?? byEmail.phone,
      })
      .eq("id", byEmail.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await db.from("user_credentials").insert({
    userId: opts.userId,
    ...payload,
  });
  if (error) throw new Error(error.message);
}
