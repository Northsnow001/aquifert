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
import { RECAP_REPLY_PROMPT, parseRecapReplyKind } from "@/lib/whatsapp/rfq-collect-logic";
import {
  THANKS_QUOTE,
  WAIT_WEEKLY,
  askMillOriginPort,
  askRfqPrice,
  isMillQuoteConfirm,
  looksLikeQuote,
  millQuoteRecap,
  nextSupplierChat,
  thanksForPrice,
  waitingForWeekly,
} from "@/lib/wechat/chat";
import {
  buyerRequestFieldNames,
  filterMissingFields,
  looksLikeMillOriginPort,
  looksLikePriceOnly,
  mergeOfferWithRfq,
  millOriginPortGaps,
  parseBareOffer,
  parseMillOriginPort,
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

async function classifyMillRecapReply(recap: string, text: string) {
  if (!geminiKey()) return false;
  try {
    const data = await askGemini(RECAP_REPLY_PROMPT, [`Last recap:\n${recap.slice(0, 1200)}`, `Reply: ${text}`].join("\n\n"));
    return parseRecapReplyKind(data.kind) === "confirm";
  } catch (error) {
    console.error("[mill-recap-reply]", error instanceof Error ? error.message : error);
    return false;
  }
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

function offerRecord(offer: OfferSlice): Record<string, unknown> {
  return { ...offer };
}

function applyMillOriginPort(offer: OfferSlice, text: string): OfferSlice {
  const extra = parseMillOriginPort(text);
  return {
    ...offer,
    origin: extra.origin || offer.origin,
    load_port: extra.load_port || offer.load_port,
    incoterms: extra.incoterms || offer.incoterms,
    raw_body: [offer.raw_body, text].filter(Boolean).join("\n"),
  };
}

function mergeDraft(captured: Record<string, unknown>, text: string, rfq: Record<string, unknown> | null, code: string): OfferSlice {
  const incoming = applyMillOriginPort(parseBareOffer(text), text);
  const prev = Object.keys(captured).length ? offerSlice(captured, code, text) : incoming;
  return mergeOfferWithRfq(
    {
      ...prev,
      unit_price: incoming.unit_price || prev.unit_price,
      currency: incoming.currency || prev.currency || (incoming.unit_price || prev.unit_price ? "USD" : ""),
      origin: incoming.origin || prev.origin,
      load_port: incoming.load_port || prev.load_port,
      incoterms: incoming.incoterms || prev.incoterms,
      destination: incoming.destination || prev.destination,
      raw_body: [prev.raw_body, text].filter(Boolean).join("\n"),
    },
    rfq,
    code,
  );
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
  const millRecapDraft =
    !weekly && pendingRfq
      ? mergeOfferWithRfq(offerSlice(state.captured, pendingRfq, input.text), rfq, pendingRfq)
      : null;
  const millConfirm =
    Boolean(pendingRfq && state.stage === "awaiting_quote_confirm" && millRecapDraft) &&
    (isMillQuoteConfirm(input.text) ||
      (!looksLikePriceOnly(input.text) &&
        !looksLikeQuote(input.text) &&
        !looksLikeMillOriginPort(input.text) &&
        (await classifyMillRecapReply(millQuoteRecap(millRecapDraft!, pendingRfq), input.text))));
  if (!weekly && pendingRfq && millConfirm && millRecapDraft) {
    const draft = millRecapDraft;
    if (draft.unit_price) {
      await writeQuote(input.supplier, draft, false, false, rfq);
      const gaps = millOriginPortGaps({ origin: draft.origin, load_port: draft.load_port });
      await saveSupplierChatState(input.supplier.id, {
        ...state,
        stage: gaps.length ? "awaiting_origin_port" : "",
        rfqId: pendingRfq,
        followUpCount: 0,
        missingFields: gaps,
        captured: gaps.length ? offerRecord(draft) : {},
      });
      return {
        reply: thanksForPrice(pendingRfq, draft.unit_price, gaps),
        nextStage: gaps.length ? "awaiting_origin_port" : "",
        agent: "wechat-supplier-quote" as const,
        usedGemini: false,
      };
    }
  }
  if (
    !weekly &&
    pendingRfq &&
    (looksLikePriceOnly(input.text) || looksLikeQuote(input.text) || (state.stage === "awaiting_quote_confirm" && looksLikeMillOriginPort(input.text)))
  ) {
    const draft = mergeDraft(state.captured, input.text, rfq, pendingRfq);
    const gaps = millOriginPortGaps({ origin: draft.origin, load_port: draft.load_port });
    await saveSupplierChatState(input.supplier.id, {
      ...state,
      stage: "awaiting_quote_confirm",
      rfqId: pendingRfq,
      followUpCount: 0,
      missingFields: gaps,
      captured: offerRecord(draft),
    });
    return {
      reply: millQuoteRecap(draft, pendingRfq),
      nextStage: "awaiting_quote_confirm",
      agent: "wechat-supplier-quote" as const,
      usedGemini: false,
    };
  }
  if (!weekly && state.stage === "awaiting_origin_port" && pendingRfq) {
    const prev = mergeOfferWithRfq(offerSlice(state.captured, pendingRfq, input.text), rfq, pendingRfq);
    if (looksLikeMillOriginPort(input.text) || looksLikeQuote(input.text)) {
      const saved = await writeQuote(input.supplier, applyMillOriginPort(prev, input.text), false, false, rfq);
      const gaps = millOriginPortGaps({ origin: saved.origin, load_port: saved.load_port });
      await saveSupplierChatState(input.supplier.id, {
        ...state,
        stage: gaps.length ? "awaiting_origin_port" : "",
        rfqId: pendingRfq,
        followUpCount: 0,
        missingFields: gaps,
        captured: gaps.length ? offerRecord(saved) : {},
      });
      return {
        reply: gaps.length ? askMillOriginPort(pendingRfq, gaps) : THANKS_QUOTE,
        nextStage: gaps.length ? "awaiting_origin_port" : "",
        agent: "wechat-supplier-quote" as const,
        usedGemini: false,
      };
    }
    if (!looksLikeQuote(input.text) && !waitingForWeekly(input.text) && !/^(no|not now|nothing|no offer|不|不用|没有|暂时没有|暂无|无报价)([\s!.]*)$/i.test(input.text.trim())) {
      await saveSupplierChatState(input.supplier.id, { ...state, stage: "awaiting_origin_port", rfqId: pendingRfq });
      return {
        reply: askMillOriginPort(pendingRfq, millOriginPortGaps(prev)),
        nextStage: "awaiting_origin_port",
        agent: "wechat-supplier-quote" as const,
        usedGemini: false,
      };
    }
  }
  if (
    armed &&
    state.stage !== "awaiting_origin_port" &&
    state.stage !== "awaiting_quote_confirm" &&
    !looksLikeQuote(input.text) &&
    !waitingForWeekly(input.text) &&
    !millConfirm &&
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
    const millGaps = weekly ? [] : millOriginPortGaps(preview);
    const missing = [
      ...new Set([
        ...filterMissingFields(
          Array.isArray(data.missing_fields) ? data.missing_fields.map((item) => asString(item)).filter(Boolean) : [],
          weekly ? null : rfq,
          preview,
        ),
        ...millGaps,
      ]),
    ];
    let nextStage = asString(data.next_stage);
    if (looksLikeQuote(input.text) && missing.length === 0) nextStage = "";
    const shouldSave = asString(data.route) === "log_price" || looksLikeQuote(input.text);
    if (weekly && shouldSave) {
      await saveOffers(input.supplier, data, input.text, weekly, rfq, rfqCode).catch(() => null);
    } else if (!weekly && pendingRfq && shouldSave && !asBool(data.is_no_offer)) {
      const draft = mergeDraft(offerRecord(preview), input.text, rfq, pendingRfq);
      await saveSupplierChatState(input.supplier.id, {
        ...state,
        stage: "awaiting_quote_confirm",
        quoteType: asString(data.quote_type) || state.quoteType,
        rfqId: pendingRfq,
        missingFields: millOriginPortGaps({ origin: draft.origin, load_port: draft.load_port }),
        followUpCount: 0,
        captured: offerRecord(draft),
      });
      return {
        reply: millQuoteRecap(draft, pendingRfq),
        nextStage: "awaiting_quote_confirm",
        agent: "wechat-supplier-quote" as const,
        usedGemini: true,
      };
    } else if (shouldSave) {
      await saveOffers(input.supplier, data, input.text, weekly, rfq, rfqCode).catch(() => null);
    }
    if (shouldSave && millGaps.length) nextStage = "awaiting_origin_port";
    let reply = asString(data.reply) || fallback.reply;
    await saveSupplierChatState(input.supplier.id, {
      stage: nextStage,
      quoteType: asString(data.quote_type) || state.quoteType,
      rfqId: asString(data.rfq_id) || state.rfqId,
      missingFields: missing,
      followUpCount: nextStage === "rfq_followup" ? Math.max(1, state.followUpCount + (state.stage === "rfq_followup" ? 0 : 1)) : nextStage ? state.followUpCount : 0,
      captured: nextStage ? (shouldSave ? offerRecord(preview) : captured) : {},
    });
    return { reply, nextStage, agent: "wechat-supplier-quote" as const, usedGemini: true };
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
