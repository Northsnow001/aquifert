import type { BuyerReplyKind, DeskDeal, DeskExecution, DeskOffer } from "@/lib/desk-hitl/types";

export function rfqKey(value: unknown): string {
  const n = Number(String(value ?? "").replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? String(n) : "";
}

export function fromEmailAddress(raw: unknown): string {
  if (raw && typeof raw === "object") {
    const row = raw as Record<string, unknown>;
    const nested = row.value;
    const first = Array.isArray(nested) && nested[0] && typeof nested[0] === "object" ? (nested[0] as Record<string, unknown>) : null;
    return fromEmailAddress(first?.address || row.address || row.text || row.from);
  }
  const s = String(raw ?? "").trim();
  const m = s.match(/<([^>]+@[^>]+)>/) || s.match(/([^\s<>]+@[^\s<>]+)/);
  return (m ? m[1] : s).toLowerCase();
}

export function rfqKeysFromText(value: string): string[] {
  const decoded = String(value ?? "")
    .replace(/rfq=23/gi, "rfq#")
    .replace(/_/g, " ");
  const keys: string[] = [];
  const re = /(?:rfq\s*#?\s*|fo\s*[-–]?\s*|deal-)(\d+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(decoded))) keys.push(String(Number(m[1])));
  return [...new Set(keys)];
}

export type BuyerEmailReply = {
  from: string;
  subject: string;
  text: string;
  requestId: string;
  kind: BuyerReplyKind;
};

/** Gmail / n8n WF11 envelope. Not a generated proforma JSON. */
export function parseBuyerEmailReply(body: unknown): BuyerEmailReply | { ignore: true } | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;
  if (String(raw.document ?? "").toLowerCase() === "proforma") return null;
  const nested = raw.body && typeof raw.body === "object" && !Array.isArray(raw.body) ? (raw.body as Record<string, unknown>) : raw;
  const subject = String(nested.subject ?? nested.Subject ?? raw.subject ?? "").trim();
  const text = String(nested.text ?? nested.snippet ?? nested.html ?? raw.text ?? raw.snippet ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const from = fromEmailAddress(nested.from ?? nested.From ?? nested.headers ?? raw.from);
  const looksLikeMail = Boolean(subject || from.includes("@") || nested.snippet);
  if (!looksLikeMail) return null;
  if (/proforma invoice/i.test(subject) && !/^\s*re\s*:/i.test(subject)) return { ignore: true };
  const requestId = rfqKeysFromText(subject)[0] || rfqKeysFromText(text)[0] || rfqKey(nested.requestId ?? nested.reference ?? raw.requestId);
  if (!from.includes("@") && !requestId) return { ignore: true };
  return {
    from,
    subject,
    text: text.slice(0, 4000),
    requestId,
    kind: classifyBuyerReply(text || subject),
  };
}

export function buyerUnitPrice(unitPrice: number, marginPct: number): number {
  const price = unitPrice * (1 + marginPct / 100);
  return Math.round(price * 100) / 100;
}

export function selectedOffer(deal: DeskDeal): DeskOffer | null {
  if (!deal.selectedOfferId) return null;
  return deal.offers.find((offer) => offer.id === deal.selectedOfferId) ?? null;
}

export type FollowUpIntent = "firm_order" | "chat";
export type DeskPhase = "rfq" | "post_yes" | "offer_review" | "pi_sent";

const PACKING_DETAIL =
  /\b(bags?|packing|jumbo|bulk|sgs|bv|coa|coo|bl\s*\+?|bl\b|lc|sblc|cad|tt\b|da\b|dp\b|origin|cfr|cif|fob|inspect|permit|25\s*kg|50\s*kg|sight|days?|payment)\b/i;
const CONFIRM_LINE =
  /^(yes|yep|yeah|ok|okay|sure|correct|confirmed?)(\s+(please\s+)?(send it|go ahead|email it))?[\s!.]*$|^(please send|send it|go ahead|email it)[\s!.]*$/i;
const GREETING_ONLY = /^(hi|hello|hey|hiya|good (morning|afternoon|evening))[\s!.]*$/i;
const NEW_RFQ_PHRASE =
  /\b(new (order|rfq|request|enquiry|inquiry|supply)|another (order|rfq|product|supply)|different product|start (over|again)|fresh (rfq|enquiry))\b/i;

function normProduct(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const PRODUCT_NAME =
  /\b(urea|dap|mop|map|npk|sop|kcl|tsp|ssp|uan|ammonium|nitrate|phosphate|sulphate|sulfate|potash|compound|fertilisers?|fertilizers?)\b|[a-z]*fert\b/i;

function looksLikeProductName(text: string) {
  return PRODUCT_NAME.test(text.trim());
}

/**
 * While packing is open, stay on that deal unless they clearly start something else.
 * Origin/port/country answers (india, lagos) stay. Only a different fertiliser SKU leaves.
 */
export function looksLikeNewRfq(text: string, currentProduct = ""): boolean {
  const t = text.trim();
  if (!t) return false;
  if (CONFIRM_LINE.test(t)) return false;
  if (PACKING_DETAIL.test(t) && t.length < 240) return false;
  if (/\d/.test(t)) return false;
  if (NEW_RFQ_PHRASE.test(t) || GREETING_ONLY.test(t)) return true;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length > 6) return false;
  const token = normProduct(t);
  const current = normProduct(currentProduct);
  if (current && token && (token.includes(current) || current.includes(token))) return false;
  return looksLikeProductName(t);
}

/** Firm offer already sent, or the proforma is out. Price, quantity, and port stay as they are. */
export function offerIsLocked(deal: {
  firmOffer?: { status?: string } | null;
  pi?: { status?: string } | null;
}): boolean {
  return deal.pi?.status === "sent" || deal.firmOffer?.status === "sent";
}

/** The buyer is pointing back at the document already sent, not at a new supply. */
export function mentionsLockedRequest(text: string, requestId = ""): boolean {
  if (/\b(proforma|firm offer|invoice|pi)\b/i.test(text)) return true;
  if (/\brfq\s*#?\s*\d+\b/i.test(text)) return true;
  const id = requestId.trim().toLowerCase();
  return Boolean(id && text.toLowerCase().includes(id));
}

/**
 * A different product, or a phrase such as "new supply".
 * A quantity and port ("600 Apapa port") is not enough on its own.
 */
export function looksLikeNewSupply(text: string, currentProduct = ""): boolean {
  const t = text.trim();
  if (!t || CONFIRM_LINE.test(t) || GREETING_ONLY.test(t)) return false;
  if (NEW_RFQ_PHRASE.test(t)) return true;
  if (/\d/.test(t) || (PACKING_DETAIL.test(t) && t.length < 240)) return false;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length > 6 || !looksLikeProductName(t)) return false;
  const token = normProduct(t);
  const current = normProduct(currentProduct);
  if (current && token && (token.includes(current) || current.includes(token))) return false;
  return true;
}

/** Keep the product already named on the draft. A bare quantity does not replace it. */
export function draftProductFrom(text: string, previous = ""): string {
  const t = text.trim();
  if (!t || /\d/.test(t) || NEW_RFQ_PHRASE.test(t) || !looksLikeProductName(t)) return previous;
  return t.slice(0, 80);
}

export type LockedInbound = {
  take: "follow_up" | "new_supply";
  phase: DeskPhase;
  product: string;
};

/**
 * On a locked request: a new product stays a draft, and everything else is a follow-up.
 * An open draft keeps the following messages, including a quantity, off that request.
 */
/**
 * The locked proforma only takes the message when no indication is waiting
 * and no firm-offer terms are being collected. Naming the proforma still
 * pulls the message back. A YES to Matt's price must not land here.
 */
export function shouldTakeLocked(input: {
  hasOpenIndication: boolean;
  collectingTerms: boolean;
  acceptingFirmOffer: boolean;
  namesDocument: boolean;
}): boolean {
  if (input.acceptingFirmOffer) return false;
  if (input.namesDocument) return true;
  if (input.hasOpenIndication || input.collectingTerms) return false;
  return true;
}

export function lockedInboundDecision(input: {
  text: string;
  product: string;
  requestId: string;
  draft: string | null;
  piSent: boolean;
}): LockedInbound {
  const back = mentionsLockedRequest(input.text, input.requestId);
  const opening = input.draft !== null || looksLikeNewSupply(input.text, input.product);
  if (back || !opening) {
    return { take: "follow_up", phase: input.piSent ? "pi_sent" : "offer_review", product: input.draft ?? "" };
  }
  return { take: "new_supply", phase: "rfq", product: draftProductFrom(input.text, input.draft ?? "") };
}

export function deskPhase(input: {
  event: string;
  collectingTerms?: boolean;
  status?: string;
  firmOfferStatus?: string;
  piStatus?: string;
}): DeskPhase {
  if (input.collectingTerms || input.event === "firm_interest") return "post_yes";
  if (input.piStatus === "sent") return "pi_sent";
  if (input.firmOfferStatus === "sent" || input.status === "firm_interest") return "offer_review";
  return "rfq";
}

export function parseFollowUpIntent(raw: string): FollowUpIntent | null {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as { intent?: unknown };
    const value = String(parsed.intent ?? "").toLowerCase().trim();
    if (value === "firm_order" || value === "details" || value === "followup") return "firm_order";
    if (value === "chat" || value === "rfq" || value === "new") return "chat";
  } catch {
    if (/\bfirm_order\b/i.test(cleaned)) return "firm_order";
    if (/\bchat\b/i.test(cleaned)) return "chat";
  }
  return null;
}

export function parseReplyIntent(raw: string): BuyerReplyKind | null {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as { intent?: unknown; kind?: unknown };
    const value = String(parsed.intent ?? parsed.kind ?? "")
      .toLowerCase()
      .trim();
    if (value === "yes" || value === "confirm" || value === "confirmed") return "agree";
    if (value === "agree" || value === "negotiate" || value === "chat") return value;
  } catch {
    const token = cleaned.toLowerCase().match(/\b(agree|negotiate|chat)\b/)?.[1];
    if (token === "agree" || token === "negotiate" || token === "chat") return token;
  }
  return null;
}

