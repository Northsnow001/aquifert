"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import type { PiEditorValues } from "@/lib/desk-hitl/pi";
import {
  addFoAttachment,
  closeDeal,
  confirmIndication,
  confirmSupplierFo,
  issueSupplierPack,
  markFirmOfferSent,
  markPiSent,
  markSalesContractSent,
  rejectFirmOffer,
  removeFoAttachment,
  saveFirmOfferDraft,
  savePiDraft,
  saveSalesContractDraft,
  sendDeskReply,
} from "@/lib/desk-hitl/store";
import { parseFoUpload, readFoAttachmentFile } from "@/lib/desk-hitl/fo-pack";
import { FO_ATTACHMENT_LABEL } from "@/lib/desk-hitl/types";
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

function firmOfferWhatsApp(order: { reference: string; product: string; quantity_mt: number; unit_price_usd: number | null; incoterm: string }) {
  return `Aquifert firm offer ${order.reference}: ${order.quantity_mt} MT ${order.product} at USD ${order.unit_price_usd} / MT, ${order.incoterm}. The PDF is in your email. Reply YES to accept, NO if you want different terms, or ask us to CLOSE this request.`;
}

export async function saveFirmOfferDraftAction(input: {
  id: string;
  values: PiEditorValues;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireAdmin();
  const deal = await saveFirmOfferDraft(String(input.id ?? "").trim(), input.values, user.name || user.email);
  if ("error" in deal) return { ok: false, message: deal.error };
  revalidatePath("/admin/desk");
  revalidatePath(`/admin/desk/${deal.id}`);
  return { ok: true };
}

export async function sendFirmOfferToBuyerAction(input: {
  id: string;
  values: PiEditorValues;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireAdmin();
  const id = String(input.id ?? "").trim();
  const saved = await saveFirmOfferDraft(id, input.values, user.name || user.email);
  if ("error" in saved) return { ok: false, message: saved.error };
  const order = saved.firmOffer?.order;
  if (!order) return { ok: false, message: "No firm offer on this deal yet." };
  const to = order.buyer.email?.trim() || "";
  if (!to.includes("@")) return { ok: false, message: "Set a buyer email on the firm offer before sending." };
  if (!saved.foPack?.supplierConfirmedAt) {
    return { ok: false, message: "Confirm the mill signed off this FO (WeChat) before sending the pack to the buyer." };
  }

  const bytes = await buildFirmOrderPdf(order);
  const filename = firmOrderFilename(order);
  const extras = [];
  for (const file of saved.foPack.attachments) {
    const content = await readFoAttachmentFile(file);
    if (!content) return { ok: false, message: `Could not read ${file.filename}. Upload it again.` };
    extras.push({ filename: `${FO_ATTACHMENT_LABEL[file.kind]}-${file.filename}`, content, contentType: file.contentType });
  }
  const settings = await getDeskSettings();
  const whatsappBody = firmOfferWhatsApp(order);
  const extraNote = extras.length
    ? `\n\nAlso attached: ${extras.map((file) => file.filename).join(", ")}.`
    : "";
  const mailed = await sendEmail(
    {
      kind: "firm-offer-buyer",
      to,
      subject: `Aquifert firm offer ${order.reference} — ${order.product}`,
      text: `Dear ${order.buyer.name || "Buyer"},\n\nPlease find attached our firm offer for ${order.quantity_mt} MT ${order.product} at USD ${order.unit_price_usd} / MT, ${order.incoterm}.${extraNote}\n\nReply YES to this email (or on WhatsApp) to accept. Reply if you want different terms. Ask us to close the request if you are stopping.\n\nKind regards,\nAquifert Limited`,
      html: `<p>Dear ${order.buyer.name || "Buyer"},</p><p>Please find attached our firm offer for ${order.quantity_mt} MT ${order.product} at USD ${order.unit_price_usd} / MT, ${order.incoterm}.</p>${extras.length ? `<p>Also attached: ${extras.map((file) => file.filename).join(", ")}.</p>` : ""}<p>Reply <strong>YES</strong> to this email (or on WhatsApp) to accept. Reply if you want different terms. Ask us to close the request if you are stopping.</p><p>Kind regards,<br/>Aquifert Limited</p>`,
      attachments: [{ filename, content: bytes, contentType: "application/pdf" }, ...extras],
    },
    settings.delivery,
  );
  if (mailed.status === "failed") return { ok: false, message: mailed.error || "Email failed." };
  if (mailed.status === "held") {
    return { ok: false, message: "Email is not connected (SMTP or Resend). The firm offer was saved but not sent." };
  }
  const sent = await markFirmOfferSent(id, to, user.name || user.email, whatsappBody);
  if ("error" in sent) return { ok: false, message: sent.error };

  const hook = process.env.DESK_FO_SENT_WEBHOOK_URL?.trim();
  if (hook?.startsWith("https://") || hook?.startsWith("http://localhost")) {
    try {
      await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "firm_offer_sent",
          dealId: sent.id,
          requestId: sent.requestId,
          buyerPhone: sent.buyerPhone,
          whatsappBody,
        }),
        signal: AbortSignal.timeout(12_000),
      });
    } catch {
      /* WhatsApp via n8n is best-effort; email already went. */
    }
  }

  revalidatePath("/admin/desk");
  revalidatePath(`/admin/desk/${id}`);
  return { ok: true };
}

