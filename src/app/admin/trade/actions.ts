"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import { getSession } from "@/lib/session";
import { inviteSupplierById, inviteSuppliersWaiting } from "@/lib/trade/invite";
import { insertTradeSupplier, updateTradeSupplier } from "@/lib/trade/store";
import type { TradeSupplierDraft } from "@/lib/trade/types";

async function requireAdmin() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) redirect("/login");
  return user;
}

function refresh() {
  revalidatePath("/admin/trade");
  revalidatePath("/admin/trade/suppliers");
}

function parseDraft(input: TradeSupplierDraft) {
  const companyName = input.companyName?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  if (!companyName) return { ok: false as const, error: "Company name is required." };
  if (!email || !email.includes("@")) return { ok: false as const, error: "A valid email is required so we can send the WeChat invite." };
  return { ok: true as const, draft: { ...input, companyName, email } };
}

export async function createSupplierAction(input: TradeSupplierDraft) {
  await requireAdmin();
  const parsed = parseDraft(input);
  if (!parsed.ok) return parsed;
  try {
    const row = await insertTradeSupplier(parsed.draft);
    let invited = false;
    let inviteError: string | undefined;
    if (input.inviteNow && !row.wechatOpenid) {
      const result = await inviteSupplierById(row.id);
      invited = result.ok;
      inviteError = result.ok ? undefined : result.error;
    }
    refresh();
    return { ok: true as const, id: row.id, invited, inviteError };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not save the supplier." };
  }
}

export async function updateSupplierAction(id: string, input: TradeSupplierDraft) {
  await requireAdmin();
  const parsed = parseDraft(input);
  if (!parsed.ok) return parsed;
  try {
    await updateTradeSupplier(id, parsed.draft);
    refresh();
    return { ok: true as const, id };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not update the supplier." };
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
