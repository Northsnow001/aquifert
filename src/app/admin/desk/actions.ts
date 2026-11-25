"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import type { PiEditorValues } from "@/lib/desk-hitl/pi";
import {
  addFoAttachment,
  closeAllOpenDeals,
  closeDeal,
  endNegotiation,
  confirmIndication,
  continueWithoutIndication,
  markSupplierDocument,
  messageSupplier,
  recordDealSend,
  saveFirmEmail,
  saveIndicationDraft,
  setBuyerPlan,
  setOfferShortlist,
  confirmSupplierFo,
  handNegotiationToAgent,
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
  sendMillFirmOfferNow,
} from "@/lib/desk-hitl/store";
import { parseFoUpload, readFoAttachmentFile } from "@/lib/desk-hitl/fo-pack";
import { FO_ATTACHMENT_LABEL } from "@/lib/desk-hitl/types";
import { getDeskSettings } from "@/lib/desk-settings/store";
import { firmOfferEmailDocument } from "@/lib/firm-order/offer-email";
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
  text: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireAdmin();
  const text = String(input.text ?? "").trim();
  if (!text) return { ok: false, message: "Write the indication, then send it. Nothing goes to the buyer before that." };
  const deal = await confirmIndication({
    id: String(input.id ?? "").trim(),
    offerId: String(input.offerId ?? "").trim(),
    marginPct: Number(input.marginPct),
    actor: user.name || user.email,
    text,
  });
  if ("error" in deal) return { ok: false, message: deal.error };
  revalidatePath("/admin/desk");
  revalidatePath(`/admin/desk/${deal.id}`);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

function refreshDeal(id: string) {
  revalidatePath("/admin/desk");
  revalidatePath(`/admin/desk/${id}`);
  revalidatePath("/admin", "layout");
}

export async function saveIndicationDraftAction(input: { id: string; offerId: string; marginPct: number; text: string }) {
  const user = await requireAdmin();
  const deal = await saveIndicationDraft({ ...input, id: String(input.id ?? "").trim(), actor: user.name || user.email });
  if ("error" in deal) return { ok: false as const, message: deal.error };
  refreshDeal(deal.id);
  return { ok: true as const };
}

export async function setOfferShortlistAction(input: { id: string; offerId: string; shortlisted: boolean }) {
  const user = await requireAdmin();
  const deal = await setOfferShortlist({ ...input, id: String(input.id ?? "").trim(), actor: user.name || user.email });
  if ("error" in deal) return { ok: false as const, message: deal.error };
  refreshDeal(deal.id);
  return { ok: true as const };
}

export async function setBuyerPlanAction(input: { id: string; plan: "aq_one" | "aq_zero" | "aq_analytics" }) {
  const user = await requireAdmin();
  const deal = await setBuyerPlan({ id: String(input.id ?? "").trim(), plan: input.plan, actor: user.name || user.email });
  if ("error" in deal) return { ok: false as const, message: deal.error };
  refreshDeal(deal.id);
  return { ok: true as const };
}

export async function continueWithoutIndicationAction(input: { id: string; offerId: string }) {
  const user = await requireAdmin();
  const deal = await continueWithoutIndication({ id: String(input.id ?? "").trim(), offerId: String(input.offerId ?? "").trim(), actor: user.name || user.email });
  if ("error" in deal) return { ok: false as const, message: deal.error };
  refreshDeal(deal.id);
  return { ok: true as const };
}

export async function messageSupplierAction(input: { id: string; offerId: string; channel: "email" | "wechat" | "whatsapp"; text: string }) {
  const user = await requireAdmin();
  const deal = await messageSupplier({ ...input, id: String(input.id ?? "").trim(), actor: user.name || user.email });
  if ("error" in deal) return { ok: false as const, message: deal.error };
  refreshDeal(deal.id);
  return { ok: true as const };
}

export async function markSupplierDocumentAction(input: { id: string; offerId: string; kind: "coa" | "tds" | "photos" | "firmOffer"; filename: string; href: string }) {
  const user = await requireAdmin();
  const deal = await markSupplierDocument({ ...input, id: String(input.id ?? "").trim(), actor: user.name || user.email });
  if ("error" in deal) return { ok: false as const, message: deal.error };
  refreshDeal(deal.id);
  return { ok: true as const };
}

export async function saveFirmEmailAction(input: { id: string; subject: string; note: string }) {
  const user = await requireAdmin();
  const deal = await saveFirmEmail({ ...input, id: String(input.id ?? "").trim(), actor: user.name || user.email });
  if ("error" in deal) return { ok: false as const, message: deal.error };
  refreshDeal(deal.id);
  return { ok: true as const };
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
  revalidatePath("/admin/desk/negotiation");
  revalidatePath(`/admin/desk/${deal.id}`);
  return { ok: true };
}

export async function handNegotiationToAgentAction(input: { id: string; price: number }): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireAdmin();
  const deal = await handNegotiationToAgent({
    id: String(input.id ?? "").trim(),
    actor: user.name || user.email,
    price: Number(input.price),
  });
  if ("error" in deal) return { ok: false, message: deal.error };
  revalidatePath("/admin/desk");
  revalidatePath("/admin/desk/negotiation");
  revalidatePath(`/admin/desk/${deal.id}`);
  return { ok: true };
}

