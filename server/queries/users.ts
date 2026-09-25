import type { InsertUser, User } from "@db/schema";
import { env } from "../lib/env";
import { getSupabaseService } from "../lib/supabase";

type UserRow = {
  id: number;
  unionId: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  role: "user" | "admin";
  portalRole: User["portalRole"];
  phone: string | null;
  organizationId: number | null;
  demoUserId: number | null;
  language: "EN" | "ZH";
  createdAt: string;
  updatedAt: string;
  lastSignInAt: string;
};

function mapUser(row: UserRow): User {
  return {
    id: Number(row.id),
    unionId: row.unionId,
    name: row.name,
    email: row.email,
    avatar: row.avatar,
    role: row.role ?? "user",
    portalRole: row.portalRole ?? null,
    phone: row.phone,
    organizationId: row.organizationId == null ? null : Number(row.organizationId),
    demoUserId: row.demoUserId == null ? null : Number(row.demoUserId),
    language: row.language ?? "EN",
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    lastSignInAt: new Date(row.lastSignInAt),
  };
}

export function dbErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Database error";
  const msg = err.message || "Database error";
  return msg.length > 280 ? `${msg.slice(0, 280)}…` : msg;
}

export async function findUserByUnionId(unionId: string): Promise<User | undefined> {
  const { data, error } = await getSupabaseService()
    .from("users")
    .select("*")
    .eq("unionId", unionId)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return undefined;
  return mapUser(data as UserRow);
}

function ownerRole(unionId: string | undefined): "admin" | undefined {
  if (unionId && unionId === env.ownerUnionId) return "admin";
  return undefined;
}

/**
 * Sync app user after Supabase Auth via PostgREST (no Drizzle / no DATABASE_URL).
 * The auth trigger often inserts first — this updates, or inserts when missing.
 */
export async function upsertUser(data: InsertUser): Promise<User> {
  if (!data.unionId) {
    throw new Error("unionId is required to sync the user profile.");
  }

  const now = (data.lastSignInAt ?? new Date()).toISOString();
  const role = data.role ?? ownerRole(data.unionId);
  const existing = await findUserByUnionId(data.unionId);

  if (existing) {
    const patch: Record<string, unknown> = {
      lastSignInAt: now,
      updatedAt: new Date().toISOString(),
    };
    if (data.name != null && data.name !== "") patch.name = data.name;
    if (data.email != null) patch.email = data.email;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.avatar !== undefined) patch.avatar = data.avatar;
    if (role) patch.role = role;

    const { data: updated, error } = await getSupabaseService()
      .from("users")
      .update(patch)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return mapUser(updated as UserRow);
  }

  const insertRow: Record<string, unknown> = {
    unionId: data.unionId,
    name: data.name ?? "User",
    email: data.email ?? null,
    phone: data.phone ?? null,
    avatar: data.avatar ?? null,
    lastSignInAt: now,
  };
  if (role) insertRow.role = role;

  const { data: created, error } = await getSupabaseService()
    .from("users")
    .insert(insertRow)
    .select("*")
    .single();

  if (error) {
    // Concurrent insert from auth trigger
    if (/duplicate|unique|conflict/i.test(error.message)) {
      const again = await findUserByUnionId(data.unionId);
      if (again) {
        const { data: updated, error: upErr } = await getSupabaseService()
          .from("users")
          .update({
            name: data.name ?? again.name,
            email: data.email ?? again.email,
            phone: data.phone ?? again.phone,
            lastSignInAt: now,
            updatedAt: new Date().toISOString(),
            ...(role ? { role } : {}),
          })
          .eq("unionId", data.unionId)
          .select("*")
          .single();
        if (upErr) throw new Error(upErr.message);
        return mapUser(updated as UserRow);
      }
    }
    throw new Error(error.message);
  }

  return mapUser(created as UserRow);
}
