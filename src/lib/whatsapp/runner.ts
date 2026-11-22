import "server-only";

import { EXTRACTION_MODEL, generateText, geminiKey } from "@/lib/aquibot-engine/gemini";
import { notifyRfqSubmitted, notifyTradeOpened } from "@/lib/trade/admin-alerts";
import {
  getLatestBuyerRfq,
  getTradeBuyer,
  getTradeBuyerByWhatsApp,
  insertTradeBuyer,
  insertWhatsAppRfq,
  linkBuyerWhatsApp,
  listTradeThread,
  patchTradeRfq,
  updateTradeBuyer,
} from "@/lib/trade/store";
import type { TradeBuyer, TradeMessage } from "@/lib/trade/types";
import { firmOfferPackingAsk } from "@/lib/desk-hitl/logic";
import { identityFromParts, mergeIdentity } from "@/lib/whatsapp/buyer-identity";
import { asString, parseJsonObject } from "@/lib/wechat/agent-parse";
import { getTradeAgent } from "@/lib/wechat/agent-store";
import {
  TRADE_BIND_PROMPT,
  bindInboundToTrade,
  buyerPhaseFromStatus,
  coerceRfqPhaseTurn,
  hasNewTradeIntent,
  isolateExtractToTrade,
  isCourtesyMessage,
  isRfqRecapConfirmTurn,
  lastAgentText,
  parseRfqRecap,
  shouldNotifyTradeOpened,
  threadSinceNewTrade,
  waitingIndicationReply,
  type TradeBindKind,
} from "@/lib/whatsapp/rfq-collect-logic";

function historyBlock(messages: TradeMessage[]) {
  return messages
    .slice(-20)
    .map((row) => `${row.direction === "in" ? "Buyer" : "Desk"}: ${row.body}`)
    .join("\n");
}

async function askGemini(system: string, user: string) {
  const { text } = await generateText({
    model: EXTRACTION_MODEL,
    json: true,
    fast: true,
    temperature: 0,
    timeoutMs: 45_000,
    maxOutputTokens: 2048,
    system,
    turns: [{ role: "user", text: user }],
  });
  return parseJsonObject(text);
}

const FALLBACK_ONBOARD = "Hello, this is Aquifert. How can we help you today?";

function extractIdentity(
  buyer: Record<string, unknown>,
  phone: string,
  whatsappName: string,
  emailHint: string,
  known?: TradeBuyer,
  useProfileName = Boolean(known),
) {
  return identityFromParts({
    name: asString(buyer.name) || known?.contactName || (useProfileName ? whatsappName : ""),
    jobTitle: asString(buyer.job_title) || known?.jobTitle || "",
    company: asString(buyer.company) || known?.companyName || "",
    email: asString(buyer.email) || known?.email || emailHint,
    country: asString(buyer.country) || known?.country || "",
    address: asString(buyer.address) || known?.address || "",
    buyerType: asString(buyer.buyer_type) || known?.buyerType || "",
    productsOfInterest: asString(buyer.products_of_interest) || known?.productsOfInterest || "",
    notes: asString(buyer.notes) || known?.notes || "",
    phone: known?.whatsappE164 || phone,
  });
}

