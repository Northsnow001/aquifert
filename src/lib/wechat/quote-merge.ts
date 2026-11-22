import { extractRfqCode, normalizeRfqCode } from "@/lib/trade/rfq-code";

const INCOTERM_RE = /\b(CFR|CIF|CPT|CIP|DAP|DPU|DDP|FOB|FCA|EXW|FAS)\b/i;
const DEST_TERMS = new Set(["CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"]);
export type OfferSlice = {
  rfq_id: string;
  product_name: string;
  specification: string;
  unit_price: string;
  currency: string;
  quantity: string;
  packaging: string;
  destination: string;
  load_port: string;
  origin: string;
  delivery_turnaround: string;
  incoterms: string;
  validity: string;
  raw_body: string;
};

function blank(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function fill(typed: string, fromRfq: unknown) {
  const t = typed.trim();
  if (!t || /^0+(?:\.0+)?$/.test(t)) return blank(fromRfq);
  return t;
}

export function looksLikeNewQuoteIntent(text: string) {
  return /\bnew quote\b|\bnew one\b|新报价|新的报价/i.test(text) && !extractRfqCode(text);
}

/** After an RFQ card, "1000" or "1000USD" is a unit price, not a new chat. */
export function looksLikePriceOnly(text: string) {
  const t = text.trim();
  if (!t || t.length > 48) return false;
  if (/^\d+(?:\.\d+)?\s*(mt|t|吨)\b/i.test(t) && !/usd|\$|美元/i.test(t)) return false;
  return /^(?:usd|us\$|\$)?\s*\d{3,6}(?:\.\d{1,2})?\s*(?:usd|us\$|\$|美元)?(?:\s*\/\s*(?:mt|t|吨))?$/i.test(t);
}

export function rfqQuoteArmed(stage: string, confirmedRfqId: string) {
  const id = confirmedRfqId.trim();
  const step = stage.trim();
  return Boolean(
    id &&
      (step === "awaiting_previous_quote" ||
        step === "rfq_followup" ||
        step === "awaiting_quote" ||
        step === "awaiting_new_quote" ||
        step === "awaiting_origin_port" ||
        step === "awaiting_quote_confirm"),
  );
}

export function resolveQuoteRfqCode(input: {
  text: string;
  quoteType: string;
  confirmedRfqId: string;
  stage: string;
  lastRfqCode?: string;
  weekly?: boolean;
}) {
  const typed = extractRfqCode(input.text);
  if (input.weekly) return typed;
  if (typed) return typed;
  if (input.quoteType === "new" || looksLikeNewQuoteIntent(input.text)) return "";
  const confirmed =
    extractRfqCode(input.confirmedRfqId) ||
    normalizeRfqCode(input.confirmedRfqId) ||
    extractRfqCode(input.lastRfqCode || "") ||
    blank(input.lastRfqCode);
  const armed =
    input.quoteType === "previous" ||
    input.stage === "awaiting_previous_quote" ||
    input.stage === "rfq_followup" ||
    input.stage === "awaiting_origin_port" ||
    input.stage === "awaiting_quote_confirm" ||
    (Boolean(confirmed) && looksLikePriceOnly(input.text));
  if (!armed) return "";
  return confirmed;
}

export function parseBareOffer(text: string): OfferSlice {
  const incoterms = (text.match(INCOTERM_RE)?.[1] || "").toUpperCase();
  const priced =
    text.match(/(\d+(?:\.\d+)?)\s*(?:usd|\$|美元)(?:\s*\/\s*(?:mt|t|吨))?/i) ||
    text.match(/(?:usd|\$|美元)\s*(\d+(?:\.\d+)?)/i) ||
    text.match(/(\d+(?:\.\d+)?)\s*(?:\/\s*(?:mt|t)|美元\/吨)/i) ||
    (looksLikePriceOnly(text) ? text.match(/(\d{3,6}(?:\.\d{1,2})?)/) : null);
  const unit_price = priced?.[1] || "";
  let port = "";
  if (incoterms) {
    const after = text.split(new RegExp(`\\b${incoterms}\\b`, "i"))[1] || "";
    port = after
      .replace(/(\d+(?:\.\d+)?)\s*(usd|\$|美元|\/mt|\/t|mt).*/i, "")
      .replace(/[,\s;]+/g, " ")
      .trim();
    if (/^(usd|mt|t|\$|\/mt)$/i.test(port)) port = "";
  }
  const destTerm = DEST_TERMS.has(incoterms);
  return {
    rfq_id: extractRfqCode(text),
    product_name: "",
    specification: "",
    unit_price,
    currency: unit_price ? "USD" : "",
    quantity: "",
    packaging: "",
    destination: destTerm ? port : "",
    load_port: destTerm ? "" : port,
    origin: "",
    delivery_turnaround: "",
    incoterms,
    validity: "",
    raw_body: text,
  };
}

const ORIGIN_NAMES: Array<[RegExp, string]> = [
  [/中国|china/i, "China"],
  [/俄罗斯|俄国|russia/i, "Russia"],
  [/埃及|egypt/i, "Egypt"],
  [/摩洛哥|morocco/i, "Morocco"],
  [/沙特|saudi/i, "Saudi Arabia"],
  [/阿曼|oman/i, "Oman"],
  [/卡塔尔|qatar/i, "Qatar"],
  [/印尼|印度尼西亚|indonesia/i, "Indonesia"],
  [/越南|vietnam/i, "Vietnam"],
  [/阿尔及利亚|algeria/i, "Algeria"],
  [/约旦|jordan/i, "Jordan"],
  [/美国|usa|united states/i, "USA"],
  [/加拿大|canada/i, "Canada"],
];

const PORT_NAMES: Array<[RegExp, string]> = [
  [/青岛|qingdao/i, "Qingdao"],
  [/天津|tianjin/i, "Tianjin"],
  [/连云港|lianyungang/i, "Lianyungang"],
  [/张家港|zhangjiagang/i, "Zhangjiagang"],
  [/大连|dalian/i, "Dalian"],
  [/日照|rizhao/i, "Rizhao"],
  [/南京|nanjing/i, "Nanjing"],
  [/上海|shanghai/i, "Shanghai"],
  [/宁波|ningbo/i, "Ningbo"],
  [/防城|fangcheng/i, "Fangcheng"],
];

export function parseMillOriginPort(text: string) {
  const bare = parseBareOffer(text);
  let origin = "";
  let load_port = bare.load_port;
  for (const [re, name] of ORIGIN_NAMES) {
    if (re.test(text)) origin = name;
  }
  for (const [re, name] of PORT_NAMES) {
    if (re.test(text)) load_port = name;
  }
  const token = text.trim();
  if (!origin && !load_port && /^[A-Za-z\u4e00-\u9fff][A-Za-z\u4e00-\u9fff\s'-]{2,40}$/.test(token)) {
    if (!/^(yes|ok|okay|sure|no|hi|hello|谢谢|好的|可以)$/i.test(token)) load_port = token.replace(/\s+/g, " ");
  }
  return { origin, load_port, incoterms: bare.incoterms };
}

export function looksLikeMillOriginPort(text: string) {
  const parsed = parseMillOriginPort(text);
  return Boolean(parsed.origin || parsed.load_port);
}

export function millOriginPortGaps(offer: { origin?: string; load_port?: string }) {
  const missing: Array<"origin" | "load_port"> = [];
  if (!blank(offer.origin)) missing.push("origin");
  if (!blank(offer.load_port)) missing.push("load_port");
  return missing;
}

export function buyerRequestFieldNames(rfq: Record<string, unknown> | null): string[] {
  if (!rfq) return [];
  return (
    [
      ["product_name", rfq.product_label],
      ["specification", rfq.specification],
      ["quantity", rfq.quantity_mt],
      ["packaging", rfq.packing],
      ["incoterms", rfq.incoterm],
      ["destination", rfq.destination_port || rfq.destination_country],
      ["delivery_turnaround", rfq.shipment_window],
    ] as const
  )
    .filter(([, value]) => Boolean(blank(value)))
    .map(([name]) => name);
}

export function mergeOfferWithRfq(offer: OfferSlice, rfq: Record<string, unknown> | null, rfqCode: string): OfferSlice {
  if (!rfq && !rfqCode) return { ...offer };
  const dest = blank(rfq?.destination_port) || blank(rfq?.destination_country);
  return {
    rfq_id: offer.rfq_id || rfqCode || blank(rfq?.code),
    product_name: fill(offer.product_name, rfq?.product_label),
    specification: fill(offer.specification, rfq?.specification),
    unit_price: offer.unit_price,
    currency: offer.currency || (offer.unit_price ? "USD" : ""),
    quantity: fill(offer.quantity, rfq?.quantity_mt),
    packaging: fill(offer.packaging, rfq?.packing),
    incoterms: fill(offer.incoterms, rfq?.incoterm),
    destination: fill(offer.destination, dest),
    load_port: offer.load_port,
    origin: offer.origin,
    delivery_turnaround: fill(offer.delivery_turnaround, rfq?.shipment_window),
    validity: offer.validity,
    raw_body: offer.raw_body,
  };
}

export function filterMissingFields(missing: string[], rfq: Record<string, unknown> | null, offer: OfferSlice) {
  const known = new Set<string>(buyerRequestFieldNames(rfq));
  const filled: Record<string, string> = {
    product_name: offer.product_name,
    specification: offer.specification,
    quantity: offer.quantity,
    packaging: offer.packaging,
    incoterms: offer.incoterms,
    destination: offer.destination,
    load_port: offer.load_port,
    origin: offer.origin,
    delivery_turnaround: offer.delivery_turnaround,
    unit_price: offer.unit_price,
    validity: offer.validity,
  };
  return missing.filter((name) => {
    if (known.has(name)) return false;
    return !blank(filled[name]);
  });
}