export async function uploadFoAttachmentAction(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const kind = String(formData.get("kind") ?? "").trim();
  const file = formData.get("file");
  if (!id) return { ok: false, message: "Missing deal." };
  if (!(file instanceof File)) return { ok: false, message: "Choose a file." };
  const parsed = parseFoUpload(file, kind);
  if ("error" in parsed) return { ok: false, message: parsed.error };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const deal = await addFoAttachment(
    id,
    {
      id: `foa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      kind: parsed.kind,
      filename: parsed.filename,
      contentType: parsed.contentType,
      uploadedAt: new Date().toISOString(),
    },
    bytes,
    user.name || user.email,
  );
  if ("error" in deal) return { ok: false, message: deal.error };
  revalidatePath("/admin/desk");
  revalidatePath(`/admin/desk/${deal.id}`);
  return { ok: true };
}

export async function removeFoAttachmentAction(input: {
  id: string;
  attachmentId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireAdmin();
  const deal = await removeFoAttachment(String(input.id ?? "").trim(), String(input.attachmentId ?? "").trim(), user.name || user.email);
  if ("error" in deal) return { ok: false, message: deal.error };
  revalidatePath("/admin/desk");
  revalidatePath(`/admin/desk/${deal.id}`);
  return { ok: true };
}

export async function confirmSupplierFoAction(input: {
  id: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireAdmin();
  const deal = await confirmSupplierFo(String(input.id ?? "").trim(), user.name || user.email);
  if ("error" in deal) return { ok: false, message: deal.error };
  revalidatePath("/admin/desk");
  revalidatePath(`/admin/desk/${deal.id}`);
  return { ok: true };
}

export async function rejectFirmOfferAction(input: {
  id: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireAdmin();
  const deal = await rejectFirmOffer(String(input.id ?? "").trim(), user.name || user.email);
  if ("error" in deal) return { ok: false, message: deal.error };
  revalidatePath("/admin/desk");
  revalidatePath(`/admin/desk/${deal.id}`);
  return { ok: true };
}

export async function closeDealAction(input: {
  id: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireAdmin();
  const deal = await closeDeal(String(input.id ?? "").trim(), user.name || user.email);
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

export async function saveSalesContractDraftAction(input: {
  id: string;
  values: PiEditorValues;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireAdmin();
  const deal = await saveSalesContractDraft(String(input.id ?? "").trim(), input.values, user.name || user.email);
  if ("error" in deal) return { ok: false, message: deal.error };
  revalidatePath("/admin/desk");
  revalidatePath(`/admin/desk/${deal.id}`);
  return { ok: true };
}

export async function sendSalesContractAndSupplierPackAction(input: {
  id: string;
  values: PiEditorValues;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireAdmin();
  const id = String(input.id ?? "").trim();
  const saved = await saveSalesContractDraft(id, input.values, user.name || user.email);
  if ("error" in saved) return { ok: false, message: saved.error };
  if (saved.pi?.status !== "sent") return { ok: false, message: "Email the proforma first." };
  const order = saved.salesContract?.order;
  if (!order) return { ok: false, message: "No sales contract on this deal yet." };
  const to = order.buyer.email?.trim() || "";
  if (!to.includes("@")) return { ok: false, message: "Set a buyer email on the sales contract before sending." };

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
