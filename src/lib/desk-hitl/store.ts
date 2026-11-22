import "server-only";

import { getRecord, listRecords, putRecords } from "@/lib/data/records";
import { DESK_DEALS } from "@/lib/data/tables";
import { resolveBuyerReply, resolveFirmFollowUp } from "@/lib/desk-hitl/classify-reply";
import { applyBuyerTermAnswer, buyerUnitPrice, classifyBuyerReply, emptyExecution, indicationWhatsApp, isPlainRefusal, lockedInboundDecision, looksLikeCounter, looksLikeNewSupply, mentionsLockedRequest, millFirmOfferWeChat, nextFirmAsk, offerIsLocked, parseBuyerEmailReply, parseShortlistBody, rfqKey, selectedOffer, shouldTakeLocked, type DeskPhase } from "@/lib/desk-hitl/logic";
import { deleteFoAttachmentFile, FO_MAX_FILES, storeFoAttachmentFile } from "@/lib/desk-hitl/fo-pack";
import { applyFirmOfferEditor, applyPiEditor, applySalesContractEditor, proformaFromN8n, type PiEditorValues } from "@/lib/desk-hitl/pi";
import type { DeskDeal, DeskExecution, DeskFoAttachment, DeskFoPack, DeskMessage } from "@/lib/desk-hitl/types";
import { listOutbox } from "@/lib/mailer";
import { buyerDocumentFromDeal, firmOfferDraftFromDeal, salesContractDraftFromDeal, salesContractFromPi, supplierDocumentFromDeal } from "@/lib/firm-order/from-deal";

const now = () => new Date().toISOString();
const idOf = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const dealIdFor = (requestId: string) => `deal-${requestId.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(0, 80)}`;

function message(partial: Omit<DeskMessage, "id" | "at"> & { at?: string }): DeskMessage {
  return { id: idOf("msg"), at: partial.at ?? now(), ...partial };
}

function emptyFoPack(existing?: DeskFoPack | null): DeskFoPack {
  return {
    attachments: existing?.attachments ?? [],
    supplierConfirmedAt: existing?.supplierConfirmedAt ?? null,
    supplierConfirmedBy: existing?.supplierConfirmedBy ?? null,
  };
}

function parkFirmOffer(deal: DeskDeal): DeskDeal {
  if (deal.firmOffer?.status === "sent") return { ...deal, foPack: emptyFoPack(deal.foPack) };
  const generated = buyerDocumentFromDeal(deal, "firm_offer");
  if (!generated) return { ...deal, foPack: emptyFoPack(deal.foPack) };
  const prior = deal.firmOffer;
  const email = generated.buyer.email || prior?.order.buyer.email;
  return {
    ...deal,
    foPack: emptyFoPack(deal.foPack),
    firmOffer: {
      status: "review",
      updatedAt: now(),
      sentAt: prior?.sentAt ?? null,
      sentTo: prior?.sentTo ?? null,
      order: applyExecutionToOrder(deal, {
        ...generated,
        buyer: { ...generated.buyer, email: email ?? generated.buyer.email },
      }),
    },
  };
}

async function save(deal: DeskDeal) {
  const next = { ...deal, updatedAt: now() };
  await putRecords(DESK_DEALS, [next]);
  return (await getRecord(DESK_DEALS, deal.id)) ?? next;
}

/** n8n WF9. Override with DESK_INDICATION_WEBHOOK_URL. */
const DEFAULT_INDICATION_WEBHOOK = "https://northsnow.app.n8n.cloud/webhook/response_from_matt";
/** n8n WF10 after payment. Override with DESK_SUPPLIER_PACK_WEBHOOK_URL. */
const DEFAULT_SUPPLIER_PACK_WEBHOOK = "https://northsnow.app.n8n.cloud/webhook/supplier_documents";
/** WhatsApp after Matt emails the firm offer. Override with DESK_FIRM_OFFER_WEBHOOK_URL. */
const DEFAULT_FIRM_OFFER_WEBHOOK = "https://northsnow.app.n8n.cloud/webhook/notify_buyer_on_firm_offer";
/** Chosen mill WeChat after Matt emails the FO. Override with DESK_FIRM_OFFER_MILL_WEBHOOK_URL. */
const DEFAULT_FIRM_OFFER_MILL_WEBHOOK = "https://northsnow.app.n8n.cloud/webhook/notify_mill_on_firm_offer";
/** Matt's replies, the opening line, the handoff, and the close. Workflow 13. */
const DEFAULT_DESK_REPLY_WEBHOOK = "https://northsnow.app.n8n.cloud/webhook/desk_to_buyer";

function indicationWebhookUrls(callbackUrl?: string | null) {
  const urls = new Set<string>();
  for (const raw of [callbackUrl, process.env.DESK_INDICATION_WEBHOOK_URL, DEFAULT_INDICATION_WEBHOOK]) {
    const url = raw?.trim().replace(/\/$/, "");
    if (url?.startsWith("https://") || url?.startsWith("http://localhost")) urls.add(url);
  }
  return [...urls];
}

async function notify(url: string | null | undefined, payload: Record<string, unknown>) {
  if (!url?.startsWith("https://") && !url?.startsWith("http://localhost")) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12_000),
    });
    return res.ok;
  } catch {
    // n8n Wait / WF9 is best-effort; the desk still has the deal.
    return false;
  }
}

async function notifyIndication(callbackUrl: string | null | undefined, payload: Record<string, unknown>) {
  await Promise.all(indicationWebhookUrls(callbackUrl).map((url) => notify(url, payload)));
}

function deskReplyWebhookUrl() {
  const url = (process.env.DESK_BUYER_WHATSAPP_WEBHOOK_URL || DEFAULT_DESK_REPLY_WEBHOOK).trim().replace(/\/$/, "");
  return url.startsWith("https://") || url.startsWith("http://localhost") ? url : "";
}

function firmOfferWebhookUrl() {
  const url = (process.env.DESK_FIRM_OFFER_WEBHOOK_URL || DEFAULT_FIRM_OFFER_WEBHOOK).trim().replace(/\/$/, "");
  return url.startsWith("https://") || url.startsWith("http://localhost") ? url : "";
}

function firmOfferMillWebhookUrl() {
  const url = (process.env.DESK_FIRM_OFFER_MILL_WEBHOOK_URL || DEFAULT_FIRM_OFFER_MILL_WEBHOOK).trim().replace(/\/$/, "");
  return url.startsWith("https://") || url.startsWith("http://localhost") ? url : "";
}

