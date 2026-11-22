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
        step === "awaiting_new_quote"),
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

export function buyerRequestFieldNames(rfq: Record<string, unknown> | null) {
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
      ["origin", rfq.origin_preference],
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
    origin: fill(offer.origin, rfq?.origin_preference),
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
    delivery_turnaround: offer.delivery_turnaround,
    unit_price: offer.unit_price,
    validity: offer.validity,
  };
  return missing.filter((name) => {
    if (known.has(name)) return false;
    return !blank(filled[name]);
  });
}

