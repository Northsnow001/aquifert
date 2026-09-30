"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import { getSession } from "@/lib/session";
import { ZERO_STATUSES, deleteZeroRegistration, updateZeroRegistration, type ZeroStatus } from "@/lib/zero-interest";

async function requireAdmin() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) redirect("/login");
  return user;
}

type Result = { ok: true; updatedAt: string | null } | { ok: false; message: string };

export async function saveZeroRegistration(id: string, input: { status: ZeroStatus; adminNote: string }): Promise<Result> {
  await requireAdmin();
  if (!ZERO_STATUSES.includes(input.status)) return { ok: false, message: "Choose a status." };
  const row = await updateZeroRegistration(id, { status: input.status, adminNote: String(input.adminNote ?? "").trim().slice(0, 2000) });
  if (!row) return { ok: false, message: "That registration no longer exists." };
  revalidatePath("/admin", "layout");
  return { ok: true, updatedAt: row.updatedAt };
}

export async function removeZeroRegistration(id: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  const ok = await deleteZeroRegistration(id);
  revalidatePath("/admin", "layout");
  return { ok };
}
