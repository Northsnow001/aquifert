import "server-only";

import { EXTRACTION_MODEL, generateText, geminiKey } from "@/lib/aquibot-engine/gemini";
import {
  getTradeBuyerByWhatsApp,
  insertTradeBuyer,
  insertWhatsAppRfq,
  linkBuyerWhatsApp,
  listTradeThread,
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
        `Chat History:\n${historyBlock(input.messages)}`,
        `Message:\n${input.text}`,
      ].join("\n"),
    );
    const reply = asString(data.wa_body) || asString(data.reply) || FALLBACK_ONBOARD;
    const buyer = data.buyer && typeof data.buyer === "object" ? (data.buyer as Record<string, unknown>) : {};
    let buyerId: string | null = null;
    if (asString(data.action) === "register") {
      const email = asString(buyer.email).trim().toLowerCase();
      const company = asString(buyer.company).trim();
      if (email.includes("@") && company) {
        const linked = await linkBuyerWhatsApp({ phone: input.phone, email });
        if (linked.ok) buyerId = linked.buyer.id;
        else {
          try {
            const row = await insertTradeBuyer({
              companyName: company,
              contactName: asString(buyer.name),
              jobTitle: asString(buyer.job_title),
              email,
              phone: input.phone,
              country: asString(buyer.country),
              address: asString(buyer.address),
              buyerType: asString(buyer.buyer_type),
              productsOfInterest: asString(buyer.products_of_interest),
              notes: asString(buyer.notes),
            });
            buyerId = row.id;
          } catch {
            buyerId = (await getTradeBuyerByWhatsApp(input.phone))?.id ?? null;
          }
        }
      }
    }
    return { reply, buyerId, agent: "whatsapp-buyer-onboard" as const };
  } catch {
    return { reply: FALLBACK_ONBOARD, buyerId: null, agent: "whatsapp-buyer-onboard" as const };
  }
}

export async function runKnownBuyerTurn(input: { buyer: TradeBuyer; text: string; messages: TradeMessage[] }) {
  const fallback = `Hi ${input.buyer.contactName || input.buyer.companyName} — what fertiliser are you looking to cover?`;
  if (!geminiKey()) return { reply: fallback, agent: "whatsapp-buyer-desk" as const, rfqCode: "" };

  try {
    const agent = await getTradeAgent("whatsapp-buyer-desk");
    const data = await askGemini(
      agent.systemPrompt,
      [
        "Phase: rfq",
        `Buyer name: ${input.buyer.contactName}`,
        `Company: ${input.buyer.companyName}`,
        `Email: ${input.buyer.email}`,
        `Phone: ${input.buyer.whatsappE164 || ""}`,
        `Chat History:\n${historyBlock(input.messages)}`,
        `Message:\n${input.text}`,
      ].join("\n"),
    );
    let reply = asString(data.reply) || fallback;
    let rfqCode = "";
    const route = asString(data.route);
    const extract = data.rfq_extract && typeof data.rfq_extract === "object" ? (data.rfq_extract as Record<string, unknown>) : null;
    if (route === "rfq_ready" && extract) {
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
    return { reply, agent: "whatsapp-buyer-desk" as const, rfqCode };
  } catch {
    return { reply: fallback, agent: "whatsapp-buyer-desk" as const, rfqCode: "" };
  }
}

export async function whatsappThread(phone: string, buyerId?: string | null) {
  return listTradeThread({ channel: "whatsapp", buyerId, address: phone }).catch(() => []);
}