/** A flat no to the indication. Not a counter, and not a new enquiry. */
export function isPlainRefusal(text: string): boolean {
  const t = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t || t.length > 40) return false;
  if (/\b(but|too|high|lower|price|port|qty|quantity|mt|usd|can|could)\b/.test(t)) return false;
  return /^(no|nope|nah|no thanks|no thank you|not interested|not for us|pass|decline|declined|stop|cancel|no offer)$/.test(t);
}

/** Latest standalone price in the negotiation, skipping the order quantity. */
export function agreedPriceFromThread(input: {
  quantityMt: number | null;
  messages: Array<{ from: string; text: string }>;
}): number | null {
  let found: number | null = null;
  for (const msg of input.messages) {
    if (msg.from !== "buyer" && msg.from !== "desk") continue;
    const match = msg.text.trim().match(/^(?:usd|us\$|\$)?\s*(\d{2,5}(?:\.\d{1,2})?)\s*(?:\/\s*mt|per\s*mt)?$/i);
    if (!match) continue;
    const price = Number(match[1]);
    if (!Number.isFinite(price) || price < 20 || price > 5000) continue;
    if (input.quantityMt != null && price === input.quantityMt) continue;
    found = price;
  }
  return found;
}

/** A change to price, volume, or terms, said without the words the keyword list already catches. */
export function looksLikeCounter(text: string): boolean {
  const t = text.toLowerCase().replace(/\s+/g, " ").trim();
  return /\b(can you|could you|what about|how about|your best|best price|last price|target price|target|instead of|do better|come down)\b/.test(t);
}