function firmOfferWhatsApp(deal: DeskDeal, email: string) {
  const qty = deal.quantityMt ? `${deal.quantityMt} MT ` : "";
  const product = deal.product || "your order";
  return `Aquifert desk — ${product}\nYour firm offer for ${qty}${product} is in your email (${email}). Reply YES on that email to accept.`;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** WF8 used to wipe PI; recover emailed PI terms from the outbox. */
async function recoverPiIfSent(deal: DeskDeal, mails?: Awaited<ReturnType<typeof listOutbox>>): Promise<DeskDeal> {
  if (deal.pi?.status === "sent" && deal.pi.order?.unit_price_usd) return deal;
  const box = mails ?? (await listOutbox().catch(() => []));
  const hit = box
    .filter((row) => row.kind === "pi-buyer" && row.subject.toLowerCase().includes(deal.requestId.toLowerCase()))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
  if (!hit) return deal;
  const base = deal.pi?.order ?? buyerDocumentFromDeal(deal, "proforma");
  if (!base) return deal;
  const body = stripHtml(hit.html);
  const parsed = body.match(/for\s+([\d.]+)\s+MT\s+(.+?)\s+at USD\s+([\d.]+)/i);
  const next: DeskDeal = {
    ...deal,
    pi: {
      status: "sent",
      updatedAt: hit.at,
      sentAt: hit.at,
      sentTo: hit.to,
      order: {
        ...base,
        document: "proforma",
        quantity_mt: parsed ? Number(parsed[1]) : base.quantity_mt,
        product: parsed ? parsed[2].trim() : base.product,
        unit_price_usd: parsed ? Number(parsed[3]) : base.unit_price_usd,
        buyer: { ...base.buyer, email: hit.to },
      },
    },
  };
  return (await save(next))!;
}

export async function listDeskDeals() {
  const [rows, mails] = await Promise.all([listRecords(DESK_DEALS), listOutbox().catch(() => [])]);
  return Promise.all(rows.map((row) => recoverPiIfSent(row, mails)));
}

export async function getDeskDeal(id: string) {
  const deal = await getRecord(DESK_DEALS, id);
  if (!deal) return null;
  const recovered = await recoverPiIfSent(deal);
  if (recovered.execution?.confirmedAt && recovered.buyerPrice != null && recovered.firmOffer?.status !== "sent" && !recovered.firmOffer) {
    return (await save(parkFirmOffer(recovered)))!;
  }
  if (recovered.buyerEmail && recovered.firmOffer?.order && !recovered.firmOffer.order.buyer.email) {
    return (await save(applyBuyerEmail(recovered, recovered.buyerEmail)))!;
  }
  return recovered;
}

export async function upsertShortlist(body: unknown): Promise<DeskDeal | { error: string }> {
  const parsed = parseShortlistBody(body);
  if (!parsed) return { error: "Need requestId, product and at least one offer with a unit price." };

  const id = dealIdFor(parsed.requestId);
  const existing = await getRecord(DESK_DEALS, id);
  const at = existing?.at ?? now();
  const deal: DeskDeal = {
    id,
    at,
    updatedAt: now(),
    status: existing?.status ?? "waiting_desk",
    requestId: parsed.requestId,
    product: parsed.product,
    quantityMt: parsed.quantityMt,
    destination: parsed.destination,
    incoterm: parsed.incoterm,
    buyerName: parsed.buyerName,
    buyerPhone: parsed.buyerPhone,
    buyerCompany: parsed.buyerCompany,
    buyerEmail: parsed.buyerEmail || existing?.buyerEmail || "",
    offers: parsed.offers,
    selectedOfferId: existing?.selectedOfferId ?? null,
    marginPct: existing?.marginPct ?? null,
    buyerPrice: existing?.buyerPrice ?? null,
    currency: parsed.currency,
    messages: existing?.messages?.length
      ? existing.messages
      : [message({ from: "system", channel: "app", text: `Shortlist of ${parsed.offers.length} offer(s) from WF8.` })],
    callbackUrl: parsed.callbackUrl ?? existing?.callbackUrl ?? null,
    firmInterestAt: existing?.firmInterestAt ?? null,
    execution: existing?.execution ?? null,
    firmOffer: existing?.firmOffer ?? null,
    foPack: existing?.foPack ?? null,
    pi: existing?.pi ?? null,
    salesContract: existing?.salesContract ?? null,
    supplierPackSentAt: existing?.supplierPackSentAt ?? null,
  };
  if (existing?.status === "firm_interest") {
    await putRecords(DESK_DEALS, [deal]);
    return deal;
  }
  await putRecords(DESK_DEALS, [deal]);
  return deal;
}

export async function confirmIndication(input: {
  id: string;
  offerId: string;
  marginPct: number;
  actor: string;
}): Promise<DeskDeal | { error: string }> {
  const deal = await getRecord(DESK_DEALS, input.id);
  if (!deal) return { error: "That shortlist was not found." };
  if (deal.status === "closed") return { error: "This request is closed." };
  if (deal.status === "firm_interest") return { error: "This deal is already firm interest." };
  const offer = deal.offers.find((item) => item.id === input.offerId);
  if (!offer) return { error: "Choose one of the three offers." };
  if (!Number.isFinite(input.marginPct) || input.marginPct < 0 || input.marginPct > 80) {
    return { error: "Margin must be between 0 and 80%." };
  }

  const buyerPrice = buyerUnitPrice(offer.unitPrice, input.marginPct);
  const next: DeskDeal = {
    ...deal,
    status: "indication_sent",
    selectedOfferId: offer.id,
    marginPct: input.marginPct,
    buyerPrice,
    currency: offer.currency || deal.currency,
    messages: [
      ...deal.messages,
      message({
        from: "system",
        channel: "app",
        text: `${input.actor || "Desk"} chose ${offer.supplierName} at ${offer.currency} ${offer.unitPrice}/MT + ${input.marginPct}% → buyer ${offer.currency} ${buyerPrice}/MT.`,
      }),
    ],
  };
  const body = indicationWhatsApp(next);
  next.messages.push(message({ from: "desk", channel: "whatsapp", text: body, outboundStatus: "queued" }));
  const saved = (await save(next))!;
  await syncRfqStatus(saved.requestId, "indication_sent", {
    selected_supplier: offer.supplierName,
    supplier_unit_price: offer.unitPrice,
    buyer_unit_price: buyerPrice,
    margin_pct: input.marginPct,
  });
  await notifyIndication(saved.callbackUrl, {
    event: "indication_ready",
    dealId: saved.id,
    requestId: saved.requestId,
    buyerPhone: saved.buyerPhone,
    whatsappBody: body,
    buyerPrice: saved.buyerPrice,
    marginPct: saved.marginPct,
    currency: saved.currency,
    product: saved.product,
    supplierName: offer.supplierName,
    supplierUnitPrice: offer.unitPrice,
    supplierOpenId: offer.wechatOpenId ?? "",
    offerId: offer.id,
    incoterm: offer.incoterm || saved.incoterm,
    adminUrl: `${(process.env.NEXT_PUBLIC_SITE_URL || "https://aquifert.com").replace(/\/$/, "")}/admin/desk/${saved.id}`,
  });
  return saved;
}

function phoneMatches(deal: DeskDeal, digits: string) {
  const theirs = deal.buyerPhone.replace(/\D/g, "");
  return Boolean(theirs && digits && (theirs.endsWith(digits) || digits.endsWith(theirs)));
}

export async function buyerHasLiveDeskThread(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return false;
  const { isLiveDeskStatus } = await import("@/lib/trade/admin-alert-logic");
  const deals = await listRecords(DESK_DEALS);
  return deals.some((row) => isLiveDeskStatus(row.status) && phoneMatches(row, digits));
}

function applyBuyerEmail(deal: DeskDeal, email: string): DeskDeal {
  const nextEmail = email.includes("@") ? email : deal.buyerEmail || "";
  const order = deal.firmOffer?.order;
  const stampFo =
    deal.firmOffer && order && nextEmail && !order.buyer.email
      ? {
          ...deal.firmOffer,
          order: { ...order, buyer: { ...order.buyer, email: nextEmail } },
        }
      : deal.firmOffer;
  return { ...deal, buyerEmail: nextEmail, firmOffer: stampFo };
}

export async function recordBuyerInbound(input: {
  phone?: string;
  requestId?: string;
  text: string;
  email?: string;
}): Promise<DeskDeal | { error: string } | { event: "chat" | "negotiating" | "firm_interest"; phase?: DeskPhase; dealId?: string; requestId?: string }> {
  const text = input.text.trim().slice(0, 4000);
  if (!text) return { error: "Empty message." };
  const inboundEmail = String(input.email || "").trim();

  const deals = await listRecords(DESK_DEALS);
  const phone = (input.phone || "").replace(/\s+/g, "");
  const digits = phone.replace(/\D/g, "");
  const negotiable = (row: DeskDeal) =>
    row.status !== "closed" &&
    !offerIsLocked(row) &&
    (row.status === "indication_sent" || row.status === "negotiating");
  const mail = inboundEmail.toLowerCase();
  const deal =
    (input.requestId
      ? deals.find(
          (row) =>
            negotiable(row) &&
            (row.requestId === input.requestId || (rfqKey(input.requestId) !== "" && rfqKey(row.requestId) === rfqKey(input.requestId))),
        )
      : null) ??
    deals
      .filter((row) => negotiable(row) && phoneMatches(row, digits))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0] ??
    deals
      .filter((row) => negotiable(row) && mail && row.buyerEmail?.trim().toLowerCase() === mail)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0] ??
    null;
  const collecting =
    deals.find(
      (row) =>
        row.status !== "closed" &&
        row.status === "firm_interest" &&
        !row.execution?.confirmedAt &&
        phoneMatches(row, digits),
    ) ?? null;
  const awaitingFo =
    deals.find(
      (row) =>
        row.status !== "closed" &&
        row.status === "firm_interest" &&
        row.firmOffer?.status === "sent" &&
        row.pi?.status !== "sent" &&
        phoneMatches(row, digits),
    ) ?? null;
  const kind = await resolveBuyerReply(text, Boolean(deal || awaitingFo));
  if (inboundEmail.includes("@")) {
    const open = deals.filter((row) => row.status !== "closed" && phoneMatches(row, digits));
    for (const row of open) {
      if (row.buyerEmail === inboundEmail && row.firmOffer?.order.buyer.email) continue;
      await save(applyBuyerEmail(row, inboundEmail));
    }
  }
  const locked =
    deals
      .filter((row) => row.status !== "closed" && offerIsLocked(row) && phoneMatches(row, digits))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0] ?? null;
  if (locked) {
    const acceptingFirmOffer =
      !locked.newEnquiry &&
      locked.status === "firm_interest" &&
      locked.firmOffer?.status === "sent" &&
      locked.pi?.status !== "sent" &&
      !looksLikeNewSupply(text, locked.product) &&
      !mentionsLockedRequest(text, locked.requestId) &&
      classifyBuyerReply(text) === "agree";
    const collectingTerms = Boolean(collecting && !offerIsLocked(collecting));
    const takeLocked = shouldTakeLocked({
      hasOpenIndication: Boolean(deal),
      collectingTerms,
      acceptingFirmOffer,
      namesDocument: mentionsLockedRequest(text, locked.requestId),
    });
    if (takeLocked) {
      const row = inboundEmail.includes("@") ? applyBuyerEmail(locked, inboundEmail) : locked;
      const decision = lockedInboundDecision({
        text,
        product: row.product,
        requestId: row.requestId,
        draft: row.newEnquiry ? row.newEnquiry.product : null,
        piSent: row.pi?.status === "sent",
      });
      if (decision.take === "follow_up") {
        const saved = (await save({
          ...row,
          newEnquiry: null,
          messages: [...row.messages, message({ from: "buyer", channel: "whatsapp", text })],
        }))!;
        return { event: "chat", phase: decision.phase, dealId: saved.id, requestId: saved.requestId };
      }
      const saved = (await save({
        ...row,
        newEnquiry: { product: decision.product, at: now() },
      }))!;
      return { event: "chat", phase: "rfq", dealId: saved.id, requestId: saved.requestId };
    }
  }
  if (collecting && !offerIsLocked(collecting)) {
    const follow = await resolveFirmFollowUp(text, collecting.product);
    if (follow === "firm_order") {
      const row = inboundEmail.includes("@") ? applyBuyerEmail(collecting, inboundEmail) : collecting;
      const saved = (await save({
        ...row,
        buyerPhone: phone || row.buyerPhone,
        messages: [...row.messages, message({ from: "buyer", channel: "whatsapp", text })],
      }))!;
      return { event: "firm_interest" as const, phase: "post_yes" as const, dealId: saved.id, requestId: saved.requestId };
    }
  }
  if (!deal && awaitingFo && kind === "agree") {
    return parkProformaForReview(awaitingFo, text, inboundEmail, "whatsapp");
  }
  if (!deal && awaitingFo && kind === "negotiate" && !offerIsLocked(awaitingFo)) {
    return (await save({
      ...awaitingFo,
      status: "negotiating",
      messages: [
        ...awaitingFo.messages,
        message({ from: "buyer", channel: "whatsapp", text }),
        message({ from: "system", channel: "app", text: "Buyer rejected the firm offer. Desk can edit and send again." }),
      ],
    }))!;
  }
  if (deal?.mattThread) {
    return (await save({
      ...deal,
      status: "negotiating",
      messages: [...deal.messages, message({ from: "buyer", channel: "whatsapp", text })],
    }))!;
  }

  if (deal?.status === "indication_sent" && isPlainRefusal(text)) {
    const saved = (await save({
      ...deal,
      messages: [...deal.messages, message({ from: "buyer", channel: "whatsapp", text })],
    }))!;
    return { event: "negotiating", phase: "rfq", dealId: saved.id, requestId: saved.requestId };
  }

  if (deal?.status === "indication_sent" && (kind === "negotiate" || looksLikeCounter(text)) && !isPlainRefusal(text)) {
    const ack = message({
      from: "desk",
      channel: "whatsapp",
      text: "Thanks. The desk has this and will reply to you here.",
      outboundStatus: "queued",
    });
    const saved = (await save({
      ...deal,
      status: "negotiating",
      mattThread: true,
      mattNotifiedAt: now(),
      messages: [
        ...deal.messages,
        message({ from: "buyer", channel: "whatsapp", text }),
        message({ from: "system", channel: "app", text: "Buyer asked to negotiate. Matt has the thread." }),
        ack,
      ],
    }))!;
    await emailMattAboutNegotiation(saved, text);
    await syncRfqStatus(saved.requestId, "negotiating");
    const delivered = await deliverDeskLines(saved, [ack.id], undefined, phone || saved.buyerPhone);
    return delivered;
  }

  if (!deal || kind === "chat") return { event: "chat" };

  const inbound = message({ from: "buyer", channel: "whatsapp", text });
  if (kind === "agree") {
    if (locked?.newEnquiry) {
      const row = inboundEmail.includes("@") ? applyBuyerEmail(locked, inboundEmail) : locked;
      await save({ ...row, newEnquiry: null });
    }
    const saved = (await save({
      ...deal,
      status: "firm_interest",
      firmInterestAt: now(),
      buyerPhone: phone || deal.buyerPhone,
      messages: [...deal.messages, inbound, message({ from: "system", channel: "app", text: "Buyer agreed. Firm offer agent is collecting terms." })],
    }))!;
    await syncRfqStatus(saved.requestId, "firm_interest", {
      buyer_unit_price: saved.buyerPrice,
      selected_supplier: selectedOffer(saved)?.supplierName || "",
    }).catch(() => undefined);
    await import("@/lib/trade/admin-alerts")
      .then(({ notifyBuyerAgreedIndication }) =>
        notifyBuyerAgreedIndication({
          requestId: saved.requestId,
          product: saved.product,
          buyer: saved.buyerName || saved.buyerCompany || saved.buyerPhone,
          price:
            saved.buyerPrice != null
              ? `${saved.currency} ${saved.buyerPrice.toLocaleString("en-GB")} / MT`
              : "",
          dealId: saved.id,
        }),
      )
      .catch(() => undefined);
    return { event: "firm_interest" as const, phase: "post_yes" as const, dealId: saved.id, requestId: saved.requestId };
  }

  const next: DeskDeal = {
    ...deal,
    status: "negotiating",
    messages: [...deal.messages, inbound],
  };
  return (await save(next))!;
}

