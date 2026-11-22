import "server-only";

import { allowlistedAdminEmails } from "@/lib/admin-access";
import { EMAIL_PATTERN } from "@/lib/desk-settings/email-rules";
import { getDeskSettings } from "@/lib/desk-settings/store";
import { SITE_URL } from "@/lib/email/brand";
import { deskAlertEmail } from "@/lib/email/templates";
import { sendEmail, type MailKind } from "@/lib/mailer";
import { deskInbox } from "@/lib/email/member-emails";
import type { DeskCandidate } from "@/lib/trade/desk-closer-logic";

function origin() {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || SITE_URL;
}

async function mailAdmins(input: { kind: MailKind; subject: string; heading: string; preheader: string; rows: Array<[string, string]> }) {
  try {
    const { delivery } = await getDeskSettings();
    const email = deskAlertEmail(input);
    const to = [...new Set([deskInbox(delivery.replyTo), ...allowlistedAdminEmails()].map((addr) => addr.trim().toLowerCase()).filter((addr) => EMAIL_PATTERN.test(addr)))];
    await Promise.all(to.map((addr) => sendEmail({ kind: input.kind, to: addr, ...email }, delivery)));
  } catch (error) {
    console.error("[trade-admin-alert]", error);
  }
}

function offerLine(offer: DeskCandidate, index: number) {
  const price = `${offer.unitPrice} ${offer.currency}/MT`.trim();
  const terms = [offer.incoterm, offer.loadPort].filter(Boolean).join(" ");
  return `${index + 1}. ${offer.supplierName} · ${price}${terms ? ` ${terms}` : ""}`;
}

export async function notifyDeskShortlist(input: {
  requestId: string;
  dealId: string;
  product: string;
  buyer: string;
  quantityMt: string;
  destination: string;
  reason: "three_quotes" | "wait_elapsed";
  offers: DeskCandidate[];
}) {
  const why =
    input.reason === "three_quotes"
      ? "Three unique supplier quotes are in. The first three by time are on Matt's desk."
      : "24 hours passed with at least one quote. Whatever we have is on Matt's desk.";
  await mailAdmins({
    kind: "desk-shortlist-admin",
    subject: `Desk shortlist — ${input.requestId} — ${input.product}`,
    heading: "Supplier quotes ready for Matt",
    preheader: why,
    rows: [
      ["Request", input.requestId],
      ["Product", input.product],
      ["Buyer", input.buyer],
      ["Quantity", input.quantityMt],
      ["Destination", input.destination],
      ["Why now", why],
      ["Shortlist", input.offers.map(offerLine).join("\n")],
      ["Open desk", `${origin()}/admin/desk/${input.dealId}`],
    ],
  });
}

export async function notifyBuyerConversationStarted(input: {
  buyer: string;
  phone: string;
  company?: string;
  message: string;
  buyerId?: string | null;
}) {
  await mailAdmins({
    kind: "buyer-chat-admin",
    subject: `Buyer conversation started — ${input.buyer || input.phone}`,
    heading: "A buyer started a WhatsApp conversation",
    preheader: `${input.buyer || input.phone} just wrote in.`,
    rows: [
      ["Buyer", input.buyer],
      ["Company", input.company || ""],
      ["WhatsApp", input.phone],
      ["First message", input.message.slice(0, 500)],
      ["Open buyers", `${origin()}/admin/trade/buyers`],
    ],
  });
}
