export const SUPPLIER_PRODUCTS = [
  "Urea (granular)",
  "Urea (prilled)",
  "CAN",
  "Ammonium sulphate",
  "Ammonium nitrate",
  "UAN",
  "Ammonia",
  "NPK",
  "DAP",
  "MAP",
  "Other",
] as const;

export const SUPPLIER_CHANNELS = ["wechat", "email"] as const;
export type SupplierChannel = (typeof SUPPLIER_CHANNELS)[number];

/** One row's worth of fields for the Suppliers sheet, keyed by its column names. */
export type SupplierRegistration = {
  code: string;
  company: string;
  country: string;
  contact: string;
  email: string;
  products: string;
  load_ports: string;
  channel: SupplierChannel;
  status: "form_done";
  form_submitted_at: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CODE = /^[A-Z0-9-]{3,20}$/;
const PRODUCT_VALUES = new Set<string>(SUPPLIER_PRODUCTS);

const text = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

/** "sup 002 " and "sup-002" both become "SUP-002"-style codes the sheet can match. */
export const normaliseSupplierCode = (v: unknown) => text(v, 40).toUpperCase().replace(/\s+/g, "");

export function parseSupplierRegistration(
  body: Record<string, unknown>,
  now = new Date(),
): { ok: true; value: SupplierRegistration } | { ok: false; error: string } {
  // Optional: only present when the supplier opened a personal link from the invite email.
  const rawCode = normaliseSupplierCode(body.code);
  const code = CODE.test(rawCode) ? rawCode : "";
  const email = text(body.email, 320).toLowerCase();
  const company = text(body.company);
  const country = text(body.country, 100);
  const contact = text(body.contact, 120);
  const loadPorts = text(body.load_ports, 400);
  const products = Array.isArray(body.products)
    ? [...new Set(body.products.filter((p): p is string => typeof p === "string" && PRODUCT_VALUES.has(p)))]
    : [];
  const channel = SUPPLIER_CHANNELS.find((c) => c === body.channel);

  if (!EMAIL.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (!company) return { ok: false, error: "Enter your company name." };
  if (!country) return { ok: false, error: "Enter your country." };
  if (contact.length < 2) return { ok: false, error: "Enter a contact person." };
  if (!products.length) return { ok: false, error: "Choose at least one product." };
  if (!loadPorts) return { ok: false, error: "Enter at least one load port." };
  if (!channel) return { ok: false, error: "Choose WeChat or email." };
  if (body.consent !== true) return { ok: false, error: "Please agree to be contacted about price requests." };

  return {
    ok: true,
    value: {
      code,
      company,
      country,
      contact,
      email,
      products: products.join(", "),
      load_ports: loadPorts,
      channel,
      status: "form_done",
      form_submitted_at: now.toISOString(),
    },
  };
}