async function supplierEmailFor(name: string) {
  try {
    const { listTradeSuppliers } = await import("@/lib/trade/store");
    const want = name.trim().toLowerCase();
    if (!want) return "";
    const rows = await listTradeSuppliers();
    return rows.find((row) => row.companyName.trim().toLowerCase() === want)?.email || "";
  } catch {
    return "";
  }
}

async function supplierWechatFor(name: string) {
  try {
    const { listTradeSuppliers } = await import("@/lib/trade/store");
    const want = name.trim().toLowerCase();
    if (!want) return "";
    const rows = await listTradeSuppliers();
    const hit = rows.find((row) => row.companyName.trim().toLowerCase() === want);
    return hit?.wechatOpenid || "";
  } catch {
    return "";
  }
}

async function syncRfqStatus(requestId: string, status: string, extras: Record<string, unknown> = {}) {
  try {
    const { findRfqIdByCode, getTradeRfqRecord, patchTradeRfq } = await import("@/lib/trade/store");
    const id = await findRfqIdByCode(requestId);
    if (!id) return;
    const row = await getTradeRfqRecord(id);
    const prior =
      row?.extras && typeof row.extras === "object" && !Array.isArray(row.extras) ? (row.extras as Record<string, unknown>) : {};
    await patchTradeRfq(id, { status, extras: { ...prior, ...extras } });
  } catch {
    /* trade book update is best-effort */
  }
}

