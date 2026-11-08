"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import { confirmIndication, issueSupplierPack, sendDeskReply } from "@/lib/desk-hitl/store";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) redirect("/login");
  return user;
}

export async function confirmIndicationAction(input: {
  id: string;
  offerId: string;
  marginPct: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireAdmin();
  const deal = await confirmIndication({
    id: String(input.id ?? "").trim(),
    offerId: String(input.offerId ?? "").trim(),
    marginPct: Number(input.marginPct),
    actor: user.name || user.email,
  });
  if ("error" in deal) return { ok: false, message: deal.error };
  revalidatePath("/admin/desk");
  revalidatePath(`/admin/desk/${deal.id}`);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function sendDeskReplyAction(input: {
  id: string;
  text: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireAdmin();
  const deal = await sendDeskReply({
    id: String(input.id ?? "").trim(),
    text: String(input.text ?? ""),
    actor: user.name || user.email,
  });
  if ("error" in deal) return { ok: false, message: deal.error };
  revalidatePath("/admin/desk");
  revalidatePath(`/admin/desk/${deal.id}`);
  return { ok: true };
}

export async function issueSupplierPackAction(input: {
  id: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireAdmin();
  const deal = await issueSupplierPack({
    id: String(input.id ?? "").trim(),
    actor: user.name || user.email,
  });
  if ("error" in deal) return { ok: false, message: deal.error };
  revalidatePath("/admin/desk");
  revalidatePath(`/admin/desk/${deal.id}`);
  return { ok: true };
}