export async function endNegotiationAction(input: { id: string }): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireAdmin();
  const deal = await endNegotiation({
    id: String(input.id ?? "").trim(),
    actor: user.name || user.email,
  });
  if ("error" in deal) return { ok: false, message: deal.error };
  revalidatePath("/admin/desk");
  revalidatePath("/admin/desk/negotiation");
  revalidatePath(`/admin/desk/${deal.id}`);
  return { ok: true };
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

async function firmOfferMail(id: string, values: PiEditorValues, subject: string, note: string, actor: string) {
  const saved = await saveFirmOfferDraft(id, values, actor);
  if ("error" in saved) return saved;
  await saveFirmEmail({ id, subject, note, actor });
  const order = saved.firmOffer?.order;
  if (!order) return { error: "No firm offer on this deal yet." };
  const settings = await getDeskSettings();
  const letter = firmOfferEmailDocument({ order, note });
  const attachments = [];
  for (const file of saved.foPack?.attachments ?? []) {
    const content = await readFoAttachmentFile(file);
    if (!content) return { error: `Could not read ${file.filename}. Upload it again.` };
    attachments.push({ filename: `${FO_ATTACHMENT_LABEL[file.kind]}-${file.filename}`, content, contentType: file.contentType });
  }
  return { saved, order, settings, text: letter.text, html: letter.html, subject: subject.trim(), attachments };
}

export async function sendFirmOfferToBuyerAction(input: {
  id: string;
  values: PiEditorValues;
  subject: string;
  note: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireAdmin();
  const id = String(input.id ?? "").trim();
  const actor = user.name || user.email;
  const packed = await firmOfferMail(id, input.values, String(input.subject ?? ""), String(input.note ?? ""), actor);
  if ("error" in packed) return { ok: false, message: packed.error };
  const to = packed.order.buyer.email?.trim() || "";
  if (!to.includes("@")) return { ok: false, message: "Set a buyer email on the firm offer before sending." };
  const mailed = await sendEmail(
    {
      kind: "firm-offer-buyer",
      to,
      subject: packed.subject,
      text: packed.text,
      html: packed.html,
      attachments: packed.attachments,
    },
    packed.settings.delivery,
  );
  if (mailed.status === "failed") return { ok: false, message: mailed.error || "Email failed." };
  if (mailed.status === "held") return { ok: false, message: "Email is not connected (SMTP or Resend). The draft was saved but not sent." };
  const sent = await markFirmOfferSent(id, to, actor);
  if ("error" in sent) return { ok: false, message: sent.error };
  await recordDealSend({ id, actor, channel: "email", to, subject: packed.subject, body: packed.text });
  revalidatePath("/admin/desk");
  revalidatePath(`/admin/desk/${id}`);
  return { ok: true };
}

export async function sendFirmOfferDraftToMeAction(input: {
  id: string;
  values: PiEditorValues;
  subject: string;
  note: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireAdmin();
  const id = String(input.id ?? "").trim();
  const actor = user.name || user.email;
  if (!user.email.includes("@")) return { ok: false, message: "Your admin account has no email address for the draft." };
  const packed = await firmOfferMail(id, input.values, String(input.subject ?? ""), String(input.note ?? ""), actor);
  if ("error" in packed) return { ok: false, message: packed.error };
  const mailed = await sendEmail(
    {
      kind: "firm-offer-draft",
      to: user.email,
      subject: `Draft: ${packed.subject}`,
      text: packed.text,
      html: packed.html,
      attachments: packed.attachments,
    },
    packed.settings.delivery,
  );
  if (mailed.status !== "sent") return { ok: false, message: mailed.error || "The draft email was not sent. It is saved on the trade." };
  await recordDealSend({ id, actor, channel: "email-draft", to: user.email, subject: packed.subject, body: packed.text });
  revalidatePath(`/admin/desk/${id}`);
  return { ok: true };
}

export async function sendMillFirmOfferAction(input: {
  id: string;
}): Promise<{ ok: true; millEmail: string; millEmailStatus: string } | { ok: false; message: string }> {
  await requireAdmin();
  const id = String(input.id ?? "").trim();
  const sent = await sendMillFirmOfferNow(id);
  if ("error" in sent) return { ok: false, message: sent.error };
  revalidatePath("/admin/desk");
  revalidatePath(`/admin/desk/${id}`);
  if (!sent.millEmail) return { ok: false, message: "No supplier email on file. Add it on the supplier record, then send again." };
  if (sent.millEmailStatus !== "sent") {
    return { ok: false, message: `Supplier email was ${sent.millEmailStatus}.` };
  }
  return { ok: true, millEmail: sent.millEmail, millEmailStatus: sent.millEmailStatus };
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

export async function closeAllOpenDealsAction(): Promise<
  { ok: true; closed: number } | { ok: false; message: string }
> {
  const user = await requireAdmin();
  const result = await closeAllOpenDeals(user.name || user.email);
  revalidatePath("/admin/desk");
  return { ok: true, closed: result.closed.length };
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