async function deliverDeskLines(deal: DeskDeal, messageIds: string[], fallbackUrl?: string, phoneOverride?: string) {
  const phone = (phoneOverride || deal.buyerPhone || "").trim();
  const pending = new Set(messageIds);
  if (!phone || pending.size === 0) return deal;
  let current = deal;
  for (const msg of deal.messages) {
    if (!pending.has(msg.id) || msg.outboundStatus !== "queued") continue;
    let ok = false;
    try {
      const { sendWhatsAppText } = await import("@/lib/whatsapp/send");
      const sent = await sendWhatsAppText(phone, msg.text);
      ok = sent.ok;
    } catch {
      ok = false;
    }
    if (!ok) {
      ok = await notify(fallbackUrl || deskReplyWebhookUrl(), {
        event: fallbackUrl ? "firm_offer_sent" : "desk_reply",
        dealId: current.id,
        requestId: current.requestId,
        buyerPhone: phone,
        whatsappBody: msg.text,
      });
    }
    if (!ok) continue;
    current = (await save({
      ...current,
      messages: current.messages.map((row) => (row.id === msg.id ? { ...row, outboundStatus: "sent" as const } : row)),
    }))!;
  }
  return current;
}

async function emailMattAboutNegotiation(deal: DeskDeal, buyerText: string) {
  const who = deal.buyerName || deal.buyerCompany || deal.buyerPhone || "The buyer";
  const price = deal.buyerPrice != null ? `${deal.currency} ${deal.buyerPrice} / MT` : "the indication";
  await import("@/lib/trade/admin-alerts").then(({ notifyNegotiationAwaitingMatt }) =>
    notifyNegotiationAwaitingMatt({
      requestId: deal.requestId,
      product: deal.product,
      buyer: who,
      price,
      buyerText,
      dealId: deal.id,
    }),
  );
}

function packingHandoff(deal: DeskDeal) {
  const qty = deal.quantityMt ? `${deal.quantityMt} MT of ` : "";
  const price = deal.buyerPrice != null ? `${deal.currency} ${deal.buyerPrice.toLocaleString("en-GB")} / MT` : "the price we agreed";
  return `Good — we can proceed at ${price}. How would you like the ${qty}${deal.product} packed? 25kg bags, jumbo bags, or bulk?`;
}

function lastDeskText(deal: DeskDeal) {
  return [...deal.messages].reverse().find((row) => row.from === "desk")?.text || "";
}

