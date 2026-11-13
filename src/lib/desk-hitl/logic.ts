import type { BuyerReplyKind, DeskDeal, DeskOffer } from "@/lib/desk-hitl/types";

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

const PACKING_DETAIL = /\b(bag|packing|jumbo|bulk|sgs|bl\s*\+|lc |origin|cfr|cif|fob|inspect|coa|permit|25kg|50kg)\b/i;
const CONFIRM_LINE = /^(yes|yep|yeah|ok|okay|sure|correct|confirmed?|send it|please send|go ahead|email it)[\s!.]*$/i;
const GREETING_ONLY = /^(hi|hello|hey|hiya|good (morning|afternoon|evening))[\s!.]*$/i;
const NEW_RFQ_PHRASE =
  /\b(new (order|rfq|request|enquiry|inquiry)|another (order|rfq|product)|different product|start (over|again)|fresh (rfq|enquiry))\b/i;

/** Product names, hellos, and “new RFQ” language must leave packing / FO follow-up. */
export function looksLikeNewRfq(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (CONFIRM_LINE.test(t)) return false;
  if (PACKING_DETAIL.test(t) && t.length < 240) return false;
  if (GREETING_ONLY.test(t) || NEW_RFQ_PHRASE.test(t)) return true;
  const words = t.split(/\s+/).filter(Boolean);
  return words.length <= 6 && !/\b(yes|ok|okay|bags?|jumbo|bulk|origin|inspect|lc)\b/i.test(t);
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
