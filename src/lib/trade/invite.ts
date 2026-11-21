import "server-only";

import { getDeskSettings } from "@/lib/desk-settings/store";
import { supplierWeChatInviteEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/mailer";
import { supplierInviteEligible } from "@/lib/trade/invite-rules";
import { getTradeSupplier, listTradeSuppliers, logTradeMessage, markSupplierInvited } from "@/lib/trade/store";
import type { InviteResult, TradeSupplier } from "@/lib/trade/types";
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
