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
import { THANKS_QUOTE, WAIT_WEEKLY, askRfqPrice, looksLikeQuote, nextSupplierChat, thanksForPrice, waitingForWeekly } from "@/lib/wechat/chat";
import {
  buyerRequestFieldNames,
  filterMissingFields,
  looksLikePriceOnly,
  mergeOfferWithRfq,
  parseBareOffer,
  resolveQuoteRfqCode,
  rfqQuoteArmed,
  type OfferSlice,
} from "@/lib/wechat/quote-merge";

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

function offerSlice(offer: Record<string, unknown>, fallbackRfq: string, text: string): OfferSlice {
  return {
    rfq_id: asString(offer.rfq_id) || fallbackRfq,
    product_name: asString(offer.product_name),
    specification: asString(offer.specification),
    unit_price: asString(offer.unit_price),
    currency: asString(offer.currency),
    quantity: asString(offer.quantity),
    packaging: asString(offer.packaging),
    destination: asString(offer.destination),
    load_port: asString(offer.load_port),
    origin: asString(offer.origin),
    delivery_turnaround: asString(offer.delivery_turnaround),
    incoterms: asString(offer.incoterms),
    validity: asString(offer.validity),
    raw_body: asString(offer.raw_body) || text,
  };
}

async function writeQuote(supplier: TradeSupplier, offer: OfferSlice, weekly: boolean, noOffer: boolean, rfq: Record<string, unknown> | null) {
  const merged = weekly ? offer : mergeOfferWithRfq(offer, rfq, offer.rfq_id);
  await insertWechatQuote({
    supplierId: supplier.id,
    kind: weekly ? "weekly" : "rfq",
    rfqCode: weekly ? asString(merged.rfq_id) || undefined : merged.rfq_id || undefined,
    productLabel: merged.product_name,
    specification: merged.specification,
    unitPrice: merged.unit_price,
    currency: merged.currency || (merged.unit_price ? "USD" : "USD"),
    quantityMt: merged.quantity,
    packing: merged.packaging,
    origin: merged.origin,
    loadPort: merged.load_port,
    destinationPort: merged.destination,
    incoterm: merged.incoterms,
    deliveryWindow: merged.delivery_turnaround,
    isNoOffer: noOffer,
    rawMessage: merged.raw_body,
    extras: {
      validity: merged.validity,
      filled_from_rfq: Boolean(!weekly && rfq),
      rfq_code: merged.rfq_id,
    },
  });
  if (!weekly && (merged.unit_price || noOffer)) {
    await import("@/lib/trade/admin-alerts")
      .then(({ notifySupplierQuote }) =>
        notifySupplierQuote({
          requestId: merged.rfq_id || asString(rfq?.code),
          supplier: supplier.companyName,
          product: merged.product_name || asString(rfq?.product_label),
          unitPrice: merged.unit_price ? `${merged.currency || "USD"} ${merged.unit_price} / MT` : "",
          incoterm: merged.incoterms,
          noOffer,
        }),
      )
      .catch(() => undefined);
  }
  return merged;
}

function backfillPrice(slice: OfferSlice, text: string) {
  if (!looksLikeQuote(text)) return slice;
  const bare = parseBareOffer(text);
  return {
    ...slice,
    unit_price: slice.unit_price || bare.unit_price,
    currency: slice.currency || bare.currency,
    incoterms: slice.incoterms || bare.incoterms,
    load_port: slice.load_port || bare.load_port,
    destination: slice.destination || bare.destination,
    rfq_id: slice.rfq_id || bare.rfq_id,
  };
}

