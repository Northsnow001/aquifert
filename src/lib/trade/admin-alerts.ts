import "server-only";

import { allowlistedAdminEmails } from "@/lib/admin-access";
import { getDeskSettings } from "@/lib/desk-settings/store";
import { SITE_URL } from "@/lib/email/brand";
import { deskAlertEmail } from "@/lib/email/templates";
import { sendEmail, type MailKind } from "@/lib/mailer";
import { deskInbox } from "@/lib/email/member-emails";
import { isAlertInbox } from "@/lib/trade/admin-alert-logic";
import type { DeskCandidate } from "@/lib/trade/desk-closer-logic";

function origin() {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || SITE_URL;
}

function routableInbox(addr: string) {
  const email = addr.trim().toLowerCase();
  return isAlertInbox(email) ? email : "";
}

async function mailAdmins(input: { kind: MailKind; subject: string; heading: string; preheader: string; rows: Array<[string, string]> }) {
  try {
    const settings = await getDeskSettings();
    const { delivery } = settings;
    const email = deskAlertEmail(input);
    const to = [
      ...new Set(
        [
          process.env.DESK_ALERT_EMAIL,
          deskInbox(delivery.replyTo),
          settings.orderDesk.recipient,
          ...allowlistedAdminEmails(),
        ]
          .map((addr) => routableInbox(String(addr || "")))
          .filter(Boolean),
      ),
    ];
    if (!to.length) return;
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
  const who = input.buyer.trim() || input.phone;
  await mailAdmins({
    kind: "buyer-chat-admin",
    subject: `${who} has started a conversation`,
    heading: `${who} has started a conversation`,
    preheader: `${who} just wrote in on WhatsApp.`,
    rows: [
      ["Buyer", input.buyer],
      ["Company", input.company || ""],
      ["WhatsApp", input.phone],
      ["First message", input.message.slice(0, 500)],
      ["Open buyers", `${origin()}/admin/trade/buyers`],
    ],
  });
}

export async function notifyTradeOpened(input: {
  requestId: string;
  product: string;
  buyer: string;
  quantityMt: string;
  destination: string;
}) {
  await mailAdmins({
    kind: "rfq-opened-admin",
    subject: `New trade ${input.requestId} — ${input.product}`,
    heading: "New buyer request opened",
    preheader: `${input.buyer} started ${input.requestId}.`,
    rows: [
      ["Request", input.requestId],
      ["Buyer", input.buyer],
      ["Product", input.product],
      ["Quantity", input.quantityMt],
      ["Destination", input.destination],
      ["Open RFQ", `${origin()}/admin/trade/rfqs`],
    ],
  });
}

export async function notifyRfqSentToSuppliers(input: {
  requestId: string;
  product: string;
  buyer: string;
  sent: number;
  failed: number;
  skipped: number;
  total: number;
}) {
  await mailAdmins({
    kind: "rfq-fanout-admin",
    subject: `${input.requestId} sent to ${input.sent} suppliers — ${input.product}`,
    heading: "Buyer request sent to suppliers",
    preheader: `${input.requestId} went to WeChat (${input.sent} sent, ${input.failed} failed, ${input.skipped} skipped).`,
    rows: [
      ["Request", input.requestId],
      ["Buyer", input.buyer],
      ["Product", input.product],
      ["Sent", String(input.sent)],
      ["Failed", String(input.failed)],
      ["No WeChat ID", String(input.skipped)],
      ["Suppliers on book", String(input.total)],
      ["Open tracker", `${origin()}/admin/trade/rfqs`],
    ],
  });
}

export async function notifyNegotiationAwaitingMatt(input: {
  requestId: string;
  product: string;
  buyer: string;
  price: string;
  buyerText: string;
  dealId: string;
}) {
  await mailAdmins({
    kind: "negotiation-desk",
    subject: `Negotiation awaiting Matt — ${input.requestId} — ${input.product}`,
    heading: "Negotiation awaiting Matt",
    preheader: `${input.buyer} wants to change the indication on ${input.requestId}.`,
    rows: [
      ["Request", input.requestId],
      ["Buyer", input.buyer],
      ["Product", input.product],
      ["Indication", input.price],
      ["They wrote", input.buyerText.slice(0, 800)],
      ["Open negotiation", `${origin()}/admin/desk/negotiation`],
    ],
  });
}

export async function notifyFirmOfferOnDesk(input: {
  requestId: string;
  product: string;
  buyer: string;
  packing: string;
  payment: string;
  dealId: string;
}) {
  await mailAdmins({
    kind: "firm-offer-desk-admin",
    subject: `Firm offer on desk — ${input.requestId} — ${input.product}`,
    heading: "Firm offer ready for Matt",
    preheader: `${input.requestId} is on the desk to review and send.`,
    rows: [
      ["Request", input.requestId],
      ["Buyer", input.buyer],
      ["Product", input.product],
      ["Packing", input.packing],
      ["Payment", input.payment],
      ["Open desk", `${origin()}/admin/desk/${input.dealId}`],
    ],
  });
}

export async function notifySupplierQuote(input: {
  requestId: string;
  supplier: string;
  product: string;
  unitPrice: string;
  incoterm: string;
  noOffer?: boolean;
}) {
  await mailAdmins({
    kind: "supplier-quote-admin",
    subject: input.noOffer
      ? `No offer — ${input.requestId} — ${input.supplier}`
      : `Supplier quote — ${input.requestId} — ${input.supplier}`,
    heading: input.noOffer ? "Supplier sent no offer" : "Supplier quote received",
    preheader: input.noOffer
      ? `${input.supplier} has no offer on ${input.requestId}.`
      : `${input.supplier} quoted ${input.unitPrice} on ${input.requestId}.`,
    rows: [
      ["Request", input.requestId],
      ["Supplier", input.supplier],
      ["Product", input.product],
      ["Quote", input.noOffer ? "NO OFFER" : input.unitPrice],
      ["Incoterm", input.incoterm],
      ["Open tracker", `${origin()}/admin/trade/rfqs`],
    ],
  });
}

export async function notifyIndicationSent(input: {
  requestId: string;
  product: string;
  buyer: string;
  price: string;
  dealId: string;
}) {
  await mailAdmins({
    kind: "indication-sent-admin",
    subject: `Indication sent — ${input.requestId} — ${input.product}`,
    heading: "Indication sent to the buyer",
    preheader: `${input.requestId} went to ${input.buyer} at ${input.price}.`,
    rows: [
      ["Request", input.requestId],
      ["Buyer", input.buyer],
      ["Product", input.product],
      ["Indication", input.price],
      ["Open desk", `${origin()}/admin/desk/${input.dealId}`],
    ],
  });
}

export async function notifyFirmOfferSent(input: {
  requestId: string;
  product: string;
  buyer: string;
  to: string;
  dealId: string;
  millName?: string;
  millEmail?: string;
  millEmailStatus?: string;
}) {
  await mailAdmins({
    kind: "firm-offer-sent-admin",
    subject: `Firm offer sent — ${input.requestId} — ${input.product}`,
    heading: "Firm offer emailed to the buyer",
    preheader: `${input.requestId} FO went to ${input.to}.`,
    rows: [
      ["Request", input.requestId],
      ["Buyer", input.buyer],
      ["Product", input.product],
      ["Buyer email", input.to],
      ["Supplier", input.millName || ""],
      ["Supplier email", input.millEmail || "not on file"],
      ["Supplier email status", input.millEmailStatus || ""],
      ["Open desk", `${origin()}/admin/desk/${input.dealId}`],
    ],
  });
}

export async function notifyPiOnDesk(input: {
  requestId: string;
  product: string;
  buyer: string;
  channel: string;
  dealId: string;
}) {
  await mailAdmins({
    kind: "pi-desk-admin",
    subject: `Proforma on desk — ${input.requestId} — ${input.product}`,
    heading: "Buyer accepted the firm offer",
    preheader: `${input.requestId} PI is on the desk to review and send.`,
    rows: [
      ["Request", input.requestId],
      ["Buyer", input.buyer],
      ["Product", input.product],
      ["Accepted via", input.channel],
      ["Open desk", `${origin()}/admin/desk/${input.dealId}`],
    ],
  });
}

export async function notifyPiSent(input: {
  requestId: string;
  product: string;
  buyer: string;
  to: string;
  dealId: string;
}) {
  await mailAdmins({
    kind: "pi-sent-admin",
    subject: `Proforma sent — ${input.requestId} — ${input.product}`,
    heading: "Proforma invoice emailed",
    preheader: `${input.requestId} PI went to ${input.to}.`,
    rows: [
      ["Request", input.requestId],
      ["Buyer", input.buyer],
      ["Product", input.product],
      ["Sent to", input.to],
      ["Open desk", `${origin()}/admin/desk/${input.dealId}`],
    ],
  });
}

export async function notifySupplierPackIssued(input: {
  requestId: string;
  product: string;
  supplier: string;
  dealId: string;
  millEmail?: string;
  millEmailStatus?: string;
}) {
  await mailAdmins({
    kind: "supplier-pack-admin",
    subject: `Supplier pack issued — ${input.requestId} — ${input.supplier}`,
    heading: "Supplier documents issued",
    preheader: `${input.requestId} pack went to ${input.supplier}.`,
    rows: [
      ["Request", input.requestId],
      ["Supplier", input.supplier],
      ["Product", input.product],
      ["Supplier email", input.millEmail || "not on file"],
      ["Supplier email status", input.millEmailStatus || ""],
      ["Open desk", `${origin()}/admin/desk/${input.dealId}`],
    ],
  });
}

export async function notifyRfqSubmitted(input: {
  requestId: string;
  product: string;
  buyer: string;
  quantityMt: string;
  destination: string;
}) {
  await mailAdmins({
    kind: "rfq-submitted-admin",
    subject: `RFQ submitted ${input.requestId} — ${input.product}`,
    heading: "Buyer confirmed the enquiry",
    preheader: `${input.buyer} confirmed ${input.requestId}. Fan-out to suppliers follows.`,
    rows: [
      ["Request", input.requestId],
      ["Buyer", input.buyer],
      ["Product", input.product],
      ["Quantity", input.quantityMt],
      ["Destination", input.destination],
      ["Open RFQ", `${origin()}/admin/trade/rfqs`],
    ],
  });
}

export async function notifyBuyerAgreedIndication(input: {
  requestId: string;
  product: string;
  buyer: string;
  price: string;
  dealId: string;
}) {
  await mailAdmins({
    kind: "buyer-yes-admin",
    subject: `${input.buyer} agreed the indication on ${input.requestId}`,
    heading: "Buyer agreed — collecting firm-offer terms",
    preheader: `${input.buyer} said YES on ${input.requestId}.`,
    rows: [
      ["Request", input.requestId],
      ["Buyer", input.buyer],
      ["Product", input.product],
      ["Indication", input.price],
      ["Open desk", `${origin()}/admin/desk/${input.dealId}`],
    ],
  });
}
