export const TRADE_DOCUMENTS = ["purchase_order", "proforma", "sales_contract"] as const;
export type TradeDocument = (typeof TRADE_DOCUMENTS)[number];

/** Trade PDF posted by n8n or the desk. Price is locked by document kind. */

export type FirmOrderBuyer = {
  name: string | null;
  email: string | null;
  phone: string | null;
};

export type FirmOrderSupplier = {
  name: string;
  attention: string;
  address: string;
  city: string;
  country: string;
  wechat_open_id: string;
};

export type FirmOrderDraft = {
  document: TradeDocument;
  status: string;
  order_ref: string | null;
  reference: string;
  po_date: string;
  delivery_date: string;
  vat_number: string;
  supplier: FirmOrderSupplier;
  buyer: FirmOrderBuyer;
  product: string;
  form_grade: string;
  packing: string;
  quantity_mt: number;
  tolerance_pct: number;
  /** Locked price for this document: supplier cost on PO, buyer (cost + margin) on PI / sales contract. */
  unit_price_usd: number | null;
  discount_pct: number;
  vat_applicable: boolean;
  currency: string;
  incoterm: string;
  price_basis: string;
  load_port: string;
  discharge_port: string;
  origin: string;
  shipping: string;
  laycan_from: string;
  laycan_to: string;
  payment_terms: string;
  additional_information: string;
  documents: string;
  flags: string[];
  negotiation_summary: string;
  assumed: string[];
};

export const AQUIFERT_PO_ISSUER = {
  name: "Aquifert Limited",
  lines: ["Office 125,", "Spaces, 12 Hammersmith Grove", "London, W6 7AP", "VAT ID: 457847344"],
  vatNumber: "457847344",
  footer:
    "Company Registration No: 14506592.  Registered Office: 71-75 Shelton Street, London, Greater London, WC2H 9JQ, United Kingdom.",
} as const;

export const DEFAULT_PO_ADDITIONAL =
  "Full amount due must be received into our account without any discount or rebate. Bank charges to be covered by the buyer.";

export const AQUIFERT_BANK = {
  beneficiary: "AQUIFERT LIMITED",
  bankName: "Lloyds Bank",
  bankAddress: "25 Gresham Street, London, EC2V 7HN, United Kingdom",
  account: "12026405",
  currency: "USD",
  iban: "GB91LOYD30995012026406",
  bic: "LOYDGB21287",
} as const;

export function invoiceNumber(requestId: string) {
  const digits = requestId.replace(/\D/g, "");
  if (digits) return `AQ${digits.padStart(6, "0")}`;
  return `AQ${Date.now().toString().slice(-6)}`;
}

export function contractReference(requestId: string) {
  const digits = requestId.replace(/\D/g, "") || "0000";
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `AQ-TE-${yy}-${mm}-${digits.padStart(6, "0")}`;
}

const str = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
};
const list = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, 300)).filter(Boolean).slice(0, 20) : [];

export function purchaseOrderNumber(requestId: string) {
  const digits = requestId.replace(/\D/g, "");
  if (digits) return `PO-${digits.padStart(4, "0")}`;
  return `PO-${Date.now().toString().slice(-4)}`;
}

function poDate(value?: string) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function parseDocument(raw: Record<string, unknown>): TradeDocument {
  const value = str(raw.document ?? raw.doc ?? raw.kind, 40).toLowerCase().replace(/[\s-]+/g, "_");
  if (value === "proforma" || value === "proforma_invoice" || value === "pi") return "proforma";
  if (value === "sales_contract" || value === "sale_contract" || value === "contract") return "sales_contract";
  return "purchase_order";
}

function unitForDocument(document: TradeDocument, raw: Record<string, unknown>) {
  const buyer = num(raw.buyer_unit_price ?? raw.buyerUnitPrice ?? raw.buyerPrice ?? raw.target_price ?? raw.targetPrice);
  const supplier = num(raw.supplier_unit_price ?? raw.supplierUnitPrice);
  if (document === "purchase_order") return supplier ?? (buyer == null ? num(raw.unit_price_usd) : null);
  return buyer ?? (supplier == null ? num(raw.unit_price_usd) : null);
}

/** Accepts `{ firm_order }` or a flat body. PO uses supplier cost; PI / sales contract use buyer price only. */
export function parseFirmOrder(body: unknown): FirmOrderDraft | null {
  if (!body || typeof body !== "object") return null;
  const root = body as Record<string, unknown>;
  const raw = (root.firm_order && typeof root.firm_order === "object" ? root.firm_order : body) as Record<string, unknown>;

  const product = str(raw.product, 120);
  if (!product) return null;

  const document = parseDocument(raw);
  const unit = unitForDocument(document, raw);
  if (unit == null || unit <= 0) return null;

  const buyerRaw = raw.buyer && typeof raw.buyer === "object" ? (raw.buyer as Record<string, unknown>) : {};
  const supplierRaw = raw.supplier && typeof raw.supplier === "object" ? (raw.supplier as Record<string, unknown>) : {};

  const reference = str(raw.reference ?? raw.requestId ?? raw.request_id, 80);
  const orderRef =
    str(raw.order_ref ?? raw.po_number ?? raw.poNumber ?? raw.invoice_number, 64) ||
    (reference ? (document === "purchase_order" ? purchaseOrderNumber(reference) : document === "proforma" ? invoiceNumber(reference) : contractReference(reference)) : null);

  return {
    document,
    status: str(raw.status, 64) || document.toUpperCase(),
    order_ref: orderRef,
    reference,
    po_date: poDate(str(raw.po_date, 32) || undefined),
    delivery_date: str(raw.delivery_date ?? raw.laycan_to, 32),
    vat_number: str(raw.vat_number, 40) || AQUIFERT_PO_ISSUER.vatNumber,
    supplier: {
      name: str(supplierRaw.name ?? raw.supplier_name ?? raw.supplierName, 160),
      attention: str(supplierRaw.attention, 120),
      address: str(supplierRaw.address, 240),
      city: str(supplierRaw.city, 120),
      country: str(supplierRaw.country, 80),
      wechat_open_id: str(supplierRaw.wechat_open_id ?? supplierRaw.wechatOpenId ?? raw.supplierOpenId, 80),
    },
    buyer: {
      name: str(buyerRaw.name, 120) || null,
      email: str(buyerRaw.email, 320) || null,
      phone: str(buyerRaw.phone, 40) || null,
    },
    product,
    form_grade: str(raw.form_grade, 120),
    packing: str(raw.packing, 200),
    quantity_mt: num(raw.quantity_mt) ?? 0,
    tolerance_pct: num(raw.tolerance_pct) ?? 5,
    unit_price_usd: unit,
    discount_pct: num(raw.discount_pct) ?? 0,
    vat_applicable: raw.vat_applicable === true,
    currency: str(raw.currency, 8) || "USD",
    incoterm: str(raw.incoterm, 24),
    price_basis: str(raw.price_basis, 120),
    load_port: str(raw.load_port, 120),
    discharge_port: str(raw.discharge_port, 120),
    origin: str(raw.origin, 120),
    shipping: str(raw.shipping, 120),
    laycan_from: str(raw.laycan_from, 32),
    laycan_to: str(raw.laycan_to, 32),
    payment_terms: str(raw.payment_terms, 500),
    additional_information: str(raw.additional_information, 800) || DEFAULT_PO_ADDITIONAL,
    documents: str(raw.documents, 500),
    flags: list(raw.flags),
    negotiation_summary: str(raw.negotiation_summary, 1000),
    assumed: list(raw.assumed),
  };
}
