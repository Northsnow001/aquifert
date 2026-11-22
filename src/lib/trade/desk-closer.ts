import "server-only";

import { getDeskDeal, upsertShortlist } from "@/lib/desk-hitl/store";
import {
  getTradeRfqDesk,
  getTradeRfqRecord,
  listDeskCandidateQuotes,
  listRfqsWaitingOnSuppliers,
  patchTradeRfq,
} from "@/lib/trade/store";
import { pickDeskShortlist } from "@/lib/trade/desk-closer-logic";

export { DESK_QUOTE_TARGET, DESK_QUOTE_WAIT_MS, pickDeskShortlist } from "@/lib/trade/desk-closer-logic";
export type { DeskCandidate } from "@/lib/trade/desk-closer-logic";

function extrasOf(row: Record<string, unknown>) {
  const extras = row.extras;
  return extras && typeof extras === "object" && !Array.isArray(extras) ? (extras as Record<string, unknown>) : {};
}

function dealIdFor(requestId: string) {
  return `deal-${requestId.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(0, 80)}`;
}

export async function considerRfqForDesk(rfqId: string) {
  const rfq = await getTradeRfqRecord(rfqId);
  if (!rfq) return { ok: false as const, reason: "missing" as const };
  const status = String(rfq.status || "");
  if (["indication_sent", "negotiating", "firm_interest", "firm_offer_sent", "won", "lost", "expired", "closed"].includes(status)) {
    return { ok: false as const, reason: "already_moved" as const };
  }
  const desk = await getTradeRfqDesk(rfqId);
  const quotes = await listDeskCandidateQuotes(rfqId);
  const extras = extrasOf(rfq);
  const firstSent = desk?.asks.map((ask) => ask.sentAt).filter(Boolean).sort()[0] || null;
  const picked = pickDeskShortlist({
    quotes,
    fanoutAt: extras.fanout_at != null ? String(extras.fanout_at) : firstSent,
  });
  if (!picked.promote) return { ok: true as const, ...picked, requestId: String(rfq.code || "") };

  const requestId = String(rfq.code || "");
  const existing = await getDeskDeal(dealIdFor(requestId));
  if (existing && existing.status !== "waiting_desk") {
    return { ok: false as const, reason: "desk_locked" as const };
  }
  const dest = String(rfq.destination_port || rfq.destination_country || "");
  const deal = await upsertShortlist({
    requestId,
    product: String(rfq.product_label || ""),
    quantityMt: rfq.quantity_mt,
    destination: dest,
    incoterm: String(rfq.incoterm || ""),
    currency: picked.offers[0]?.currency || "USD",
    buyer: {
      name: desk?.buyerContact || "",
      phone: desk?.buyerPhone || "",
      company: desk?.buyerCompany || "",
      email: desk?.buyerEmail || "",
    },
    offers: picked.offers.map((offer, index) => ({
      id: offer.supplierId || `off-${index + 1}`,
      supplierName: offer.supplierName,
      unitPrice: offer.unitPrice,
      currency: offer.currency,
      incoterm: offer.incoterm,
      quantityMt: offer.quantityMt,
      loadPort: offer.loadPort,
      destination: offer.destination || dest,
      receivedAt: offer.receivedAt,
      wechatOpenId: offer.wechatOpenid,
    })),
  });
  if ("error" in deal) return { ok: false as const, reason: "shortlist" as const };

  if (status !== "awaiting_desk") {
    await patchTradeRfq(rfqId, {
      status: "awaiting_desk",
      extras: { ...extras, desk_promoted_at: new Date().toISOString(), desk_reason: picked.reason },
    });
  }
  return { ok: true as const, ...picked, requestId, dealId: deal.id };
}

export async function closeWaitingRfqs() {
  const ids = await listRfqsWaitingOnSuppliers();
  const results = [];
  for (const id of ids) results.push(await considerRfqForDesk(id));
  return results;
}