export async function runUnknownBuyerTurn(input: { phone: string; text: string; email?: string; name?: string; messages: TradeMessage[] }) {
  if (!geminiKey()) return { reply: FALLBACK_ONBOARD, buyerId: null as string | null, agent: "whatsapp-buyer-onboard" as const };

  try {
    const agent = await getTradeAgent("whatsapp-buyer-onboard");
    const data = await askGemini(
      agent.systemPrompt,
      [
        `Phone: ${input.phone}`,
        `WhatsApp name: ${input.name || ""}`,
        `Email if any: ${input.email || ""}`,
        `Message: ${input.text}`,
        "Buyer lookup: not on list",
        `Chat History:\n${historyBlock(input.messages)}`,
      ].join("\n"),
    );
    const buyer = data.buyer && typeof data.buyer === "object" ? (data.buyer as Record<string, unknown>) : {};
    const fields = extractIdentity(buyer, input.phone, input.name || "", input.email || "", undefined, false);
    let reply = asString(data.wa_body) || asString(data.reply) || FALLBACK_ONBOARD;
    let buyerId: string | null = null;
    if (asString(data.action) === "register" && !fields.missing.length) {
      const linked = await linkBuyerWhatsApp({ phone: fields.phone, email: fields.email });
      if (linked.ok) buyerId = linked.buyer.id;
      else {
        try {
          const row = await insertTradeBuyer({
            companyName: fields.company,
            contactName: fields.name,
            jobTitle: fields.jobTitle,
            email: fields.email,
            phone: fields.phone,
            country: fields.country,
            address: fields.address,
            buyerType: fields.buyerType,
            productsOfInterest: fields.productsOfInterest,
            notes: fields.notes,
            linkedOnWhatsApp: true,
          });
          buyerId = row.id;
        } catch {
          buyerId = (await getTradeBuyerByWhatsApp(input.phone))?.id ?? null;
        }
      }
    } else if (asString(data.action) === "register" && fields.missing.length) {
      reply = `Thanks — I still need ${fields.missing.join(" and ")} before I can add you to the buyer list.`;
    }
    return { reply, buyerId, agent: "whatsapp-buyer-onboard" as const };
  } catch {
    return { reply: FALLBACK_ONBOARD, buyerId: null, agent: "whatsapp-buyer-onboard" as const };
  }
}

export async function runInvitedBuyerTurn(input: {
  buyer: TradeBuyer;
  text: string;
  name?: string;
  messages: TradeMessage[];
}) {
  const known = extractIdentity({}, input.buyer.whatsappE164 || "", input.name || "", input.buyer.email, input.buyer);
  const fallback = known.missing.length
    ? `Hi ${known.name || input.buyer.companyName} — welcome back on WhatsApp. I still need ${known.missing.join(" and ")} on file.`
    : `Hi ${known.name || input.buyer.companyName} — good to continue here. What fertiliser are you looking to cover?`;
  if (!known.missing.length) {
    return { reply: fallback, buyer: input.buyer, agent: "whatsapp-buyer-complete" as const, complete: true };
  }
  if (!geminiKey()) return { reply: fallback, buyer: input.buyer, agent: "whatsapp-buyer-complete" as const, complete: false };

  try {
    const agent = await getTradeAgent("whatsapp-buyer-complete");
    const data = await askGemini(
      agent.systemPrompt,
      [
        `Phone: ${input.buyer.whatsappE164 || ""}`,
        `WhatsApp name: ${input.name || ""}`,
        `Message: ${input.text}`,
        "Buyer lookup: on list, profile incomplete",
        `Known buyer fields: name=${known.name}; job_title=${known.jobTitle}; company=${known.company}; email=${known.email}; country=${known.country}; address=${known.address}; buyer_type=${known.buyerType}`,
        `Missing fields: ${known.missing.join(", ")}`,
        `Chat History:\n${historyBlock(input.messages)}`,
      ].join("\n"),
    );
    const extract = data.buyer && typeof data.buyer === "object" ? (data.buyer as Record<string, unknown>) : {};
    const fields = extractIdentity(extract, input.buyer.whatsappE164 || "", input.name || "", input.buyer.email, input.buyer);
    const saved = await updateTradeBuyer(input.buyer.id, mergeIdentity(input.buyer, fields)).catch(() => input.buyer);
    const latest = (await getTradeBuyer(input.buyer.id).catch(() => null)) ?? saved;
    let reply = asString(data.wa_body) || asString(data.reply) || fallback;
    const complete = !fields.missing.length;
    if (asString(data.action) === "complete" && fields.missing.length) {
      reply = `Thanks — I still need ${fields.missing.join(" and ")} before we continue.`;
    }
    return { reply, buyer: latest, agent: "whatsapp-buyer-complete" as const, complete };
  } catch {
    return { reply: fallback, buyer: input.buyer, agent: "whatsapp-buyer-complete" as const, complete: false };
  }
}

