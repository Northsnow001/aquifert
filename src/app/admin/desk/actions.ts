"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import type { PiEditorValues } from "@/lib/desk-hitl/pi";
import {
  confirmIndication,
  getDeskDeal,
  issueSupplierPack,
  markPiSent,
  markSalesContractSent,
  savePiDraft,
  sendDeskReply,
} from "@/lib/desk-hitl/store";
import { salesContractFromPi } from "@/lib/firm-order/from-deal";
import { getDeskSettings } from "@/lib/desk-settings/store";
import { buildFirmOrderPdf, firmOrderFilename } from "@/lib/firm-order/pdf";
import { sendEmail } from "@/lib/mailer";
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

export async function savePiDraftAction(input: {
  id: string;
  values: PiEditorValues;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireAdmin();
  const deal = await savePiDraft(String(input.id ?? "").trim(), input.values, user.name || user.email);
  if ("error" in deal) return { ok: false, message: deal.error };
  revalidatePath("/admin/desk");
  revalidatePath(`/admin/desk/${deal.id}`);
  return { ok: true };
}

export async function sendPiToBuyerAction(input: {
  id: string;
  values: PiEditorValues;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireAdmin();
  const id = String(input.id ?? "").trim();
  const saved = await savePiDraft(id, input.values, user.name || user.email);
  if ("error" in saved) return { ok: false, message: saved.error };
  const order = saved.pi?.order;
  if (!order) return { ok: false, message: "No proforma on this deal yet." };
  const to = order.buyer.email?.trim() || "";
  if (!to.includes("@")) return { ok: false, message: "Set a buyer email on the proforma before sending." };

  const bytes = await buildFirmOrderPdf(order);
  const filename = firmOrderFilename(order);
  const settings = await getDeskSettings();
  const mailed = await sendEmail(
    {
      kind: "pi-buyer",
      to,
      subject: `Aquifert proforma invoice ${order.reference} — ${order.product}`,
      text: `Dear ${order.buyer.name || "Buyer"},\n\nPlease find attached our proforma invoice for ${order.quantity_mt} MT ${order.product} at USD ${order.unit_price_usd} / MT, ${order.incoterm}.\n\nBank details are on the invoice.\n\nKind regards,\nAquifert Limited`,
      html: `<p>Dear ${order.buyer.name || "Buyer"},</p><p>Please find attached our proforma invoice for ${order.quantity_mt} MT ${order.product} at USD ${order.unit_price_usd} / MT, ${order.incoterm}.</p><p>Bank details are on the invoice.</p><p>Kind regards,<br/>Aquifert Limited</p>`,
      attachments: [{ filename, content: bytes, contentType: "application/pdf" }],
    },
    settings.delivery,
  );
  if (mailed.status === "failed") return { ok: false, message: mailed.error || "Email failed." };
  if (mailed.status === "held") {
    return { ok: false, message: "Email is not connected (SMTP or Resend). The proforma was saved but not sent." };
  }
  const sent = await markPiSent(id, to, user.name || user.email);
  if ("error" in sent) return { ok: false, message: sent.error };
  revalidatePath("/admin/desk");
  revalidatePath(`/admin/desk/${id}`);
  return { ok: true };
}

export async function sendSalesContractAndSupplierPackAction(input: {
  id: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireAdmin();
  const id = String(input.id ?? "").trim();
  const deal = await getDeskDeal(id);
  if (!deal) return { ok: false, message: "That shortlist was not found." };
  if (deal.pi?.status !== "sent") return { ok: false, message: "Email the proforma first." };
  const order = salesContractFromPi(deal.pi.order);
  const to = order.buyer.email?.trim() || "";
  if (!to.includes("@")) return { ok: false, message: "The proforma has no buyer email." };

  const bytes = await buildFirmOrderPdf(order);
  const filename = firmOrderFilename(order);
  const settings = await getDeskSettings();
  const mailed = await sendEmail(
    {
      kind: "sales-contract-buyer",
      to,
      subject: `Aquifert sales contract ${order.reference} — ${order.product}`,
      text: `Dear ${order.buyer.name || "Buyer"},\n\nPlease find attached our sales contract for ${order.quantity_mt} MT ${order.product} at USD ${order.unit_price_usd} / MT, ${order.incoterm}.\n\nKind regards,\nAquifert Limited`,
      html: `<p>Dear ${order.buyer.name || "Buyer"},</p><p>Please find attached our sales contract for ${order.quantity_mt} MT ${order.product} at USD ${order.unit_price_usd} / MT, ${order.incoterm}.</p><p>Kind regards,<br/>Aquifert Limited</p>`,
      attachments: [{ filename, content: bytes, contentType: "application/pdf" }],
    },
    settings.delivery,
  );
  if (mailed.status === "failed") return { ok: false, message: mailed.error || "Sales contract email failed." };
  if (mailed.status === "held") {
    return { ok: false, message: "Email is not connected (SMTP or Resend). Sales contract was not sent." };
  }
  const marked = await markSalesContractSent(id, to, user.name || user.email);
  if ("error" in marked) return { ok: false, message: marked.error };

  const pack = await issueSupplierPack({ id, actor: user.name || user.email });
  if ("error" in pack) {
    revalidatePath("/admin/desk");
    revalidatePath(`/admin/desk/${id}`);
    return { ok: false, message: `Sales contract emailed, but supplier pack failed: ${pack.error}` };
  }
  revalidatePath("/admin/desk");
  revalidatePath(`/admin/desk/${id}`);
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
