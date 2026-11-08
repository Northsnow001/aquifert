import { selectedOffer } from "@/lib/desk-hitl/logic";
import type { DeskDeal } from "@/lib/desk-hitl/types";
import {
  DEFAULT_PO_ADDITIONAL,
  contractReference,
  invoiceNumber,
  purchaseOrderNumber,
  type FirmOrderDraft,
} from "@/lib/firm-order/types";

function packingFromNotes(notes: string) {
  const match = notes.match(/packing\s*[:\-]\s*(.+)/i);
  return match?.[1]?.trim().slice(0, 200) ?? "";
}

function baseFromDeal(deal: DeskDeal) {
  const offer = selectedOffer(deal);
  const qty = deal.quantityMt ?? offer?.quantityMt ?? 0;
  const destination = offer?.destination || deal.destination;
  const incoterm = offer?.incoterm || deal.incoterm;
  return {
    offer,
    qty,
    destination,
    incoterm,
    packing: packingFromNotes(offer?.notes ?? ""),
    currency: offer?.currency || deal.currency || "USD",
    load_port: offer?.loadPort ?? "",
  };
}

/** Buyer PI / sales contract. Price is indication (supplier + margin). Never includes supplier identity or cost. */
export function buyerDocumentFromDeal(deal: DeskDeal, document: "proforma" | "sales_contract"): FirmOrderDraft | null {
  if (deal.buyerPrice == null || deal.buyerPrice <= 0) return null;
  const { qty, destination, incoterm, packing, currency, load_port } = baseFromDeal(deal);
  const ref = deal.requestId;
  return {
    document,
    status: document.toUpperCase(),
    order_ref: document === "proforma" ? invoiceNumber(ref) : contractReference(ref),
    reference: ref,
    po_date: new Date().toISOString().slice(0, 10),
    delivery_date: "",
    vat_number: "457847344",
    supplier: {
      name: "",
      attention: "",
      address: "",
      city: "",
      country: "",
      wechat_open_id: "",
    },
    buyer: {
      name: deal.buyerName || deal.buyerCompany || null,
      email: null,
      phone: deal.buyerPhone || null,
    },
    product: deal.product,
    form_grade: "",
    packing,
    quantity_mt: qty,
    tolerance_pct: 5,
    unit_price_usd: deal.buyerPrice,
    discount_pct: 0,
    vat_applicable: false,
    currency,
    incoterm,
    price_basis: destination,
    load_port,
    discharge_port: destination,
    origin: "",
    shipping: "",
    laycan_from: "",
    laycan_to: "",
    payment_terms: "",
    additional_information: DEFAULT_PO_ADDITIONAL,
    documents: "",
    flags: [],
    negotiation_summary: "",
    assumed: [],
  };
}

/** PO JSON for the desk button after payment. Supplier cost only. */
export function firmOrderFromDeal(deal: DeskDeal): FirmOrderDraft | null {
  const { offer, qty, destination, incoterm, packing, currency, load_port } = baseFromDeal(deal);
  if (!offer) return null;
  return {
    document: "purchase_order",
    status: "PURCHASE_ORDER",
    order_ref: purchaseOrderNumber(deal.requestId),
    reference: deal.requestId,
    po_date: new Date().toISOString().slice(0, 10),
    delivery_date: "",
    vat_number: "457847344",
    supplier: {
      name: offer.supplierName,
      attention: "",
      address: "",
      city: "",
      country: "",
      wechat_open_id: offer.wechatOpenId ?? "",
    },
    buyer: {
      name: deal.buyerName || null,
      email: null,
      phone: deal.buyerPhone || null,
    },
    product: deal.product,
    form_grade: "",
    packing,
    quantity_mt: qty,
    tolerance_pct: 5,
    unit_price_usd: offer.unitPrice,
    discount_pct: 0,
    vat_applicable: false,
    currency,
    incoterm,
    price_basis: destination,
    load_port,
    discharge_port: destination,
    origin: "",
    shipping: "",
    laycan_from: "",
    laycan_to: "",
    payment_terms: "",
    additional_information: DEFAULT_PO_ADDITIONAL,
    documents: "",
    flags: [],
    negotiation_summary: "",
    assumed: [],
  };
}

/** Supplier pack after payment: PO, purchase contract, documentary instructions at supplier cost. */
export function supplierDocumentFromDeal(
  deal: DeskDeal,
  document: "purchase_order" | "purchase_contract" | "documentary_instructions",
): FirmOrderDraft | null {
  const po = firmOrderFromDeal(deal);
  if (!po) return null;
  return {
    ...po,
    document,
    status: document.toUpperCase(),
    order_ref:
      document === "purchase_order" ? purchaseOrderNumber(deal.requestId) : contractReference(deal.requestId),
  };
}
