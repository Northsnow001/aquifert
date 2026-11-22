const NEW_TRADE_PHRASE =
  /\b(new (order|rfq|request|enquiry|inquiry|supply)|another (order|rfq|product|supply)|different product|start (over|again)|fresh (rfq|enquiry))\b/i;

const COURTESY_RE =
  /^(hi+|hello|hey|yo|gm|good\s+(morning|afternoon|evening)|start|thanks|thank you|thx|ok|okay|okey|noted|cheers|great|perfect|cool|alright|all good)(([\s!,.]+(thanks|thank you|thx))*)?([\s!.]*)$/i;

const WAITING_STATUSES = new Set(["open", "rfq_sent", "awaiting_desk"]);

export type BuyerDeskPhase = "rfq" | "waiting_indication" | "post_yes" | "offer_review" | "pi_sent";
export type TradeBindKind = "courtesy" | "same_trade" | "new_trade" | "unclear";

export function isCourtesyMessage(text: string) {
  const t = text.trim();
  if (!t || t.length > 80) return false;
  return COURTESY_RE.test(t);
}

export function buyerPhaseFromStatus(status: string): BuyerDeskPhase {
  const s = status.trim();
  if (s === "pi_sent" || s === "won") return "pi_sent";
  if (s === "firm_offer_sent") return "offer_review";
  if (s === "firm_interest") return "post_yes";
  if (s === "indication_sent" || s === "negotiating") return "offer_review";
  if (WAITING_STATUSES.has(s)) return "waiting_indication";
  return "rfq";
}

export function waitingIndicationReply(code: string, product = "") {
  const id = code.trim() || "this request";
  const prod = product.trim();
  return prod
    ? `Noted — ${id} (${prod}) is with the desk. We'll come back shortly with an indication.`
    : `Noted — ${id} is with the desk. We'll come back shortly with an indication.`;
}

const COMMERCIAL_ROUTE = new Set([
  "commercial_collect",
  "firm_offer_ready",
  "pi_ready",
  "await_review",
  "await_payment",
]);

const FIRM_OFFER_TALK =
  /\b(firm offer|proforma invoice|how would you like to pay|origin preferences|inspection requirements|prepare the firm offer|keeping delivery to|cad payment confirmed)\b/i;

export type RfqExtract = Record<string, unknown> | null;

export function hasNewTradeIntent(text: string, recentInbound: string[] = []) {
  if (NEW_TRADE_PHRASE.test(text.trim())) return true;
  return recentInbound.some((line) => NEW_TRADE_PHRASE.test(line.trim()));
}

