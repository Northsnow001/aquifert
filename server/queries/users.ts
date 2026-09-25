import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertUser, User } from "@db/schema";
import { getDb } from "./connection";
import { env } from "../lib/env";

export async function findUserByUnionId(unionId: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.unionId, unionId))
    .limit(1);
  return rows.at(0);
}

function ownerRole(unionId: string | undefined): "admin" | undefined {
  if (unionId && unionId === env.ownerUnionId) return "admin";
  return undefined;
}

/** Prefer Postgres/driver cause over Drizzle's "Failed query: …" wrapper. */
export function dbErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Database error";
  const chain: string[] = [];
  let cur: unknown = err;
  for (let i = 0; i < 4 && cur; i++) {
    if (cur instanceof Error) {
      chain.push(cur.message);
      cur = (cur as Error & { cause?: unknown }).cause;
      continue;
    }
    if (typeof cur === "object" && cur && "message" in cur) {
      chain.push(String((cur as { message: unknown }).message));
    }
    break;
  }
  const useful = chain.find((m) => m && !m.startsWith("Failed query:")) ?? chain[0] ?? "Database error";
  return useful.length > 280 ? `${useful.slice(0, 280)}…` : useful;
}

/**
 * Sync app user after Supabase Auth. The auth trigger often inserts first,
 * so this updates an existing row by unionId and only inserts when missing.
 */
export async function upsertUser(data: InsertUser): Promise<User> {
  if (!data.unionId) {
    throw new Error("unionId is required to sync the user profile.");
  }

  const db = getDb();
  const now = data.lastSignInAt ?? new Date();
  const role = data.role ?? ownerRole(data.unionId);

  const existing = await findUserByUnionId(data.unionId);
  if (existing) {
    const patch: Partial<InsertUser> = {
      lastSignInAt: now,
      updatedAt: new Date(),
    };
    if (data.name != null && data.name !== "") patch.name = data.name;
    if (data.email != null) patch.email = data.email;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (role) patch.role = role;

    await db.update(schema.users).set(patch).where(eq(schema.users.id, existing.id));
    const updated = await findUserByUnionId(data.unionId);
    if (!updated) throw new Error("User row disappeared after update.");
    return updated;
  }

  try {
    await db.insert(schema.users).values({
      unionId: data.unionId,
      name: data.name ?? "User",
      email: data.email ?? null,
      phone: data.phone ?? null,
      lastSignInAt: now,
      ...(role ? { role } : {}),
    });
  } catch (err) {
    // Concurrent insert from the auth.users trigger — treat as update.
    const msg = dbErrorMessage(err);
    if (/unique|duplicate|conflict/i.test(msg)) {
      await db
        .update(schema.users)
        .set({
          name: data.name ?? undefined,
          email: data.email ?? undefined,
          phone: data.phone ?? undefined,
          lastSignInAt: now,
          updatedAt: new Date(),
          ...(role ? { role } : {}),
        })
        .where(eq(schema.users.unionId, data.unionId));
    } else {
      throw new Error(msg);
    }
  }

  const created = await findUserByUnionId(data.unionId);
  if (!created) throw new Error("Failed to create user profile.");
  return created;
}
