import "server-only";

import { getRecord, listRecords, putRecords } from "@/lib/data/records";
import { DESK_DEALS } from "@/lib/data/tables";
import { buyerUnitPrice, classifyBuyerReply, indicationWhatsApp, parseShortlistBody, selectedOffer } from "@/lib/desk-hitl/logic";
import { applyPiEditor, proformaFromN8n, type PiEditorValues } from "@/lib/desk-hitl/pi";
import type { DeskDeal, DeskMessage } from "@/lib/desk-hitl/types";
import { listOutbox } from "@/lib/mailer";
import { buyerDocumentFromDeal, supplierDocumentFromDeal } from "@/lib/firm-order/from-deal";

const now = () => new Date().toISOString();
const idOf = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const dealIdFor = (requestId: string) => `deal-${requestId.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(0, 80)}`;

function message(partial: Omit<DeskMessage, "id" | "at"> & { at?: string }): DeskMessage {
  return { id: idOf("msg"), at: partial.at ?? now(), ...partial };
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

function indicationWebhookUrls(callbackUrl?: string | null) {
  const urls = new Set<string>();
  for (const raw of [callbackUrl, process.env.DESK_INDICATION_WEBHOOK_URL, DEFAULT_INDICATION_WEBHOOK]) {
    const url = raw?.trim().replace(/\/$/, "");
    if (url?.startsWith("https://") || url?.startsWith("http://localhost")) urls.add(url);
  }
  return [...urls];
}

async function notify(url: string | null | undefined, payload: Record<string, unknown>) {
  if (!url?.startsWith("https://") && !url?.startsWith("http://localhost")) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    // n8n Wait / WF9 is best-effort; the desk still has the deal.
  }
}

async function notifyIndication(callbackUrl: string | null | undefined, payload: Record<string, unknown>) {
  await Promise.all(indicationWebhookUrls(callbackUrl).map((url) => notify(url, payload)));
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
  return recoverPiIfSent(deal);
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

export async function recordBuyerInbound(input: {
  phone?: string;
  requestId?: string;
  text: string;
}): Promise<DeskDeal | { error: string } | { event: "chat" }> {
  const text = input.text.trim().slice(0, 4000);
  if (!text) return { error: "Empty message." };

  const deals = await listRecords(DESK_DEALS);
  const phone = (input.phone || "").replace(/\s+/g, "");
  const digits = phone.replace(/\D/g, "");
  const deal =
    (input.requestId ? deals.find((row) => row.requestId === input.requestId) : null) ??
    deals.find((row) => {
      if (row.status !== "indication_sent" && row.status !== "negotiating") return false;
      const theirs = row.buyerPhone.replace(/\D/g, "");
      return theirs && digits && (theirs.endsWith(digits) || digits.endsWith(theirs));
    }) ??
    null;
  const kind = classifyBuyerReply(text);
  if (!deal || kind === "chat") return { event: "chat" };

  const inbound = message({ from: "buyer", channel: "whatsapp", text });
  if (kind === "agree") {
    const next: DeskDeal = {
      ...deal,
      status: "firm_interest",
      firmInterestAt: now(),
      messages: [...deal.messages, inbound, message({ from: "system", channel: "app", text: "Buyer agreed. Firm interest created." })],
    };
    const saved = (await save(next))!;
    await notify(saved.callbackUrl, {
      event: "firm_interest",
      dealId: saved.id,
      requestId: saved.requestId,
      buyerPhone: saved.buyerPhone,
      buyerPrice: saved.buyerPrice,
      buyer_documents: {
        proforma: buyerDocumentFromDeal(saved, "proforma"),
        sales_contract: buyerDocumentFromDeal(saved, "sales_contract"),
      },
    });
    return saved;
  }

  const next: DeskDeal = {
    ...deal,
    status: "negotiating",
    messages: [...deal.messages, inbound],
  };
  return (await save(next))!;
}

export async function sendDeskReply(input: { id: string; text: string; actor: string }): Promise<DeskDeal | { error: string }> {
  const deal = await getRecord(DESK_DEALS, input.id);
  if (!deal) return { error: "That shortlist was not found." };
  const text = input.text.trim().slice(0, 1500);
  if (!text) return { error: "Write a reply." };
  if (deal.status === "waiting_desk") return { error: "Send the indication first." };
  if (deal.status === "firm_interest") return { error: "This deal is already firm interest." };

  const next: DeskDeal = {
    ...deal,
    status: "negotiating",
    messages: [
      ...deal.messages,
      message({ from: "desk", channel: "whatsapp", text, outboundStatus: "queued" }),
    ],
  };
  return (await save(next))!;
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
    packing: offer.notes,
    supplierName: offer.supplierName,
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

function findDealForPi(deals: DeskDeal[], requestId: string, phone: string) {
  const ref = requestId.trim().toLowerCase();
  const digits = phone.replace(/\D/g, "");
  return (
    deals.find((row) => row.requestId.trim().toLowerCase() === ref) ??
    deals.find((row) => {
      const theirs = row.buyerPhone.replace(/\D/g, "");
      return Boolean(theirs && digits && (theirs.endsWith(digits) || digits.endsWith(theirs)));
    }) ??
    null
  );
}

/** n8n WF11: park a proforma on the desk deal. Does not email the buyer. */
export async function submitPiForReview(body: unknown): Promise<DeskDeal | { error: string }> {
  const order = proformaFromN8n(body);
  if (!order) return { error: "Need a proforma payload (document: proforma, product, buyer unit price)." };
  const deals = await listRecords(DESK_DEALS);
  const deal = findDealForPi(deals, order.reference, order.buyer.phone || "");
  if (!deal) return { error: `No desk deal for ${order.reference || "that buyer"}.` };

  const next: DeskDeal = {
    ...deal,
    pi: {
      status: "review",
      updatedAt: now(),
      sentAt: deal.pi?.sentAt ?? null,
      sentTo: deal.pi?.sentTo ?? null,
      order,
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

export async function markSalesContractSent(id: string, to: string, actor: string): Promise<DeskDeal | { error: string }> {
  const deal = await getRecord(DESK_DEALS, id);
  if (!deal?.pi) return { error: "Send the proforma first." };
  const at = now();
  const next: DeskDeal = {
    ...deal,
    salesContract: {
      status: "sent",
      updatedAt: at,
      sentAt: at,
      sentTo: to,
      order: deal.salesContract?.order ?? deal.pi.order,
    },
    messages: [
      ...deal.messages,
      message({ from: "system", channel: "app", text: `${actor || "Desk"} emailed the sales contract to ${to}.` }),
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