function normProduct(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function productsDiffer(a: string, b: string) {
  const left = normProduct(a);
  const right = normProduct(b);
  if (!left || !right) return false;
  return left !== right && !left.includes(right) && !right.includes(left);
}

function standaloneProductName(text: string) {
  const t = text.trim();
  if (!t || t.length > 80 || NEW_TRADE_PHRASE.test(t)) return "";
  if (isCourtesyMessage(t) || isRfqRecapConfirm(t)) return "";
  if (/^(yes|no|ok|okay|cad|lc|sblc|sgs|bulk|cif|cfr|fob|thanks|thank you)\b/i.test(t)) return "";
  if (/@|https?:/i.test(t)) return "";
  if (t.split(/\s+/).filter(Boolean).length > 6) return "";
  return t;
}

export function bindInboundToTrade(input: {
  text: string;
  recentInbound?: string[];
  latestStatus?: string;
  latestProduct?: string;
  geminiKind?: TradeBindKind | null;
}) {
  const status = (input.latestStatus || "").trim();
  const phase = buyerPhaseFromStatus(status);
  if (!status || status === "collecting") {
    return { kind: "same_trade" as const, startNew: false, phase: "rfq" as const };
  }
  if (isCourtesyMessage(input.text) || input.geminiKind === "courtesy") {
    return { kind: "courtesy" as const, startNew: false, phase };
  }
  if (hasNewTradeIntent(input.text, input.recentInbound)) {
    return { kind: "new_trade" as const, startNew: true, phase: "rfq" as const };
  }
  const named = standaloneProductName(input.text);
  if (named && productsDiffer(named, input.latestProduct || "")) {
    return { kind: "new_trade" as const, startNew: true, phase: "rfq" as const };
  }
  if (input.geminiKind === "new_trade") {
    return { kind: "new_trade" as const, startNew: true, phase: "rfq" as const };
  }
  return { kind: "same_trade" as const, startNew: false, phase };
}

export const TRADE_BIND_PROMPT = `You classify one WhatsApp line against the buyer's LIVE trade.
Return JSON only: {"kind":"courtesy"|"same_trade"|"new_trade"|"unclear"}
- courtesy: thanks, okay, hi, noted, acknowledgements. Never new_trade. Never a product.
- same_trade: follow-up on the live product, destination, price, status, or Trade ID.
- new_trade: they clearly want a different enquiry (new order/request, or a fertiliser that is not the live product).
- unclear: if unsure. Prefer same_trade over new_trade when a live Trade ID exists.
Never treat thanks or okay as a product name.`;

/** Open a new collecting RFQ instead of writing onto a live or confirmed request. */
export function shouldStartNewRfq(input: {
  text: string;
  recentInbound?: string[];
  latestStatus?: string;
  requestedPhase?: string;
  latestProduct?: string;
  geminiKind?: TradeBindKind | null;
}) {
  return bindInboundToTrade(input).startNew;
}

/** One admin mail when a product is first named on this request — not on every follow-up. */
export function shouldNotifyTradeOpened(
  previousProduct: string,
  nextProduct: string,
  alreadyNotified = false,
) {
  if (alreadyNotified) return false;
  const next = nextProduct.trim();
  if (!next) return false;
  return !previousProduct.trim();
}

export function threadSinceNewTrade<T extends { direction?: string; body?: string }>(
  messages: T[],
  currentText: string,
): T[] {
  if (NEW_TRADE_PHRASE.test(currentText.trim())) return [];
  let start = -1;
  for (let i = 0; i < messages.length; i += 1) {
    const row = messages[i];
    if (row.direction === "in" && NEW_TRADE_PHRASE.test(String(row.body || ""))) start = i;
  }
  if (start < 0) return messages;
  return messages.slice(start);
}

const TRADE_SCOPED_FIELDS = [
  "destination",
  "discharge_port",
  "incoterm_pref",
  "packing",
  "origin_pref",
  "payment_pref",
  "inspection",
  "timing_notes",
  "laycan_from",
  "laycan_to",
] as const;

/** Drop ports, terms, and payment copied from another trade unless the buyer said them here. */
export function isolateExtractToTrade(extract: RfqExtract, buyerLines: string[], currentText: string) {
  if (!extract) return extract;
  const blob = [...buyerLines, currentText].join("\n").toLowerCase();
  const next: Record<string, unknown> = { ...extract };
  for (const key of TRADE_SCOPED_FIELDS) {
    const val = String(next[key] ?? "").trim();
    if (!val) continue;
    const parts = val
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((part) => part.length >= 3);
    if (!parts.length) continue;
    if (!parts.some((part) => blob.includes(part))) delete next[key];
  }
  return next;
}

function valueOf(extract: RfqExtract, key: string) {
  return String(extract?.[key] ?? "").trim();
}

const RFQ_ASKS: Array<{ key: string; ask: string }> = [
  { key: "product", ask: "What fertiliser are you looking to cover?" },
  { key: "quantity_mt", ask: "What quantity in MT are you looking for?" },
  { key: "packing", ask: "How should it be packed — bulk, jumbo bags, or 25/50 kg bags?" },
  { key: "incoterm_pref", ask: "Do you wish to buy FOB, or CFR / CIF?" },
  { key: "discharge_port", ask: "Which discharge port or country?" },
  { key: "timing_notes", ask: "What shipping window are you looking at?" },
];

function portFilled(extract: RfqExtract) {
  return Boolean(valueOf(extract, "discharge_port") || valueOf(extract, "destination"));
}

function skipPort(extract: RfqExtract) {
  return /\bFOB\b/i.test(valueOf(extract, "incoterm_pref"));
}

export function nextMissingRfqField(extract: RfqExtract) {
  for (const row of RFQ_ASKS) {
    if (row.key === "discharge_port") {
      if (skipPort(extract) || portFilled(extract)) continue;
    } else if (valueOf(extract, row.key)) continue;
    else return row;
  }
  return null;
}

export function rfqCollectComplete(extract: RfqExtract) {
  return !nextMissingRfqField(extract);
}

export function isRfqRecapConfirm(text: string) {
  return /^(yes|yep|yeah|ok|okay|sure|correct|confirmed|go ahead|proceed)([\s!.]*)$/i.test(text.trim());
}

export function isRfqRecapMessage(text: string) {
  const t = text.trim();
  if (!t || /prepare the firm offer/i.test(t)) return false;
  return /please confirm if .{0,160}details/i.test(t) && /product\s*:/i.test(t);
}

export function lastAgentText(messages: Array<{ direction?: string; from?: string; body?: string; text?: string }>) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const row = messages[i];
    if (row.direction === "out" || row.from === "desk") return String(row.body || row.text || "");
  }
  return "";
}