async function continueFirmInterest(deal: DeskDeal, text: string, inboundEmail: string) {
  const row = inboundEmail.includes("@") ? applyBuyerEmail(deal, inboundEmail) : deal;
  const inbound = message({ from: "buyer", channel: "whatsapp", text });
  const exec = emptyExecution({
    ...(row.execution ?? {}),
    destinationPort: row.execution?.destinationPort || row.destination,
    incoterm: row.execution?.incoterm || row.incoterm,
  });
  const recapPending = /please confirm so we can prepare the firm offer/i.test(lastDeskText(row));
  if (recapPending && classifyBuyerReply(text) === "agree") {
    const confirmed = { ...exec, confirmedAt: now() };
    const parked = parkFirmOffer({
      ...row,
      execution: confirmed,
      messages: [
        ...row.messages,
        inbound,
        message({ from: "system", channel: "app", text: "Buyer confirmed execution terms. Firm offer is on the desk to review." }),
      ],
    });
    const thanks = message({
      from: "desk",
      channel: "whatsapp",
      text: "Thanks — the firm offer is with the desk to review. We will send it when it is ready. No need to pay until you have the proforma.",
      outboundStatus: "queued",
    });
    const saved = (await save({ ...parked, messages: [...parked.messages, thanks] }))!;
    return deliverDeskLines(saved, [thanks.id]);
  }
  const merged = recapPending ? { ...exec, notes: [exec.notes, text.trim()].filter(Boolean).join(" · ") } : applyBuyerTermAnswer(exec, text);
  const ask = nextFirmAsk(merged);
  const outbound = message({
    from: "desk",
    channel: "whatsapp",
    text: ask.text,
    outboundStatus: "queued",
  });
  const saved = (await save({
    ...row,
    execution: merged,
    messages: [...row.messages, inbound, outbound],
  }))!;
  return deliverDeskLines(saved, [outbound.id]);
}

export async function sendDeskReply(input: { id: string; text: string; actor: string }): Promise<DeskDeal | { error: string }> {
  const deal = await getRecord(DESK_DEALS, input.id);
  if (!deal) return { error: "That shortlist was not found." };
  const text = input.text.trim().slice(0, 1500);
  if (!text) return { error: "Write a reply." };
  if (deal.status === "waiting_desk") return { error: "Send the indication first." };
  if (deal.status === "closed") return { error: "This request is closed." };
  if (deal.status === "firm_interest") return { error: "This deal is already firm interest." };

  const outbound = message({ from: "desk", channel: "whatsapp", text, outboundStatus: "queued" });
  const saved = (await save({
    ...deal,
    status: "negotiating",
    messages: [...deal.messages, outbound],
  }))!;
  return deliverDeskLines(saved, [outbound.id]);
}

export async function handNegotiationToAgent(input: { id: string; actor: string; price: number }): Promise<DeskDeal | { error: string }> {
  const deal = await getRecord(DESK_DEALS, input.id);
  if (!deal) return { error: "That shortlist was not found." };
  if (!deal.mattThread) return { error: "This thread is not in negotiation." };
  if (deal.status === "closed") return { error: "This request is closed." };
  const price = Math.round(Number(input.price) * 100) / 100;
  if (!Number.isFinite(price) || price <= 0 || price > 10000) return { error: "Enter the agreed price per MT." };
  const actor = input.actor || "Desk";
  const agreed: DeskDeal = { ...deal, buyerPrice: price };
  const outbound = message({ from: "desk", channel: "whatsapp", text: packingHandoff(agreed), outboundStatus: "queued" });
  const saved = (await save({
    ...agreed,
    status: "firm_interest",
    mattThread: false,
    firmInterestAt: now(),
    messages: [
      ...deal.messages,
      message({
        from: "system",
        channel: "app",
        text: `${actor} agreed ${agreed.currency || "USD"} ${price} / MT and handed this to the firm offer agent.`,
      }),
      outbound,
    ],
  }))!;
  return deliverDeskLines(saved, [outbound.id]);
}

export async function endNegotiation(input: { id: string; actor: string }): Promise<DeskDeal | { error: string }> {
  const deal = await getRecord(DESK_DEALS, input.id);
  if (!deal) return { error: "That shortlist was not found." };
  if (!deal.mattThread) return { error: "This thread is not in negotiation." };
  if (deal.status === "closed") return deal;
  const actor = input.actor || "Desk";
  const outbound = message({
    from: "desk",
    channel: "whatsapp",
    text: "Thank you. We'll leave this one here. Message us when you want to look at a supply again.",
    outboundStatus: "queued",
  });
  const saved = (await save({
    ...deal,
    status: "closed",
    mattThread: false,
    messages: [
      ...deal.messages,
      outbound,
      message({ from: "system", channel: "app", text: `${actor} ended the negotiation. The trade id is kept.` }),
    ],
  }))!;
  return deliverDeskLines(saved, [outbound.id]);
}

export async function queuedWhatsApp() {
  const deals = await listRecords(DESK_DEALS);
  const out: Array<{ dealId: string; messageId: string; phone: string; text: string; requestId: string }> = [];
  for (const deal of deals) {
    for (const msg of deal.messages) {
      if (msg.from === "desk" && msg.channel === "whatsapp" && msg.outboundStatus === "queued") {
        out.push({ dealId: deal.id, messageId: msg.id, phone: deal.buyerPhone, text: msg.text, requestId: deal.requestId });
      }
    }
  }
  return out;
}

export async function issueSupplierPack(input: { id: string; actor: string }): Promise<DeskDeal | { error: string }> {
  const deal = await getRecord(DESK_DEALS, input.id);
  if (!deal) return { error: "That shortlist was not found." };
  if (deal.status !== "firm_interest") return { error: "Confirm firm interest before issuing supplier documents." };
  if (deal.pi?.status !== "sent") return { error: "Email the proforma and confirm offline payment before issuing supplier documents." };
  const offer = selectedOffer(deal);
  if (!offer) return { error: "No selected supplier on this deal." };

  const next: DeskDeal = {
    ...deal,
    supplierPackSentAt: now(),
    messages: [
      ...deal.messages,
      message({
        from: "system",
        channel: "app",
        text: `${input.actor || "Desk"} issued supplier documents to ${offer.supplierName} at ${offer.currency} ${offer.unitPrice}/MT.`,
      }),
    ],
  };
  const saved = (await save(next))!;
  const urls = new Set<string>();
  for (const raw of [process.env.DESK_SUPPLIER_PACK_WEBHOOK_URL, DEFAULT_SUPPLIER_PACK_WEBHOOK]) {
    const url = raw?.trim().replace(/\/$/, "");
    if (url?.startsWith("https://") || url?.startsWith("http://localhost")) urls.add(url);
  }
  const payload = {
    event: "supplier_pack",
    dealId: saved.id,
    requestId: saved.requestId,
    product: saved.product,
    quantityMt: saved.quantityMt,
    destination: saved.destination,
    incoterm: offer.incoterm || saved.incoterm,
    loadPort: offer.loadPort,
    packing: saved.execution?.packing || offer.notes,
    supplierName: offer.supplierName,
    supplierEmail: await supplierEmailFor(offer.supplierName),
    supplierUnitPrice: offer.unitPrice,
    currency: offer.currency || saved.currency,
    supplierOpenId: offer.wechatOpenId ?? "",
    purchase_order: supplierDocumentFromDeal(saved, "purchase_order"),
    purchase_contract: supplierDocumentFromDeal(saved, "purchase_contract"),
    documentary_instructions: supplierDocumentFromDeal(saved, "documentary_instructions"),
  };
  await Promise.all([...urls].map((url) => notify(url, payload)));
  return saved;
}

