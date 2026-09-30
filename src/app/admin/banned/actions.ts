"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import { EMAIL_PATTERN } from "@/lib/desk-settings/email-rules";
import { banMember, findBan, reinstateMember } from "@/lib/member-access";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) redirect("/login");
  return user;
}

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/hub", "layout");
}

type Result = { ok: true } | { ok: false; message: string };

export async function banMemberAction(input: { email: string; name: string; userId?: string | null; reason: string }): Promise<Result> {
  const admin = await requireAdmin();
  const email = String(input.email ?? "").trim().toLowerCase().slice(0, 320);
  const reason = String(input.reason ?? "").trim().slice(0, 1000);
  if (!EMAIL_PATTERN.test(email)) return { ok: false, message: "Enter the member's full email address." };
  if (isAdminUser({ email })) return { ok: false, message: "Admin accounts cannot be banned. Remove the address from the admin list first." };
  if (reason.length < 3) return { ok: false, message: "Add a short reason so the rest of the team knows why." };
  if (await findBan({ email })) return { ok: false, message: `${email} is already banned.` };
  await banMember({ email, name: String(input.name ?? "").slice(0, 120), userId: input.userId ?? null, reason }, admin.email);
  refresh();
  return { ok: true };
}

export async function reinstateMemberAction(email: string, note: string): Promise<Result> {
  const admin = await requireAdmin();
  const record = await reinstateMember(String(email ?? ""), admin.email, String(note ?? "").slice(0, 1000));
  if (!record) return { ok: false, message: "That member is not banned." };
  refresh();
  return { ok: true };
}
