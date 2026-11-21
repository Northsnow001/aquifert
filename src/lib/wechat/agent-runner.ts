import "server-only";

import { EXTRACTION_MODEL, generateText, geminiKey } from "@/lib/aquibot-engine/gemini";
import {
  getSupplierChatState,
  getTradeRfqByCode,
  getTradeSupplierByWechatOpenid,
  insertTradeSupplier,
  insertWechatQuote,
  linkSupplierWechatFollow,
  listWechatThread,
  saveSupplierChatState,
} from "@/lib/trade/store";
import type { TradeMessage, TradeSupplier, WechatChatState } from "@/lib/trade/types";
import { MATT_GUARD } from "@/lib/wechat/agent-defs";
import { getTradeAgent } from "@/lib/wechat/agent-store";
import { asBool, asString, parseJsonObject } from "@/lib/wechat/agent-parse";
import { WAIT_WEEKLY, nextSupplierChat, waitingForWeekly } from "@/lib/wechat/chat";

function historyBlock(messages: TradeMessage[]) {
  return messages
    .slice(-12)
    .map((row) => `${row.direction === "in" ? "Supplier" : "Matt"}: ${row.body}`)
    .join("\n");
}

async function askGemini(system: string, user: string) {
  const { text } = await generateText({
    model: EXTRACTION_MODEL,
    json: true,
    temperature: 0,
    timeoutMs: 25_000,
    maxOutputTokens: 2048,
    system,
    turns: [{ role: "user", text: user }],
  });
  return parseJsonObject(text);
}

function offerFields(offer: Record<string, unknown>) {
  return {
    productLabel: asString(offer.product_name),
    specification: asString(offer.specification),
    unitPrice: asString(offer.unit_price),
    currency: asString(offer.currency) || "USD",
    quantityMt: asString(offer.quantity),
    packing: asString(offer.packaging),
    loadPort: asString(offer.load_port),
    destinationPort: asString(offer.destination),
    incoterm: asString(offer.incoterms),
    deliveryWindow: asString(offer.delivery_turnaround),
    rawMessage: asString(offer.raw_body),
    validity: asString(offer.validity),
  };
}

function buyerRequestFields(rfq: Record<string, unknown> | null) {
  if (!rfq) return "";
  const parts = [
    ["product_name", rfq.product_label],
    ["specification", rfq.specification],
    ["quantity", rfq.quantity_mt],
    ["packaging", rfq.packing],
    ["incoterms", rfq.incoterm],
    ["destination", rfq.destination_port || rfq.destination_country],
    ["delivery_turnaround", rfq.shipment_window],
  ]
    .filter(([, value]) => value != null && String(value).trim() !== "")
    .map(([name]) => name);
  return parts.join(", ");
}

async function saveOffers(supplier: TradeSupplier, data: Record<string, unknown>, text: string, weekly: boolean) {
  const offers = Array.isArray(data.offers) ? data.offers.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
  const extract = data.extract && typeof data.extract === "object" ? (data.extract as Record<string, unknown>) : null;
  const rows = offers.length ? offers : extract ? [extract] : [];
  if (!rows.length && asBool(data.is_no_offer)) {
    await insertWechatQuote({
      supplierId: supplier.id,
      kind: weekly ? "weekly" : "rfq",
      rfqCode: asString(data.rfq_id) || undefined,
      productLabel: "",
      isNoOffer: true,
      rawMessage: text,
    });
    return;
  }
  for (const offer of rows) {
    const fields = offerFields(offer);
    await insertWechatQuote({
      supplierId: supplier.id,
      kind: weekly ? "weekly" : "rfq",
      rfqCode: asString(offer.rfq_id) || asString(data.rfq_id) || undefined,
      productLabel: fields.productLabel,
      specification: fields.specification,
      unitPrice: fields.unitPrice,
      currency: fields.currency,
      quantityMt: fields.quantityMt,
      packing: fields.packing,
      loadPort: fields.loadPort,
      destinationPort: fields.destinationPort,
      incoterm: fields.incoterm,
      deliveryWindow: fields.deliveryWindow,
      isNoOffer: asBool(data.is_no_offer) || asBool(offer.is_no_offer),
      rawMessage: fields.rawMessage || text,
      extras: { validity: fields.validity },
    });
  }
}

