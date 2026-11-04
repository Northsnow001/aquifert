"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import { EMAIL_PATTERN } from "@/lib/desk-settings/email-rules";
import { inviteMember, setMemberAdmin } from "@/lib/members";
import type { Plan } from "@/lib/session-shared";
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

const PLANS: Plan[] = ["core", "growth", "enterprise"];

export async function inviteMemberAction(input: {
  email: string;
  name: string;
  company: string;
  country: string;
  phone?: string;
  plan?: string;
  admin: boolean;
}): Promise<{ ok: true; email: string } | { ok: false; message: string }> {
  await requireAdmin();
  const email = String(input.email ?? "").trim().toLowerCase();
  const name = String(input.name ?? "").trim();
  const company = String(input.company ?? "").trim();
  const country = String(input.country ?? "").trim();
  const phone = String(input.phone ?? "").trim();
  const plan = PLANS.includes(input.plan as Plan) ? (input.plan as Plan) : "core";

  if (!EMAIL_PATTERN.test(email)) return { ok: false, message: "Enter a valid email address." };
  if (name.length < 2) return { ok: false, message: "Enter the person's full name." };
  if (!company) return { ok: false, message: "Enter their company." };
  if (!country) return { ok: false, message: "Enter their country." };

  const result = await inviteMember({
    email,
    name,
    company,
    country,
    phone: phone || undefined,
    plan,
    admin: Boolean(input.admin),
  });
  if (!result.ok) return result;
  revalidatePath("/admin/members");
  revalidatePath("/admin", "layout");
  return result;
}
