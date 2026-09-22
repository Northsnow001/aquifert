/**
 * AQUIFERT AI service layer, deterministic simulations of the GPT-4o
 * integrations described in the PRD. Structured so a real OpenAI client
 * can be swapped in without touching callers.
 */
import { PRODUCTS, PRODUCT_META } from "@contracts/constants";

export type ExtractedIntent = {
  product: string | null;
  quantity: number | null;
  destination: string | null;
  deliveryDate: string | null;
  specialInstructions: string | null;
};

export function summarizeWhatsAppMessage(message: string): ExtractedIntent & { confidence: number } {
  const lower = message.toLowerCase();
  const product = PRODUCTS.find((p) => lower.includes(p.toLowerCase())) ?? null;
  const qtyMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:tons?|tonnes?|mt|t\b)/i);
  const quantity = qtyMatch ? Number(qtyMatch[1]) : null;
  const destMatch = message.match(/(?:to|port of|delivery to|deliver to)\s+([A-Z][a-zA-Z]+(?:\s[A-Za-z]+)?(?:,\s*UK)?)/);
  const destination = destMatch ? destMatch[1] : null;
  const weeksMatch = message.match(/(\d+)\s*weeks?/i);
  const deliveryDate = weeksMatch
    ? new Date(Date.now() + Number(weeksMatch[1]) * 7 * 864e5).toISOString().slice(0, 10)
    : null;

  let score = 55;
  if (product) score += 14;
  if (quantity) score += 13;
  if (destination) score += 10;
  if (deliveryDate) score += 8;
  const confidence = Math.min(97, score);

  return {
    product,
    quantity,
    destination,
    deliveryDate,
    specialInstructions: confidence < 75 ? "Some details unclear, clarification recommended" : "Standard granular grade assumed",
    confidence,
  };
}

export function rewriteSupplierResponse(input: {
  pricePerTon: number;
  availability: boolean;
  shipDate?: string;
  notes?: string;
  product: string;
  quantity: number;
}) {
  const label = PRODUCT_META[input.product as keyof typeof PRODUCT_META]?.label ?? input.product;
  const buyerFriendlyMessage = input.availability
    ? `Good news, our supplier has confirmed availability for ${input.quantity} tons of ${label} at $${input.pricePerTon.toLocaleString()}/t, with the earliest vessel departure on ${input.shipDate ?? "the next sailing"}. ${input.notes ? `Note: ${input.notes}.` : ""} Full landed-cost breakdown is ready for your review.`
    : `Our supplier is currently unable to cover ${input.quantity} tons of ${label} on your required dates. We are approaching alternative producers and will revert within 24 hours.`;
  return { ...input, buyerFriendlyMessage };
}

export function generateMarketInsight(points: { date: Date; pricePerTon: number; region: string }[], commodity: string) {
  if (points.length < 2) {
    return {
      narrative: `Insufficient data to generate a reliable ${commodity} insight yet.`,
      recommendation: "Add more market data points to unlock AI insights.",
      trend: "STABLE" as const,
      confidence: 40,
      changePct: 0,
    };
  }
  const sorted = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());
  const first = sorted[0].pricePerTon;
  const last = sorted[sorted.length - 1].pricePerTon;
  const changePct = ((last - first) / first) * 100;
  const windowSize = Math.max(3, Math.floor(sorted.length / 4));
  const recent = sorted.slice(-windowSize);
  const variance = recent.reduce((acc, p) => acc + Math.abs(p.pricePerTon - last) / last, 0) / recent.length;
  const trend = changePct > 2.5 ? "RISING" : changePct < -2.5 ? "FALLING" : "STABLE";
  const volatility = variance > 0.04 ? "HIGH" : variance > 0.015 ? "MODERATE" : "LOW";
  const label = PRODUCT_META[commodity as keyof typeof PRODUCT_META]?.label ?? commodity;
  const narrative =
    trend === "RISING"
      ? `${label} prices have climbed ${changePct.toFixed(1)}% over the tracked period to $${last.toFixed(0)}/t, with ${volatility.toLowerCase()} volatility. Tighter export availability and firm freight rates are supporting the move.`
      : trend === "FALLING"
        ? `${label} prices have eased ${Math.abs(changePct).toFixed(1)}% over the tracked period to $${last.toFixed(0)}/t, with ${volatility.toLowerCase()} volatility. Softer demand and improving producer availability are weighing on the market.`
        : `${label} prices are broadly stable around $${last.toFixed(0)}/t (${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}% over the period), with ${volatility.toLowerCase()} volatility and balanced supply-demand.`;
  const recommendation =
    trend === "RISING"
      ? `Recommend locking in near-term ${label} coverage before further upside; stagger purchases for Q-next exposure.`
      : trend === "FALLING"
        ? `Recommend a buying window for ${label} over the next 2–3 weeks; avoid over-committing until floor forms.`
        : `Recommend hand-to-mouth purchasing for ${label}; revisit hedges if volatility rises.`;
  return {
    narrative,
    recommendation,
    trend: trend as "RISING" | "FALLING" | "STABLE",
    volatility: volatility as "LOW" | "MODERATE" | "HIGH",
    confidence: Math.round(70 + Math.min(25, sorted.length / 4)),
    changePct,
  };
}

const ZH_DICT: [RegExp, string][] = [
  [/request/gi, "询价请求"],
  [/quote/gi, "报价"],
  [/supplier/gi, "供应商"],
  [/tons?/gi, "吨"],
  [/please confirm/gi, "请确认"],
  [/price per ton/gi, "每吨价格"],
  [/earliest ship date/gi, "最早装船日期"],
  [/delivery/gi, "交付"],
];

export function translateToMandarin(text: string) {
  let out = text;
  for (const [re, zh] of ZH_DICT) out = out.replace(re, zh as string);
  return `【AQUIFERT】${out}`;
}

/** Simulated channel senders, structured for Twilio / SendGrid swap-in */
export function simulateChannelSend(channel: "WHATSAPP" | "EMAIL" | "WECHAT", to: string, message: string) {
  console.log(`[${channel} → ${to}] ${message}`);
  return { queued: true, channel, to };
}
