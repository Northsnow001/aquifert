import "server-only";

import { getDeskSettings } from "@/lib/desk-settings/store";
import { buyerWhatsAppInviteEmail, supplierWeChatInviteEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/mailer";
import { supplierInviteEligible } from "@/lib/trade/invite-rules";
import {
  getTradeBuyer,
  getTradeSupplier,
  listTradeBuyers,
  listTradeSuppliers,
  logTradeMessage,
  markBuyerInvited,
  markSupplierInvited,
} from "@/lib/trade/store";
import type { BuyerInviteResult, InviteResult, TradeBuyer, TradeSupplier } from "@/lib/trade/types";
import { buyerInviteEligible, buyerWhatsAppLink, deskWhatsAppE164 } from "@/lib/whatsapp/parse";
import { wechatPermanentQr, wechatQrPng } from "@/lib/wechat/qr";

const BATCH = 20;

async function inviteOne(row: TradeSupplier): Promise<InviteResult> {
  const check = supplierInviteEligible(row);
  if (!check.ok) return { supplierId: row.id, email: row.email, ok: false, reusedToken: false, error: check.reason };

  let reusedToken = false;
  let ticket = row.qrTicket && row.qrScene === check.scene ? row.qrTicket : "";
  if (!ticket) {
    const qr = await wechatPermanentQr(check.scene);
    ticket = qr.ticket;
    reusedToken = qr.reusedToken;
  }
  const png = await wechatQrPng(ticket);
  const { delivery } = await getDeskSettings();
  const email = supplierWeChatInviteEmail({ name: row.contactName, company: row.companyName, deskEmail: delivery.replyTo });
  const mailed = await sendEmail(
    {
      kind: "supplier-wechat-invite",
      to: check.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      attachments: [{ filename: "aquifert-wechat-qr.png", content: png, contentType: "image/png", cid: "wechat-qr" }],
    },
    delivery,
  );
  if (mailed.status !== "sent") {
    return {
      supplierId: row.id,
      email: check.email,
      ok: false,
      reusedToken,
      error: mailed.error || "Email was not sent (check SMTP on Settings).",
    };
  }
  await markSupplierInvited(row.id, { email: check.email, scene: check.scene, ticket });
  await logTradeMessage({
    direction: "out",
    channel: "email",
    supplierId: row.id,
    toAddress: check.email,
    body: email.subject,
    payload: { kind: "wechat_invite", scene: check.scene },
  });
  return { supplierId: row.id, email: check.email, ok: true, reusedToken };
}

export async function inviteSupplierById(id: string): Promise<InviteResult> {
  const row = await getTradeSupplier(id);
  if (!row) return { supplierId: id, email: "", ok: false, reusedToken: false, error: "Supplier not found." };
  return inviteOne(row);
}

export async function inviteSuppliersWaiting(): Promise<{ results: InviteResult[]; truncated: boolean }> {
  const waiting = (await listTradeSuppliers()).filter((row) => row.onboardingStatus === "to_invite");
  const batch = waiting.slice(0, BATCH);
  const results: InviteResult[] = [];
  for (const row of batch) results.push(await inviteOne(row));
  return { results, truncated: waiting.length > BATCH };
}

async function inviteBuyerOne(row: TradeBuyer): Promise<BuyerInviteResult> {
  const check = buyerInviteEligible(row);
  if (!check.ok) return { buyerId: row.id, email: row.email, ok: false, error: check.reason };
  const { delivery } = await getDeskSettings();
  const link = buyerWhatsAppLink(check.email, { name: row.contactName, company: row.companyName });
  const email = buyerWhatsAppInviteEmail({
    name: row.contactName,
    company: row.companyName,
    link,
    deskNumber: deskWhatsAppE164(),
    deskEmail: delivery.replyTo,
  });
  const mailed = await sendEmail(
    { kind: "buyer-whatsapp-invite", to: check.email, subject: email.subject, html: email.html, text: email.text },
    delivery,
  );
  if (mailed.status !== "sent") {
    return { buyerId: row.id, email: check.email, ok: false, error: mailed.error || "Email was not sent (check SMTP on Settings)." };
  }
  await markBuyerInvited(row.id, check.email);
  await logTradeMessage({
    direction: "out",
    channel: "email",
    buyerId: row.id,
    toAddress: check.email,
    body: email.subject,
    payload: { kind: "whatsapp_invite", link },
  });
  return { buyerId: row.id, email: check.email, ok: true };
}

export async function inviteBuyerById(id: string): Promise<BuyerInviteResult> {
  const row = await getTradeBuyer(id);
  if (!row) return { buyerId: id, email: "", ok: false, error: "Buyer not found." };
  return inviteBuyerOne(row);
}

export async function inviteBuyersWaiting(): Promise<{ results: BuyerInviteResult[]; truncated: boolean }> {
  const waiting = (await listTradeBuyers()).filter((row) => row.onboardingStatus === "to_invite");
  const batch = waiting.slice(0, BATCH);
  const results: BuyerInviteResult[] = [];
  for (const row of batch) results.push(await inviteBuyerOne(row));
  return { results, truncated: waiting.length > BATCH };
}
