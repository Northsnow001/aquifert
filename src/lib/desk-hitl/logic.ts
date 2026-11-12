import type { BuyerReplyKind, DeskDeal, DeskOffer } from "@/lib/desk-hitl/types";

export function buyerUnitPrice(unitPrice: number, marginPct: number): number {
  const price = unitPrice * (1 + marginPct / 100);
  return Math.round(price * 100) / 100;
}

export function selectedOffer(deal: DeskDeal): DeskOffer | null {
  if (!deal.selectedOfferId) return null;
  return deal.offers.find((offer) => offer.id === deal.selectedOfferId) ?? null;
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
    offers,
    callbackUrl: text(raw.callbackUrl ?? raw.resumeUrl ?? raw.waitUrl, 2000) || null,
    currency: text(raw.currency, 8) || offers[0].currency || "USD",
  };
}
