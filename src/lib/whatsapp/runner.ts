import "server-only";

import { EXTRACTION_MODEL, generateText, geminiKey } from "@/lib/aquibot-engine/gemini";
import {
  getLatestBuyerRfq,
  getTradeBuyerByWhatsApp,
  insertTradeBuyer,
  insertWhatsAppRfq,
  linkBuyerWhatsApp,
  listTradeThread,
  patchTradeRfq,
} from "@/lib/trade/store";
import type { TradeBuyer, TradeMessage } from "@/lib/trade/types";
import { asString, parseJsonObject } from "@/lib/wechat/agent-parse";
import { getTradeAgent } from "@/lib/wechat/agent-store";

function historyBlock(messages: TradeMessage[]) {
  return messages
    .slice(-12)
    .map((row) => `${row.direction === "in" ? "Buyer" : "Desk"}: ${row.body}`)
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

const FALLBACK_ONBOARD =
  "Hello, this is Aquifert. Please send your company name, your name, job title, email, country, city or address, and whether you are a distributor, importer, wholesaler, government buyer, cooperative, or end user.";

function onboardFields(buyer: Record<string, unknown>, phone: string, whatsappName: string, emailHint: string) {
  const name = asString(buyer.name).trim() || whatsappName.trim();
  const jobTitle = asString(buyer.job_title).trim();
  const company = asString(buyer.company).trim();
  const email = (asString(buyer.email).trim() || emailHint.trim()).toLowerCase();
  const country = asString(buyer.country).trim();
  const address = asString(buyer.address).trim();
  const rawType = asString(buyer.buyer_type).trim().toLowerCase();
  const canonicalType =
    (
      {
        distributor: "Distributor",
        importer: "Importer",
        wholesaler: "Wholesaler",
        "government buyer": "Government Buyer",
        government: "Government Buyer",
        cooperative: "Cooperative",
        "end user": "End User",
        other: "Other",
      } as Record<string, string>
    )[rawType] || "";
  const missing: string[] = [];
  if (!name) missing.push("your name");
  if (!jobTitle) missing.push("job title");
  if (!company) missing.push("company name");
  if (!email.includes("@")) missing.push("email");
  if (!country) missing.push("country");
  if (!address) missing.push("city or address");
  if (!canonicalType) missing.push("buyer type");
  return {
    name,
    jobTitle,
    company,
    email,
    country,
    address,
    buyerType: canonicalType,
    productsOfInterest: asString(buyer.products_of_interest),
    notes: asString(buyer.notes),
    phone,
    missing,
  };
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
    const fields = onboardFields(buyer, input.phone, input.name || "", input.email || "");
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

function buyerPhase(status: string) {
  if (status === "pi_sent" || status === "won") return "pi_sent";
  if (status === "firm_offer_sent") return "offer_review";
  if (status === "indication_sent" || status === "firm_interest" || status === "negotiating") return "post_yes";
  return "rfq";
}

function rfqContext(rfq: Record<string, unknown> | null) {
  if (!rfq) return "Known RFQ: none";
  return [
    `Known RFQ: ${asString(rfq.code)}`,
    `RFQ status: ${asString(rfq.status)}`,
    `Product: ${asString(rfq.product_label)}`,
    `Specification: ${asString(rfq.specification)}`,
    `Quantity MT: ${asString(rfq.quantity_mt)}`,
    `Packing: ${asString(rfq.packing)}`,
    `Incoterm: ${asString(rfq.incoterm)}`,
    `Destination: ${asString(rfq.destination_port)} ${asString(rfq.destination_country)}`.trim(),
    `Shipment: ${asString(rfq.shipment_window)}`,
    `Extras: ${JSON.stringify(rfq.extras ?? {})}`,
  ].join("\n");
}

export async function runKnownBuyerTurn(input: { buyer: TradeBuyer; text: string; messages: TradeMessage[] }) {
  const fallback = `Hi ${input.buyer.contactName || input.buyer.companyName} — what fertiliser are you looking to cover?`;
  if (!geminiKey()) return { reply: fallback, agent: "whatsapp-buyer-desk" as const, rfqCode: "" };

  try {
    const latest = await getLatestBuyerRfq(input.buyer.id).catch(() => null);
    const phase = buyerPhase(asString(latest?.status));
    const agent = await getTradeAgent("whatsapp-buyer-desk");
    const data = await askGemini(
      agent.systemPrompt,
      [
        `Phase: ${phase}`,
        `Buyer name: ${input.buyer.contactName}`,
        `Company: ${input.buyer.companyName}`,
        `Email: ${input.buyer.email}`,
        `Phone: ${input.buyer.whatsappE164 || ""}`,
        rfqContext(latest),
        `Chat History:\n${historyBlock(input.messages)}`,
        `Message:\n${input.text}`,
      ].join("\n"),
    );
    let reply = asString(data.reply) || fallback;
    let rfqCode = asString(latest?.code);
    const route = asString(data.route);
    const extract = data.rfq_extract && typeof data.rfq_extract === "object" ? (data.rfq_extract as Record<string, unknown>) : null;
    const commercial = data.commercial_extract && typeof data.commercial_extract === "object" ? (data.commercial_extract as Record<string, unknown>) : null;
    if (phase === "rfq" && route === "rfq_ready" && extract) {
      const saved = await insertWhatsAppRfq({
        buyerId: input.buyer.id,
        productLabel: asString(extract.product),
        specification: asString(extract.form_grade) || asString(extract.specs_notes),
        quantityMt: asString(extract.quantity_mt),
        packing: asString(extract.packing),
        destinationPort: asString(extract.discharge_port) || asString(extract.destination),
        destinationCountry: asString(extract.destination),
        incoterm: asString(extract.incoterm_pref),
        shipmentWindow: asString(extract.timing_notes) || [asString(extract.laycan_from), asString(extract.laycan_to)].filter(Boolean).join(" – "),
        rawMessage: input.text,
        extras: extract,
      });
      rfqCode = saved.code;
      reply = `Thank you for confirming — we have what we need. Your Trade ID is "${saved.code}", and we’ll come back to you shortly with an indication.`;
    }
    if (latest?.id && commercial && (route === "commercial_collect" || route === "firm_offer_ready" || route === "pi_ready")) {
      const extras = latest.extras && typeof latest.extras === "object" ? (latest.extras as Record<string, unknown>) : {};
      const nextStatus = route === "pi_ready" ? "pi_sent" : route === "firm_offer_ready" ? "firm_interest" : asString(latest.status) || "negotiating";
      await patchTradeRfq(asString(latest.id), { status: nextStatus, extras: { ...extras, commercial } });
    }
    return { reply, agent: "whatsapp-buyer-desk" as const, rfqCode };
  } catch {
    return { reply: fallback, agent: "whatsapp-buyer-desk" as const, rfqCode: "" };
  }
}

export async function whatsappThread(phone: string, buyerId?: string | null) {
  return listTradeThread({ channel: "whatsapp", buyerId, address: phone }).catch(() => []);
}
