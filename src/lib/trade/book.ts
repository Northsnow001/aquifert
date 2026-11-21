export type BookRow = Record<string, unknown> & { id: string };

export type BookFieldType = "text" | "textarea" | "number" | "date" | "select" | "checkbox";

export type BookField = {
  key: string;
  label: string;
  type: BookFieldType;
  required?: boolean;
  list?: boolean;
  readonly?: boolean;
  persist?: boolean;
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
      { key: "code", label: "Product ID", type: "text", list: true },
      { key: "name", label: "Product Name", type: "text", required: true, list: true },
      { key: "grade", label: "Grade / Description", type: "text", list: true },
      { key: "main_suppliers", label: "Main Suppliers", type: "text", list: true, persist: false },
      { key: "notes", label: "Notes", type: "textarea", list: true },
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
      { key: "code", label: "Forwarder ID", type: "text", list: true, readonly: true },
      { key: "company_name", label: "Company Name", type: "text", required: true, list: true },
      { key: "contact_name", label: "Contact Name", type: "text", list: true },
      { key: "email", label: "Email", type: "text", list: true },
      { key: "whatsapp_e164", label: "Phone/WhatsApp", type: "text", list: true },
      { key: "wechat_id", label: "WeChat ID", type: "text", list: true },
      { key: "country", label: "Country", type: "text", list: true },
      { key: "routes_covered", label: "Routes Covered", type: "textarea", list: true },
      { key: "vessel_types", label: "Container/Vessel Types", type: "text", list: true },
      { key: "status", label: "Status", type: "select", options: PARTY_STATUS, list: true },
      { key: "notes", label: "Notes", type: "textarea", list: true },
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
      { key: "code", label: "Request ID", type: "text", list: true, readonly: true },
      { key: "date_received", label: "Date Received", type: "text", list: true, persist: false, readonly: true },
      { key: "week_start", label: "Weekstart", type: "date", list: true },
      { key: "buyer_code", label: "Buyer ID", type: "text", list: true, persist: false },
      { key: "buyer_company", label: "Buyer Company", type: "text", list: true, persist: false, readonly: true },
      { key: "buyer_contact", label: "Buyer Contact", type: "text", list: true, persist: false, readonly: true },
      { key: "product_label", label: "Product Name", type: "text", required: true, list: true },
      { key: "specification", label: "Specification", type: "text", list: true },
      { key: "quantity_mt", label: "Quantity (MT)", type: "number", list: true },
      { key: "shipment_type", label: "Shipment Type", type: "select", options: ["single", "recurring"], list: true },
      { key: "packing", label: "Packing", type: "text", list: true },
      { key: "bag_specification", label: "Bag Specification", type: "text", list: true },
      { key: "destination_port", label: "Destination Port", type: "text", list: true },
      { key: "destination_country", label: "Destination Country", type: "text", list: true },
      { key: "incoterm", label: "Incoterm", type: "text", list: true },
      { key: "shipment_window", label: "Delivery/Shipment Window", type: "text", list: true },
      { key: "payment_terms", label: "Payment Terms", type: "text", list: true },
      { key: "inspection_company", label: "Inspection Company", type: "text", list: true },
      { key: "inspection_paid_by", label: "Inspection Cost Paid By", type: "text", list: true },
      { key: "origin_preference", label: "Origin Preference", type: "text", list: true },
      { key: "discharge_rate", label: "Discharge Rate", type: "text", list: true },
      { key: "target_price", label: "Target Price", type: "number", list: true },
      { key: "currency", label: "Currency", type: "text", list: true },
      { key: "validity_requested", label: "Validity Requested", type: "text", list: true },
      { key: "buyer_documents", label: "Buyer Documents", type: "text", list: true },
      { key: "core_fields_complete", label: "Core Fields Complete", type: "text", list: true, persist: false, readonly: true },
      { key: "missing_fields", label: "Missing Fields", type: "text", list: true, persist: false, readonly: true },
      { key: "status", label: "Status", type: "select", options: RFQ_STATUS, list: true },
      { key: "source_channel", label: "Source Channel", type: "select", options: CHANNEL, list: true },
      { key: "raw_message", label: "Raw Message", type: "textarea", list: true },
      { key: "notes", label: "Notes", type: "textarea", list: true },
      { key: "last_updated", label: "Last Updated", type: "text", list: true, persist: false, readonly: true },
      { key: "supplier_unit_price", label: "Supplier Price (per MT)", type: "number", list: true },
      { key: "selected_supplier_name", label: "Selected Supplier", type: "text", list: true, persist: false, readonly: true },
      { key: "margin_value", label: "Margin_added", type: "number", list: true },
      { key: "buyer_unit_price", label: "Buyer price", type: "number" },
      { key: "margin_type", label: "Margin type", type: "select", options: ["fixed", "percent", "aq0_fee"] },
    ],
  },
  {
    slug: "quotes",
    table: "trade_quotes",
    title: "Supplier quotes",
    sheet: "Supplier Offers / suppliers_responses",
    description: "RFQ replies and weekly supplier rates — same book as the old Supplier Offers sheet.",
    identity: "uuid",
    fields: [
      { key: "code", label: "Offer ID", type: "text", list: true, readonly: true },
      { key: "rfq_code", label: "Linked Request ID", type: "text", list: true, persist: false, readonly: true },
      { key: "date_received", label: "Date Received", type: "text", list: true, persist: false, readonly: true },
      { key: "week_start", label: "Weekstart", type: "date", list: true },
      { key: "supplier_code", label: "Supplier ID", type: "text", list: true, persist: false, readonly: true },
      { key: "supplier_name", label: "Supplier Name", type: "text", list: true, persist: false, readonly: true },
      { key: "supplier_contact", label: "Supplier Contact", type: "text", list: true, persist: false, readonly: true },
      { key: "supplier_email", label: "Supplier Email", type: "text", list: true, persist: false, readonly: true },
      { key: "product_label", label: "Product Name", type: "text", required: true, list: true },
      { key: "specification", label: "Specification", type: "text", list: true },
      { key: "unit_price", label: "Unit Price (per MT)", type: "number", list: true },
      { key: "currency", label: "Currency", type: "text", list: true },
      { key: "quantity_mt", label: "Quantity Available (MT)", type: "number", list: true },
      { key: "packing", label: "Packing Type", type: "text", list: true },
      { key: "origin", label: "Origin", type: "text", list: true },
      { key: "load_port", label: "Load Port", type: "text", list: true },
      { key: "destination_port", label: "Destination Port", type: "text", list: true },
      { key: "incoterm", label: "Incoterm", type: "text", list: true },
      { key: "delivery_window", label: "Delivery Turnaround", type: "text", list: true },
      { key: "validity_text", label: "Validity", type: "text", list: true, persist: false },
      { key: "validity_until", label: "Validity Until", type: "date", list: true },
      { key: "status", label: "Offer Status", type: "select", options: QUOTE_STATUS, list: true },
      { key: "payment_terms", label: "Payment Terms", type: "text", list: true },
      { key: "prepayment_pct", label: "Prepayment %", type: "number", list: true },
      { key: "loading_rate", label: "Loading Rate", type: "text", list: true },
      { key: "inspection", label: "Inspection", type: "text", list: true },
      { key: "other_conditions", label: "Other Conditions", type: "textarea", list: true },
      { key: "price_check_flag", label: "Price Check Flag", type: "text", list: true, persist: false },
      { key: "source_channel", label: "Source Channel", type: "select", options: CHANNEL, list: true },
      { key: "raw_message", label: "Raw Message", type: "textarea", list: true },
      { key: "notes", label: "Notes", type: "textarea", list: true, persist: false },
      { key: "last_updated", label: "Last Updated", type: "text", list: true, persist: false, readonly: true },
      { key: "received_at", label: "Received At", type: "text", list: true, persist: false, readonly: true },
      { key: "response_type", label: "Response Type", type: "text", list: true, persist: false, readonly: true },
      { key: "supplier_response", label: "Supplier response", type: "textarea", list: true, persist: false, readonly: true },
      { key: "kind", label: "Kind", type: "select", options: QUOTE_KIND, list: true },
      { key: "is_no_offer", label: "No offer", type: "checkbox", list: true },
      { key: "broadcast_ref", label: "Broadcast Ref", type: "text", list: true },
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
      { key: "origin_port", label: "Origin Port", type: "text", list: true },
      { key: "destination_port", label: "Destination Port", type: "text", list: true },
      { key: "route", label: "Route", type: "text", list: true },
      { key: "container_type", label: "Container Type", type: "text", list: true },
      { key: "mode", label: "Shipment Mode", type: "select", options: ["bulk_vessel", "container"], list: true },
      { key: "rate", label: "Rate", type: "number", list: true },
      { key: "rate_basis", label: "Rate Basis", type: "select", options: ["per_container", "per_mt", "lump_sum"], list: true },
      { key: "mt_per_container", label: "MT per Container", type: "number", list: true },
      { key: "rate_per_mt", label: "Rate per MT", type: "number", list: true },
      { key: "insurance_per_mt", label: "Insurance per MT", type: "number", list: true },
      { key: "currency", label: "Currency", type: "text", list: true },
      { key: "transit_days", label: "Transit Days", type: "text", list: true },
      { key: "validity_until", label: "Validity Until", type: "date", list: true },
      { key: "is_no_offer", label: "No offer", type: "checkbox", list: true },
      { key: "week_start", label: "Weekstart", type: "date", list: true },
      { key: "source_channel", label: "Source Channel", type: "select", options: CHANNEL, list: true },
      { key: "conditions", label: "Conditions/Surcharges", type: "textarea", list: true },
      { key: "raw_message", label: "Raw Message", type: "textarea", list: true },
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
      { key: "offer_date", label: "Offer Date", type: "date", list: true },
      { key: "status", label: "Status", type: "text", list: true },
      { key: "enquiry_code", label: "Enquiry ID", type: "text", list: true },
      { key: "quote_code", label: "Quote ID", type: "text", list: true },
      { key: "buyer_name", label: "Buyer", type: "text", list: true },
      { key: "product_label", label: "Product", type: "text", list: true },
      { key: "quantity_mt", label: "Quantity (MT)", type: "number", list: true },
      { key: "packing", label: "Packing", type: "text", list: true },
      { key: "incoterm", label: "Incoterm", type: "text", list: true },
      { key: "port", label: "Port", type: "text", list: true },
      { key: "payment_terms", label: "Payment Terms", type: "text", list: true },
      { key: "shipping_month", label: "Shipping Month", type: "text", list: true },
      { key: "supplier_unit_price", label: "Supplier Price (USD/MT)", type: "number", list: true },
      { key: "offered_unit_price", label: "Offered Price (USD/MT)", type: "number", list: true },
      { key: "margin_per_mt", label: "Margin (USD/MT)", type: "number", list: true },
      { key: "margin_pct", label: "Margin %", type: "number", list: true },
      { key: "total_margin", label: "Total Margin (USD)", type: "number", list: true },
      { key: "notes", label: "Notes", type: "textarea", list: true },
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
      { key: "buyer_company", label: "Buyer Company", type: "text", list: true },
      { key: "deal_type", label: "Deal Type", type: "text", list: true },
      { key: "selected_offer_code", label: "Selected Offer ID", type: "text", list: true },
      { key: "supplier_name", label: "Supplier Name", type: "text", list: true },
      { key: "seller_unit_price", label: "Seller Price (per MT)", type: "number", list: true },
      { key: "seller_incoterm", label: "Seller Incoterm", type: "text", list: true },
      { key: "selected_freight_code", label: "Selected Freight ID", type: "text", list: true },
      { key: "freight_per_mt", label: "Freight per MT", type: "number", list: true },
      { key: "insurance_per_mt", label: "Insurance per MT", type: "number", list: true },
      { key: "landed_cost_per_mt", label: "Landed Cost per MT", type: "number", list: true },
      { key: "margin_type", label: "Margin Type", type: "text", list: true },
      { key: "margin_value", label: "Margin Value", type: "number", list: true },
      { key: "margin_per_mt", label: "Margin per MT", type: "number", list: true },
      { key: "floor_per_mt", label: "Floor per MT", type: "number", list: true },
      { key: "buyer_unit_price", label: "Buyer Price (per MT)", type: "number", list: true },
      { key: "buyer_incoterm", label: "Buyer Incoterm", type: "text", list: true },
      { key: "currency", label: "Currency", type: "text", list: true },
      { key: "quantity_mt", label: "Quantity (MT)", type: "number", list: true },
      { key: "notes", label: "Notes", type: "textarea", list: true },
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
      { key: "status", label: "Trade Status", type: "select", options: SHIP_STATUS, list: true },
      { key: "pol", label: "POL", type: "text", list: true },
      { key: "pod", label: "POD", type: "text", list: true },
      { key: "etd", label: "ETD", type: "date", list: true },
      { key: "eta", label: "ETA", type: "date", list: true },
      { key: "lsd", label: "LSD", type: "date", list: true },
      { key: "packing", label: "Packing", type: "text", list: true },
      { key: "shipping_mode", label: "Shipping Mode", type: "text", list: true },
      { key: "carrier", label: "Carrier", type: "text", list: true },
      { key: "booking_ref", label: "Booking Ref", type: "text", list: true },
      { key: "inspection", label: "Inspection", type: "text", list: true },
      { key: "notes", label: "Notes", type: "textarea", list: true },
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
      { key: "next_action", label: "Next Action", type: "text", list: true },
      { key: "next_action_at", label: "Next Action Date", type: "date", list: true },
      { key: "expected_volume_mt", label: "Expected Volume (MT)", type: "number", list: true },
      { key: "expected_margin_pct", label: "Expected Margin %", type: "number", list: true },
      { key: "enquiry_code", label: "Enquiry ID", type: "text", list: true },
      { key: "comments", label: "Comments", type: "textarea", list: true },
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
      { key: "doc_type", label: "Doc Type", type: "select", options: DOC_TYPE, list: true },
      { key: "doc_number", label: "Doc Number", type: "text", list: true },
      { key: "version", label: "Version", type: "number", list: true },
      { key: "counterparty_name", label: "Counterparty", type: "text", list: true },
      { key: "counterparty_kind", label: "Counterparty Type", type: "select", options: ["buyer", "supplier", "forwarder"], list: true },
      { key: "currency", label: "Currency", type: "text", list: true },
      { key: "total_amount", label: "Total Amount", type: "number", list: true },
      { key: "status", label: "Status", type: "select", options: DOC_STATUS, list: true },
      { key: "storage_path", label: "PDF Link", type: "text", list: true },
      { key: "warnings", label: "Warnings", type: "textarea", list: true },
      { key: "created_by", label: "Created By", type: "text", list: true },
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
