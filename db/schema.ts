import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  integer,
  decimal,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Postgres enums (unique type names required)                          */
/* ------------------------------------------------------------------ */
export const users_portalRoleEnum = pgEnum("users_portal_role", [
    "ADMIN",
    "OPERATIONS",
    "FINANCE",
    "SUPPORT",
    "BUYER",
    "SUPPLIER",
  ]);
export const quotes_statusEnum = pgEnum("quotes_status", [
      "DRAFT",
      "PENDING_APPROVAL",
      "SENT",
      "ACCEPTED",
      "REJECTED",
    ]);
export const protectedEntities_roleEnum = pgEnum("protected_entities_role", [
      "CONTRACTING_SELLER",
      "MAINLAND_ENTITY",
      "EXPORT_OF_RECORD",
      "CONTACT",
      "BANK",
      "OTHER",
    ]);
export const shipments_statusEnum = pgEnum("shipments_status", [
    "BOOKED",
    "GATE_IN",
    "LOADED",
    "DEPARTURE",
    "IN_TRANSIT",
    "ARRIVAL",
    "CUSTOMS",
    "CLEARED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
  ]);
export const libraryReports_reportTypeEnum = pgEnum("library_reports_report_type", [
      "weekly_market",
      "special_report",
      "data_pack",
      "training",
      "other",
    ]);
export const libraryReports_statusEnum = pgEnum("library_reports_status", [
      "draft",
      "in_review",
      "approved",
      "published",
      "archived",
    ]);
export const libraryReportSources_sourceTypeEnum = pgEnum("library_report_sources_source_type", [
      "telex_post",
      "market_price",
      "news_item",
      "open_dataset",
      "tender",
      "freight_record",
      "desk_assessment",
    ]);
export const libraryAccessLog_actionEnum = pgEnum("library_access_log_action", [
      "viewed",
      "downloaded",
      "blocked_by_tier",
      "upgrade_clicked",
    ]);
export const requestStatusEnum = pgEnum("request_status", [
  "NEW",
  "QUOTED",
  "ACCEPTED",
  "PAID",
  "SHIPPED",
  "IN_TRANSIT",
  "DELIVERED",
  "COMPLETED",
  "DISPUTED",
]);
export const users_roleEnum = pgEnum("users_role", ["user", "admin"]);
export const users_languageEnum = pgEnum("users_language", ["EN", "ZH"]);
export const organizations_typeEnum = pgEnum("organizations_type", ["BUYER", "SUPPLIER"]);
export const memberships_tierEnum = pgEnum("memberships_tier", ["SPROUT", "HARVEST", "SCALE"]);
export const memberships_statusEnum = pgEnum("memberships_status", ["ACTIVE", "PENDING", "EXPIRED", "CANCELLED"]);
export const memberships_billingCycleEnum = pgEnum("memberships_billing_cycle", ["MONTHLY", "ANNUAL"]);
export const requests_productEnum = pgEnum("requests_product", ["UREA", "DAP", "MOP", "MAP", "NPK"]);
export const requests_unitEnum = pgEnum("requests_unit", ["TONS"]);
export const requests_incotermsEnum = pgEnum("requests_incoterms", ["DDP", "FOB", "CIF"]);
export const requests_originChannelEnum = pgEnum("requests_origin_channel", ["WHATSAPP", "PORTAL", "EMAIL"]);
export const orders_paymentStatusEnum = pgEnum("orders_payment_status", ["PENDING", "PAID", "PARTIAL", "REFUNDED"]);
export const orders_dealTypeEnum = pgEnum("orders_deal_type", ["AQ_ZERO", "TRADITIONAL"]);
export const orders_inspectionBasisEnum = pgEnum("orders_inspection_basis", ["SELLER_CERT", "THIRD_PARTY"]);
export const conversations_sourceEnum = pgEnum("conversations_source", ["WHATSAPP", "WECHAT", "EMAIL", "PORTAL"]);
export const conversations_statusEnum = pgEnum("conversations_status", ["PENDING", "PROCESSED", "SPAM", "CLARIFICATION"]);
export const marketData_commodityEnum = pgEnum("market_data_commodity", ["UREA", "DAP", "MOP", "MAP", "NPK"]);
export const financingApplications_statusEnum = pgEnum("financing_applications_status", ["PENDING", "APPROVED", "REJECTED", "ACTIVE", "REPAID"]);
export const invoices_typeEnum = pgEnum("invoices_type", ["PROFORMA", "COMMERCIAL", "PURCHASE_ORDER"]);
export const invoices_installmentEnum = pgEnum("invoices_installment", ["FULL", "DEPOSIT", "BALANCE"]);
export const documents_typeEnum = pgEnum("documents_type", ["INVOICE", "PACKING_LIST", "BOL", "CERTIFICATE", "CUSTOMS", "SDS", "CONTRACT"]);
export const documents_docClassEnum = pgEnum("documents_doc_class", ["A", "B", "C"]);
export const documents_gateStateEnum = pgEnum("documents_gate_state", ["BLOCKED", "PASS", "RESOLVE_THEN_PASS", "HARD_NO_GO"]);
export const agentDrafts_kindEnum = pgEnum("agent_drafts_kind", ["FIRM_OFFER", "RECAP", "CONTRACT", "MARGIN_REVIEW", "STATUS_UPDATE"]);
export const agentDrafts_statusEnum = pgEnum("agent_drafts_status", ["PENDING", "APPROVED", "REJECTED", "SENT"]);
export const freightBids_statusEnum = pgEnum("freight_bids_status", ["OPEN", "WON", "LOST", "WITHDRAWN"]);
export const broadcasts_channelEnum = pgEnum("broadcasts_channel", ["WHATSAPP", "EMAIL", "IN_APP"]);
export const broadcasts_statusEnum = pgEnum("broadcasts_status", ["SCHEDULED", "SENT"]);
export const supplierRequests_statusEnum = pgEnum("supplier_requests_status", ["NEW", "QUOTED", "ACCEPTED", "COMPLETED"]);
export const supplierProducts_productEnum = pgEnum("supplier_products_product", ["UREA", "DAP", "MOP", "MAP", "NPK"]);
export const prices_directionEnum = pgEnum("prices_direction", ["UP", "DOWN", "FLAT"]);
export const leads_scoreEnum = pgEnum("leads_score", ["HOT", "WARM", "COLD"]);
export const otpCodes_purposeEnum = pgEnum("otp_codes_purpose", ["VERIFY", "RESET"]);
export const otpEvents_eventEnum = pgEnum("otp_events_event", ["ISSUE", "VERIFY_SUCCESS", "VERIFY_FAIL", "RESEND"]);
export const loginAttempts_keyTypeEnum = pgEnum("login_attempts_key_type", ["ACCOUNT", "IP"]);
export const hubIndicators_nutrientEnum = pgEnum("hub_indicators_nutrient", ["NITROGEN", "PHOSPHATE", "POTASSIUM"]);
export const hubCommentary_kindEnum = pgEnum("hub_commentary_kind", ["FREIGHT", "MARKET"]);
export const engagementPromptEvents_eventEnum = pgEnum("engagement_prompt_events_event", ["VIEW", "DISMISS", "SUBSCRIBE"]);
export const engagementPromptEvents_tabEnum = pgEnum("engagement_prompt_events_tab", ["NEWSLETTER", "MEMBERSHIP"]);
export const newsletterSubs_frequencyEnum = pgEnum("newsletter_subs_frequency", ["DAILY", "WEEKLY", "MAJOR_MOVES"]);
export const libraryReports_accessLevelEnum = pgEnum("library_reports_access_level", ["free", "members", "premium"]);
export const libraryReports_originEnum = pgEnum("library_reports_origin", ["manual_upload", "ai_generated"]);
export const libraryGenerationLog_statusEnum = pgEnum("library_generation_log_status", ["running", "success", "failed"]);
export const libraryGenerationLog_triggerTypeEnum = pgEnum("library_generation_log_trigger_type", ["scheduled", "manual"]);
export const aqAnalysisNotes_statusEnum = pgEnum("aq_analysis_notes_status", ["DRAFT", "SCHEDULED", "PUBLISHED"]);
export const orderRequirements_statusEnum = pgEnum("order_requirements_status", ["captured", "upgrade_started", "upgraded", "callback_requested", "abandoned"]);
export const communityCallSessions_statusEnum = pgEnum("community_call_sessions_status", ["SCHEDULED", "COMPLETED", "CANCELLED"]);
export const communityCallRegistrations_statusEnum = pgEnum("community_call_registrations_status", ["REGISTERED", "CANCELLED"]);
export const promoImpressions_promoKeyEnum = pgEnum("promo_impressions_promo_key", ["A", "B", "C"]);
export const promoImpressions_actionEnum = pgEnum("promo_impressions_action", ["shown", "dismissed", "clicked"]);
export const tourProgress_statusEnum = pgEnum("tour_progress_status", ["not_started", "in_progress", "completed", "skipped"]);
export const aqUsage_kindEnum = pgEnum("aq_usage_kind", ["NITROGEN_REPORT", "UREA_CALC"]);
export const aqSavedReports_kindEnum = pgEnum("aq_saved_reports_kind", ["NITROGEN_REPORT", "UREA_CALC"]);

