export type BookRow = Record<string, unknown> & { id: string };

export type BookFieldType = "text" | "textarea" | "number" | "date" | "select" | "checkbox";

export type BookField = {
  key: string;
  label: string;
  type: BookFieldType;
  required?: boolean;
  list?: boolean;
  readonly?: boolean;
  options?: string[];
};

export type BookSpec = {
  slug: string;
  table: string;
  title: string;
  description: string;
  sheet: string;
  identity: "uuid" | "settings" | "lists";
  codeCounter?: { key: string; prefix: string; pad: number };
  fields: BookField[];
};

const RFQ_STATUS = [
  "collecting", "open", "rfq_sent", "awaiting_desk", "indication_sent",
  "negotiating", "firm_interest", "firm_offer_sent", "won", "lost", "expired", "closed",
];
const PARTY_STATUS = ["active", "inactive", "dormant"];
const CHANNEL = ["email", "whatsapp", "wechat", "phone", "other"];
const QUOTE_KIND = ["rfq", "weekly", "broadcast"];
const QUOTE_STATUS = ["incomplete", "received", "firm", "general_rate", "no_offer", "superseded"];
const DOC_TYPE = [
  "firm_offer", "proforma", "purchase_order", "sales_contract",
  "commercial_invoice", "packing_list", "bl", "coa", "coo", "other",
];
const DOC_STATUS = ["draft", "review", "sent", "superseded", "void"];
const SHIP_STATUS = [
  "pending", "contract_negotiation", "contract_signed", "loading_pending",
  "loading", "shipped", "delivered", "cancelled",
];