async function saveOffers(
  supplier: TradeSupplier,
  data: Record<string, unknown>,
  text: string,
  weekly: boolean,
  rfq: Record<string, unknown> | null,
  defaultRfqCode: string,
) {
  const offers = Array.isArray(data.offers) ? data.offers.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
  const extract = data.extract && typeof data.extract === "object" ? (data.extract as Record<string, unknown>) : null;
  const rows = offers.length ? offers : extract ? [extract] : [];
  const rfqCode = asString(data.rfq_id) || defaultRfqCode;
  if (!rows.length && asBool(data.is_no_offer)) {
    await writeQuote(supplier, { ...parseBareOffer(text), rfq_id: rfqCode, raw_body: text }, weekly, true, rfq);
    return null;
  }
  if (!rows.length && looksLikeQuote(text)) {
    return writeQuote(supplier, { ...parseBareOffer(text), rfq_id: rfqCode }, weekly, false, rfq);
  }
  let last: OfferSlice | null = null;
  for (const offer of rows) {
    last = await writeQuote(
      supplier,
      backfillPrice(offerSlice(offer, rfqCode, text), text),
      weekly,
      asBool(data.is_no_offer) || asBool(offer.is_no_offer),
      rfq,
    );
  }
  return last;
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
  const weekly = state.stage === "weekly" || input.supplier.awaitingReply === "weekly";
  const fallback = nextSupplierChat({ stage: state.stage, text: input.text, confirmedRfqId: state.rfqId });
  if (waitingForWeekly(input.text)) {
    await saveSupplierChatState(input.supplier.id, { ...state, stage: "", followUpCount: 0 });
    return { reply: WAIT_WEEKLY, nextStage: "", agent: "wechat-supplier-quote" as const, usedGemini: false };
  }

  const rfqCode = resolveQuoteRfqCode({
    text: input.text,
    quoteType: state.quoteType,
    confirmedRfqId: state.rfqId,
    stage: state.stage,
    lastRfqCode: input.supplier.lastRfqCode ?? undefined,
    weekly,
  });
  const pendingRfq = rfqCode || state.rfqId || input.supplier.lastRfqCode || "";
  const rfq = pendingRfq && !weekly ? await getTradeRfqByCode(pendingRfq).catch(() => null) : null;

  const persistBareQuote = async () => {
    try {
      if (weekly || !(looksLikeQuote(input.text) || looksLikePriceOnly(input.text))) return null;
      const code = rfqCode || pendingRfq;
      return await saveOffers(input.supplier, { rfq_id: code }, input.text, weekly, rfq, code);
    } catch {
      return null;
    }
  };
  const armed = !weekly && rfqQuoteArmed(state.stage, pendingRfq);
  if (!weekly && looksLikePriceOnly(input.text) && pendingRfq) {
    await persistBareQuote();
    const price = parseBareOffer(input.text).unit_price;
    await saveSupplierChatState(input.supplier.id, {
      ...state,
      stage: "",
      rfqId: pendingRfq,
      followUpCount: 0,
      captured: {},
    });
    return {
      reply: thanksForPrice(pendingRfq, price),
      nextStage: "",
      agent: "wechat-supplier-quote" as const,
      usedGemini: false,
    };
  }
  if (
    armed &&
    !looksLikeQuote(input.text) &&
    !waitingForWeekly(input.text) &&
    !/^(no|not now|nothing|no offer|不|不用|没有|暂时没有|暂无|无报价)([\s!.]*)$/i.test(input.text.trim())
  ) {
    await saveSupplierChatState(input.supplier.id, { ...state, stage: "rfq_followup", rfqId: pendingRfq });
    return {
      reply: askRfqPrice(pendingRfq),
      nextStage: "rfq_followup",
      agent: "wechat-supplier-quote" as const,
      usedGemini: false,
    };
  }

  if (!geminiKey()) {
    const saved = await persistBareQuote();
    const nextStage = saved ? "" : fallback.nextStage;
    await saveSupplierChatState(input.supplier.id, {
      ...state,
      stage: nextStage,
      rfqId: rfqCode || state.rfqId,
      followUpCount: saved ? 0 : state.followUpCount,
      captured: saved ? {} : state.captured,
    });
    return {
      reply: saved ? THANKS_QUOTE : fallback.reply,
      nextStage,
      agent: "wechat-supplier-quote" as const,
      usedGemini: false,
    };
  }

  try {
    const agent = await getTradeAgent("wechat-supplier-quote");
    const data = await askGemini(
      `${MATT_GUARD}\n\n${agent.systemPrompt}`,
      [
        `Conversation Stage: ${state.stage || ""}`,
        `Confirmed RFQ ID: ${state.rfqId || ""}`,
        `Quote Type: ${state.quoteType || ""}`,
        `Buyer Request Fields: ${buyerRequestFieldNames(rfq).join(", ")}`,
        `Missing Fields: ${state.missingFields.join(", ")}`,
        `Follow Up Count: ${state.followUpCount}`,
        `Captured So Far: ${JSON.stringify(state.captured && Object.keys(state.captured).length ? state.captured : {})}`,
        `Last RFQ Ref: ${input.supplier.lastRfqCode || ""}`,
        `Chat History:\n${historyBlock(input.messages)}`,
        `WeChat Text:\n${input.text}`,
      ].join("\n"),
    );
    data.rfq_id = asString(data.rfq_id) || rfqCode;
    const captured =
      Array.isArray(data.offers) && data.offers[0] && typeof data.offers[0] === "object"
        ? (data.offers[0] as Record<string, unknown>)
        : state.captured;
    const preview = weekly
      ? offerSlice(captured, asString(data.rfq_id), input.text)
      : mergeOfferWithRfq(backfillPrice(offerSlice(captured, asString(data.rfq_id), input.text), input.text), rfq, asString(data.rfq_id));
    const missing = filterMissingFields(
      Array.isArray(data.missing_fields) ? data.missing_fields.map((item) => asString(item)).filter(Boolean) : [],
      weekly ? null : rfq,
      preview,
    );
    let nextStage = asString(data.next_stage);
    if (looksLikeQuote(input.text) && missing.length === 0) nextStage = "";
    const shouldSave = asString(data.route) === "log_price" || looksLikeQuote(input.text);
    if (shouldSave) {
      await saveOffers(input.supplier, data, input.text, weekly, rfq, rfqCode).catch(() => null);
    }
    await saveSupplierChatState(input.supplier.id, {
      stage: nextStage,
      quoteType: asString(data.quote_type) || state.quoteType,
      rfqId: asString(data.rfq_id) || state.rfqId,
      missingFields: missing,
      followUpCount: nextStage === "rfq_followup" ? Math.max(1, state.followUpCount + (state.stage === "rfq_followup" ? 0 : 1)) : nextStage ? state.followUpCount : 0,
      captured: nextStage ? captured : {},
    });
    return { reply: asString(data.reply) || fallback.reply, nextStage, agent: "wechat-supplier-quote" as const, usedGemini: true };
  } catch {
    const saved = await persistBareQuote();
    const nextStage = saved ? "" : fallback.nextStage;
    await saveSupplierChatState(input.supplier.id, {
      ...state,
      stage: nextStage,
      rfqId: rfqCode || state.rfqId,
      followUpCount: saved ? 0 : state.followUpCount,
      captured: saved ? {} : state.captured,
    });
    return {
      reply: saved ? THANKS_QUOTE : fallback.reply,
      nextStage,
      agent: "wechat-supplier-quote" as const,
      usedGemini: false,
    };
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
          await saveOffers(saved, data, input.text, false, null, asString((data.extract as Record<string, unknown>).rfq_id));
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