/* ------------------------------------------------------------------ */
/* Users (auth feature) + AQUIFERT portal role                         */
/* ------------------------------------------------------------------ */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: users_roleEnum("role").default("user").notNull(),
  portalRole: users_portalRoleEnum("portalRole"),
  phone: varchar("phone", { length: 64 }),
  organizationId: bigint("organizationId", { mode: "number" }),
  demoUserId: bigint("demoUserId", { mode: "number" }),
  language: users_languageEnum("language").default("EN").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/* ------------------------------------------------------------------ */
/* Organizations                                                       */
/* ------------------------------------------------------------------ */
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: organizations_typeEnum("type").notNull(),
  country: varchar("country", { length: 128 }),
  address: text("address"),
  vatNumber: varchar("vatNumber", { length: 64 }),
  contactPerson: varchar("contactPerson", { length: 255 }),
  wechatId: varchar("wechatId", { length: 128 }),
  bankDetails: text("bankDetails"),
  /** Per-buyer default margin % applied on TRADITIONAL (AQ ONE) trades.
   *  The profit margin varies per buyer; AI proposes, a human approves. */
  marginProfilePct: decimal("marginProfilePct", { precision: 5, scale: 2, mode: "number" }).default(0).notNull(),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Organization = typeof organizations.$inferSelect;

/* ------------------------------------------------------------------ */
/* Memberships                                                         */
/* ------------------------------------------------------------------ */
export const memberships = pgTable("memberships", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  tier: memberships_tierEnum("tier").notNull(),
  status: memberships_statusEnum("status")
    .default("PENDING")
    .notNull(),
  monthlyTonnageLimit: integer("monthlyTonnageLimit").notNull(),
  currentMonthTonnage: integer("currentMonthTonnage").default(0).notNull(),
  price: decimal("price", { precision: 12, scale: 2, mode: "number" }).notNull(),
  billingCycle: memberships_billingCycleEnum("billingCycle")
    .default("MONTHLY")
    .notNull(),
  startDate: timestamp("startDate").defaultNow().notNull(),
  endDate: timestamp("endDate"),
  autoRenew: boolean("autoRenew").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Membership = typeof memberships.$inferSelect;

/* ------------------------------------------------------------------ */
/* Requests (Request Cards)                                            */
/* ------------------------------------------------------------------ */

export const requests = pgTable(
  "requests",
  {
    id: serial("id").primaryKey(),
    requestNumber: varchar("requestNumber", { length: 32 }).notNull().unique(),
    buyerId: bigint("buyerId", { mode: "number" }).notNull(),
    product: requests_productEnum("product").notNull(),
    quantity: decimal("quantity", { precision: 12, scale: 2, mode: "number" }).notNull(),
    unit: requests_unitEnum("unit").default("TONS").notNull(),
    destination: varchar("destination", { length: 255 }).notNull(),
    deliveryDate: timestamp("deliveryDate"),
    incoterms: requests_incotermsEnum("incoterms").default("CIF").notNull(),
    specialInstructions: text("specialInstructions"),
    status: requestStatusEnum("status").default("NEW").notNull(),
    originChannel: requests_originChannelEnum("originChannel")
      .default("PORTAL")
      .notNull(),
    archived: boolean("archived").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    buyerIdx: index("req_buyer_idx").on(table.buyerId),
    statusIdx: index("req_status_idx").on(table.status),
  }),
);
export type Request = typeof requests.$inferSelect;