export async function runKnownSupplierTurn(input: { supplier: TradeSupplier; text: string; messages: TradeMessage[] }) {
  const state = await getSupplierChatState(input.supplier.id).catch(() => ({
    stage: input.supplier.awaitingReply || "",
    quoteType: "",
    rfqId: "",
    missingFields: [],
    followUpCount: 0,
    captured: {},
  } satisfies WechatChatState));
  const fallback = nextSupplierChat({ stage: state.stage, text: input.text });
  if (waitingForWeekly(input.text)) {
    await saveSupplierChatState(input.supplier.id, { ...state, stage: "", followUpCount: 0 });
    return { reply: WAIT_WEEKLY, nextStage: "", agent: "wechat-supplier-quote" as const, usedGemini: false };
  }
  if (!geminiKey()) return { reply: fallback.reply, nextStage: fallback.nextStage, agent: "wechat-supplier-quote" as const, usedGemini: false };

  try {
    const agent = await getTradeAgent("wechat-supplier-quote");
    const confirmedId = asString(state.rfqId);
    const rfq = confirmedId && state.quoteType === "previous" ? await getTradeRfqByCode(confirmedId).catch(() => null) : null;
    const data = await askGemini(
      `${MATT_GUARD}\n\n${agent.systemPrompt}`,
      [
        `Conversation Stage: ${state.stage || ""}`,
        `Confirmed RFQ ID: ${state.rfqId || ""}`,
        `Quote Type: ${state.quoteType || ""}`,
        `Buyer Request Fields: ${buyerRequestFields(rfq)}`,
        `Missing Fields: ${state.missingFields.join(", ")}`,
        `Follow Up Count: ${state.followUpCount}`,
        `Captured So Far: ${JSON.stringify(state.captured && Object.keys(state.captured).length ? state.captured : {})}`,
        `Last RFQ Ref: ${input.supplier.lastRfqCode || ""}`,
        `Chat History:\n${historyBlock(input.messages)}`,
        `WeChat Text:\n${input.text}`,
      ].join("\n"),
    );
    const reply = asString(data.reply) || fallback.reply;
    const nextStage = asString(data.next_stage);
    const captured = Array.isArray(data.offers) && data.offers[0] && typeof data.offers[0] === "object" ? (data.offers[0] as Record<string, unknown>) : state.captured;
    await saveSupplierChatState(input.supplier.id, {
      stage: nextStage,
      quoteType: asString(data.quote_type) || state.quoteType,
      rfqId: asString(data.rfq_id) || state.rfqId,
      missingFields: Array.isArray(data.missing_fields) ? data.missing_fields.map((item) => asString(item)).filter(Boolean) : [],
      followUpCount: nextStage === "rfq_followup" ? Math.max(1, state.followUpCount + (state.stage === "rfq_followup" ? 0 : 1)) : nextStage ? state.followUpCount : 0,
      captured: nextStage ? captured : {},
    });
    if (asString(data.route) === "log_price") {
      await saveOffers(input.supplier, data, input.text, state.stage === "weekly" || input.supplier.awaitingReply === "weekly");
    }
    return { reply, nextStage, agent: "wechat-supplier-quote" as const, usedGemini: true };
  } catch {
    await saveSupplierChatState(input.supplier.id, { ...state, stage: fallback.nextStage });
    return { reply: fallback.reply, nextStage: fallback.nextStage, agent: "wechat-supplier-quote" as const, usedGemini: false };
  }
}

export async function runUnknownSupplierTurn(input: { openid: string; text: string; messages: TradeMessage[] }) {
  const fallback =
    "Hello, this is Aquifert. Please send your company name, your name, and email so we can add you as a supplier.\n\n您好，这里是 Aquifert。请发送公司名称、联系人姓名和邮箱，以便我们把您加入供应商名单。";
  if (!geminiKey()) return { reply: fallback, millId: null as string | null, agent: "wechat-supplier-unknown" as const, usedGemini: false };

  try {
    const agent = await getTradeAgent("wechat-supplier-unknown");
    const data = await askGemini(
      agent.systemPrompt,
      [`OpenID: ${input.openid}`, "Supplier lookup: not on list", `Chat History:\n${historyBlock(input.messages)}`, `Message:\n${input.text}`].join("\n"),
    );
    const reply = asString(data.wa_body) || asString(data.reply) || fallback;
    const supplier = data.supplier && typeof data.supplier === "object" ? (data.supplier as Record<string, unknown>) : {};
    let millId: string | null = null;
    if (asString(data.action) === "register") {
      const email = asString(supplier.email).trim().toLowerCase();
      const company = asString(supplier.company).trim();
      if (email.includes("@") && company) {
        const existing = await getTradeSupplierByWechatOpenid(input.openid);
        if (existing) millId = existing.id;
        else {
          const linked = await linkSupplierWechatFollow({ openid: input.openid, email, joinedAt: new Date().toISOString() });
          if (linked.ok) millId = linked.supplier.id;
          else {
            try {
              const row = await insertTradeSupplier({
                companyName: company,
                contactName: asString(supplier.contact_name),
                email,
                phone: "",
                country: asString(supplier.country),
                address: "",
                productsSupplied: asString(supplier.products),
                origins: "",
                loadPorts: "",
                paymentTerms: "",
                notes: asString(supplier.notes),
                wechatOpenid: input.openid,
                inviteNow: false,
              });
              millId = row.id;
            } catch {
              millId = null;
            }
          }
        }
        const saved = millId ? await getTradeSupplierByWechatOpenid(input.openid) : null;
        if (saved && data.extract && typeof data.extract === "object") {
          await saveOffers(saved, data, input.text, false);
        }
      }
    }
    return { reply, millId, agent: "wechat-supplier-unknown" as const, usedGemini: true };
  } catch {
    return { reply: fallback, millId: null as string | null, agent: "wechat-supplier-unknown" as const, usedGemini: false };
  }
}

export async function threadFor(openid: string, supplierId?: string | null) {
  return listWechatThread({ supplierId, openid }).catch(() => []);
}