function findDealForPi(deals: DeskDeal[], requestId: string, phone: string, email = "") {
  const ref = requestId.trim().toLowerCase();
  const key = rfqKey(requestId);
  const digits = phone.replace(/\D/g, "");
  const mail = email.trim().toLowerCase();
  const open = deals.filter((row) => row.status !== "closed");
  return (
    open.find((row) => row.requestId.trim().toLowerCase() === ref) ??
    open.find((row) => key && rfqKey(row.requestId) === key) ??
    open.find((row) => {
      const theirs = row.buyerPhone.replace(/\D/g, "");
      return Boolean(theirs && digits && (theirs.endsWith(digits) || digits.endsWith(theirs)));
    }) ??
    open.find((row) => mail && row.buyerEmail?.trim().toLowerCase() === mail) ??
    null
  );
}

async function parkProformaForReview(
  deal: DeskDeal,
  buyerText: string,
  email: string,
  channel: "email" | "whatsapp",
): Promise<DeskDeal | { error: string }> {
  const generated = buyerDocumentFromDeal(deal, "proforma");
  if (!generated) return { error: "Need a buyer price on this deal before the proforma." };
  const withMail = email.includes("@") ? applyBuyerEmail(deal, email) : deal;
  const order = applyExecutionToOrder(withMail, {
    ...generated,
    buyer: {
      ...generated.buyer,
      email: (email.includes("@") ? email : generated.buyer.email) || generated.buyer.email,
    },
  });
  const next: DeskDeal = {
    ...withMail,
    pi: {
      status: "review",
      updatedAt: now(),
      sentAt: withMail.pi?.sentAt ?? null,
      sentTo: withMail.pi?.sentTo ?? null,
      order,
    },
    messages: [
      ...withMail.messages,
      message({ from: "buyer", channel, text: buyerText }),
      message({
        from: "system",
        channel: "app",
        text:
          channel === "email"
            ? "Buyer accepted the firm offer by email. Proforma is on the desk for review — do not email it until Matt sends it."
            : "Buyer accepted the firm offer on WhatsApp. Proforma is on the desk for review.",
      }),
    ],
  };
  return (await save(next))!;
}

function textField(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function parseExecution(body: unknown): {
  requestId: string;
  phone: string;
  email: string;
  execution: DeskExecution;
} | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;
  const profile = raw.profile && typeof raw.profile === "object" ? (raw.profile as Record<string, unknown>) : raw;
  const requestId = textField(raw.requestId ?? raw.request_id ?? raw.reference, 80);
  const phone = textField(raw.phone ?? raw.buyerPhone, 40);
  const email = textField(raw.email ?? raw.buyerEmail ?? profile.email, 160);
  const packing = textField(profile.packing, 200);
  const paymentTerms = textField(profile.payment_terms ?? profile.paymentTerms, 500);
  if (!requestId && !phone) return null;
  if (!packing && !paymentTerms && !textField(profile.origin_preference ?? profile.origin, 120)) return null;
  return {
    requestId,
    phone,
    email,
    execution: {
      packing,
      origin: textField(profile.origin_preference ?? profile.origin, 120),
      destinationPort: textField(profile.destination_port ?? profile.destinationPort, 120),
      incoterm: textField(profile.incoterm, 40),
      shipmentWindow: textField(profile.shipment_window ?? profile.shipmentWindow, 120),
      paymentTerms,
      inspection: textField(profile.inspection_requirements ?? profile.inspection, 300),
      documentation: textField(profile.documentation_requirements ?? profile.documentation, 300),
      specification: textField(profile.specification, 200),
      urgency: textField(profile.urgency_level ?? profile.urgency, 40),
      notes: textField(profile.additional_notes ?? profile.notes, 800),
      confirmedAt: now(),
    },
  };
}

function applyExecutionToOrder(deal: DeskDeal, order: NonNullable<ReturnType<typeof buyerDocumentFromDeal>>) {
  const filled = buyerDocumentFromDeal({ ...deal, execution: deal.execution }, order.document as "firm_offer" | "proforma" | "sales_contract");
  if (!filled) return order;
  return {
    ...order,
    packing: order.packing || filled.packing,
    origin: order.origin || filled.origin,
    shipping: order.shipping || filled.shipping,
    payment_terms: order.payment_terms || filled.payment_terms,
    discharge_port: order.discharge_port || filled.discharge_port,
    price_basis: order.price_basis || filled.price_basis,
    incoterm: order.incoterm || filled.incoterm,
    form_grade: order.form_grade || filled.form_grade,
    documents: order.documents || filled.documents,
    additional_information: order.additional_information || filled.additional_information,
  };
}

/** n8n firm-order agent: lock WhatsApp terms onto the deal so every PDF uses them. */
export async function saveFirmTerms(body: unknown): Promise<DeskDeal | { error: string }> {
  const parsed = parseExecution(body);
  if (!parsed) return { error: "Need requestId and the confirmed packing / origin / payment terms." };
  const deals = await listRecords(DESK_DEALS);
  const deal = findDealForPi(deals, parsed.requestId, parsed.phone);
  if (!deal) return { error: `No desk deal for ${parsed.requestId || "that buyer"}.` };

  const next: DeskDeal = {
    ...deal,
    buyerEmail: parsed.email || deal.buyerEmail || "",
    destination: parsed.execution.destinationPort || deal.destination,
    incoterm: parsed.execution.incoterm || deal.incoterm,
    execution: parsed.execution,
    messages: [
      ...deal.messages,
      message({
        from: "system",
        channel: "app",
        text: `Buyer confirmed execution terms: packing ${parsed.execution.packing || "n/a"}, ${parsed.execution.incoterm || deal.incoterm} ${parsed.execution.destinationPort || deal.destination}, ${parsed.execution.paymentTerms || "payment tbc"}.`,
      }),
    ],
  };
  if (next.pi?.status === "review") {
    next.pi = { ...next.pi, updatedAt: now(), order: applyExecutionToOrder(next, next.pi.order) };
  }
  const parked = parkFirmOffer(next);
  if (parked.firmOffer && next.firmOffer?.status !== "sent") {
    parked.messages = [
      ...parked.messages,
      message({
        from: "system",
        channel: "app",
        text: `Firm offer ${parked.firmOffer.order.order_ref || parked.requestId} is on the desk. Edit it, attach COA/TDS/photos, confirm the supplier, then send.`,
      }),
    ];
  }
  return (await save(parked))!;
}

