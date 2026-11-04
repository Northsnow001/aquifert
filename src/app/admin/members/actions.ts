"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import { setMemberAdmin } from "@/lib/members";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) redirect("/login");
  return user;
}

export async function setMemberAdminAction(input: { userId: string; admin: boolean }): Promise<{ ok: true } | { ok: false; message: string }> {
  const actor = await requireAdmin();
  const userId = String(input.userId ?? "").trim();
  if (!userId) return { ok: false, message: "Choose a member." };
  const result = await setMemberAdmin({ userId, admin: Boolean(input.admin), actorId: actor.id });
  if (!result.ok) return result;
  revalidatePath("/admin/members");
  revalidatePath("/admin", "layout");
  revalidatePath("/hub", "layout");
  return { ok: true };
}