export function isRfqRecapConfirmTurn(
  messages: Array<{ direction?: string; from?: string; body?: string; text?: string }>,
  text: string,
) {
  return isRfqRecapConfirm(text) && isRfqRecapMessage(lastAgentText(messages));
}

export function parseRfqRecap(text: string) {
  const grab = (label: string) => {
    const match = text.match(new RegExp(`${label}\\s*:\\s*([^\\n•]+)`, "i"));
    return match ? match[1].replace(/\s+/g, " ").trim() : "";
  };
  const quantity = grab("quantity");
  const terms = grab("incoterms?\\s*/\\s*port") || grab("incoterms?");
  const term = terms.match(/\b(CIF|CFR|FOB|CPT|CIP|DAP|DDP|FCA|EXW)\b/i)?.[1] || "";
  const port = terms
    .replace(/\b(CIF|CFR|FOB|CPT|CIP|DAP|DDP|FCA|EXW)\b/gi, "")
    .replace(/^[\s,/-]+|[\s,/-]+$/g, "")
    .trim();
  return {
    product: grab("product"),
    quantity_mt: quantity.replace(/[^\d.]/g, ""),
    packing: grab("packing"),
    incoterm_pref: term.toUpperCase(),
    discharge_port: port,
    timing_notes: grab("shipping"),
  };
}

export function looksLikeCommercialJump(reply: string, route: string) {
  if (COMMERCIAL_ROUTE.has(route)) return true;
  return FIRM_OFFER_TALK.test(reply);
}

function notedAsk(extract: RfqExtract, ask: string) {
  const product = valueOf(extract, "product");
  const qty = valueOf(extract, "quantity_mt");
  const bits = [product, qty ? `${qty} MT` : ""].filter(Boolean);
  return bits.length ? `Noted — ${bits.join(", ")}. ${ask}` : ask;
}

export function rfqRecapText(extract: RfqExtract) {
  const port = valueOf(extract, "discharge_port") || valueOf(extract, "destination") || "to confirm";
  const term = valueOf(extract, "incoterm_pref") || "to confirm";
  const qty = valueOf(extract, "quantity_mt");
  return [
    "Please confirm if the following details are correct:",
    `• Product: ${valueOf(extract, "product") || "to confirm"}`,
    `• Quantity: ${qty ? `${qty} MT` : "to confirm"}`,
    `• Packing: ${valueOf(extract, "packing") || "to confirm"}`,
    `• Incoterms / Port: ${term} ${port}`.trim(),
    `• Shipping: ${valueOf(extract, "timing_notes") || valueOf(extract, "laycan_from") || "to confirm"}`,
  ].join("\n");
}

/** Keep a new enquiry on RFQ intake: collect, recap, confirm — never a firm offer. */
export function coerceRfqPhaseTurn(input: {
  route: string;
  reply: string;
  extract: RfqExtract;
  text: string;
}) {
  let route = input.route;
  let reply = input.reply;
  const extract = input.extract;
  if (isRfqRecapConfirm(input.text) && rfqCollectComplete(extract)) {
    return { route: "rfq_ready", reply, extract };
  }
  const jumped = looksLikeCommercialJump(reply, route);
  if (jumped) route = "rfq_collect";
  if (route === "rfq_ready" && (!rfqCollectComplete(extract) || !isRfqRecapConfirm(input.text))) {
    route = "rfq_collect";
  }
  if (jumped) {
    const missing = nextMissingRfqField(extract);
    reply = missing ? notedAsk(extract, missing.ask) : rfqRecapText(extract);
  } else if (route === "rfq_ready" && !rfqCollectComplete(extract)) {
    const missing = nextMissingRfqField(extract);
    reply = missing ? notedAsk(extract, missing.ask) : rfqRecapText(extract);
  } else if (route !== "rfq_ready" && rfqCollectComplete(extract) && !isRfqRecapConfirm(input.text)) {
    route = "rfq_collect";
    if (!/please confirm if the following details are correct/i.test(reply)) {
      reply = rfqRecapText(extract);
    }
  }
  return { route, reply, extract };
}