/** n8n WF11: park a proforma on the desk deal. Does not email the buyer. */
export async function submitPiForReview(body: unknown): Promise<DeskDeal | { error: string }> {
  const order = proformaFromN8n(body);
  if (!order) return { error: "Need a proforma payload (document: proforma, product, buyer unit price)." };
  const deals = await listRecords(DESK_DEALS);
  const deal = findDealForPi(deals, order.reference, order.buyer.phone || "", order.buyer.email || "");
  if (!deal) return { error: `No desk deal for ${order.reference || "that buyer"}.` };
  const filled = applyExecutionToOrder(deal, order);

  const next: DeskDeal = {
    ...deal,
    pi: {
      status: "review",
      updatedAt: now(),
      sentAt: deal.pi?.sentAt ?? null,
      sentTo: deal.pi?.sentTo ?? null,
      order: filled,
    },
    messages: [
      ...deal.messages,
      message({
        from: "system",
        channel: "app",
        text: `Proforma ${order.order_ref || order.reference} is ready for review. Edit it on this card, then send to the buyer by email.`,
      }),
    ],
  };
  return (await save(next))!;
}

export async function ingestDeskPiInbound(
  body: unknown,
): Promise<DeskDeal | { error: string } | { event: "ignored" | "negotiating"; dealId?: string; requestId?: string }> {
  const mail = parseBuyerEmailReply(body);
  if (mail && "ignore" in mail) return { event: "ignored" };
  if (!mail) return submitPiForReview(body);

  const deals = await listRecords(DESK_DEALS);
  const deal = findDealForPi(deals, mail.requestId, "", mail.from);
  if (!deal) return { error: `No desk deal for ${mail.requestId || mail.from}.` };

  const foSent = deal.firmOffer?.status === "sent" && deal.pi?.status !== "sent";
  if (mail.kind === "agree" && foSent) {
    return parkProformaForReview(deal, mail.text || mail.subject, mail.from, "email");
  }
  if (mail.kind === "negotiate") {
    const saved = (await save({
      ...applyBuyerEmail(deal, mail.from),
      status: "negotiating",
      mattThread: true,
      mattNotifiedAt: now(),
      messages: [
        ...deal.messages,
        message({ from: "buyer", channel: "email", text: mail.text || mail.subject }),
        message({ from: "system", channel: "app", text: "Buyer replied on email. Matt has the thread." }),
      ],
    }))!;
    await emailMattAboutNegotiation(saved, mail.text || mail.subject);
    await syncRfqStatus(saved.requestId, "negotiating");
    return { event: "negotiating", dealId: saved.id, requestId: saved.requestId };
  }
  if (foSent) {
    const saved = (await save({
      ...applyBuyerEmail(deal, mail.from),
      messages: [...deal.messages, message({ from: "buyer", channel: "email", text: mail.text || mail.subject })],
    }))!;
    return saved;
  }
  return { event: "ignored" };
}

export async function savePiDraft(
  id: string,
  values: PiEditorValues,
  _actor: string,
): Promise<DeskDeal | { error: string }> {
  const deal = await getRecord(DESK_DEALS, id);
  if (!deal?.pi) return { error: "No proforma on this deal yet." };
  const order = applyPiEditor(deal.pi.order, values);
  if ("error" in order) return order;
  const next: DeskDeal = {
    ...deal,
    pi: { ...deal.pi, status: "review", updatedAt: now(), order },
  };
  return (await save(next))!;
}

export async function saveSalesContractDraft(
  id: string,
  values: PiEditorValues,
  _actor: string,
): Promise<DeskDeal | { error: string }> {
  const deal = await getRecord(DESK_DEALS, id);
  if (!deal?.pi) return { error: "Send the proforma first." };
  const base = salesContractDraftFromDeal(deal) ?? salesContractFromPi(deal.pi.order);
  const order = applySalesContractEditor(base, values);
  if ("error" in order) return order;
  const prior = deal.salesContract;
  const next: DeskDeal = {
    ...deal,
    salesContract: {
      status: "review",
      updatedAt: now(),
      sentAt: prior?.sentAt ?? null,
      sentTo: prior?.sentTo ?? null,
      order,
    },
  };
  return (await save(next))!;
}

export async function markSalesContractSent(id: string, to: string, actor: string): Promise<DeskDeal | { error: string }> {
  const deal = await getRecord(DESK_DEALS, id);
  if (!deal?.pi) return { error: "Send the proforma first." };
  const order = salesContractDraftFromDeal(deal);
  if (!order) return { error: "No sales contract on this deal yet." };
  const at = now();
  const next: DeskDeal = {
    ...deal,
    salesContract: {
      status: "sent",
      updatedAt: at,
      sentAt: at,
      sentTo: to,
      order,
    },
    messages: [
      ...deal.messages,
      message({ from: "system", channel: "app", text: `${actor || "Desk"} emailed the sales contract to ${to}.` }),
    ],
  };
  return (await save(next))!;
}

export async function addFoAttachment(
  id: string,
  file: DeskFoAttachment,
  bytes: Uint8Array,
  actor: string,
): Promise<DeskDeal | { error: string }> {
  const deal = await getRecord(DESK_DEALS, id);
  if (!deal) return { error: "That shortlist was not found." };
  if (deal.status === "closed") return { error: "This request is closed." };
  const pack = emptyFoPack(deal.foPack);
  if (pack.attachments.length >= FO_MAX_FILES) return { error: `At most ${FO_MAX_FILES} files on the pack.` };
  await storeFoAttachmentFile(file.id, file.filename, bytes, file.contentType);
  pack.attachments = [...pack.attachments, file];
  const next: DeskDeal = {
    ...deal,
    foPack: pack,
    messages: [
      ...deal.messages,
      message({ from: "system", channel: "app", text: `${actor || "Desk"} attached ${file.kind.toUpperCase()} (${file.filename}).` }),
    ],
  };
  return (await save(next))!;
}

export async function removeFoAttachment(id: string, attachmentId: string, actor: string): Promise<DeskDeal | { error: string }> {
  const deal = await getRecord(DESK_DEALS, id);
  if (!deal) return { error: "That shortlist was not found." };
  const pack = emptyFoPack(deal.foPack);
  const hit = pack.attachments.find((row) => row.id === attachmentId);
  if (!hit) return { error: "That file is not on this pack." };
  await deleteFoAttachmentFile(attachmentId);
  pack.attachments = pack.attachments.filter((row) => row.id !== attachmentId);
  const next: DeskDeal = {
    ...deal,
    foPack: pack,
    messages: [
      ...deal.messages,
      message({ from: "system", channel: "app", text: `${actor || "Desk"} removed ${hit.kind.toUpperCase()} (${hit.filename}).` }),
    ],
  };
  return (await save(next))!;
}

