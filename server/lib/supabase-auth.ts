import * as cookie from "cookie";
import { eq } from "drizzle-orm";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./cookies";
import { getSupabaseAnon } from "./supabase";
import { dbErrorMessage, findUserByUnionId, upsertUser } from "../queries/users";
import { signSessionToken } from "../kimi/session";
import { getDb } from "../queries/connection";
import * as schema from "@db/schema";
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
 * Verify a Supabase access token, sync the app `users` row, mint our session cookie.
 * Relies on the auth trigger for the first insert when possible; updates safely either way.
 */
export async function establishAppSessionFromSupabase(opts: {
  accessToken: string;
  reqHeaders: Headers;
  resHeaders: Headers;
  profile?: SupabaseProfileExtras;
}): Promise<{ user: User; unionId: string }> {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is required for Supabase Auth (user sync).");
  }
  if (!env.appSecret) {
    throw new Error("APP_SECRET is required to create an app session cookie.");
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
      // Credentials are optional for portal entry; session cookie is enough.
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
  const db = getDb();
  const byUser = await db
    .select()
    .from(schema.userCredentials)
    .where(eq(schema.userCredentials.userId, opts.userId))
    .limit(1);

  if (byUser[0]) {
    await db
      .update(schema.userCredentials)
      .set({
        email: opts.email,
        emailVerified: opts.emailVerified,
        company: opts.company ?? byUser[0].company,
        country: opts.country ?? byUser[0].country,
        phone: opts.phone ?? byUser[0].phone,
        passwordHash: "supabase:managed",
      })
      .where(eq(schema.userCredentials.id, byUser[0].id));
    return;
  }

  const byEmail = await db
    .select()
    .from(schema.userCredentials)
    .where(eq(schema.userCredentials.email, opts.email))
    .limit(1);

  if (byEmail[0]) {
    await db
      .update(schema.userCredentials)
      .set({
        userId: opts.userId,
        emailVerified: opts.emailVerified,
        company: opts.company ?? byEmail[0].company,
        country: opts.country ?? byEmail[0].country,
        phone: opts.phone ?? byEmail[0].phone,
        passwordHash: "supabase:managed",
      })
      .where(eq(schema.userCredentials.id, byEmail[0].id));
    return;
  }

  await db.insert(schema.userCredentials).values({
    userId: opts.userId,
    email: opts.email,
    passwordHash: "supabase:managed",
    emailVerified: opts.emailVerified,
    company: opts.company,
    country: opts.country,
    phone: opts.phone,
  });
}
