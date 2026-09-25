import { TRPCError } from "@trpc/server";
import { getSupabaseService } from "./lib/supabase";
import { findUserByUnionId } from "./queries/users";
import * as s from "@db/schema";
import { STAFF_ROLES, type PortalRole } from "@contracts/constants";
import { nanoid } from "nanoid";
import { isDemoMode, resolveDemoUser } from "./demo/mode";

type CtxUser = s.User;

/** Resolve the effective user: if the signed-in user picked a demo persona,
 *  all data operations act as that persona. */
export async function effUser(user: CtxUser): Promise<s.User> {
  if (isDemoMode()) {
    return resolveDemoUser(user.unionId) ?? user;
  }
  if (user.demoUserId) {
    try {
      const { data } = await getSupabaseService()
        .from("users")
        .select("*")
        .eq("id", user.demoUserId)
        .maybeSingle();
      if (data?.unionId) {
        const demo = await findUserByUnionId(String(data.unionId));
        if (demo) return demo;
      }
    } catch {
      // Fall through to signed-in user
    }
  }
  return user;
}

export function assertRole(user: s.User, roles: PortalRole[]) {
  if (!user.portalRole || !roles.includes(user.portalRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Requires one of: ${roles.join(", ")}`,
    });
  }
}

export function assertStaff(user: s.User) {
  assertRole(user, STAFF_ROLES);
}

export function assertFinance(user: s.User) {
  assertRole(user, ["ADMIN", "FINANCE"]);
}

export function assertBuyer(user: s.User) {
  assertRole(user, ["BUYER"]);
}

export function assertSupplier(user: s.User) {
  assertRole(user, ["SUPPLIER"]);
}

/** Whether the caller may see margin/cost breakdowns */
export function canSeeMargins(user: s.User) {
  return user.portalRole === "ADMIN" || user.portalRole === "FINANCE" || user.portalRole === "OPERATIONS";
}

export async function notify(
  userId: number,
  type: string,
  title: string,
  message: string,
  actionUrl?: string,
) {
  if (isDemoMode()) return;
  try {
    await getSupabaseService().from("notifications").insert({
      userId,
      type,
      title,
      message,
      actionUrl,
    });
  } catch {
    // non-fatal
  }
}

export async function logActivity(
  actor: string,
  action: string,
  entity?: string,
  entityId?: string,
  userId?: number,
) {
  if (isDemoMode()) return;
  try {
    await getSupabaseService().from("activities").insert({
      actor,
      action,
      entity,
      entityId,
      userId,
    });
  } catch {
    // non-fatal
  }
}

export function genNumber(prefix: string) {
  return `${prefix}-${nanoid(6).toUpperCase().replace(/[-_]/g, "X")}`;
}

export const fmtActor = (u: s.User) => u.name ?? u.email ?? "User";
