import { looksLikeMillOriginPort, looksLikePriceOnly, millOriginPortGaps, rfqQuoteArmed } from "@/lib/wechat/quote-merge";

export const GREETING =
  "Hello, this is Matt from Aquifert Ltd. Thank you for getting in touch. Would you like to share a quote with us today?\n\n您好，我是 Aquifert Ltd 的 Matt。感谢您的联系。请问您今天是否想向我们提供报价？";

export const QUOTE_TYPE =
  "Thank you. Is this a new quote, or a quote for a previous Trade ID?\n\n谢谢。请问这是新的报价，还是针对之前某个交易编号（Trade ID）的报价？";

export const QUOTE_FORMAT =
  "Please send your quote in this format: Product; USD/MT; Incoterm and port; quantity; packaging; shipment; validity. If it is for a previous Trade ID, please add it at the start, e.g. rfq#123.\nExample: Urea granular 46%, USD 395/MT, FOB Qingdao, 5000 MT, 50 kg bags, shipment December, valid 3 days.\n\n请按以下格式发送报价：产品；美元/吨；贸易术语和港口；数量；包装；装期；有效期。如是针对之前的交易编号，请在开头注明，例如 rfq#123。\n例如：颗粒尿素 46%，395 美元/吨，FOB 青岛，5000 吨，50 公斤袋，12月装期，有效期3天。";

export const NO_QUOTE =
  "No problem, thank you for letting us know. Please message us any time you have an offer to share.\n\n好的，谢谢告知。如有报价，欢迎随时联系我们。";

export const THANKS_QUOTE =
  "Thank you — we've received your message and recorded it. Our team will follow up if anything else is needed.\n\n谢谢，我们已收到并记录您的消息。如需其他信息，我们的团队会再联系。";

export function thanksForPrice(rfqId: string, price: string) {
  const id = rfqId.trim() || "this RFQ";
  const usd = price.trim() || "";
  const line = usd ? `Thank you — recorded USD ${usd}/MT for ${id}.` : `Thank you — we've recorded your price for ${id}.`;
  const zh = usd ? `谢谢，已记录 ${id} 的价格为 ${usd} 美元/吨。` : `谢谢，已记录您对 ${id} 的报价。`;
  return `${line}\n\n${zh}`;
}

export function askRfqPrice(rfqId: string) {
  const id = rfqId.trim() || "this RFQ";
  return `Please send the unit price in USD/MT for ${id} (for example 400 or 400 USD/MT). If this is not a quote for ${id}, tell us the Trade ID.\n\n请发送 ${id} 的单价（美元/吨），例如 400 或 400 USD/MT。如不是该编号的报价，请告知正确的交易编号。`;
}

export function askMillOriginPort(rfqId: string, missing: Array<"origin" | "load_port"> = ["origin", "load_port"]) {
  const id = rfqId.trim() || "this RFQ";
  const needOrigin = missing.includes("origin");
  const needPort = missing.includes("load_port");
  if (needOrigin && needPort) {
    return `Please send origin and load port for ${id} (for example China, FOB Qingdao).\n\n请发送 ${id} 的产地和装货港，例如 中国，FOB 青岛。`;
  }
  if (needPort) {
    return `Please send the load port for ${id} (for example Qingdao).\n\n请发送 ${id} 的装货港，例如 青岛。`;
  }
  return `Please send the origin for ${id} (for example China).\n\n请发送 ${id} 的产地，例如 中国。`;
}

export function thanksForPriceAndAskOriginPort(rfqId: string, price: string, missing: Array<"origin" | "load_port">) {
  if (!missing.length) return thanksForPrice(rfqId, price);
  return `${thanksForPrice(rfqId, price)}\n\n${askMillOriginPort(rfqId, missing)}`;
}

export const WAIT_WEEKLY =
  "Thank you — we'll send the weekly broadcast when it goes out. No need to quote until then.\n\n谢谢，我们会在每周广播发出时发给您。在此之前无需报价。";

const compact = (raw: string) => raw.trim().toLowerCase().replace(/[!?。．、，,\s]+$/g, "");

const YES = new Set(["yes", "ok", "okay", "sure", "yeah", "y", "have", "是", "好", "好的", "可以", "有", "要", "嗯", "对"]);
const NO = new Set(["no", "not now", "nothing", "no offer", "不", "不用", "没有", "暂时没有", "暂无", "无报价"]);
const HI = new Set(["hi", "hello", "hey", "yo", "你好", "您好", "在吗", "哈喽", "嗨"]);
const NEW = new Set(["new", "new one", "new quote", "fresh", "新", "新的", "新报价"]);
const PREV = new Set(["previous", "old", "existing", "update", "follow up", "last one", "之前", "以前", "旧的", "上次", "更新", "跟进"]);

export function looksLikeQuote(text: string) {
  return /rfq#?\s*\d+/i.test(text) || /(\d+(?:\.\d+)?)\s*(usd|\$|美元|\/mt|\/t)/i.test(text) || looksLikePriceOnly(text);
}

function parseBarePrice(text: string) {
  return text.trim().match(/(\d{3,6}(?:\.\d{1,2})?)/)?.[1] || "";
}

export function waitingForWeekly(text: string) {
  return /weekly\s+broadcast|wait(?:ing)?\s+(?:till|until|for).{0,40}(broadcast|weekly|rfq)|until you send/i.test(text);
}

export function nextSupplierChat(input: { stage?: string | null; text: string; confirmedRfqId?: string }) {
  const stage = String(input.stage ?? "").trim();
  const raw = input.text.trim();
  const key = compact(raw);
  const rfqId = String(input.confirmedRfqId || "").trim();
  const armed = rfqQuoteArmed(stage, rfqId);

  if (armed && looksLikePriceOnly(raw)) {
    return {
      reply: thanksForPriceAndAskOriginPort(rfqId, parseBarePrice(raw), millOriginPortGaps({})),
      nextStage: "awaiting_origin_port",
    };
  }
  if (stage === "awaiting_origin_port") {
    if (looksLikeMillOriginPort(raw) || looksLikeQuote(raw)) return { reply: THANKS_QUOTE, nextStage: "" };
    return { reply: askMillOriginPort(rfqId), nextStage: "awaiting_origin_port" };
  }
  if (looksLikeQuote(raw) || looksLikePriceOnly(raw)) return { reply: THANKS_QUOTE, nextStage: "" };
  if (waitingForWeekly(raw)) return { reply: WAIT_WEEKLY, nextStage: "" };
  if (NO.has(key)) return { reply: NO_QUOTE, nextStage: "" };
  if (armed) return { reply: askRfqPrice(rfqId), nextStage: "rfq_followup" };

  if (stage === "ask_quote_intent") {
    if (YES.has(key)) return { reply: QUOTE_TYPE, nextStage: "ask_quote_type" };
    if (NEW.has(key)) return { reply: QUOTE_FORMAT, nextStage: "awaiting_quote" };
    if (PREV.has(key)) return { reply: QUOTE_FORMAT, nextStage: "awaiting_quote" };
    if (HI.has(key)) return { reply: QUOTE_FORMAT, nextStage: "awaiting_quote" };
    return { reply: QUOTE_FORMAT, nextStage: "awaiting_quote" };
  }

  if (stage === "ask_quote_type" || stage === "awaiting_quote") {
    if (NEW.has(key) || PREV.has(key) || YES.has(key) || HI.has(key)) return { reply: QUOTE_FORMAT, nextStage: "awaiting_quote" };
    return { reply: QUOTE_FORMAT, nextStage: "awaiting_quote" };
  }

  return { reply: GREETING, nextStage: "ask_quote_intent" };
}
