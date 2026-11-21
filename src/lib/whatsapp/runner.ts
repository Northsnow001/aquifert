import "server-only";

import { EXTRACTION_MODEL, generateText, geminiKey } from "@/lib/aquibot-engine/gemini";
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
import { identityFromParts, mergeIdentity } from "@/lib/whatsapp/buyer-identity";
import { asString, parseJsonObject } from "@/lib/wechat/agent-parse";
import { getTradeAgent } from "@/lib/wechat/agent-store";

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
    temperature: 0,
    timeoutMs: 25_000,
    maxOutputTokens: 4096,
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

function buyerPhase(status: string) {
  if (status === "pi_sent" || status === "won") return "pi_sent";
  if (status === "firm_offer_sent") return "offer_review";
  if (status === "indication_sent" || status === "firm_interest" || status === "negotiating") return "post_yes";
  return "rfq";
}

function rfqContext(rfq: Record<string, unknown> | null) {
  if (!rfq) return "Known RFQ: none — this is a new enquiry. Do not invent a Trade ID. Leave rfq_id empty.";
  return [
    "Known RFQ: in progress, not confirmed. Do not give a Trade ID yet. Leave rfq_id empty.",
    `RFQ status: ${asString(rfq.status)}`,
    `Product: ${asString(rfq.product_label)}`,
    `Specification: ${asString(rfq.specification)}`,
    `Quantity MT: ${asString(rfq.quantity_mt)}`,
    `Packing: ${asString(rfq.packing)}`,
    `Incoterm: ${asString(rfq.incoterm)}`,
    `Destination: ${asString(rfq.destination_port)} ${asString(rfq.destination_country)}`.trim(),
    `Shipment: ${asString(rfq.shipment_window)}`,
    `Captured extract: ${JSON.stringify(rfq.extras ?? {})}`,
  ].join("\n");
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
      "This turn is RFQ intake for a buyer already on the list. Do not greet as if you just met them. Do not collect onboarding identity again.",
      `Buyer (on file — do not say nice to meet you): ${name}`,
      `Company: ${input.buyer.companyName}`,
      `Email: ${input.buyer.email}`,
      `Phone: ${input.buyer.whatsappE164 || ""}`,
      `Country: ${input.buyer.country}`,
      rfqContext(input.draft),
      `Chat History:\n${historyBlock(input.messages)}`,
      `Last WhatsApp: ${input.text}`,
      "Treat the last WhatsApp as the buyer's latest message. If it is a product name (e.g. SplashFert, urea, DAP), that is the product — ask quantity or destination next, do not ask which product.",
      "Leave rfq_id empty. The app writes the Trade ID only after they confirm the recap.",
    ].join("\n");
  }
  return [
    `Phase: ${input.phase}`,
    `Buyer name: ${name}`,
    `Company: ${input.buyer.companyName}`,
    `Email: ${input.buyer.email}`,
    `Phone: ${input.buyer.whatsappE164 || ""}`,
    rfqContext(input.draft),
    `Chat History:\n${historyBlock(input.messages)}`,
    `Message:\n${input.text}`,
  ].join("\n");
}

export async function runKnownBuyerTurn(input: { buyer: TradeBuyer; text: string; messages: TradeMessage[] }) {
  const fallback = `Hi ${input.buyer.contactName || input.buyer.companyName} — what fertiliser are you looking to cover?`;
  if (!geminiKey()) return { reply: fallback, agent: "whatsapp-buyer-desk" as const, rfqCode: "", rfqId: "", fanout: false };

  try {
    const latest = await getLatestBuyerRfq(input.buyer.id).catch(() => null);
    const phase = buyerPhase(asString(latest?.status));
    const draft = phase === "rfq" && asString(latest?.status) === "collecting" ? latest : null;
    const agent = await getTradeAgent("whatsapp-buyer-desk");
    const data = await askGemini(
      agent.systemPrompt,
      deskUserPrompt({ phase, buyer: input.buyer, text: input.text, messages: input.messages, draft }),
    );
    let reply = asString(data.reply) || fallback;
    let rfqCode = asString(draft?.code);
    let rfqId = asString(draft?.id);
    let fanout = false;
    const route = asString(data.route);
    const extract = data.rfq_extract && typeof data.rfq_extract === "object" ? (data.rfq_extract as Record<string, unknown>) : null;
    const commercial = data.commercial_extract && typeof data.commercial_extract === "object" ? (data.commercial_extract as Record<string, unknown>) : null;
    if (phase === "rfq" && extract && asString(extract.product) && (route === "rfq_collect" || route === "rfq_ready")) {
      const fields = fieldsFromExtract(extract, input.text);
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
      } else if (draft?.id) {
        await patchTradeRfq(asString(draft.id), fields);
        rfqCode = asString(draft.code);
      } else {
        const saved = await insertWhatsAppRfq({ buyerId: input.buyer.id, ...fields, status: "collecting" });
        rfqCode = saved.code;
      }
    }
    if (latest?.id && commercial && (route === "commercial_collect" || route === "firm_offer_ready" || route === "pi_ready")) {
      const extras = latest.extras && typeof latest.extras === "object" ? (latest.extras as Record<string, unknown>) : {};
      const nextStatus = route === "pi_ready" ? "pi_sent" : route === "firm_offer_ready" ? "firm_interest" : asString(latest.status) || "negotiating";
      await patchTradeRfq(asString(latest.id), { status: nextStatus, extras: { ...extras, commercial } });
    }
    return { reply, agent: "whatsapp-buyer-desk" as const, rfqCode, rfqId, fanout };
  } catch {
    return { reply: fallback, agent: "whatsapp-buyer-desk" as const, rfqCode: "", rfqId: "", fanout: false };
  }
}

export async function whatsappThread(phone: string, buyerId?: string | null) {
  return listTradeThread({ channel: "whatsapp", buyerId, address: phone }).catch(() => []);
}
