"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import { getSession } from "@/lib/session";
import { inviteSupplierById, inviteSuppliersWaiting } from "@/lib/trade/invite";
import { insertTradeSupplier } from "@/lib/trade/store";

async function requireAdmin() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) redirect("/login");
  return user;
}

function refresh() {
  revalidatePath("/admin/trade");
  revalidatePath("/admin/trade/suppliers");
}

export async function createSupplierAction(formData: FormData) {
  await requireAdmin();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  if (!companyName || !email) return { ok: false as const, error: "Company and email are required." };
  try {
    const row = await insertTradeSupplier({ companyName, contactName, email, country });
    refresh();
    return { ok: true as const, id: row.id };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not save the supplier." };
  }
}

export async function inviteSupplierAction(id: string) {
  await requireAdmin();
  try {
    const result = await inviteSupplierById(id);
    refresh();
    return result;
  } catch (error) {
    return {
      supplierId: id,
      email: "",
      ok: false,
      reusedToken: false,
      error: error instanceof Error ? error.message : "Invite failed.",
    };
  }
}

export async function inviteAllWaitingAction() {
  await requireAdmin();
  try {
    const batch = await inviteSuppliersWaiting();
    refresh();
    return batch;
  } catch (error) {
    return {
      results: [],
      truncated: false,
      error: error instanceof Error ? error.message : "Invite failed.",
    };
  }
}