async function classifyTradeBind(input: {
  text: string;
  status: string;
  product: string;
  code: string;
}): Promise<TradeBindKind | null> {
  if (!input.status || input.status === "collecting") return null;
  if (isCourtesyMessage(input.text) || hasNewTradeIntent(input.text)) return null;
  if (!geminiKey()) return null;
  try {
    const data = await askGemini(
      TRADE_BIND_PROMPT,
      [
        `Live Trade ID: ${input.code || "(none)"}`,
        `Live product: ${input.product || "(none)"}`,
        `Live status: ${input.status}`,
        `Last WhatsApp: ${input.text}`,
      ].join("\n"),
    );
    const kind = asString(data.kind);
    if (kind === "courtesy" || kind === "same_trade" || kind === "new_trade" || kind === "unclear") return kind;
  } catch (error) {
    console.error("[trade-bind]", error instanceof Error ? error.message : error);
  }
  return null;
}

function extrasOf(rfq: Record<string, unknown> | null) {
  const extras = rfq?.extras;
  return extras && typeof extras === "object" && !Array.isArray(extras) ? (extras as Record<string, unknown>) : {};
}

function rfqContext(rfq: Record<string, unknown> | null, phase: string) {
  if (!rfq) {
    return [
      "Known RFQ: none — this is a new enquiry. Do not invent a Trade ID. Leave rfq_id empty.",
      "TRADE SEPARATION: this enquiry is unique. Never copy product, port, packing, payment, origin, or Trade ID from any earlier deal in Chat History.",
    ].join("\n");
  }
  const extras = extrasOf(rfq);
  const indication = asString(extras.buyer_unit_price);
  const lines = [
    phase === "rfq"
      ? "Known RFQ: in progress, not confirmed. Do not give a Trade ID yet. Leave rfq_id empty."
      : `Known RFQ: ${asString(rfq.code)}. Do not start a new enquiry. Do not recap this RFQ again unless they asked to change it.`,
    `RFQ status: ${asString(rfq.status)}`,
    `Product: ${asString(rfq.product_label)}`,
    `Specification: ${asString(rfq.specification)}`,
    `Quantity MT: ${asString(rfq.quantity_mt)}`,
    `Packing: ${asString(rfq.packing)}`,
    `Incoterm: ${asString(rfq.incoterm)}`,
    `Destination: ${asString(rfq.destination_port)} ${asString(rfq.destination_country)}`.trim(),
    `Shipment: ${asString(rfq.shipment_window)}`,
  ];
  if (phase === "post_yes" || phase === "offer_review" || phase === "pi_sent") {
    lines.push(`Indication price: ${indication ? `USD ${indication} / MT` : "on the indication already sent"}`);
    lines.push("They confirmed the indication. Collect commercial terms for the firm offer. Do not start an RFQ. Do not ask which product.");
    lines.push("KNOWN FIELD LOCK: copy packing, quantity, destination, incoterm, and shipment from the lines above into commercial_extract. If packing is filled, do not ask packing — ask payment next.");
    lines.push("POST-YES LOCK: never ask load port or mill origin. After payment, ask origin preference (origins they want or cannot take), then inspection.");
  }
  lines.push(`Captured extract: ${JSON.stringify(extras)}`);
  return lines.join("\n");
}

function fieldsFromExtract(extract: Record<string, unknown>, rawMessage: string) {
  return {
    productLabel: asString(extract.product),
    specification: asString(extract.form_grade) || asString(extract.specs_notes),
    quantityMt: asString(extract.quantity_mt),
    packing: asString(extract.packing),
    destinationPort: asString(extract.discharge_port) || asString(extract.destination),
    destinationCountry: asString(extract.destination),
    incoterm: asString(extract.incoterm_pref),
    shipmentWindow: asString(extract.timing_notes) || [asString(extract.laycan_from), asString(extract.laycan_to)].filter(Boolean).join(" – "),
    rawMessage,
    extras: extract,
  };
}

function firstName(buyer: TradeBuyer) {
  return (buyer.contactName || buyer.companyName).trim().split(/\s+/)[0] || "there";
}

