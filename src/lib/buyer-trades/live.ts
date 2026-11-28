import "server-only";

import { listRecords } from "@/lib/data/records";
import { DESK_DEALS, INBOX } from "@/lib/data/tables";
import { dataClient } from "@/lib/data/db";
import { listDeskDeals } from "@/lib/desk-hitl/store";
import type { DeskDeal } from "@/lib/desk-hitl/types";
import type { MemberDoc, MemberStage, MemberTrade } from "@/lib/buyer-trades/member";
import type { SessionUser } from "@/lib/session-shared";

const mail = (value: string | null | undefined) => value?.trim().toLowerCase() ?? "";

function when(iso: string | null | undefined) {
  const time = Date.parse(iso ?? "");
  if (!Number.isFinite(time)) return "";
  return new Date(time).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function qty(value: number | null) {
  return value && value > 0 ? value : null;
}

function stageOf(status: string): { stage: MemberStage; label: string } {
  if (status === "lost" || status === "expired") return { stage: "completed", label: "Closed" };
  if (status === "closed" || status === "won") return { stage: "completed", label: "Completed" };
  if (status === "firm_interest" || status === "firm_offer_sent") return { stage: "confirmed", label: "Confirmed" };
  return { stage: "quote", label: "With the desk" };
}

const SENT_DOCS: { kind: MemberDoc["kind"]; name: string; sent: (deal: DeskDeal) => boolean; at: (deal: DeskDeal) => string | null | undefined }[] = [
  { kind: "firm_offer", name: "Firm offer", sent: (deal) => deal.firmOffer?.status === "sent", at: (deal) => deal.firmOffer?.sentAt },
  { kind: "proforma", name: "Proforma invoice", sent: (deal) => deal.pi?.status === "sent", at: (deal) => deal.pi?.sentAt },
  { kind: "sales_contract", name: "Sales contract", sent: (deal) => deal.salesContract?.status === "sent", at: (deal) => deal.salesContract?.sentAt },
];

export function sentBuyerDocument(deal: DeskDeal, kind: string) {
  return SENT_DOCS.find((doc) => doc.kind === kind && doc.sent(deal)) ?? null;
}

function documentsFor(deal: DeskDeal): MemberDoc[] {
  return SENT_DOCS.filter((doc) => doc.sent(deal)).map((doc) => ({
    name: doc.name,
    kind: doc.kind,
    status: "Sent",
    updated: when(doc.at(deal)) || when(deal.updatedAt),
    href: `/hub/trade/${encodeURIComponent(deal.id)}/file/${doc.kind}`,
  }));
}

function fromDeal(deal: DeskDeal): MemberTrade {
  const mapped = stageOf(deal.status);
  const execution = deal.execution;
  const quantity = qty(deal.quantityMt);
  const route = [deal.incoterm, deal.destination].filter(Boolean).join(" · ");
  const payment = execution?.paymentTerms?.trim() || "";
  return {
    id: deal.id,
    ref: deal.requestId?.trim() || deal.id,
    product: deal.product || "Fertiliser",
    detail: [quantity ? `${quantity.toLocaleString("en-GB")} MT` : "", execution?.packing || deal.packing || ""].filter(Boolean).join(" · "),
    quantityMt: quantity,
    route: route || "Route to be confirmed",
    stage: mapped.stage,
    stageLabel: mapped.label,
    stageNote: when(deal.updatedAt) ? `Updated ${when(deal.updatedAt)}` : "",
    shipment: execution?.shipmentWindow?.trim() || "Not nominated",
    shipmentNote: execution?.destinationPort?.trim() || deal.destination || "",
    payment: payment || "Not invoiced",
    paymentNote: deal.buyerPrice != null ? `${deal.currency || "USD"} ${deal.buyerPrice.toLocaleString("en-GB")} / MT` : "",
    documents: documentsFor(deal),
    terms: [
      ["Product", deal.product],
      ["Quantity", quantity ? `${quantity.toLocaleString("en-GB")} MT` : ""],
      ["Packing", execution?.packing || deal.packing || ""],
      ["Incoterm", execution?.incoterm || deal.incoterm],
      ["Destination", execution?.destinationPort || deal.destination],
      ["Origin", execution?.origin || ""],
      ["Shipment", execution?.shipmentWindow || ""],
      ["Payment", payment],
      ["Specification", execution?.specification || ""],
    ]
      .filter(([, value]) => value?.trim())
      .map(([label, value]) => ({ label, value: value.trim() })),
    updates: [...deal.messages]
      .filter((message) => message.text?.trim())
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
      .slice(0, 6)
      .map((message) => ({ when: when(message.at), text: message.text.trim() })),
    updatedAt: deal.updatedAt || deal.at,
  };
}

function fromEnquiry(item: { id: string; at: string; payload: Record<string, string> }): MemberTrade {
  const payload = item.payload;
  const quantity = Number(payload.quantity);
  const amount = Number.isFinite(quantity) && quantity > 0 ? quantity : null;
  return {
    id: item.id,
    ref: payload.reference?.trim() || item.id,
    product: payload.product?.trim() || "Fertiliser",
    detail: [amount ? `${amount.toLocaleString("en-GB")} MT` : "", payload.packaging?.trim() || ""].filter(Boolean).join(" · "),
    quantityMt: amount,
    route: [payload.incoterm, payload.destination].filter(Boolean).join(" · ") || "Route to be confirmed",
    stage: "quote",
    stageLabel: "Enquiry received",
    stageNote: when(item.at) ? `Sent ${when(item.at)}` : "",
    shipment: payload.shipping?.trim() || "Not nominated",
    shipmentNote: payload.destination?.trim() || "",
    payment: "Not invoiced",
    paymentNote: "",
    documents: [],
    terms: [
      ["Product", payload.product],
      ["Quantity", amount ? `${amount.toLocaleString("en-GB")} MT` : ""],
      ["Packing", payload.packaging],
      ["Incoterm", payload.incoterm],
      ["Destination", payload.destination],
      ["Shipment", payload.shipping],
      ["Company", payload.company],
    ]
      .filter(([, value]) => value?.trim())
      .map(([label, value]) => ({ label, value: value.trim() })),
    updates: when(item.at) ? [{ when: when(item.at), text: "Enquiry sent to the desk." }] : [],
    updatedAt: item.at,
  };
}

function fromRfq(row: Record<string, unknown>): MemberTrade {
  const status = String(row.status ?? "");
  const mapped = stageOf(status);
  const quantity = qty(typeof row.quantity_mt === "number" ? row.quantity_mt : Number(row.quantity_mt));
  const destination = [String(row.destination_port ?? ""), String(row.destination_country ?? "")].filter(Boolean).join(", ");
  const id = String(row.id ?? "");
  const updated = String(row.updated_at ?? row.created_at ?? "");
  return {
    id: `rfq-${id}`,
    ref: String(row.code ?? id),
    product: String(row.product_label ?? "").trim() || "Fertiliser",
    detail: [quantity ? `${quantity.toLocaleString("en-GB")} MT` : "", String(row.packing ?? "").trim()].filter(Boolean).join(" · "),
    quantityMt: quantity,
    route: [String(row.incoterm ?? "").trim(), destination].filter(Boolean).join(" · ") || "Route to be confirmed",
    stage: mapped.stage,
    stageLabel: mapped.label,
    stageNote: when(updated) ? `Updated ${when(updated)}` : "",
    shipment: String(row.shipment_window ?? "").trim() || "Not nominated",
    shipmentNote: destination,
    payment: "Not invoiced",
    paymentNote: "",
    documents: [],
    terms: [
      ["Product", String(row.product_label ?? "")],
      ["Quantity", quantity ? `${quantity.toLocaleString("en-GB")} MT` : ""],
      ["Packing", String(row.packing ?? "")],
      ["Incoterm", String(row.incoterm ?? "")],
      ["Destination", destination],
      ["Shipment", String(row.shipment_window ?? "")],
    ]
      .filter(([, value]) => value.trim())
      .map(([label, value]) => ({ label, value: value.trim() })),
    updates: when(updated) ? [{ when: when(updated), text: "The desk has this request." }] : [],
    updatedAt: updated,
  };
}

async function dealsFor(email: string) {
  const want = mail(email);
  const db = dataClient();
  if (!db) return (await listDeskDeals()).filter((deal) => mail(deal.buyerEmail) === want);
  const { data, error } = await db.from(DESK_DEALS.table).select("data").filter("data->>buyerEmail", "ilike", want);
  if (error) return (await listDeskDeals()).filter((deal) => mail(deal.buyerEmail) === want);
  return (data ?? []).map((row) => row.data as DeskDeal);
}

async function rfqsFor(email: string) {
  const db = dataClient();
  if (!db) return [];
  const buyer = await db.from("trade_buyers").select("id").ilike("email", mail(email)).maybeSingle();
  if (buyer.error || !buyer.data?.id) return [];
  const rfqs = await db
    .from("trade_rfqs")
    .select("id, code, product_label, quantity_mt, packing, incoterm, destination_port, destination_country, shipment_window, status, created_at, updated_at")
    .eq("buyer_id", buyer.data.id)
    .order("updated_at", { ascending: false });
  if (rfqs.error) return [];
  return (rfqs.data ?? []) as Record<string, unknown>[];
}

/** Trades and sent documents that belong to this member. Nothing from another account is included. */
export async function memberTrades(user: SessionUser): Promise<MemberTrade[]> {
  const [deals, inbox, rfqs] = await Promise.all([
    dealsFor(user.email).catch(() => [] as DeskDeal[]),
    listRecords(INBOX, { email: user.email, limit: 100 }).catch(() => []),
    rfqsFor(user.email).catch(() => [] as Record<string, unknown>[]),
  ]);
  const covered = new Set(deals.map((deal) => deal.requestId?.trim().toLowerCase()).filter(Boolean) as string[]);
  const fromDeals = deals.map(fromDeal);
  const fromOrders = inbox
    .filter((item) => item.table === "order_enquiries")
    .filter((item) => !covered.has((item.payload.reference || "").trim().toLowerCase()))
    .map(fromEnquiry);
  const fromRequests = rfqs
    .filter((row) => !covered.has(String(row.code ?? "").trim().toLowerCase()))
    .map(fromRfq);
  return [...fromDeals, ...fromOrders, ...fromRequests].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export async function memberTrade(user: SessionUser, id: string) {
  const trades = await memberTrades(user);
  const key = decodeURIComponent(id);
  return trades.find((trade) => trade.id === key || trade.ref === key) ?? null;
}