/* ------------------------------------------------------------------ */
/* Quotes                                                              */
/* ------------------------------------------------------------------ */
export const quotes = pgTable(
  "quotes",
  {
    id: serial("id").primaryKey(),
    requestId: bigint("requestId", { mode: "number" }).notNull(),
    supplierId: bigint("supplierId", { mode: "number" }),
    adminId: bigint("adminId", { mode: "number" }),
    productCost: decimal("productCost", { precision: 14, scale: 2, mode: "number" }).notNull(),
    shippingCost: decimal("shippingCost", { precision: 14, scale: 2, mode: "number" }).notNull(),
    clearingCost: decimal("clearingCost", { precision: 14, scale: 2, mode: "number" }).notNull(),
    margin: decimal("margin", { precision: 14, scale: 2, mode: "number" }).default(0).notNull(),
    total: decimal("total", { precision: 14, scale: 2, mode: "number" }).notNull(),
    marginPercentage: decimal("marginPercentage", { precision: 5, scale: 2, mode: "number" }).default(0).notNull(),
    status: quotes_statusEnum("status")
      .default("DRAFT")
      .notNull(),
    aiMessage: text("aiMessage"),
    supplierNotes: text("supplierNotes"),
    rejectReason: text("rejectReason"),
    validUntil: timestamp("validUntil"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    requestIdx: index("quote_request_idx").on(table.requestId),
    statusIdx: index("quote_status_idx").on(table.status),
  }),
);
export type Quote = typeof quotes.$inferSelect;

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  quoteId: bigint("quoteId", { mode: "number" }).notNull(),
  orderNumber: varchar("orderNumber", { length: 32 }).notNull().unique(),
  paymentStatus: orders_paymentStatusEnum("paymentStatus")
    .default("PENDING")
    .notNull(),
  shipmentStatus: varchar("shipmentStatus", { length: 32 }).default("PENDING").notNull(),
  total: decimal("total", { precision: 14, scale: 2, mode: "number" }).notNull(),
  paidAt: timestamp("paidAt"),
  /* ---- Trade spine (back-to-back Deal A / Deal B) ---- */
  tradeRef: varchar("tradeRef", { length: 40 }),
  dealType: orders_dealTypeEnum("dealType").default("AQ_ZERO").notNull(),
  /** 14-stage lifecycle position (1..14), see TRADE_STAGES in contracts */
  tradeStage: integer("tradeStage").default(1).notNull(),
  stageHistory: jsonb("stageHistory"),
  buyContractRef: varchar("buyContractRef", { length: 64 }),
  sellContractRef: varchar("sellContractRef", { length: 64 }),
  /** Spec buffer: buy tighter than sell (e.g. buy Fe 19.7% min, sell Fe 19% min) */
  buySpec: varchar("buySpec", { length: 255 }),
  sellSpec: varchar("sellSpec", { length: 255 }),
  /** Quantity buffer: firm buy vs tolerance sell (e.g. 48 MT firm vs 50 MT ±10%) */
  buyQtyMt: decimal("buyQtyMt", { precision: 12, scale: 2, mode: "number" }),
  sellQtyMt: decimal("sellQtyMt", { precision: 12, scale: 2, mode: "number" }),
  tolerancePct: decimal("tolerancePct", { precision: 5, scale: 2, mode: "number" }),
  buyPricePerMt: decimal("buyPricePerMt", { precision: 12, scale: 2, mode: "number" }),
  freightPerMt: decimal("freightPerMt", { precision: 12, scale: 2, mode: "number" }),
  /** Internal margin per MT, never buyer-visible on TRADITIONAL trades */
  marginPerMt: decimal("marginPerMt", { precision: 12, scale: 2, mode: "number" }),
  sellPricePerMt: decimal("sellPricePerMt", { precision: 12, scale: 2, mode: "number" }),
  tradeCurrency: varchar("tradeCurrency", { length: 8 }).default("USD").notNull(),
  inspectionBasis: orders_inspectionBasisEnum("inspectionBasis").default("SELLER_CERT").notNull(),
  documentaryInstructions: text("documentaryInstructions"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
export type Order = typeof orders.$inferSelect;

/* ------------------------------------------------------------------ */
/* Protected-entity set, every supplier-side identity linked to a     */
/* trade. The identity firewall checks buyer-facing output against the */
/* WHOLE set, never a single supplier field.                           */
/* ------------------------------------------------------------------ */
export const protectedEntities = pgTable(
  "protected_entities",
  {
    id: serial("id").primaryKey(),
    orderId: bigint("orderId", { mode: "number" }).notNull(),
    entityName: varchar("entityName", { length: 255 }).notNull(),
    role: protectedEntities_roleEnum("role").default("OTHER").notNull(),
    aliases: jsonb("aliases"), // string[], incl. non-Latin script variants
    phones: jsonb("phones"), // string[]
    addresses: jsonb("addresses"), // string[]
    bankAccounts: jsonb("bankAccounts"), // string[]
    contacts: jsonb("contacts"), // string[], named individuals
    notes: varchar("notes", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({ orderIdx: index("pe_order_idx").on(table.orderId) }),
);
export type ProtectedEntity = typeof protectedEntities.$inferSelect;

/* ------------------------------------------------------------------ */
/* Shipments                                                           */
/* ------------------------------------------------------------------ */
export const shipments = pgTable("shipments", {
  id: serial("id").primaryKey(),
  orderId: bigint("orderId", { mode: "number" }).notNull(),
  containerNumber: varchar("containerNumber", { length: 32 }),
  vesselName: varchar("vesselName", { length: 128 }),
  bolNumber: varchar("bolNumber", { length: 64 }),
  carrier: varchar("carrier", { length: 128 }),
  departurePort: varchar("departurePort", { length: 128 }),
  destinationPort: varchar("destinationPort", { length: 128 }),
  milestones: jsonb("milestones"),
  route: jsonb("route"),
  currentLocation: varchar("currentLocation", { length: 255 }),
  currentLat: decimal("currentLat", { precision: 10, scale: 5, mode: "number" }),
  currentLng: decimal("currentLng", { precision: 10, scale: 5, mode: "number" }),
  eta: timestamp("eta"),
  delayed: boolean("delayed").default(false).notNull(),
  delayDays: integer("delayDays").default(0).notNull(),
  status: shipments_statusEnum("status")
    .default("BOOKED")
    .notNull(),
  lastAdvancedAt: timestamp("lastAdvancedAt").defaultNow().notNull(),
  trackingData: jsonb("trackingData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
export type Shipment = typeof shipments.$inferSelect;

/* ------------------------------------------------------------------ */
/* Conversations (unified inbox)                                       */
/* ------------------------------------------------------------------ */
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  requestId: bigint("requestId", { mode: "number" }),
  buyerName: varchar("buyerName", { length: 255 }),
  participants: jsonb("participants"),
  messages: jsonb("messages"),
  source: conversations_sourceEnum("source")
    .default("PORTAL")
    .notNull(),
  summary: text("summary"),
  extracted: jsonb("extracted"),
  aiConfidence: integer("aiConfidence"),
  status: conversations_statusEnum("status")
    .default("PENDING")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
export type Conversation = typeof conversations.$inferSelect;

/* ------------------------------------------------------------------ */
/* Market data                                                         */
/* ------------------------------------------------------------------ */
export const marketData = pgTable(
  "market_data",
  {
    id: serial("id").primaryKey(),
    commodity: marketData_commodityEnum("commodity").notNull(),
    region: varchar("region", { length: 64 }).notNull(),
    pricePerTon: decimal("pricePerTon", { precision: 10, scale: 2, mode: "number" }).notNull(),
    currency: varchar("currency", { length: 8 }).default("USD").notNull(),
    date: timestamp("date").notNull(),
    source: varchar("source", { length: 128 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    commodityIdx: index("md_commodity_idx").on(table.commodity),
    dateIdx: index("md_date_idx").on(table.date),
  }),
);
export type MarketDataPoint = typeof marketData.$inferSelect;

/* ------------------------------------------------------------------ */
/* Financing applications                                              */
/* ------------------------------------------------------------------ */
export const financingApplications = pgTable("financing_applications", {
  id: serial("id").primaryKey(),
  buyerId: bigint("buyerId", { mode: "number" }).notNull(),
  orderId: bigint("orderId", { mode: "number" }).notNull(),
  amount: decimal("amount", { precision: 14, scale: 2, mode: "number" }).notNull(),
  creditLimit: decimal("creditLimit", { precision: 14, scale: 2, mode: "number" }),
  interestRate: decimal("interestRate", { precision: 5, scale: 2, mode: "number" }),
  term: integer("term").notNull(),
  status: financingApplications_statusEnum("status")
    .default("PENDING")
    .notNull(),
  repaymentSchedule: jsonb("repaymentSchedule"),
  signature: text("signature"),
  signedAt: timestamp("signedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
export type FinancingApplication = typeof financingApplications.$inferSelect;

/* ------------------------------------------------------------------ */
/* Invoices                                                            */
/* ------------------------------------------------------------------ */
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  orderId: bigint("orderId", { mode: "number" }).notNull(),
  invoiceNumber: varchar("invoiceNumber", { length: 32 }).notNull().unique(),
  type: invoices_typeEnum("type")
    .default("PROFORMA")
    .notNull(),
  /** Paid-member schedule: 70% deposit on order approval, 30% balance with document release */
  installment: invoices_installmentEnum("installment")
    .default("FULL")
    .notNull(),
  amount: decimal("amount", { precision: 14, scale: 2, mode: "number" }).notNull(),
  currency: varchar("currency", { length: 8 }).default("GBP").notNull(),
  pdfUrl: varchar("pdfUrl", { length: 512 }),
  dueDate: timestamp("dueDate"),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Invoice = typeof invoices.$inferSelect;

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  orderId: bigint("orderId", { mode: "number" }).notNull(),
  type: documents_typeEnum("type").notNull(),
  name: varchar("name", { length: 255 }),
  url: varchar("url", { length: 512 }),
  ocrData: jsonb("ocrData"),
  uploadedBy: bigint("uploadedBy", { mode: "number" }),
  /* ---- Identity-firewall document gate (default-deny) ---- */
  /** A = Aquifert-issuable (regenerate) · B = carrier doc (switch B/L + LOI) · C = authority-issued (source re-issue only) */
  docClass: documents_docClassEnum("docClass").default("A").notNull(),
  /** Default is BLOCKED, nothing reaches the buyer until PASS + human clearance */
  gateState: documents_gateStateEnum("gateState")
    .default("BLOCKED")
    .notNull(),
  /** Leak findings from multilingual body-level screening */
  scanFindings: jsonb("scanFindings"),
  /** Raw supplier-side body text (as uploaded / OCR'd) */
  rawText: text("rawText"),
  /** Regenerated clean Aquifert-letterhead body */
  cleanText: text("cleanText"),
  /** Known fix path: REGENERATE | SWITCH_BL | STRIP_ANNOTATIONS | REISSUE_COO | SUBSTITUTE */
  fixAction: varchar("fixAction", { length: 40 }),
  clearedBy: bigint("clearedBy", { mode: "number" }),
  clearedAt: timestamp("clearedAt"),
  /** Only true after gateState=PASS AND a human has cleared */
  buyerReleasable: boolean("buyerReleasable").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Document = typeof documents.$inferSelect;

/* ------------------------------------------------------------------ */
/* AI communication agent drafts, human-gated (Stages 4, 5, 7 +       */
/* per-buyer margin review). Nothing sends without explicit sign-off.  */
/* ------------------------------------------------------------------ */
export const agentDrafts = pgTable(
  "agent_drafts",
  {
    id: serial("id").primaryKey(),
    kind: agentDrafts_kindEnum("kind").notNull(),
    requestId: bigint("requestId", { mode: "number" }),
    orderId: bigint("orderId", { mode: "number" }),
    conversationId: bigint("conversationId", { mode: "number" }),
    title: varchar("title", { length: 255 }).notNull(),
    /** Buyer-facing message as drafted by the agent (masked, safe) */
    draftText: text("draftText").notNull(),
    /** Structured inputs: prices, margin rationale, validity, etc. */
    payload: jsonb("payload"),
    status: agentDrafts_statusEnum("status").default("PENDING").notNull(),
    decidedBy: bigint("decidedBy", { mode: "number" }),
    decidedAt: timestamp("decidedAt"),
    decisionNote: text("decisionNote"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("agent_drafts_status_idx").on(table.status),
    orderIdx: index("agent_drafts_order_idx").on(table.orderId),
  }),
);
export type AgentDraft = typeof agentDrafts.$inferSelect;

/* ------------------------------------------------------------------ */
/* Freight forwarder bidding, fast-follow data model. The buyer may   */
/* watch bidding but forwarder identity stays masked (alias only).     */
/* ------------------------------------------------------------------ */
export const freightBids = pgTable(
  "freight_bids",
  {
    id: serial("id").primaryKey(),
    orderId: bigint("orderId", { mode: "number" }).notNull(),
    /** Masked label shown to buyers, e.g. "Forwarder A" */
    forwarderAlias: varchar("forwarderAlias", { length: 32 }).notNull(),
    /** Real forwarder org, staff-only, never serialized to buyers */
    forwarderOrgId: bigint("forwarderOrgId", { mode: "number" }),
    pricePerContainer: decimal("pricePerContainer", { precision: 12, scale: 2, mode: "number" }).notNull(),
    currency: varchar("currency", { length: 8 }).default("USD").notNull(),
    transitDays: integer("transitDays"),
    status: freightBids_statusEnum("status").default("OPEN").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({ orderIdx: index("fb_order_idx").on(table.orderId) }),
);
export type FreightBid = typeof freightBids.$inferSelect;

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number" }).notNull(),
    type: varchar("type", { length: 48 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message"),
    read: boolean("read").default(false).notNull(),
    actionUrl: varchar("actionUrl", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("notif_user_idx").on(table.userId),
  }),
);
export type Notification = typeof notifications.$inferSelect;

/* ------------------------------------------------------------------ */
/* Broadcasts (market insight distribution)                            */
/* ------------------------------------------------------------------ */
export const broadcasts = pgTable("broadcasts", {
  id: serial("id").primaryKey(),
  audience: varchar("audience", { length: 32 }).notNull(),
  channel: broadcasts_channelEnum("channel").notNull(),
  message: text("message").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  status: broadcasts_statusEnum("status").default("SCHEDULED").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Broadcast = typeof broadcasts.$inferSelect;

/* ------------------------------------------------------------------ */
/* Activity feed                                                       */
/* ------------------------------------------------------------------ */
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number" }),
  actor: varchar("actor", { length: 255 }),
  action: varchar("action", { length: 255 }).notNull(),
  entity: varchar("entity", { length: 64 }),
  entityId: varchar("entityId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Activity = typeof activities.$inferSelect;

/* ------------------------------------------------------------------ */
/* Supplier request assignments (which suppliers got which request)    */
/* ------------------------------------------------------------------ */
export const supplierRequests = pgTable("supplier_requests", {
  id: serial("id").primaryKey(),
  requestId: bigint("requestId", { mode: "number" }).notNull(),
  supplierId: bigint("supplierId", { mode: "number" }).notNull(),
  status: supplierRequests_statusEnum("status")
    .default("NEW")
    .notNull(),
  supplierMessage: text("supplierMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SupplierRequest = typeof supplierRequests.$inferSelect;

/* ------------------------------------------------------------------ */
/* Supplier product catalog                                            */
/* ------------------------------------------------------------------ */
export const supplierProducts = pgTable("supplier_products", {
  id: serial("id").primaryKey(),
  supplierId: bigint("supplierId", { mode: "number" }).notNull(),
  product: supplierProducts_productEnum("product").notNull(),
  specSheet: text("specSheet"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SupplierProduct = typeof supplierProducts.$inferSelect;

/* ------------------------------------------------------------------ */
/* Market price sources registry + prices (price slider data layer)    */
/* ------------------------------------------------------------------ */
export const priceSources = pgTable("price_sources", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  url: varchar("url", { length: 512 }).notNull(),
  licenceType: varchar("licenceType", { length: 255 }).notNull(),
  attributionText: text("attributionText").notNull(),
  redistributionAllowed: boolean("redistributionAllowed").notNull(),
  refreshCadence: varchar("refreshCadence", { length: 64 }).notNull(),
  lastFetchedAt: timestamp("lastFetchedAt"),
  dataAsOf: timestamp("dataAsOf"),
  owner: varchar("owner", { length: 255 }).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PriceSource = typeof priceSources.$inferSelect;

export const prices = pgTable(
  "prices",
  {
    id: serial("id").primaryKey(),
    product: varchar("product", { length: 64 }).notNull(),
    grade: varchar("grade", { length: 64 }),
    basis: varchar("basis", { length: 64 }).notNull(),
    region: varchar("region", { length: 64 }).notNull(),
    location: varchar("location", { length: 128 }).notNull(),
    currency: varchar("currency", { length: 8 }).notNull(),
    unit: varchar("unit", { length: 32 }).notNull(),
    value: decimal("value", { precision: 12, scale: 2, mode: "number" }).notNull(),
    previousValue: decimal("previousValue", { precision: 12, scale: 2, mode: "number" }),
    changeAbs: decimal("changeAbs", { precision: 12, scale: 2, mode: "number" }),
    changePct: decimal("changePct", { precision: 8, scale: 2, mode: "number" }),
    direction: prices_directionEnum("direction").notNull(),
    sourceId: bigint("sourceId", { mode: "number" }).notNull(),
    dataAsOf: timestamp("dataAsOf").notNull(),
    ingestedAt: timestamp("ingestedAt").defaultNow().notNull(),
  },
  (t) => ({
    regionIdx: index("prices_region_idx").on(t.region),
    sourceIdx: index("prices_source_idx").on(t.sourceId),
  })
);
export type Price = typeof prices.$inferSelect;

/* ------------------------------------------------------------------ */
/* Lead capture (lead-magnet modal)                                    */
/* ------------------------------------------------------------------ */
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  intent: varchar("intent", { length: 64 }).notNull(),
  source: varchar("source", { length: 64 }).notNull(),
  products: jsonb("products").$type<string[]>().notNull(),
  regions: jsonb("regions").$type<string[]>().notNull(),
  goals: jsonb("goals").$type<string[]>().notNull(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  country: varchar("country", { length: 128 }).notNull(),
  role: varchar("role", { length: 64 }),
  annualVolume: varchar("annualVolume", { length: 64 }),
  timeline: varchar("timeline", { length: 64 }),
  phone: varchar("phone", { length: 64 }),
  termsAccepted: boolean("termsAccepted").notNull(),
  marketingOptIn: boolean("marketingOptIn").notNull(),
  consentPolicyVersion: varchar("consentPolicyVersion", { length: 32 }).notNull(),
  consentAt: timestamp("consentAt").notNull(),
  consentIp: varchar("consentIp", { length: 64 }),
  cookieConsent: jsonb("cookieConsent").$type<{ analytics: boolean; marketing: boolean; version: string }>(),
  utmSource: varchar("utmSource", { length: 255 }),
  utmMedium: varchar("utmMedium", { length: 255 }),
  utmCampaign: varchar("utmCampaign", { length: 255 }),
  referrer: text("referrer"),
  landingPage: text("landingPage"),
  score: leads_scoreEnum("score").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Lead = typeof leads.$inferSelect;

/* ------------------------------------------------------------------ */
/* Identity: email/password credentials, OTP, rate limits, TOTP        */
/* ------------------------------------------------------------------ */
export const userCredentials = pgTable("user_credentials", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  totpSecret: varchar("totpSecret", { length: 64 }),
  totpEnabled: boolean("totpEnabled").default(false).notNull(),
  company: varchar("company", { length: 255 }),
  country: varchar("country", { length: 128 }),
  phone: varchar("phone", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type UserCredential = typeof userCredentials.$inferSelect;

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    purpose: otpCodes_purposeEnum("purpose").notNull(),
    codeHash: varchar("codeHash", { length: 128 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    usedAt: timestamp("usedAt"),
    ip: varchar("ip", { length: 64 }),
    userAgent: varchar("userAgent", { length: 512 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({ emailIdx: index("otp_email_idx").on(t.email) })
);
export type OtpCode = typeof otpCodes.$inferSelect;

export const otpEvents = pgTable("otp_events", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  event: otpEvents_eventEnum("event").notNull(),
  ip: varchar("ip", { length: 64 }),
  userAgent: varchar("userAgent", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type OtpEvent = typeof otpEvents.$inferSelect;

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    keyType: loginAttempts_keyTypeEnum("keyType").notNull(),
    keyValue: varchar("keyValue", { length: 320 }).notNull(),
    success: boolean("success").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({ keyIdx: index("login_attempts_key_idx").on(t.keyType, t.keyValue) })
);
export type LoginAttempt = typeof loginAttempts.$inferSelect;

/* ------------------------------------------------------------------ */
/* Hub: news sources registry (RSS syndication only)                   */
/* ------------------------------------------------------------------ */
export const newsSources = pgTable("news_sources", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  feedUrl: varchar("feedUrl", { length: 512 }).notNull(),
  siteUrl: varchar("siteUrl", { length: 512 }),
  licenceType: varchar("licenceType", { length: 255 }).notNull(),
  attributionText: text("attributionText").notNull(),
  refreshCadence: varchar("refreshCadence", { length: 64 }).notNull(),
  geography: varchar("geography", { length: 64 }).default("GLOBAL").notNull(),
  lastFetchedAt: timestamp("lastFetchedAt"),
  dataAsOf: timestamp("dataAsOf"),
  lastError: varchar("lastError", { length: 512 }),
  owner: varchar("owner", { length: 255 }).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type NewsSource = typeof newsSources.$inferSelect;

/* Headline + <=200-char snippet only. Full article bodies are NEVER stored. */
export const newsItems = pgTable(
  "news_items",
  {
    id: serial("id").primaryKey(),
    sourceId: bigint("sourceId", { mode: "number" }).notNull(),
    headline: varchar("headline", { length: 512 }).notNull(),
    url: varchar("url", { length: 1024 }).notNull(),
    snippet: varchar("snippet", { length: 220 }),
    publishedAt: timestamp("publishedAt").notNull(),
    product: varchar("product", { length: 32 }).default("GENERAL").notNull(),
    geography: varchar("geography", { length: 64 }).default("GLOBAL").notNull(),
    ingestedAt: timestamp("ingestedAt").defaultNow().notNull(),
  },
  (t) => ({
    urlIdx: index("news_url_idx").on(t.url),
    srcIdx: index("news_src_idx").on(t.sourceId),
    pubIdx: index("news_pub_idx").on(t.publishedAt),
  })
);
export type NewsItem = typeof newsItems.$inferSelect;

/* ------------------------------------------------------------------ */
/* Hub: market indicator gauges, every move carries a rationale       */
/* ------------------------------------------------------------------ */
export const hubIndicators = pgTable("hub_indicators", {
  id: serial("id").primaryKey(),
  nutrient: hubIndicators_nutrientEnum("nutrient").notNull().unique(),
  score: integer("score").notNull(), // 0..100
  rationale: text("rationale").notNull(),
  history: jsonb("history").$type<{ date: string; score: number }[]>().notNull(),
  updatedBy: varchar("updatedBy", { length: 255 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type HubIndicator = typeof hubIndicators.$inferSelect;

/* ------------------------------------------------------------------ */
/* Hub: TELEX desk flashes                                             */
/* ------------------------------------------------------------------ */
export const telexItems = pgTable(
  "telex_items",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull(),
    product: varchar("product", { length: 32 }).notNull(),
    geography: varchar("geography", { length: 64 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => ({
    prodIdx: index("telex_prod_idx").on(t.product),
    geoIdx: index("telex_geo_idx").on(t.geography),
    createdIdx: index("telex_created_idx").on(t.createdAt),
  })
);
export type TelexItem = typeof telexItems.$inferSelect;

/* ------------------------------------------------------------------ */
/* Hub: per-user saved filter defaults                                 */
/* ------------------------------------------------------------------ */
export const hubPrefs = pgTable("hub_prefs", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number" }).notNull().unique(),
  products: jsonb("products").$type<string[]>().notNull(),
  regions: jsonb("regions").$type<string[]>().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type HubPref = typeof hubPrefs.$inferSelect;

/* ------------------------------------------------------------------ */
/* Hub: open freight enquiries (anonymised account codes only)         */
/* ------------------------------------------------------------------ */
export const freightEnquiries = pgTable("freight_enquiries", {
  id: serial("id").primaryKey(),
  accountCode: varchar("accountCode", { length: 32 }).notNull(),
  product: varchar("product", { length: 64 }).notNull(),
  qtyMt: integer("qtyMt").notNull(),
  origin: varchar("origin", { length: 128 }).notNull(),
  destination: varchar("destination", { length: 128 }).notNull(),
  laycan: varchar("laycan", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FreightEnquiry = typeof freightEnquiries.$inferSelect;

/* ------------------------------------------------------------------ */
/* Hub: desk commentary (freight corridor analysis + AQ VIEW)          */
/* ------------------------------------------------------------------ */
export const hubCommentary = pgTable("hub_commentary", {
  id: serial("id").primaryKey(),
  kind: hubCommentary_kindEnum("kind").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  byline: varchar("byline", { length: 255 }).notNull(),
  paragraphs: jsonb("paragraphs").$type<string[]>().notNull(),
  publishedAt: timestamp("publishedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type HubCommentary = typeof hubCommentary.$inferSelect;

/* ------------------------------------------------------------------ */
/* Engagement prompt (newsletter / membership), suppression records   */
/* ------------------------------------------------------------------ */
export const engagementPromptEvents = pgTable(
  "engagement_prompt_events",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number" }).notNull(),
    event: engagementPromptEvents_eventEnum("event").notNull(),
    tab: engagementPromptEvents_tabEnum("tab"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({ userIdx: index("eng_prompt_user_idx").on(t.userId) })
);
export type EngagementPromptEvent = typeof engagementPromptEvents.$inferSelect;

export const newsletterSubs = pgTable("newsletter_subs", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  frequency: newsletterSubs_frequencyEnum("frequency").notNull(),
  marketingOptIn: boolean("marketingOptIn").notNull(),
  consentAt: timestamp("consentAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type NewsletterSub = typeof newsletterSubs.$inferSelect;

/* ------------------------------------------------------------------ */
/* Nitrogen Assessment reports (additive feature)                      */
/* ------------------------------------------------------------------ */
export const nitrogenReports = pgTable(
  "nitrogen_reports",
  {
    id: serial("id").primaryKey(),
    refNo: varchar("refNo", { length: 32 }).notNull().unique(),
    userId: bigint("userId", { mode: "number" }).notNull(),
    answers: jsonb("answers").$type<Record<string, unknown>>().notNull(),
    reportMd: text("reportMd").notNull(),
    pdfUrl: varchar("pdfUrl", { length: 512 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({ userIdx: index("nitrogen_reports_user_idx").on(t.userId) })
);
export type NitrogenReport = typeof nitrogenReports.$inferSelect;

/* ------------------------------------------------------------------ */
/* Library, weekly market reports (additive feature, new tables only)  */
/* ------------------------------------------------------------------ */

/** Structured report body: ordered sections with text + citations. */
export type LibraryBodySection = {
  key: string;
  heading: string;
  paragraphs: string[];
  citations: { sourceRefId: string; marker: number }[];
};

export const libraryReports = pgTable(
  "library_reports",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    title: text("title").notNull(),
    slug: varchar("slug", { length: 512 }).notNull().unique(),
    reportType: libraryReports_reportTypeEnum("reportType").notNull(),
    weekNumber: integer("weekNumber"),
    year: integer("year"),
    periodStart: timestamp("periodStart"),
    periodEnd: timestamp("periodEnd"),
    summary: text("summary").notNull(),
    body: jsonb("body").$type<LibraryBodySection[]>(),
    accessLevel: libraryReports_accessLevelEnum("accessLevel").notNull(),
    origin: libraryReports_originEnum("origin").notNull(),
    status: libraryReports_statusEnum("status").default("draft").notNull(),
    publishedAt: timestamp("publishedAt"),
    scheduledFor: timestamp("scheduledFor"),
    authorName: varchar("authorName", { length: 255 }).default("Aquifert Desk").notNull(),
    aiModel: varchar("aiModel", { length: 255 }),
    aiPromptVersion: varchar("aiPromptVersion", { length: 64 }),
    aiReviewedBy: bigint("aiReviewedBy", { mode: "number" }),
    aiReviewedAt: timestamp("aiReviewedAt"),
    filePath: varchar("filePath", { length: 512 }),
    fileName: varchar("fileName", { length: 255 }),
    fileSizeBytes: bigint("fileSizeBytes", { mode: "number" }),
    fileMime: varchar("fileMime", { length: 128 }),
    coverImagePath: varchar("coverImagePath", { length: 512 }),
    tags: jsonb("tags").$type<string[]>().notNull(),
    validationFlags: jsonb("validationFlags").$type<LibraryValidationFlag[]>(),
    viewCount: integer("viewCount").default(0).notNull(),
    downloadCount: integer("downloadCount").default(0).notNull(),
    createdBy: bigint("createdBy", { mode: "number" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => ({
    statusIdx: index("library_reports_status_idx").on(t.status),
    typeIdx: index("library_reports_type_idx").on(t.reportType),
    publishedIdx: index("library_reports_published_idx").on(t.publishedAt),
  })
);
export type LibraryReport = typeof libraryReports.$inferSelect;

export type LibraryValidationFlag = {
  check: "numeric" | "citation" | "quotation" | "scope" | "length" | "advice";
  sectionKey: string | null;
  message: string;
  blocking: boolean;
  resolved: boolean;
};

export const libraryReportSources = pgTable(
  "library_report_sources",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    reportId: varchar("reportId", { length: 36 }).notNull(),
    sectionKey: varchar("sectionKey", { length: 64 }).notNull(),
    claimExcerpt: text("claimExcerpt").notNull(),
    sourceType: libraryReportSources_sourceTypeEnum("sourceType").notNull(),
    sourceId: varchar("sourceId", { length: 128 }).notNull(),
    sourceTitle: text("sourceTitle").notNull(),
    sourceUrl: varchar("sourceUrl", { length: 1024 }),
    sourceDate: timestamp("sourceDate").notNull(),
  },
  (t) => ({ reportIdx: index("library_sources_report_idx").on(t.reportId) })
);
export type LibraryReportSource = typeof libraryReportSources.$inferSelect;

export const libraryAccessLog = pgTable(
  "library_access_log",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    reportId: varchar("reportId", { length: 36 }).notNull(),
    userId: bigint("userId", { mode: "number" }).notNull(),
    action: libraryAccessLog_actionEnum("action").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("library_access_user_idx").on(t.userId),
    reportIdx: index("library_access_report_idx").on(t.reportId),
  })
);
export type LibraryAccessLogRow = typeof libraryAccessLog.$inferSelect;

export const libraryReportVersions = pgTable(
  "library_report_versions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    reportId: varchar("reportId", { length: 36 }).notNull(),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    changedBy: bigint("changedBy", { mode: "number" }).notNull(),
    changeNote: varchar("changeNote", { length: 512 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({ reportIdx: index("library_versions_report_idx").on(t.reportId) })
);
export type LibraryReportVersion = typeof libraryReportVersions.$inferSelect;

export const libraryGenerationLog = pgTable(
  "library_generation_log",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    reportId: varchar("reportId", { length: 36 }),
    status: libraryGenerationLog_statusEnum("status").notNull(),
    triggerType: libraryGenerationLog_triggerTypeEnum("triggerType").notNull(),
    model: varchar("model", { length: 255 }).notNull(),
    promptVersion: varchar("promptVersion", { length: 64 }).notNull(),
    corpusIds: jsonb("corpusIds").$type<string[]>().notNull(),
    tokenCounts: jsonb("tokenCounts").$type<Record<string, number>>(),
    latencyMs: integer("latencyMs"),
    validationResult: jsonb("validationResult").$type<LibraryValidationFlag[]>(),
    error: text("error"),
    startedAt: timestamp("startedAt").defaultNow().notNull(),
    finishedAt: timestamp("finishedAt"),
  },
  (t) => ({ statusIdx: index("library_genlog_status_idx").on(t.status) })
);
export type LibraryGenerationLogRow = typeof libraryGenerationLog.$inferSelect;

/* ------------------------------------------------------------------ */
/* AQ1 free-plan account (additive; no existing tables modified)      */
/* ------------------------------------------------------------------ */

/** Admin-editable application settings (free-tier limits etc.) */
export const appSettings = pgTable("app_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: varchar("value", { length: 512 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/** AQ Market Analysis feed — desk notes interpreting the news */
export const aqAnalysisNotes = pgTable("aq_analysis_notes", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  body: text("body").notNull(),
  authorName: varchar("authorName", { length: 128 }).notNull(),
  products: jsonb("products").$type<string[]>().notNull(),
  regions: jsonb("regions").$type<string[]>().notNull(),
  relatedTelexIds: jsonb("relatedTelexIds").$type<number[]>().notNull(),
  publishedAt: timestamp("publishedAt"),
  status: aqAnalysisNotes_statusEnum("status").default("DRAFT").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type AqAnalysisNote = typeof aqAnalysisNotes.$inferSelect;

/** Order Fertilizer Now — step-1 requirement capture (AQ0 funnel) */
export const orderRequirements = pgTable("order_requirements", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  product: varchar("product", { length: 64 }).notNull(),
  grade: varchar("grade", { length: 255 }),
  quantityMt: decimal("quantityMt", { precision: 12, scale: 2, mode: "number" }).notNull(),
  packingStyle: varchar("packingStyle", { length: 64 }).notNull(),
  portOfEntry: varchar("portOfEntry", { length: 128 }).notNull(),
  destinationPort: varchar("destinationPort", { length: 128 }).notNull(),
  finalDeliveryLocation: varchar("finalDeliveryLocation", { length: 255 }),
  deliveryWindowFrom: varchar("deliveryWindowFrom", { length: 16 }).notNull(),
  deliveryWindowTo: varchar("deliveryWindowTo", { length: 16 }).notNull(),
  targetPrice: decimal("targetPrice", { precision: 12, scale: 2, mode: "number" }),
  currency: varchar("currency", { length: 8 }),
  incoterm: varchar("incoterm", { length: 16 }),
  notes: text("notes"),
  status: orderRequirements_statusEnum("status").default("captured").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type OrderRequirement = typeof orderRequirements.$inferSelect;

/** Community call sessions (admin-managed) */
export const communityCallSessions = pgTable("community_call_sessions", {
  id: serial("id").primaryKey(),
  startsAt: timestamp("startsAt").notNull(),
  durationMinutes: integer("durationMinutes").default(45).notNull(),
  topic: varchar("topic", { length: 255 }).notNull(),
  host: varchar("host", { length: 128 }).notNull(),
  joiningLink: varchar("joiningLink", { length: 512 }),
  recordingUrl: varchar("recordingUrl", { length: 512 }),
  status: communityCallSessions_statusEnum("status").default("SCHEDULED").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CommunityCallSession = typeof communityCallSessions.$inferSelect;

export const communityCallRegistrations = pgTable("community_call_registrations", {
  id: serial("id").primaryKey(),
  sessionId: bigint("sessionId", { mode: "number" }).notNull(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  company: varchar("company", { length: 255 }),
  country: varchar("country", { length: 128 }),
  question: text("question"),
  reminders: boolean("reminders").default(false).notNull(),
  status: communityCallRegistrations_statusEnum("status").default("REGISTERED").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CommunityCallRegistration = typeof communityCallRegistrations.$inferSelect;

/** Rotating promotional prompts — impressions enforce the display rules */
export const promoImpressions = pgTable("promo_impressions", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  promoKey: promoImpressions_promoKeyEnum("promoKey").notNull(),
  action: promoImpressions_actionEnum("action").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PromoImpression = typeof promoImpressions.$inferSelect;

/** First-run tour progress */
export const tourProgress = pgTable("tour_progress", {
  userId: bigint("userId", { mode: "number" }).primaryKey(),
  lastStepCompleted: integer("lastStepCompleted").default(0).notNull(),
  status: tourProgress_statusEnum("status").default("not_started").notNull(),
  resumeOffered: boolean("resumeOffered").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type TourProgress = typeof tourProgress.$inferSelect;

/** Free-tier usage metering (per user, per calendar month) */
export const aqUsage = pgTable(
  "aq_usage",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number" }).notNull(),
    kind: aqUsage_kindEnum("kind").notNull(),
    periodKey: varchar("periodKey", { length: 7 }).notNull(), // YYYY-MM
    count: integer("count").default(0).notNull(),
  },
  (t) => ({
    usageUnique: uniqueIndex("aq_usage_user_kind_period_uidx").on(
      t.userId,
      t.kind,
      t.periodKey,
    ),
  }),
);
export type AqUsage = typeof aqUsage.$inferSelect;

/** Saved outputs ("My Reports"): generated reports and saved calculations */
export const aqSavedReports = pgTable("aq_saved_reports", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  kind: aqSavedReports_kindEnum("kind").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(), // markdown report or JSON calc payload
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AqSavedReport = typeof aqSavedReports.$inferSelect;

/** Generation audit log for AI-drafted outputs */
export const aqGenerationLog = pgTable("aq_generation_log", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  kind: varchar("kind", { length: 32 }).notNull(),
  modelName: varchar("modelName", { length: 128 }).notNull(),
  modelVersion: varchar("modelVersion", { length: 64 }).notNull(),
  promptVersion: varchar("promptVersion", { length: 64 }).notNull(),
  corpusIds: jsonb("corpusIds").$type<string[]>().notNull(),
  validationResult: jsonb("validationResult").$type<Record<string, unknown>>().notNull(),
  blocked: boolean("blocked").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AqGenerationLog = typeof aqGenerationLog.$inferSelect;

/** Public "Contact us" messages from the marketing site */
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  channel: varchar("channel", { length: 32 }).notNull(), // whatsapp | book_call | message | callback
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  company: varchar("company", { length: 255 }),
  message: text("message").notNull(),
  status: varchar("status", { length: 24 }).default("NEW").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ContactMessage = typeof contactMessages.$inferSelect;