export async function confirmSupplierFo(id: string, actor: string): Promise<DeskDeal | { error: string }> {
  const deal = await getRecord(DESK_DEALS, id);
  if (!deal) return { error: "That shortlist was not found." };
  if (deal.status === "closed") return { error: "This request is closed." };
  const at = now();
  const pack = emptyFoPack(deal.foPack);
  pack.supplierConfirmedAt = at;
  pack.supplierConfirmedBy = actor;
  const next: DeskDeal = {
    ...deal,
    foPack: pack,
    messages: [
      ...deal.messages,
      message({
        from: "system",
        channel: "app",
        text: `${actor || "Desk"} confirmed the supplier signed off this firm offer (WeChat).`,
      }),
    ],
  };
  return (await save(next))!;
}

export async function saveFirmOfferDraft(
  id: string,
  values: PiEditorValues,
  _actor: string,
): Promise<DeskDeal | { error: string }> {
  const deal = await getRecord(DESK_DEALS, id);
  if (!deal) return { error: "That shortlist was not found." };
  if (deal.status === "closed") return { error: "This request is closed." };
  const base = firmOfferDraftFromDeal(deal);
  if (!base) return { error: "Need a buyer price on this deal before the firm offer." };
  const order = applyFirmOfferEditor(base, values);
  if ("error" in order) return order;
  const prior = deal.firmOffer;
  const next: DeskDeal = {
    ...deal,
    firmOffer: {
      status: "review",
      updatedAt: now(),
      sentAt: prior?.sentAt ?? null,
      sentTo: prior?.sentTo ?? null,
      order,
    },
  };
  return (await save(next))!;
}

export async function markFirmOfferSent(id: string, to: string, actor: string): Promise<DeskDeal | { error: string }> {
  const deal = await getRecord(DESK_DEALS, id);
  if (!deal?.firmOffer) return { error: "No firm offer on this deal yet." };
  if (deal.status === "closed") return { error: "This request is closed." };
  const at = now();
  const next: DeskDeal = {
    ...deal,
    status: deal.status === "negotiating" ? "firm_interest" : deal.status,
    firmOffer: { ...deal.firmOffer, status: "sent", updatedAt: at, sentAt: at, sentTo: to },
    messages: [
      ...deal.messages,
      message({ from: "system", channel: "app", text: `${actor || "Desk"} sent the firm offer to ${to}. Reply YES on that email to accept.` }),
    ],
  };
  const wa = message({
    from: "desk",
    channel: "whatsapp",
    text: firmOfferWhatsApp(next, to),
    outboundStatus: "queued",
  });
  const saved = (await save({ ...next, messages: [...next.messages, wa] }))!;
  await deliverDeskLines(saved, [wa.id], firmOfferWebhookUrl());
  await notifyChosenSupplier(saved);
  return (await getRecord(DESK_DEALS, saved.id)) ?? saved;
}

async function notifyChosenSupplier(deal: DeskDeal) {
  const mill = millFirmOfferWeChat(deal);
  if (!mill) {
    await notify(firmOfferMillWebhookUrl(), {
      event: "firm_offer_sent_mill",
      dealId: deal.id,
      requestId: deal.requestId,
      skip: true,
      reason: "no_selected_mill_quote",
    });
    return;
  }
  const openid = mill.wechatOpenId || (await supplierWechatFor(mill.supplierName));
  let ok = false;
  if (openid) {
    try {
      const { sendWechatText } = await import("@/lib/wechat/send");
      const sent = await sendWechatText(openid, mill.millMessage);
      ok = sent.ok;
    } catch {
      ok = false;
    }
  }
  if (ok) return;
  await notify(firmOfferMillWebhookUrl(), { ...mill, wechatOpenId: openid });
}

export async function rejectFirmOffer(id: string, actor: string): Promise<DeskDeal | { error: string }> {
  const deal = await getRecord(DESK_DEALS, id);
  if (!deal) return { error: "That shortlist was not found." };
  if (deal.status === "closed") return { error: "This request is closed." };
  const next: DeskDeal = {
    ...deal,
    status: "negotiating",
    firmOffer: deal.firmOffer ? { ...deal.firmOffer, status: "review", updatedAt: now() } : deal.firmOffer,
    messages: [
      ...deal.messages,
      message({ from: "system", channel: "app", text: `${actor || "Desk"} sent the firm offer back to negotiate.` }),
    ],
  };
  return (await save(next))!;
}

export async function closeAllOpenDeals(actor: string): Promise<{ closed: string[]; alreadyClosed: string[] }> {
  const deals = await listRecords(DESK_DEALS);
  const closed: string[] = [];
  const alreadyClosed: string[] = [];
  for (const deal of deals) {
    if (deal.status === "closed") {
      alreadyClosed.push(deal.requestId || deal.id);
      continue;
    }
    const result = await closeDeal(deal.id, actor);
    if (!("error" in result)) closed.push(result.requestId || result.id);
  }
  return { closed, alreadyClosed };
}

export async function closeDeal(id: string, actor: string): Promise<DeskDeal | { error: string }> {
  const deal = await getRecord(DESK_DEALS, id);
  if (!deal) return { error: "That shortlist was not found." };
  if (deal.status === "closed") return deal;
  const next: DeskDeal = {
    ...deal,
    status: "closed",
    messages: [
      ...deal.messages,
      message({
        from: "system",
        channel: "app",
        text: `${actor || "Desk"} closed ${deal.requestId}. The trade id is kept.`,
      }),
    ],
  };
  return (await save(next))!;
}

export async function markPiSent(id: string, to: string, actor: string): Promise<DeskDeal | { error: string }> {
  const deal = await getRecord(DESK_DEALS, id);
  if (!deal?.pi) return { error: "No proforma on this deal yet." };
  const at = now();
  const next: DeskDeal = {
    ...deal,
    pi: { ...deal.pi, status: "sent", updatedAt: at, sentAt: at, sentTo: to },
    messages: [
      ...deal.messages,
      message({ from: "system", channel: "app", text: `${actor || "Desk"} emailed the proforma invoice to ${to}.` }),
    ],
  };
  return (await save(next))!;
}

export async function markWhatsAppSent(dealId: string, messageId: string): Promise<DeskDeal | { error: string }> {
  const deal = await getRecord(DESK_DEALS, dealId);
  if (!deal) return { error: "Deal not found." };
  const next: DeskDeal = {
    ...deal,
    messages: deal.messages.map((msg) => (msg.id === messageId ? { ...msg, outboundStatus: "sent" as const } : msg)),
  };
  return (await save(next))!;
}