export function classifyBuyerReply(text: string): BuyerReplyKind {
  const t = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "chat";
  if (
    /\b(no|not|dont|don't|cannot|cant|too high|too much|lower|reduce|negotiate|counter|expensive|load port)\b/.test(
      t,
    )
  ) {
    return "negotiate";
  }
  if (
    /^(yes|yeah|yep|ok|okay|sure|agree|agreed|confirm|confirmed|accept|accepted|proceed|interested|deal|go ahead|i agree|we agree|happy with that|that works)(\s|$)/.test(
      t,
    )
  ) {
    return "agree";
  }
  if (/\b(yes|agree|confirm|accept|interested)\b/.test(t) && t.length < 80) return "agree";
  return "chat";
}

export type MillFirmOfferPayload = {
  event: "firm_offer_sent_mill";
  dealId: string;
  requestId: string;
  supplierName: string;
  wechatOpenId: string;
  product: string;
  quantityMt: number | null;
  packing: string;
  documentation: string;
  incoterm: string;
  destination: string;
  shipping: string;
  paymentTerms: string;
  currency: string;
  supplierUnitPrice: number;
  millMessage: string;
};

function millDocsReq(deal: DeskDeal): string {
  const kinds = new Set((deal.foPack?.attachments ?? []).map((item) => item.kind));
  const parts: string[] = [];
  if (kinds.has("coa")) parts.push("COA");
  if (kinds.has("tds")) parts.push("TDS");
  if (parts.length) return `${parts.join("/")} req`;
  return (deal.execution?.documentation || deal.firmOffer?.order.documents || "").trim();
}

