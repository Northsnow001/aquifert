import * as cookie from "cookie";
import { eq } from "drizzle-orm";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./cookies";
import { getSupabaseAnon } from "./supabase";
import { findUserByUnionId, upsertUser } from "../queries/users";
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
 * Verify a Supabase access token, upsert the app `users` row, mint our session cookie.
 */
export async function establishAppSessionFromSupabase(opts: {
  accessToken: string;
  reqHeaders: Headers;
  resHeaders: Headers;
  profile?: SupabaseProfileExtras;
}): Promise<{ user: User; unionId: string }> {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is required for Supabase Auth (Drizzle user sync).");
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

  await upsertUser({
    unionId,
    name,
    email,
    phone,
    lastSignInAt: new Date(),
  });

  const user = await findUserByUnionId(unionId);
  if (!user) {
    throw new Error("Failed to sync user profile.");
  }

  // Keep optional CRM fields on user_credentials (password is managed by Supabase).
  const company =
    opts.profile?.company?.trim() ||
    (typeof meta.company === "string" ? meta.company : undefined);
  const country =
    opts.profile?.country?.trim() ||
    (typeof meta.country === "string" ? meta.country : undefined);

  if (email) {
    const db = getDb();
    const existing = await db
      .select()
      .from(schema.userCredentials)
      .where(eq(schema.userCredentials.userId, user.id))
      .limit(1);

    if (existing[0]) {
      await db
        .update(schema.userCredentials)
        .set({
          email,
          emailVerified: Boolean(sbUser.email_confirmed_at),
          company: company ?? existing[0].company,
          country: country ?? existing[0].country,
          phone: phone ?? existing[0].phone,
        })
        .where(eq(schema.userCredentials.id, existing[0].id));
    } else {
      await db.insert(schema.userCredentials).values({
        userId: user.id,
        email,
        // Sentinel: password is owned by Supabase Auth, not this table.
        passwordHash: "supabase:managed",
        emailVerified: Boolean(sbUser.email_confirmed_at),
        company: company ?? null,
        country: country ?? null,
        phone: phone ?? null,
      });
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