export const BOOK_SPECS: BookSpec[] = [
  {
    slug: "products",
    table: "trade_products",
    title: "Products",
    sheet: "Products",
    description: "Fertiliser catalogue used on RFQs and quotes.",
    identity: "uuid",
    fields: [
      { key: "code", label: "Code", type: "text", list: true },
      { key: "name", label: "Product name", type: "text", required: true, list: true },
      { key: "grade", label: "Grade / description", type: "text", list: true },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    slug: "forwarders",
    table: "trade_forwarders",
    title: "Freight forwarders",
    sheet: "Freight Forwarders",
    description: "Forwarders who send weekly and RFQ freight rates.",
    identity: "uuid",
    codeCounter: { key: "next_forwarder_number", prefix: "F-", pad: 3 },
    fields: [
      { key: "code", label: "Code", type: "text", list: true, readonly: true },
      { key: "company_name", label: "Company", type: "text", required: true, list: true },
      { key: "contact_name", label: "Contact", type: "text", list: true },
      { key: "email", label: "Email", type: "text", list: true },
      { key: "whatsapp_e164", label: "Phone / WhatsApp", type: "text" },
      { key: "wechat_id", label: "WeChat ID", type: "text" },
      { key: "country", label: "Country", type: "text" },
      { key: "routes_covered", label: "Routes covered", type: "textarea" },
      { key: "vessel_types", label: "Container / vessel types", type: "text" },
      { key: "status", label: "Status", type: "select", options: PARTY_STATUS, list: true },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    slug: "rfqs",
    table: "trade_rfqs",
    title: "Buyer requests",
    sheet: "Buyer Requests",
    description: "RFQ spine. Quantity is stored in MT.",
    identity: "uuid",
    codeCounter: { key: "next_rfq_number", prefix: "rfq#", pad: 3 },
    fields: [
      { key: "code", label: "RFQ", type: "text", list: true, readonly: true },
      { key: "product_label", label: "Product", type: "text", required: true, list: true },
      { key: "specification", label: "Specification", type: "text" },
      { key: "quantity_mt", label: "Quantity (MT)", type: "number", list: true },
      { key: "packing", label: "Packing", type: "text" },
      { key: "destination_port", label: "Destination port", type: "text", list: true },
      { key: "destination_country", label: "Destination country", type: "text" },
      { key: "incoterm", label: "Incoterm", type: "text", list: true },
      { key: "shipment_window", label: "Shipment window", type: "text" },
      { key: "payment_terms", label: "Payment terms", type: "text" },
      { key: "currency", label: "Currency", type: "text" },
      { key: "target_price", label: "Target / indication price", type: "number" },
      { key: "status", label: "Status", type: "select", options: RFQ_STATUS, list: true },
      { key: "source_channel", label: "Source channel", type: "select", options: CHANNEL },
      { key: "supplier_unit_price", label: "Supplier price", type: "number" },
      { key: "buyer_unit_price", label: "Buyer price", type: "number" },
      { key: "margin_type", label: "Margin type", type: "select", options: ["fixed", "percent", "aq0_fee"] },
      { key: "margin_value", label: "Margin value", type: "number" },
      { key: "raw_message", label: "Raw message", type: "textarea" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    slug: "quotes",
    table: "trade_quotes",
    title: "Supplier quotes",
    sheet: "Supplier Offers / suppliers_responses",
    description: "RFQ replies and weekly mill rates.",
    identity: "uuid",
    fields: [
      { key: "code", label: "Offer ID", type: "text", list: true },
      { key: "kind", label: "Kind", type: "select", options: QUOTE_KIND, list: true },
      { key: "product_label", label: "Product", type: "text", required: true, list: true },
      { key: "specification", label: "Specification", type: "text" },
      { key: "unit_price", label: "Unit price", type: "number", list: true },
      { key: "currency", label: "Currency", type: "text" },
      { key: "quantity_mt", label: "Quantity (MT)", type: "number", list: true },
      { key: "packing", label: "Packing", type: "text" },
      { key: "origin", label: "Origin", type: "text" },
      { key: "load_port", label: "Load port", type: "text", list: true },
      { key: "destination_port", label: "Destination port", type: "text" },
      { key: "incoterm", label: "Incoterm", type: "text" },
      { key: "delivery_window", label: "Delivery window", type: "text" },
      { key: "validity_until", label: "Validity until", type: "date" },
      { key: "status", label: "Status", type: "select", options: QUOTE_STATUS, list: true },
      { key: "source_channel", label: "Channel", type: "select", options: CHANNEL },
      { key: "is_no_offer", label: "No offer", type: "checkbox" },
      { key: "week_start", label: "Week start", type: "date" },
      { key: "raw_message", label: "Raw message", type: "textarea" },
    ],
  },
  {
    slug: "freight",
    table: "trade_freight_quotes",
    title: "Freight quotes",
    sheet: "Freight Quotes / freight_forwaders_responses",
    description: "Weekly and per-RFQ forwarder rates.",
    identity: "uuid",
    fields: [
      { key: "kind", label: "Kind", type: "select", options: ["rfq", "weekly"], list: true },
      { key: "origin_port", label: "Origin", type: "text", list: true },
      { key: "destination_port", label: "Destination", type: "text", list: true },
      { key: "route", label: "Route", type: "text" },
      { key: "container_type", label: "Container type", type: "text" },
      { key: "mode", label: "Mode", type: "select", options: ["bulk_vessel", "container"] },
      { key: "rate", label: "Rate", type: "number", list: true },
      { key: "rate_basis", label: "Rate basis", type: "select", options: ["per_container", "per_mt", "lump_sum"] },
      { key: "currency", label: "Currency", type: "text" },
      { key: "transit_days", label: "Transit days", type: "text" },
      { key: "is_no_offer", label: "No offer", type: "checkbox" },
      { key: "week_start", label: "Week start", type: "date" },
      { key: "conditions", label: "Conditions", type: "textarea" },
      { key: "raw_message", label: "Raw message", type: "textarea" },
    ],
  },
  {
    slug: "offers",
    table: "trade_buyer_offers",
    title: "Offers to buyers",
    sheet: "Offers to Buyers",
    description: "Indications sent to buyers (Airtable and desk offers).",
    identity: "uuid",
    fields: [
      { key: "code", label: "Offer ID", type: "text", list: true },
      { key: "offer_date", label: "Offer date", type: "date", list: true },
      { key: "status", label: "Status", type: "text", list: true },
      { key: "buyer_name", label: "Buyer", type: "text", list: true },
      { key: "product_label", label: "Product", type: "text", list: true },
      { key: "quantity_mt", label: "Quantity (MT)", type: "number" },
      { key: "packing", label: "Packing", type: "text" },
      { key: "incoterm", label: "Incoterm", type: "text" },
      { key: "port", label: "Port", type: "text" },
      { key: "enquiry_code", label: "Enquiry ID", type: "text" },
      { key: "quote_code", label: "Quote ID", type: "text" },
      { key: "supplier_unit_price", label: "Supplier price", type: "number" },
      { key: "offered_unit_price", label: "Offered price", type: "number", list: true },
      { key: "margin_per_mt", label: "Margin / MT", type: "number" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    slug: "pricing",
    table: "trade_deal_pricing",
    title: "Deal pricing",
    sheet: "Deal Pricing",
    description: "Landed cost and margin build-up for a request.",
    identity: "uuid",
    fields: [
      { key: "code", label: "Pricing ID", type: "text", list: true },
      { key: "rfq_code", label: "Request ID", type: "text", list: true },
      { key: "buyer_company", label: "Buyer", type: "text", list: true },
      { key: "supplier_name", label: "Supplier", type: "text", list: true },
      { key: "deal_type", label: "Deal type", type: "text" },
      { key: "seller_unit_price", label: "Seller price", type: "number" },
      { key: "freight_per_mt", label: "Freight / MT", type: "number" },
      { key: "landed_cost_per_mt", label: "Landed cost", type: "number" },
      { key: "margin_type", label: "Margin type", type: "text" },
      { key: "margin_value", label: "Margin value", type: "number" },
      { key: "buyer_unit_price", label: "Buyer price", type: "number", list: true },
      { key: "quantity_mt", label: "Quantity (MT)", type: "number" },
      { key: "currency", label: "Currency", type: "text" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    slug: "shipments",
    table: "trade_shipments",
    title: "Trades",
    sheet: "Trades",
    description: "Execution / logistics (Airtable trades).",
    identity: "uuid",
    fields: [
      { key: "legacy_trade_code", label: "Trade ID", type: "text", list: true },
      { key: "status", label: "Status", type: "select", options: SHIP_STATUS, list: true },
      { key: "pol", label: "POL", type: "text" },
      { key: "pod", label: "POD", type: "text", list: true },
      { key: "packing", label: "Packing", type: "text" },
      { key: "shipping_mode", label: "Shipping mode", type: "text" },
      { key: "etd", label: "ETD", type: "date" },
      { key: "eta", label: "ETA", type: "date" },
      { key: "lsd", label: "LSD", type: "date" },
      { key: "carrier", label: "Carrier", type: "text", list: true },
      { key: "booking_ref", label: "Booking ref", type: "text" },
      { key: "inspection", label: "Inspection", type: "text" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    slug: "leads",
    table: "trade_leads",
    title: "Leads",
    sheet: "Leads",
    description: "Buyer follow-ups and expected volume.",
    identity: "uuid",
    fields: [
      { key: "code", label: "Lead ID", type: "text", list: true },
      { key: "buyer_name", label: "Buyer", type: "text", required: true, list: true },
      { key: "status", label: "Status", type: "text", list: true },
      { key: "next_action", label: "Next action", type: "text", list: true },
      { key: "next_action_at", label: "Next action date", type: "date" },
      { key: "expected_volume_mt", label: "Expected volume (MT)", type: "number" },
      { key: "expected_margin_pct", label: "Expected margin %", type: "number" },
      { key: "enquiry_code", label: "Enquiry ID", type: "text" },
      { key: "comments", label: "Comments", type: "textarea" },
    ],
  },
  {
    slug: "documents",
    table: "trade_documents",
    title: "Documents",
    sheet: "Documents Register",
    description: "PO, contracts, invoices and other trade docs.",
    identity: "uuid",
    fields: [
      { key: "doc_type", label: "Doc type", type: "select", options: DOC_TYPE, list: true },
      { key: "doc_number", label: "Doc number", type: "text", list: true },
      { key: "version", label: "Version", type: "number", list: true },
      { key: "counterparty_name", label: "Counterparty", type: "text", list: true },
      { key: "counterparty_kind", label: "Counterparty type", type: "select", options: ["buyer", "supplier", "forwarder"] },
      { key: "currency", label: "Currency", type: "text" },
      { key: "total_amount", label: "Total amount", type: "number" },
      { key: "status", label: "Status", type: "select", options: DOC_STATUS, list: true },
      { key: "storage_path", label: "File / Drive link", type: "text" },
      { key: "warnings", label: "Warnings", type: "textarea" },
      { key: "created_by", label: "Created by", type: "text" },
    ],
  },
  {
    slug: "lists",
    table: "trade_list_options",
    title: "Lists",
    sheet: "Lists",
    description: "Dropdown values (packing, incoterm, statuses).",
    identity: "lists",
    fields: [
      { key: "list_key", label: "List", type: "text", required: true, list: true },
      { key: "value", label: "Value", type: "text", required: true, list: true },
      { key: "sort_order", label: "Sort", type: "number", list: true },
      { key: "active", label: "Active", type: "checkbox", list: true },
    ],
  },
  {
    slug: "settings",
    table: "trade_settings",
    title: "Settings",
    sheet: "Settings",
    description: "Counters and workbook keys (next RFQ number, Drive ids).",
    identity: "settings",
    fields: [
      { key: "key", label: "Key", type: "text", required: true, list: true },
      { key: "value", label: "Value", type: "text", required: true, list: true },
    ],
  },
];

export const BOOK_SLUGS = BOOK_SPECS.map((spec) => spec.slug);

export function bookSpec(slug: string) {
  return BOOK_SPECS.find((spec) => spec.slug === slug) ?? null;
}

export function emptyBookRow(spec: BookSpec): Record<string, string> {
  const row: Record<string, string> = {};
  for (const field of spec.fields) {
    if (field.type === "checkbox") row[field.key] = "false";
    else if (field.key === "status" && field.options?.[0]) row[field.key] = field.options[0];
    else if (field.key === "kind" && field.options?.[0]) row[field.key] = field.options[0];
    else if (field.key === "currency") row[field.key] = "USD";
    else if (field.key === "source_channel") row[field.key] = "other";
    else if (field.key === "doc_type") row[field.key] = "other";
    else if (field.key === "version") row[field.key] = "1";
    else row[field.key] = "";
  }
  return row;
}