function looksLikeProduct(text: string) {
  const t = text.trim().replace(/^['"`]+|['"`]+$/g, "");
  if (!t || t.length > 80 || isCourtesyMessage(t) || hasNewTradeIntent(t)) return false;
  if (/@/.test(t) || /https?:/i.test(t)) return false;
  if (/^(yes|no|correct|go ahead|proceed|thanks|thank you|ok|okay)\b/i.test(t)) return false;
  return true;
}

function productLabelFrom(text: string) {
  return text.trim().replace(/^['"`]+|['"`]+$/g, "");
}

function askingForProductAgain(reply: string) {
  return /what fertiliser are you looking to cover/i.test(reply) || /which product/i.test(reply);
}

function deskUserPrompt(input: {
  phase: string;
  buyer: TradeBuyer;
  text: string;
  messages: TradeMessage[];
  draft: Record<string, unknown> | null;
}) {
  const name = input.buyer.contactName || input.buyer.companyName;
  if (input.phase === "rfq") {
    return [
      "Phase: rfq",
      "This node only runs for RFQ intake. Do not greet as if you just met them.",
      "TRADE SEPARATION: Chat History and Known RFQ are THIS enquiry only. Do not reuse another trade's product, destination, incoterm, packing, payment, or Trade ID.",
      `Buyer (on file — do not say nice to meet you): ${name}`,
      `Company: ${input.buyer.companyName}`,
      `Email: ${input.buyer.email}`,
      `Phone: ${input.buyer.whatsappE164 || ""}`,
      `Country: ${input.buyer.country}`,
      rfqContext(input.draft, input.phase),
      `Chat History:\n${historyBlock(input.messages)}`,
      `Last WhatsApp: ${input.text}`,
      "Treat the last WhatsApp as the buyer's latest message. If it is thanks/okay/hi, route chat — that is not a product. If it is a fertiliser name (e.g. SplashFert, Merlin Fert, urea, DAP), that is the product — set rfq_extract.product, route rfq_collect, acknowledge it, ask quantity in MT next. Do not ask which product. Do not greet again.",
      `Phase: ${input.phase}`,
    ].join("\n");
  }
  if (input.phase === "waiting_indication") {
    return [
      "Phase: waiting_indication",
      "This Trade ID is already confirmed and with the desk / suppliers. Do not collect RFQ fields. Do not recap. Do not treat thanks or okay as a product.",
      `Buyer (on file): ${name}`,
      rfqContext(input.draft, input.phase),
      `Chat History:\n${historyBlock(input.messages)}`,
      `Last WhatsApp: ${input.text}`,
      "Reply briefly that we are working on the indication. route chat. rfq_extract must be null.",
    ].join("\n");
  }
  return [
    `Phase: ${input.phase}`,
    `Buyer name: ${name}`,
    `Company: ${input.buyer.companyName}`,
    `Email: ${input.buyer.email}`,
    `Phone: ${input.buyer.whatsappE164 || ""}`,
    rfqContext(input.draft, input.phase),
    `Chat History:\n${historyBlock(input.messages)}`,
    `Last WhatsApp: ${input.text}`,
  ].join("\n");
}

function postYesPackingAsk(rfq: Record<string, unknown> | null) {
  const extras = extrasOf(rfq);
  const price = Number(extras.buyer_unit_price);
  const packing = asString(rfq?.packing);
  if (packing) {
    return `Noted — packing stays ${packing}, as on the enquiry. How would you like to pay — LC at sight, SBLC, CAD, or TT?`;
  }
  return firmOfferPackingAsk({
    product: asString(rfq?.product_label),
    quantityMt: asString(rfq?.quantity_mt),
    currency: "USD",
    buyerPrice: Number.isFinite(price) && price > 0 ? price : null,
  });
}

function waitingOnIndication(reply: string) {
  return /come back to you shortly with an indication|already working on your indication|desk has pricing ready|we.?ll come back to you shortly/i.test(
    reply,
  );
}

export async function runKnownBuyerTurn(input: {
  buyer: TradeBuyer;
  text: string;
  messages: TradeMessage[];
  phase?: string;
}) {
  const greet = `Hi ${firstName(input.buyer)} — what fertiliser are you looking to cover?`;
  const product = productLabelFrom(input.text);
  const latest = await getLatestBuyerRfq(input.buyer.id).catch(() => null);
  const recentInbound = input.messages.filter((row) => row.direction === "in").slice(-8).map((row) => row.body);
  const recapYes = isRfqRecapConfirmTurn(input.messages, input.text);
  const geminiKind = recapYes
    ? null
    : await classifyTradeBind({
        text: input.text,
        status: asString(latest?.status),
        product: asString(latest?.product_label),
        code: asString(latest?.code),
      });
  const bind = bindInboundToTrade({
    text: input.text,
    recentInbound,
    latestStatus: asString(latest?.status),
    latestProduct: asString(latest?.product_label),
    geminiKind,
  });
  const forceNew = recapYes ? false : bind.startNew;
  const phase = recapYes || forceNew ? "rfq" : bind.phase;
  const collecting = phase === "rfq";
  const productTurn = collecting && looksLikeProduct(input.text);
  const productReply = `${product} — what quantity in MT, and which discharge port or country?`;
  const draft = forceNew ? null : latest;
  const waitReply = waitingIndicationReply(asString(latest?.code), asString(latest?.product_label));
  const promptMessages = forceNew || collecting ? threadSinceNewTrade(input.messages, input.text) : input.messages;
  if (phase === "waiting_indication" && (bind.kind === "courtesy" || isCourtesyMessage(input.text))) {
    return {
      reply: waitReply,
      agent: "whatsapp-buyer-desk" as const,
      rfqCode: asString(latest?.code),
      rfqId: asString(latest?.id),
      fanout: false,
      route: "chat",
    };
  }
  let reply =
    phase === "waiting_indication"
      ? waitReply
      : phase === "post_yes"
        ? postYesPackingAsk(latest)
        : productTurn
          ? productReply
          : greet;
  let rfqCode = asString(draft?.code);
  let rfqId = asString(draft?.id);
  let fanout = false;
  let route = phase === "post_yes" ? "commercial_collect" : productTurn ? "rfq_collect" : "chat";
  let extract: Record<string, unknown> | null = collecting && productTurn ? { product } : null;
  if (recapYes) {
    extract = { ...extrasOf(draft), ...parseRfqRecap(lastAgentText(input.messages)) };
    route = "rfq_ready";
  }

  try {
    if (!recapYes && geminiKey()) {
    const agent = await getTradeAgent("whatsapp-buyer-desk");
    const data = await askGemini(
      agent.systemPrompt,
      deskUserPrompt({ phase, buyer: input.buyer, text: input.text, messages: promptMessages, draft }),
    );
    reply = asString(data.reply) || reply;
    route = asString(data.route) || route;
    extract =
      data.rfq_extract && typeof data.rfq_extract === "object" ? (data.rfq_extract as Record<string, unknown>) : extract;
    if (collecting && extract) {
      extract = isolateExtractToTrade(
        { ...extrasOf(draft), ...extract },
        promptMessages.filter((row) => row.direction === "in").map((row) => row.body),
        input.text,
      );
    }
    const commercial = data.commercial_extract && typeof data.commercial_extract === "object" ? (data.commercial_extract as Record<string, unknown>) : null;
    if (collecting && productTurn && !asString(draft?.product_label)) {
      if (!asString(extract?.product)) extract = { ...(extract || {}), product };
      if (route === "chat" || askingForProductAgain(reply)) {
        route = "rfq_collect";
        reply = productReply;
      }
    }
    if (collecting) {
      const coerced = coerceRfqPhaseTurn({ route, reply, extract, text: input.text });
      route = coerced.route;
      reply = coerced.reply;
      extract = coerced.extract;
    }
    if (phase === "waiting_indication") {
      route = "chat";
      extract = null;
      if (askingForProductAgain(reply) || /please confirm if the following details are correct/i.test(reply)) {
        reply = waitReply;
      }
    }
    if (
      phase === "post_yes" &&
      (route === "rfq_collect" || route === "rfq_ready" || askingForProductAgain(reply) || waitingOnIndication(reply))
    ) {
      route = "commercial_collect";
      if (askingForProductAgain(reply) || waitingOnIndication(reply) || !asString(data.reply)) {
        reply = postYesPackingAsk(latest);
      }
    }
    if (
      !forceNew &&
      phase !== "rfq" &&
      phase !== "waiting_indication" &&
      latest?.id &&
      commercial &&
      (route === "commercial_collect" || route === "firm_offer_ready" || route === "pi_ready")
    ) {
      const extras = extrasOf(latest);
      const nextStatus = route === "pi_ready" ? "pi_sent" : "firm_interest";
      await patchTradeRfq(asString(latest.id), { status: nextStatus, extras: { ...extras, commercial } }).catch((error) => {
        console.error("[rfq commercial save]", error);
      });
      if (route === "firm_offer_ready") {
        const { saveFirmTerms } = await import("@/lib/desk-hitl/store");
        await saveFirmTerms({
          requestId: asString(latest.code),
          phone: input.buyer.whatsappE164,
          email: input.buyer.email,
          ...commercial,
        }).catch((error) => {
          console.error("[firm offer park]", error);
        });
      }
    }
    }
  } catch (error) {
    console.error("[buyer desk]", error instanceof Error ? error.message : error);
  }

  if (collecting && extract && asString(extract.product) && (route === "rfq_collect" || route === "rfq_ready")) {
    const fields = fieldsFromExtract(extract, input.text);
    const previousProduct = asString(draft?.product_label);
    const alreadyNotified = Boolean(extrasOf(draft).trade_intent_notified);
    const sendIntent = shouldNotifyTradeOpened(previousProduct, fields.productLabel, alreadyNotified);
    if (sendIntent) fields.extras = { ...fields.extras, trade_intent_notified: true };
    const alertOpened = async (requestId: string) => {
      if (!sendIntent) return;
      await notifyTradeOpened({
        requestId,
        product: fields.productLabel,
        buyer: input.buyer.contactName || input.buyer.companyName,
        quantityMt: fields.quantityMt ? `${fields.quantityMt} MT` : "",
        destination: fields.destinationPort || fields.destinationCountry || "",
      }).catch(() => undefined);
    };
    try {
      if (route === "rfq_ready") {
        const saved = draft?.id
          ? await patchTradeRfq(asString(draft.id), { ...fields, status: "open" }).then(() => ({
              id: asString(draft.id),
              code: asString(draft.code),
            }))
          : await insertWhatsAppRfq({ buyerId: input.buyer.id, ...fields, status: "open" });
        rfqCode = saved.code;
        rfqId = saved.id;
        fanout = true;
        reply = `Thank you for confirming — we have what we need. Your Trade ID is "${saved.code}", and we’ll come back to you shortly with an indication.`;
        await alertOpened(saved.code);
        await notifyRfqSubmitted({
          requestId: saved.code,
          product: fields.productLabel,
          buyer: input.buyer.contactName || input.buyer.companyName,
          quantityMt: fields.quantityMt ? `${fields.quantityMt} MT` : "",
          destination: fields.destinationPort || fields.destinationCountry || "",
        }).catch(() => undefined);
      } else if (draft?.id) {
        await patchTradeRfq(asString(draft.id), fields);
        rfqCode = asString(draft.code);
        rfqId = asString(draft.id);
        await alertOpened(rfqCode);
      } else {
        const saved = await insertWhatsAppRfq({ buyerId: input.buyer.id, ...fields, status: "collecting" });
        rfqCode = saved.code;
        rfqId = saved.id;
        await alertOpened(saved.code);
      }
    } catch (error) {
      console.error("[rfq save]", error instanceof Error ? error.message : error);
    }
  }
  return { reply, agent: "whatsapp-buyer-desk" as const, rfqCode, rfqId, fanout, route };
}

export async function whatsappThread(phone: string, buyerId?: string | null) {
  return listTradeThread({ channel: "whatsapp", buyerId, address: phone }).catch(() => []);
}
