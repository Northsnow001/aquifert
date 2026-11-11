import { parseFirmOrder, type FirmOrderDraft } from "@/lib/firm-order/types";

const emptySupplier: FirmOrderDraft["supplier"] = {
  name: "",
  attention: "",
  address: "",
  city: "",
  country: "",
  wechat_open_id: "",
};

export type PiEditorValues = {
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  product: string;
  quantityMt: string;
  unitPrice: string;
  packing: string;
  incoterm: string;
  loadPort: string;
  dischargePort: string;
  origin: string;
  shipping: string;
  paymentTerms: string;
  additionalInformation: string;
  invoiceNumber: string;
  invoiceDate: string;
};

export function valuesFromPi(order: FirmOrderDraft): PiEditorValues {
  return {
    buyerName: order.buyer.name ?? "",
    buyerEmail: order.buyer.email ?? "",
    buyerPhone: order.buyer.phone ?? "",
    product: order.product,
    quantityMt: order.quantity_mt ? String(order.quantity_mt) : "",
    unitPrice: order.unit_price_usd != null ? String(order.unit_price_usd) : "",
    packing: order.packing,
    incoterm: order.incoterm,
    loadPort: order.load_port,
    dischargePort: order.discharge_port || order.price_basis,
    origin: order.origin,
    shipping: order.shipping,
    paymentTerms: order.payment_terms,
    additionalInformation: order.additional_information,
    invoiceNumber: order.order_ref ?? "",
    invoiceDate: order.po_date,
  };
}

function num(value: string) {
  const n = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
}

/** Matt’s form → stored PI. Always proforma; supplier identity never written. */
export function applyPiEditor(order: FirmOrderDraft, values: PiEditorValues): FirmOrderDraft | { error: string } {
  const product = values.product.trim();
  if (!product) return { error: "Product is required." };
  const quantity_mt = num(values.quantityMt);
  if (!Number.isFinite(quantity_mt) || quantity_mt <= 0) return { error: "Quantity must be a number greater than 0." };
  const unit_price_usd = num(values.unitPrice);
  if (!Number.isFinite(unit_price_usd) || unit_price_usd <= 0) return { error: "Buyer unit price must be a number greater than 0." };
  const email = values.buyerEmail.trim();
  if (email && !email.includes("@")) return { error: "Buyer email looks invalid." };

  return {
    ...order,
    document: "proforma",
    product,
    quantity_mt,
    unit_price_usd,
    packing: values.packing.trim(),
    incoterm: values.incoterm.trim(),
    load_port: values.loadPort.trim(),
    discharge_port: values.dischargePort.trim(),
    price_basis: values.dischargePort.trim() || order.price_basis,
    origin: values.origin.trim(),
    shipping: values.shipping.trim(),
    payment_terms: values.paymentTerms.trim(),
    additional_information: values.additionalInformation.trim(),
    order_ref: values.invoiceNumber.trim() || order.order_ref,
    po_date: values.invoiceDate.trim() || order.po_date,
    supplier: emptySupplier,
    buyer: {
      name: values.buyerName.trim() || null,
      email: email || null,
      phone: values.buyerPhone.trim() || null,
    },
  };
}

/** n8n PI payload → stored draft. Rejects firm offer / PO / supplier pack. */
export function proformaFromN8n(body: unknown): FirmOrderDraft | null {
  const parsed = parseFirmOrder(body);
  if (!parsed || parsed.document !== "proforma") return null;
  return { ...parsed, document: "proforma", supplier: emptySupplier };
}