/** Supplier-facing text may only show their quote. Never indication, margin, or buyer unit. */
export function hideBuyerPriceFromSupplier(text: string, buyerPrice: number | null | undefined, supplierUnit: number) {
  if (buyerPrice == null || !(buyerPrice > 0) || Math.abs(buyerPrice - supplierUnit) < 0.001) return text;
  const tokens = new Set(
    [String(buyerPrice), buyerPrice.toFixed(2), buyerPrice.toLocaleString("en-GB", { maximumFractionDigits: 2 })].filter(
      (token) => token && token !== String(supplierUnit),
    ),
  );
  let next = text;
  for (const token of tokens) next = next.split(token).join("");
  return next;
}

/** WeChat to the chosen mill after Matt emails the FO. Price is mill RFQ quote only. */
export function millFirmOfferWeChat(deal: DeskDeal): MillFirmOfferPayload | null {
  const offer = selectedOffer(deal);
  if (!offer || !(offer.unitPrice > 0)) return null;
  const fo = deal.firmOffer?.order;
  const exec = deal.execution;
  const qty = deal.quantityMt ?? offer.quantityMt;
  const packing = exec?.packing || fo?.packing || "";
  const destination = exec?.destinationPort || fo?.discharge_port || deal.destination || offer.destination || "";
  const incoterm = exec?.incoterm || fo?.incoterm || deal.incoterm || offer.incoterm || "";
  const shipping = exec?.shipmentWindow || fo?.shipping || "";
  const payment = (exec?.paymentTerms || fo?.payment_terms || "").trim() || "TBA";
  const documentation = millDocsReq(deal);
  const product = deal.product || fo?.product || "";
  const currency = offer.currency || deal.currency || "USD";
  const qtyBit = qty ? `${qty}MT` : "";
  const line2 = [product && qtyBit ? `${product} ${qtyBit}` : product || qtyBit, packing, documentation]
    .filter(Boolean)
    .join(" | ");
  const line3 = [`${incoterm} ${destination}`.trim(), shipping ? `Ship: ${shipping}` : ""].filter(Boolean).join(" | ");
  const price = `${currency} ${offer.unitPrice.toLocaleString("en-GB", { maximumFractionDigits: 2 })} / MT`;
  let millMessage = [
    `Firm Offer: AQ Trade ID ${deal.requestId}`,
    line2,
    line3,
    `Payment/Validity: ${payment}`,
    `Price: ${price}`,
    "Please check email & reply with best offer.",
  ]
    .filter(Boolean)
    .join("\n");
  millMessage = hideBuyerPriceFromSupplier(millMessage, deal.buyerPrice, offer.unitPrice);
  return {
    event: "firm_offer_sent_mill",
    dealId: deal.id,
    requestId: deal.requestId,
    supplierName: offer.supplierName,
    wechatOpenId: offer.wechatOpenId || fo?.supplier.wechat_open_id || "",
    product,
    quantityMt: qty,
    packing,
    documentation,
    incoterm,
    destination,
    shipping,
    paymentTerms: payment,
    currency,
    supplierUnitPrice: offer.unitPrice,
    millMessage,
  };
}

export function indicationWhatsApp(deal: DeskDeal): string {
  const offer = selectedOffer(deal);
  const qty = deal.quantityMt ? `${deal.quantityMt} MT` : "your volume";
  const price =
    deal.buyerPrice != null
      ? `${deal.currency} ${deal.buyerPrice.toLocaleString("en-GB", { maximumFractionDigits: 2 })} / MT`
      : "price on request";
  const dest = deal.destination || offer?.destination || "";
  const lines = [
    `Aquifert desk — ${deal.product}`,
    `${qty}${dest ? ` to ${dest}` : ""}${deal.incoterm || offer?.incoterm ? `, ${deal.incoterm || offer?.incoterm}` : ""}.`,
    `Indication: ${price}.`,
    "Reply YES to confirm firm interest, or tell us what you need changed.",
  ];
  return lines.join("\n");
}

export function emptyExecution(partial?: Partial<DeskExecution>): DeskExecution {
  return {
    packing: "",
    origin: "",
    destinationPort: "",
    incoterm: "",
    shipmentWindow: "",
    paymentTerms: "",
    inspection: "",
    documentation: "",
    specification: "",
    urgency: "",
    notes: "",
    confirmedAt: "",
    ...partial,
  };
}

