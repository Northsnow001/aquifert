import "server-only";

import { listDeskDeals } from "@/lib/desk-hitl/store";
import { listInbox } from "@/lib/inbox";
import { listTradeRfqs } from "@/lib/trade/store";
import type { TradeRfq } from "@/lib/trade/types";

export type InquirySource = "trade_desk_app" | "ai_agent" | "contact";
export type InquiryView = "inquiries" | "enquiries";

export type InquiryRow = {
  id: string;
  href: string;
  ref: string;
  at: string;
  source: InquirySource;
  channel: string;
  buyerName: string;
  company: string;
  country: string;
  contact: string;
  product: string;
  grade: string;
  quantity: string;
  packaging: string;
  incoterm: string;
  destination: string;
  window: string;
  targetPrice: string;
  payment: string;
  quotes: number;
  completeness: string;
  status: string;
};

const RFQ_STATUS: Record<string, string> = {
  collecting: "New",
  open: "New",
  rfq_sent: "Sent to suppliers",
  awaiting_desk: "In review",
  indication_sent: "Quoted to buyer",
  negotiating: "In review",
  firm_interest: "Margin approved",
  firm_offer_sent: "Quoted to buyer",
  won: "Won",
  lost: "Lost",
  expired: "Closed",
  closed: "Closed",
};

const text = (value: string | null | undefined) => value?.trim() ?? "";

export function rfqStatusLabel(status: string) {
  return RFQ_STATUS[status] ?? "In review";
}

function filled(values: string[]) {
  const done = values.filter(Boolean).length;
  return `${done}/${values.length}`;
}

function fromOrder(item: { id: string; at: string; payload: Record<string, string> }): InquiryRow {
  const p = item.payload;
  const product = text(p.product);
  const grade = product.includes("(") ? product.slice(product.indexOf("(") + 1, product.indexOf(")")) : "";
  return {
    id: item.id,
    href: `/admin/desk/inquiries/app/${encodeURIComponent(item.id)}`,
    ref: text(p.reference) || item.id.slice(0, 18),
    at: item.at,
    source: "trade_desk_app",
    channel: "App",
    buyerName: text(p.name),
    company: text(p.company),
    country: "",
    contact: [text(p.email), text(p.phone)].filter(Boolean).join(" · "),
    product: product.replace(/\s*\([^)]*\)\s*$/, ""),
    grade,
    quantity: text(p.quantity) ? `${text(p.quantity)} MT` : "",
    packaging: text(p.packaging),
    incoterm: text(p.incoterm),
    destination: text(p.destination),
    window: text(p.shipping),
    targetPrice: text(p.target),
    payment: text(p.payment),
    quotes: 0,
    completeness: "",
    status: "New",
  };
}

function fromContact(item: { id: string; at: string; payload: Record<string, string> }): InquiryRow {
  const p = item.payload;
  const message = text(p.message);
  return {
    id: item.id,
    href: `/admin/desk/inquiries/app/${encodeURIComponent(item.id)}`,
    ref: text(p.reference) || "Contact",
    at: item.at,
    source: "contact",
    channel: text(p.channel) || "Hub",
    buyerName: text(p.name),
    company: text(p.company),
    country: "",
    contact: text(p.email),
    product: message.length > 80 ? `${message.slice(0, 80)}…` : message,
    grade: "",
    quantity: "",
    packaging: "",
    incoterm: "",
    destination: "",
    window: "",
    targetPrice: "",
    payment: "",
    quotes: 0,
    completeness: "",
    status: "New",
  };
}

function fromRfq(rfq: TradeRfq, quotes: number): InquiryRow {
  const fields = [rfq.productLabel, rfq.quantityMt ? String(rfq.quantityMt) : "", rfq.packing, rfq.incoterm, rfq.destinationPort, rfq.destinationCountry, rfq.shipmentWindow, rfq.buyerCompany ?? ""];
  return {
    id: rfq.id,
    href: `/admin/desk/inquiries/ai/${rfq.id}`,
    ref: rfq.code || rfq.id.slice(0, 8),
    at: rfq.createdAt || rfq.updatedAt,
    source: "ai_agent",
    channel: "WhatsApp",
    buyerName: "",
    company: text(rfq.buyerCompany),
    country: text(rfq.destinationCountry),
    contact: "",
    product: text(rfq.productLabel),
    grade: "",
    quantity: rfq.quantityMt ? `${rfq.quantityMt} MT` : "",
    packaging: text(rfq.packing),
    incoterm: text(rfq.incoterm),
    destination: [text(rfq.destinationPort), text(rfq.destinationCountry)].filter(Boolean).join(", "),
    window: text(rfq.shipmentWindow),
    targetPrice: rfq.buyerUnitPrice ? `${rfq.buyerUnitPrice} USD / MT` : "",
    payment: "",
    quotes,
    completeness: filled(fields),
    status: rfqStatusLabel(rfq.status),
  };
}

export async function listInquiries(): Promise<InquiryRow[]> {
  const [inbox, rfqs, deals] = await Promise.all([
    listInbox(),
    listTradeRfqs().catch(() => [] as TradeRfq[]),
    listDeskDeals().catch(() => []),
  ]);
  const quotesByCode = new Map<string, number>();
  for (const deal of deals) {
    if (deal.requestId) quotesByCode.set(deal.requestId.toLowerCase(), deal.offers.length);
  }
  const orders = inbox.filter((item) => item.table === "order_enquiries").map(fromOrder);
  const contacts = inbox.filter((item) => item.table === "contact_messages").map(fromContact);
  const ai = rfqs.map((rfq) => fromRfq(rfq, Math.max(rfq.readyQuoteCount, quotesByCode.get(rfq.code.toLowerCase()) ?? 0)));
  return [...orders, ...contacts, ...ai].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export function inquiryView(value: string | undefined): InquiryView {
  return value === "enquiries" ? "enquiries" : "inquiries";
}

export function rowsInView(rows: InquiryRow[], view: InquiryView) {
  return rows.filter((row) => (view === "enquiries" ? row.source !== "ai_agent" : row.source !== "contact"));
}

export function filterInquiries(rows: InquiryRow[], input: { view?: string; tab?: string; q?: string; status?: string }) {
  const view = inquiryView(input.view);
  const tab = input.tab === "app" ? "trade_desk_app" : input.tab === "ai" ? "ai_agent" : input.tab === "contact" ? "contact" : null;
  const q = text(input.q).toLowerCase();
  const status = text(input.status);
  return rowsInView(rows, view).filter((row) => {
    if (tab && row.source !== tab) return false;
    if (status && row.status !== status) return false;
    if (!q) return true;
    return [row.ref, row.buyerName, row.company, row.product, row.contact, row.destination].join(" ").toLowerCase().includes(q);
  });
}
