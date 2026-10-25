/** Firm order draft from the WhatsApp AQ Negotiator (n8n). */

export type FirmOrderBuyer = {
  name: string | null;
  email: string | null;
  phone: string | null;
};

export type FirmOrderDraft = {
  status: string;
  order_ref: string | null;
  buyer: FirmOrderBuyer;
  product: string;
  form_grade: string;
  packing: string;
  quantity_mt: number;
  tolerance_pct: number;
  unit_price_usd: number | null;
  currency: string;
  incoterm: string;
  price_basis: string;
  load_port: string;
  discharge_port: string;
  laycan_from: string;
  laycan_to: string;
  payment_terms: string;
  documents: string;
  flags: string[];
  negotiation_summary: string;
  assumed: string[];
};

const str = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
};
const list = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, 300)).filter(Boolean).slice(0, 20) : [];

/** Accepts the negotiator JSON (or `{ firm_order: {...} }`). Returns null if unusable. */
export function parseFirmOrder(body: unknown): FirmOrderDraft | null {
  if (!body || typeof body !== "object") return null;
  const root = body as Record<string, unknown>;
  const raw = (root.firm_order && typeof root.firm_order === "object" ? root.firm_order : body) as Record<string, unknown>;

  const product = str(raw.product, 120);
  if (!product) return null;

  const buyerRaw = raw.buyer && typeof raw.buyer === "object" ? (raw.buyer as Record<string, unknown>) : {};

  return {
    status: str(raw.status, 64) || "DRAFT_PENDING_CLEARANCE",
    order_ref: str(raw.order_ref, 64) || null,
    buyer: {
      name: str(buyerRaw.name, 120) || null,
      email: str(buyerRaw.email, 320) || null,
      phone: str(buyerRaw.phone, 40) || null,
    },
    product,
    form_grade: str(raw.form_grade, 120),
    packing: str(raw.packing, 120),
    quantity_mt: num(raw.quantity_mt) ?? 0,
    tolerance_pct: num(raw.tolerance_pct) ?? 5,
    unit_price_usd: num(raw.unit_price_usd),
    currency: str(raw.currency, 8) || "USD",
    incoterm: str(raw.incoterm, 24),
    price_basis: str(raw.price_basis, 120),
    load_port: str(raw.load_port, 120),
    discharge_port: str(raw.discharge_port, 120),
    laycan_from: str(raw.laycan_from, 32),
    laycan_to: str(raw.laycan_to, 32),
    payment_terms: str(raw.payment_terms, 200),
    documents: str(raw.documents, 500),
    flags: list(raw.flags),
    negotiation_summary: str(raw.negotiation_summary, 1000),
    assumed: list(raw.assumed),
  };
}
