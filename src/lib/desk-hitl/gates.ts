import type { DeskDeal, DeskOffer } from "@/lib/desk-hitl/types";
import { selectedOffer } from "@/lib/desk-hitl/logic";
import { DEFAULT_FIRM_TERMS, DEFAULT_INDICATION_TEMPLATE } from "@/lib/desk-settings/types";

export { DEFAULT_FIRM_TERMS, DEFAULT_INDICATION_TEMPLATE };

const PRICE = (amount: number, currency: string) =>
  `${currency} ${amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / MT`;

export function fillTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{([a-z0-9_]+)\}/gi, (_, key: string) => values[key.toLowerCase()] ?? "");
}

export function indicationValues(deal: DeskDeal, price: string) {
  const offer = selectedOffer(deal) ?? deal.offers.find((item) => item.shortlisted !== false) ?? deal.offers[0];
  return {
    buyer_name: deal.buyerName || "Buyer",
    company: deal.buyerCompany || "",
    product: deal.product,
    quantity: deal.quantityMt ? `${deal.quantityMt} MT` : "",
    destination: deal.destination || offer?.destination || "",
    incoterm: deal.incoterm || offer?.incoterm || "",
    packing: deal.packing || "",
    delivery_window: deal.shipmentWindow || "",
    price_per_tonne: price,
    validity: "48 hours from this message",
    inquiry_id: deal.requestId,
  };
}

export function indicationDraftText(deal: DeskDeal, template: string, price: string) {
  return fillTemplate(template.trim() || DEFAULT_INDICATION_TEMPLATE, indicationValues(deal, price)).trim();
}

export function firmOfferSubject(deal: Pick<DeskDeal, "requestId" | "product" | "quantityMt" | "destination">) {
  const qty = deal.quantityMt ? `${deal.quantityMt} MT` : "Quantity to confirm";
  return `${deal.requestId} | Firm Offer | ${deal.product || "Product"} | ${qty} | ${deal.destination || "Destination to confirm"}`;
}

export function isShortlisted(offer: DeskOffer) {
  return offer.shortlisted !== false;
}

/** Supplier quote against the firm offer we would send. Flags are for the desk, not the buyer. */
export function firmOfferMismatches(deal: DeskDeal): string[] {
  const offer = selectedOffer(deal);
  const order = deal.firmOffer?.order;
  if (!offer || !order) return [];
  const flags: string[] = [];
  const supplierProduct = (offer.product || deal.product || "").trim();
  if (supplierProduct && order.product && supplierProduct.toLowerCase() !== order.product.trim().toLowerCase()) {
    flags.push(`Product: supplier quoted ${supplierProduct}; the firm offer says ${order.product}.`);
  }
  if (offer.quantityMt != null && order.quantity_mt && offer.quantityMt !== order.quantity_mt) {
    flags.push(`Quantity: supplier ${offer.quantityMt} MT; the firm offer says ${order.quantity_mt} MT.`);
  }
  if (deal.buyerPrice != null && order.unit_price_usd != null && Math.abs(deal.buyerPrice - order.unit_price_usd) > 0.009) {
    flags.push(`Price: the buyer indication is ${PRICE(deal.buyerPrice, deal.currency)}; the firm offer says ${PRICE(order.unit_price_usd, order.currency || "USD")}.`);
  }
  if (offer.incoterm && order.incoterm && offer.incoterm.trim().toLowerCase() !== order.incoterm.trim().toLowerCase()) {
    flags.push(`Incoterm: supplier ${offer.incoterm}; the firm offer says ${order.incoterm}.`);
  }
  const supplierDest = (offer.destination || deal.destination || "").trim();
  const ourDest = (order.discharge_port || "").trim();
  if (supplierDest && ourDest && supplierDest.toLowerCase() !== ourDest.toLowerCase()) {
    flags.push(`Destination: supplier ${supplierDest}; the firm offer says ${ourDest}.`);
  }
  if (deal.packing && order.packing && deal.packing.trim().toLowerCase() !== order.packing.trim().toLowerCase()) {
    flags.push(`Packing: the request says ${deal.packing}; the firm offer says ${order.packing}.`);
  }
  if (deal.shipmentWindow && order.shipping && deal.shipmentWindow.trim().toLowerCase() !== order.shipping.trim().toLowerCase()) {
    flags.push(`Shipment: the request says ${deal.shipmentWindow}; the firm offer says ${order.shipping}.`);
  }
  return flags;
}

export function firmOfferLetter(input: { note: string; orderText: string; terms: string }) {
  return [input.note.trim(), input.orderText.trim(), (input.terms || DEFAULT_FIRM_TERMS).trim()].filter(Boolean).join("\n\n");
}
