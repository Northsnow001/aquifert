export const Session = {
  cookieName: "kimi_sid",
  maxAgeMs: 365 * 24 * 60 * 60 * 1000,
} as const;

export const ErrorMessages = {
  unauthenticated: "Authentication required",
  insufficientRole: "Insufficient permissions",
} as const;

export const Paths = {
  login: "/login",
  oauthCallback: "/api/oauth/callback",
} as const;

/* ---------------- AQUIFERT domain constants ---------------- */

export const PRODUCTS = ["UREA", "DAP", "MOP", "MAP", "NPK"] as const;
export type Product = (typeof PRODUCTS)[number];

export const PRODUCT_META: Record<Product, { label: string; formula: string; desc: string }> = {
  UREA: { label: "Urea", formula: "46-0-0", desc: "High-nitrogen prilled/granular fertiliser" },
  DAP: { label: "DAP", formula: "18-46-0", desc: "Di-ammonium phosphate" },
  MOP: { label: "MOP", formula: "0-0-60", desc: "Muriate of potash" },
  MAP: { label: "MAP", formula: "11-52-0", desc: "Mono-ammonium phosphate" },
  NPK: { label: "NPK", formula: "15-15-15", desc: "Balanced compound fertiliser" },
};

export const PORTAL_ROLES = ["ADMIN", "OPERATIONS", "FINANCE", "SUPPORT", "BUYER", "SUPPLIER"] as const;
export type PortalRole = (typeof PORTAL_ROLES)[number];
export const STAFF_ROLES: PortalRole[] = ["ADMIN", "OPERATIONS", "FINANCE", "SUPPORT"];

export const MEMBERSHIP_PLANS = [
  {
    tier: "SPROUT" as const,
    name: "Sprout",
    monthly: 2000,
    annual: 21600,
    tonnage: "Up to 50 tons / month",
    tonnageLimit: 50,
    features: [
      "Cost-to-cost pricing (no margin)",
      "Basic market insights dashboard",
      "30-day price trends",
      "Standard support",
    ],
    missing: ["Invoice financing", "Real-time AI recommendations", "Dedicated account manager"],
  },
  {
    tier: "HARVEST" as const,
    name: "Harvest",
    monthly: 5000,
    annual: 54000,
    tonnage: "51–200 tons / month",
    tonnageLimit: 200,
    features: [
      "Everything in Sprout",
      "Real-time insights dashboard",
      "Invoice financing up to £50k",
      "AI trade recommendations",
      "Priority support",
    ],
    missing: ["Dedicated account manager", "Custom analytics"],
  },
  {
    tier: "SCALE" as const,
    name: "Scale",
    monthly: 7000,
    annual: 75600,
    tonnage: "201+ tons / month",
    tonnageLimit: 1000,
    features: [
      "Everything in Harvest",
      "Dedicated account manager",
      "Financing up to £200k",
      "Custom analytics & reports",
      "Quarterly strategy reviews",
    ],
    missing: [],
  },
];

export const REQUEST_STATUSES = [
  "NEW", "QUOTED", "ACCEPTED", "PAID", "SHIPPED", "IN_TRANSIT", "DELIVERED", "COMPLETED", "DISPUTED",
] as const;

export const MILESTONES = [
  "BOOKED", "GATE_IN", "LOADED", "DEPARTURE", "IN_TRANSIT",
  "ARRIVAL", "CUSTOMS", "CLEARED", "OUT_FOR_DELIVERY", "DELIVERED",
] as const;

/** Role-based access matrix (admin users page) */
export const ACCESS_MATRIX: { area: string; roles: Record<PortalRole, string> }[] = [
  {
    area: "Command Center & dashboards",
    roles: { ADMIN: "Full", OPERATIONS: "Full", FINANCE: "Full", SUPPORT: "View", BUYER: "N/A", SUPPLIER: "N/A" },
  },
  {
    area: "AI Communication Hub",
    roles: { ADMIN: "Full", OPERATIONS: "Full", FINANCE: "N/A", SUPPORT: "Full", BUYER: "N/A", SUPPLIER: "N/A" },
  },
  {
    area: "Request & quote management",
    roles: { ADMIN: "Full", OPERATIONS: "Full", FINANCE: "View", SUPPORT: "View", BUYER: "Own only", SUPPLIER: "Assigned" },
  },
  {
    area: "Margins & quote cost breakdown",
    roles: { ADMIN: "Full", OPERATIONS: "View", FINANCE: "Full", SUPPORT: "N/A", BUYER: "N/A", SUPPLIER: "N/A" },
  },
  {
    area: "Finance view (invoices, billing, financing)",
    roles: { ADMIN: "Full", OPERATIONS: "N/A", FINANCE: "Full", SUPPORT: "N/A", BUYER: "Own only", SUPPLIER: "N/A" },
  },
  {
    area: "Logistics tracker",
    roles: { ADMIN: "Full", OPERATIONS: "Full", FINANCE: "View", SUPPORT: "View", BUYER: "Own orders", SUPPLIER: "Own shipments" },
  },
  {
    area: "User management",
    roles: { ADMIN: "Full", OPERATIONS: "N/A", FINANCE: "N/A", SUPPORT: "N/A", BUYER: "N/A", SUPPLIER: "N/A" },
  },
  {
    area: "Market insights engine",
    roles: { ADMIN: "Full", OPERATIONS: "Full", FINANCE: "View", SUPPORT: "N/A", BUYER: "Members", SUPPLIER: "N/A" },
  },
];

/** Demo personas available on the onboarding screen */
export const DEMO_PERSONAS = [
  { key: "admin", label: "Admin, Command Center", unionId: "demo_admin", desc: "Full operations, AI draft queue, finance & margins" },
  { key: "member", label: "Buyer, Harvest member", unionId: "demo_buyer_2", desc: "Cost-to-cost pricing, insights, financing" },
  { key: "buyer", label: "Buyer, Non-member", unionId: "demo_buyer_5", desc: "Standard quotes with margin, upgrade CTA" },
  { key: "supplier", label: "Supplier, Exporter", unionId: "demo_supplier_1", desc: "Request inbox, quotes, shipments, earnings" },
] as const;

/** The 14-stage trade lifecycle (spine document, Part II). */
export const TRADE_STAGES = [
  "Enquiry",
  "Price sourcing",
  "Firming details",
  "Short-validity firm offer",
  "Close & recap",
  "System trade capture",
  "Back-to-back contracts",
  "Payment & margin",
  "Execution",
  "Documentary instructions & regeneration",
  "Inspection workflow",
  "Shipment & B/L management",
  "Payment against scanned documents",
  "Originals couriered & completion",
] as const;

/** Document gate states (identity firewall, default-deny). */
export const GATE_STATES = {
  BLOCKED: { label: "Blocked, awaiting scan", tone: "slate" },
  PASS: { label: "Pass, awaiting human clearance", tone: "teal" },
  RESOLVE_THEN_PASS: { label: "Resolve then pass, fix required", tone: "amber" },
  HARD_NO_GO: { label: "Hard no-go, blocked outright", tone: "red" },
} as const;

export const DOC_CLASSES = {
  A: "Aquifert-issuable, regenerate on our letterhead",
  B: "Carrier document, switch B/L + Letter of Indemnity",
  C: "Authority-issued, source re-issue only, never pass through",
} as const;