/** Fill the next blank commercial field from the buyer's WhatsApp answer. */
export function applyBuyerTermAnswer(exec: DeskExecution, text: string): DeskExecution {
  const value = text.trim().slice(0, 500);
  if (!value) return exec;
  if (!exec.packing) return { ...exec, packing: value };
  if (!exec.paymentTerms) return { ...exec, paymentTerms: value };
  if (!exec.origin) return { ...exec, origin: value };
  if (!exec.inspection) return { ...exec, inspection: value };
  return { ...exec, notes: [exec.notes, value].filter(Boolean).join(" · ") };
}

export function firmTermsRecap(exec: DeskExecution) {
  return [
    "Please confirm so we can prepare the firm offer:",
    exec.packing ? `Packing: ${exec.packing}` : "",
    exec.paymentTerms ? `Payment: ${exec.paymentTerms}` : "",
    exec.origin ? `Origin: ${exec.origin}` : "",
    exec.inspection ? `Inspection: ${exec.inspection}` : "",
    "Reply YES if that is correct, or tell us what to change.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function nextFirmAsk(exec: DeskExecution): { kind: "question"; text: string } | { kind: "recap"; text: string } | { kind: "ready" } {
  if (!exec.packing) {
    return { kind: "question", text: "How would you like it packed — 25kg bags, jumbo bags, or bulk?" };
  }
  if (!exec.paymentTerms) {
    return { kind: "question", text: "How would you like to pay — LC at sight, SBLC, CAD, or TT?" };
  }
  if (!exec.origin) {
    return { kind: "question", text: "Any origin preference, or origins you cannot take?" };
  }
  return { kind: "recap", text: firmTermsRecap(exec) };
}

const num = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
};
const text = (value: unknown, max = 240) => (typeof value === "string" ? value.trim().slice(0, max) : "");

export function parseShortlistBody(body: unknown): {
  requestId: string;
  product: string;
  quantityMt: number | null;
  destination: string;
  incoterm: string;
  buyerName: string;
  buyerPhone: string;
  buyerCompany: string;
  buyerEmail: string;
  offers: DeskOffer[];
  callbackUrl: string | null;
  currency: string;
} | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;
  const requestId = text(raw.requestId || raw.request_id, 80);
  const product = text(raw.product, 120);
  if (!requestId || !product) return null;

  const offersRaw = Array.isArray(raw.offers) ? raw.offers : [];
  const offers: DeskOffer[] = offersRaw
    .map((item, index): DeskOffer | null => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const unitPrice = num(o.unitPrice ?? o.unit_price ?? o.price);
      if (unitPrice === null || unitPrice <= 0) return null;
      return {
        id: text(o.id, 64) || `off-${index + 1}`,
        supplierName: text(o.supplierName ?? o.supplier_name ?? o.supplier, 120) || `Supplier ${index + 1}`,
        unitPrice,
        currency: text(o.currency, 8) || text(raw.currency, 8) || "USD",
        incoterm: text(o.incoterm, 24),
        quantityMt: num(o.quantityMt ?? o.quantity_mt ?? o.qty),
        loadPort: text(o.loadPort ?? o.load_port, 120),
        destination: text(o.destination ?? o.dest, 120),
        receivedAt: text(o.receivedAt ?? o.received_at, 40),
        notes: text(o.notes, 500),
        wechatOpenId: text(o.wechatOpenId ?? o.wechat_open_id ?? o.openid ?? o.openId ?? o.wechatId, 80),
      };
    })
    .filter((o): o is DeskOffer => Boolean(o))
    .slice(0, 3);

  if (!offers.length) return null;

  const buyer = raw.buyer && typeof raw.buyer === "object" ? (raw.buyer as Record<string, unknown>) : {};
  return {
    requestId,
    product,
    quantityMt: num(raw.quantityMt ?? raw.quantity_mt ?? raw.qty),
    destination: text(raw.destination ?? raw.dest, 120),
    incoterm: text(raw.incoterm, 24),
    buyerName: text(buyer.name ?? raw.buyerName, 120),
    buyerPhone: text(buyer.phone ?? raw.buyerPhone ?? raw.phone, 40).replace(/\s+/g, ""),
    buyerCompany: text(buyer.company ?? raw.buyerCompany, 160),
    buyerEmail: text(buyer.email ?? raw.buyerEmail ?? raw.email, 160),
    offers,
    callbackUrl: text(raw.callbackUrl ?? raw.resumeUrl ?? raw.waitUrl, 2000) || null,
    currency: text(raw.currency, 8) || offers[0].currency || "USD",
  };
}
