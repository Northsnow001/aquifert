"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import { getSession } from "@/lib/session";
import { assignSupplierMail } from "@/lib/trade/inbound-mail";

async function requireAdmin() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) redirect("/login");
  return user;
}

export async function assignMailAction(formData: FormData) {
  const user = await requireAdmin();
  const result = await assignSupplierMail(String(formData.get("id") ?? ""), String(formData.get("dealId") ?? ""), user.name || user.email);
  revalidatePath("/admin/desk/matching");
  if ("error" in result) redirect(`/admin/desk/matching?error=${encodeURIComponent(result.error)}`);
  redirect("/admin/desk/matching");
}
