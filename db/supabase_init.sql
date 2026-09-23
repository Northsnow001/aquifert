-- Aquifert schema for Supabase (Postgres)
-- Generated from db/schema.ts — run in SQL Editor (new project / empty public schema)
-- Includes enums, tables, unique constraints, indexes, and foreign keys.
CREATE TYPE "public"."agent_drafts_kind" AS ENUM('FIRM_OFFER', 'RECAP', 'CONTRACT', 'MARGIN_REVIEW', 'STATUS_UPDATE');
CREATE TYPE "public"."agent_drafts_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'SENT');
CREATE TYPE "public"."aq_analysis_notes_status" AS ENUM('DRAFT', 'SCHEDULED', 'PUBLISHED');
CREATE TYPE "public"."aq_saved_reports_kind" AS ENUM('NITROGEN_REPORT', 'UREA_CALC');
CREATE TYPE "public"."aq_usage_kind" AS ENUM('NITROGEN_REPORT', 'UREA_CALC');
CREATE TYPE "public"."broadcasts_channel" AS ENUM('WHATSAPP', 'EMAIL', 'IN_APP');
CREATE TYPE "public"."broadcasts_status" AS ENUM('SCHEDULED', 'SENT');
CREATE TYPE "public"."community_call_registrations_status" AS ENUM('REGISTERED', 'CANCELLED');
CREATE TYPE "public"."community_call_sessions_status" AS ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "public"."conversations_source" AS ENUM('WHATSAPP', 'WECHAT', 'EMAIL', 'PORTAL');
CREATE TYPE "public"."conversations_status" AS ENUM('PENDING', 'PROCESSED', 'SPAM', 'CLARIFICATION');
CREATE TYPE "public"."documents_doc_class" AS ENUM('A', 'B', 'C');
CREATE TYPE "public"."documents_gate_state" AS ENUM('BLOCKED', 'PASS', 'RESOLVE_THEN_PASS', 'HARD_NO_GO');
CREATE TYPE "public"."documents_type" AS ENUM('INVOICE', 'PACKING_LIST', 'BOL', 'CERTIFICATE', 'CUSTOMS', 'SDS', 'CONTRACT');
CREATE TYPE "public"."engagement_prompt_events_event" AS ENUM('VIEW', 'DISMISS', 'SUBSCRIBE');
CREATE TYPE "public"."engagement_prompt_events_tab" AS ENUM('NEWSLETTER', 'MEMBERSHIP');
CREATE TYPE "public"."financing_applications_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'REPAID');
CREATE TYPE "public"."freight_bids_status" AS ENUM('OPEN', 'WON', 'LOST', 'WITHDRAWN');
CREATE TYPE "public"."hub_commentary_kind" AS ENUM('FREIGHT', 'MARKET');
CREATE TYPE "public"."hub_indicators_nutrient" AS ENUM('NITROGEN', 'PHOSPHATE', 'POTASSIUM');
CREATE TYPE "public"."invoices_installment" AS ENUM('FULL', 'DEPOSIT', 'BALANCE');
CREATE TYPE "public"."invoices_type" AS ENUM('PROFORMA', 'COMMERCIAL', 'PURCHASE_ORDER');
CREATE TYPE "public"."leads_score" AS ENUM('HOT', 'WARM', 'COLD');
CREATE TYPE "public"."library_access_log_action" AS ENUM('viewed', 'downloaded', 'blocked_by_tier', 'upgrade_clicked');
CREATE TYPE "public"."library_generation_log_status" AS ENUM('running', 'success', 'failed');
CREATE TYPE "public"."library_generation_log_trigger_type" AS ENUM('scheduled', 'manual');
CREATE TYPE "public"."library_report_sources_source_type" AS ENUM('telex_post', 'market_price', 'news_item', 'open_dataset', 'tender', 'freight_record', 'desk_assessment');
CREATE TYPE "public"."library_reports_access_level" AS ENUM('free', 'members', 'premium');
CREATE TYPE "public"."library_reports_origin" AS ENUM('manual_upload', 'ai_generated');
CREATE TYPE "public"."library_reports_report_type" AS ENUM('weekly_market', 'special_report', 'data_pack', 'training', 'other');
CREATE TYPE "public"."library_reports_status" AS ENUM('draft', 'in_review', 'approved', 'published', 'archived');
CREATE TYPE "public"."login_attempts_key_type" AS ENUM('ACCOUNT', 'IP');
CREATE TYPE "public"."market_data_commodity" AS ENUM('UREA', 'DAP', 'MOP', 'MAP', 'NPK');
CREATE TYPE "public"."memberships_billing_cycle" AS ENUM('MONTHLY', 'ANNUAL');
CREATE TYPE "public"."memberships_status" AS ENUM('ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED');
CREATE TYPE "public"."memberships_tier" AS ENUM('SPROUT', 'HARVEST', 'SCALE');
CREATE TYPE "public"."newsletter_subs_frequency" AS ENUM('DAILY', 'WEEKLY', 'MAJOR_MOVES');
CREATE TYPE "public"."order_requirements_status" AS ENUM('captured', 'upgrade_started', 'upgraded', 'callback_requested', 'abandoned');
CREATE TYPE "public"."orders_deal_type" AS ENUM('AQ_ZERO', 'TRADITIONAL');
CREATE TYPE "public"."orders_inspection_basis" AS ENUM('SELLER_CERT', 'THIRD_PARTY');
CREATE TYPE "public"."orders_payment_status" AS ENUM('PENDING', 'PAID', 'PARTIAL', 'REFUNDED');
CREATE TYPE "public"."organizations_type" AS ENUM('BUYER', 'SUPPLIER');
CREATE TYPE "public"."otp_codes_purpose" AS ENUM('VERIFY', 'RESET');
CREATE TYPE "public"."otp_events_event" AS ENUM('ISSUE', 'VERIFY_SUCCESS', 'VERIFY_FAIL', 'RESEND');
CREATE TYPE "public"."prices_direction" AS ENUM('UP', 'DOWN', 'FLAT');
CREATE TYPE "public"."promo_impressions_action" AS ENUM('shown', 'dismissed', 'clicked');
CREATE TYPE "public"."promo_impressions_promo_key" AS ENUM('A', 'B', 'C');
CREATE TYPE "public"."protected_entities_role" AS ENUM('CONTRACTING_SELLER', 'MAINLAND_ENTITY', 'EXPORT_OF_RECORD', 'CONTACT', 'BANK', 'OTHER');
CREATE TYPE "public"."quotes_status" AS ENUM('DRAFT', 'PENDING_APPROVAL', 'SENT', 'ACCEPTED', 'REJECTED');
CREATE TYPE "public"."request_status" AS ENUM('NEW', 'QUOTED', 'ACCEPTED', 'PAID', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'DISPUTED');
CREATE TYPE "public"."requests_incoterms" AS ENUM('DDP', 'FOB', 'CIF');
CREATE TYPE "public"."requests_origin_channel" AS ENUM('WHATSAPP', 'PORTAL', 'EMAIL');
CREATE TYPE "public"."requests_product" AS ENUM('UREA', 'DAP', 'MOP', 'MAP', 'NPK');
CREATE TYPE "public"."requests_unit" AS ENUM('TONS');
CREATE TYPE "public"."shipments_status" AS ENUM('BOOKED', 'GATE_IN', 'LOADED', 'DEPARTURE', 'IN_TRANSIT', 'ARRIVAL', 'CUSTOMS', 'CLEARED', 'OUT_FOR_DELIVERY', 'DELIVERED');
CREATE TYPE "public"."supplier_products_product" AS ENUM('UREA', 'DAP', 'MOP', 'MAP', 'NPK');
CREATE TYPE "public"."supplier_requests_status" AS ENUM('NEW', 'QUOTED', 'ACCEPTED', 'COMPLETED');
CREATE TYPE "public"."tour_progress_status" AS ENUM('not_started', 'in_progress', 'completed', 'skipped');
CREATE TYPE "public"."users_language" AS ENUM('EN', 'ZH');
CREATE TYPE "public"."users_portal_role" AS ENUM('ADMIN', 'OPERATIONS', 'FINANCE', 'SUPPORT', 'BUYER', 'SUPPLIER');
CREATE TYPE "public"."users_role" AS ENUM('user', 'admin');
CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" bigint,
	"actor" varchar(255),
	"action" varchar(255) NOT NULL,
	"entity" varchar(64),
	"entityId" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "agent_drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" "agent_drafts_kind" NOT NULL,
	"requestId" bigint,
	"orderId" bigint,
	"conversationId" bigint,
	"title" varchar(255) NOT NULL,
	"draftText" text NOT NULL,
	"payload" jsonb,
	"status" "agent_drafts_status" DEFAULT 'PENDING' NOT NULL,
	"decidedBy" bigint,
	"decidedAt" timestamp,
	"decisionNote" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "app_settings" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"value" varchar(512) NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "aq_analysis_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"authorName" varchar(128) NOT NULL,
	"products" jsonb NOT NULL,
	"regions" jsonb NOT NULL,
	"relatedTelexIds" jsonb NOT NULL,
	"publishedAt" timestamp,
	"status" "aq_analysis_notes_status" DEFAULT 'DRAFT' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "aq_generation_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" bigint NOT NULL,
	"kind" varchar(32) NOT NULL,
	"modelName" varchar(128) NOT NULL,
	"modelVersion" varchar(64) NOT NULL,
	"promptVersion" varchar(64) NOT NULL,
	"corpusIds" jsonb NOT NULL,
	"validationResult" jsonb NOT NULL,
	"blocked" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "aq_saved_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" bigint NOT NULL,
	"kind" "aq_saved_reports_kind" NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "aq_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" bigint NOT NULL,
	"kind" "aq_usage_kind" NOT NULL,
	"periodKey" varchar(7) NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "broadcasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"audience" varchar(32) NOT NULL,
	"channel" "broadcasts_channel" NOT NULL,
	"message" text NOT NULL,
	"scheduledAt" timestamp,
	"status" "broadcasts_status" DEFAULT 'SCHEDULED' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "community_call_registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" bigint NOT NULL,
	"userId" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"company" varchar(255),
	"country" varchar(128),
	"question" text,
	"reminders" boolean DEFAULT false NOT NULL,
	"status" "community_call_registrations_status" DEFAULT 'REGISTERED' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "community_call_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"startsAt" timestamp NOT NULL,
	"durationMinutes" integer DEFAULT 45 NOT NULL,
	"topic" varchar(255) NOT NULL,
	"host" varchar(128) NOT NULL,
	"joiningLink" varchar(512),
	"recordingUrl" varchar(512),
	"status" "community_call_sessions_status" DEFAULT 'SCHEDULED' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel" varchar(32) NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"company" varchar(255),
	"message" text NOT NULL,
	"status" varchar(24) DEFAULT 'NEW' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"requestId" bigint,
	"buyerName" varchar(255),
	"participants" jsonb,
	"messages" jsonb,
	"source" "conversations_source" DEFAULT 'PORTAL' NOT NULL,
	"summary" text,
	"extracted" jsonb,
	"aiConfidence" integer,
	"status" "conversations_status" DEFAULT 'PENDING' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" bigint NOT NULL,
	"type" "documents_type" NOT NULL,
	"name" varchar(255),
	"url" varchar(512),
	"ocrData" jsonb,
	"uploadedBy" bigint,
	"docClass" "documents_doc_class" DEFAULT 'A' NOT NULL,
	"gateState" "documents_gate_state" DEFAULT 'BLOCKED' NOT NULL,
	"scanFindings" jsonb,
	"rawText" text,
	"cleanText" text,
	"fixAction" varchar(40),
	"clearedBy" bigint,
	"clearedAt" timestamp,
	"buyerReleasable" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "engagement_prompt_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" bigint NOT NULL,
	"event" "engagement_prompt_events_event" NOT NULL,
	"tab" "engagement_prompt_events_tab",
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "financing_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"buyerId" bigint NOT NULL,
	"orderId" bigint NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"creditLimit" numeric(14, 2),
	"interestRate" numeric(5, 2),
	"term" integer NOT NULL,
	"status" "financing_applications_status" DEFAULT 'PENDING' NOT NULL,
	"repaymentSchedule" jsonb,
	"signature" text,
	"signedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "freight_bids" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" bigint NOT NULL,
	"forwarderAlias" varchar(32) NOT NULL,
	"forwarderOrgId" bigint,
	"pricePerContainer" numeric(12, 2) NOT NULL,
	"currency" varchar(8) DEFAULT 'USD' NOT NULL,
	"transitDays" integer,
	"status" "freight_bids_status" DEFAULT 'OPEN' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "freight_enquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"accountCode" varchar(32) NOT NULL,
	"product" varchar(64) NOT NULL,
	"qtyMt" integer NOT NULL,
	"origin" varchar(128) NOT NULL,
	"destination" varchar(128) NOT NULL,
	"laycan" varchar(64) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "hub_commentary" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" "hub_commentary_kind" NOT NULL,
	"title" varchar(255) NOT NULL,
	"byline" varchar(255) NOT NULL,
	"paragraphs" jsonb NOT NULL,
	"publishedAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "hub_indicators" (
	"id" serial PRIMARY KEY NOT NULL,
	"nutrient" "hub_indicators_nutrient" NOT NULL,
	"score" integer NOT NULL,
	"rationale" text NOT NULL,
	"history" jsonb NOT NULL,
	"updatedBy" varchar(255) NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hub_indicators_nutrient_unique" UNIQUE("nutrient")
);

CREATE TABLE "hub_prefs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" bigint NOT NULL,
	"products" jsonb NOT NULL,
	"regions" jsonb NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hub_prefs_userId_unique" UNIQUE("userId")
);

CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" bigint NOT NULL,
	"invoiceNumber" varchar(32) NOT NULL,
	"type" "invoices_type" DEFAULT 'PROFORMA' NOT NULL,
	"installment" "invoices_installment" DEFAULT 'FULL' NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" varchar(8) DEFAULT 'GBP' NOT NULL,
	"pdfUrl" varchar(512),
	"dueDate" timestamp,
	"paidAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoiceNumber_unique" UNIQUE("invoiceNumber")
);

CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"intent" varchar(64) NOT NULL,
	"source" varchar(64) NOT NULL,
	"products" jsonb NOT NULL,
	"regions" jsonb NOT NULL,
	"goals" jsonb NOT NULL,
	"fullName" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"company" varchar(255) NOT NULL,
	"country" varchar(128) NOT NULL,
	"role" varchar(64),
	"annualVolume" varchar(64),
	"timeline" varchar(64),
	"phone" varchar(64),
	"termsAccepted" boolean NOT NULL,
	"marketingOptIn" boolean NOT NULL,
	"consentPolicyVersion" varchar(32) NOT NULL,
	"consentAt" timestamp NOT NULL,
	"consentIp" varchar(64),
	"cookieConsent" jsonb,
	"utmSource" varchar(255),
	"utmMedium" varchar(255),
	"utmCampaign" varchar(255),
	"referrer" text,
	"landingPage" text,
	"score" "leads_score" NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "library_access_log" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"reportId" varchar(36) NOT NULL,
	"userId" bigint NOT NULL,
	"action" "library_access_log_action" NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "library_generation_log" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"reportId" varchar(36),
	"status" "library_generation_log_status" NOT NULL,
	"triggerType" "library_generation_log_trigger_type" NOT NULL,
	"model" varchar(255) NOT NULL,
	"promptVersion" varchar(64) NOT NULL,
	"corpusIds" jsonb NOT NULL,
	"tokenCounts" jsonb,
	"latencyMs" integer,
	"validationResult" jsonb,
	"error" text,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"finishedAt" timestamp
);

CREATE TABLE "library_report_sources" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"reportId" varchar(36) NOT NULL,
	"sectionKey" varchar(64) NOT NULL,
	"claimExcerpt" text NOT NULL,
	"sourceType" "library_report_sources_source_type" NOT NULL,
	"sourceId" varchar(128) NOT NULL,
	"sourceTitle" text NOT NULL,
	"sourceUrl" varchar(1024),
	"sourceDate" timestamp NOT NULL
);

CREATE TABLE "library_report_versions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"reportId" varchar(36) NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"changedBy" bigint NOT NULL,
	"changeNote" varchar(512),
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "library_reports" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" varchar(512) NOT NULL,
	"reportType" "library_reports_report_type" NOT NULL,
	"weekNumber" integer,
	"year" integer,
	"periodStart" timestamp,
	"periodEnd" timestamp,
	"summary" text NOT NULL,
	"body" jsonb,
	"accessLevel" "library_reports_access_level" NOT NULL,
	"origin" "library_reports_origin" NOT NULL,
	"status" "library_reports_status" DEFAULT 'draft' NOT NULL,
	"publishedAt" timestamp,
	"scheduledFor" timestamp,
	"authorName" varchar(255) DEFAULT 'Aquifert Desk' NOT NULL,
	"aiModel" varchar(255),
	"aiPromptVersion" varchar(64),
	"aiReviewedBy" bigint,
	"aiReviewedAt" timestamp,
	"filePath" varchar(512),
	"fileName" varchar(255),
	"fileSizeBytes" bigint,
	"fileMime" varchar(128),
	"coverImagePath" varchar(512),
	"tags" jsonb NOT NULL,
	"validationFlags" jsonb,
	"viewCount" integer DEFAULT 0 NOT NULL,
	"downloadCount" integer DEFAULT 0 NOT NULL,
	"createdBy" bigint,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "library_reports_slug_unique" UNIQUE("slug")
);

CREATE TABLE "login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"keyType" "login_attempts_key_type" NOT NULL,
	"keyValue" varchar(320) NOT NULL,
	"success" boolean NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "market_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"commodity" "market_data_commodity" NOT NULL,
	"region" varchar(64) NOT NULL,
	"pricePerTon" numeric(10, 2) NOT NULL,
	"currency" varchar(8) DEFAULT 'USD' NOT NULL,
	"date" timestamp NOT NULL,
	"source" varchar(128),
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" bigint NOT NULL,
	"tier" "memberships_tier" NOT NULL,
	"status" "memberships_status" DEFAULT 'PENDING' NOT NULL,
	"monthlyTonnageLimit" integer NOT NULL,
	"currentMonthTonnage" integer DEFAULT 0 NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"billingCycle" "memberships_billing_cycle" DEFAULT 'MONTHLY' NOT NULL,
	"startDate" timestamp DEFAULT now() NOT NULL,
	"endDate" timestamp,
	"autoRenew" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "news_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sourceId" bigint NOT NULL,
	"headline" varchar(512) NOT NULL,
	"url" varchar(1024) NOT NULL,
	"snippet" varchar(220),
	"publishedAt" timestamp NOT NULL,
	"product" varchar(32) DEFAULT 'GENERAL' NOT NULL,
	"geography" varchar(64) DEFAULT 'GLOBAL' NOT NULL,
	"ingestedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "news_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"feedUrl" varchar(512) NOT NULL,
	"siteUrl" varchar(512),
	"licenceType" varchar(255) NOT NULL,
	"attributionText" text NOT NULL,
	"refreshCadence" varchar(64) NOT NULL,
	"geography" varchar(64) DEFAULT 'GLOBAL' NOT NULL,
	"lastFetchedAt" timestamp,
	"dataAsOf" timestamp,
	"lastError" varchar(512),
	"owner" varchar(255) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "news_sources_code_unique" UNIQUE("code")
);

CREATE TABLE "newsletter_subs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" bigint NOT NULL,
	"email" varchar(320) NOT NULL,
	"frequency" "newsletter_subs_frequency" NOT NULL,
	"marketingOptIn" boolean NOT NULL,
	"consentAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "nitrogen_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"refNo" varchar(32) NOT NULL,
	"userId" bigint NOT NULL,
	"answers" jsonb NOT NULL,
	"reportMd" text NOT NULL,
	"pdfUrl" varchar(512),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nitrogen_reports_refNo_unique" UNIQUE("refNo")
);

CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" bigint NOT NULL,
	"type" varchar(48) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text,
	"read" boolean DEFAULT false NOT NULL,
	"actionUrl" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "order_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" bigint NOT NULL,
	"product" varchar(64) NOT NULL,
	"grade" varchar(255),
	"quantityMt" numeric(12, 2) NOT NULL,
	"packingStyle" varchar(64) NOT NULL,
	"portOfEntry" varchar(128) NOT NULL,
	"destinationPort" varchar(128) NOT NULL,
	"finalDeliveryLocation" varchar(255),
	"deliveryWindowFrom" varchar(16) NOT NULL,
	"deliveryWindowTo" varchar(16) NOT NULL,
	"targetPrice" numeric(12, 2),
	"currency" varchar(8),
	"incoterm" varchar(16),
	"notes" text,
	"status" "order_requirements_status" DEFAULT 'captured' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"quoteId" bigint NOT NULL,
	"orderNumber" varchar(32) NOT NULL,
	"paymentStatus" "orders_payment_status" DEFAULT 'PENDING' NOT NULL,
	"shipmentStatus" varchar(32) DEFAULT 'PENDING' NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"paidAt" timestamp,
	"tradeRef" varchar(40),
	"dealType" "orders_deal_type" DEFAULT 'AQ_ZERO' NOT NULL,
	"tradeStage" integer DEFAULT 1 NOT NULL,
	"stageHistory" jsonb,
	"buyContractRef" varchar(64),
	"sellContractRef" varchar(64),
	"buySpec" varchar(255),
	"sellSpec" varchar(255),
	"buyQtyMt" numeric(12, 2),
	"sellQtyMt" numeric(12, 2),
	"tolerancePct" numeric(5, 2),
	"buyPricePerMt" numeric(12, 2),
	"freightPerMt" numeric(12, 2),
	"marginPerMt" numeric(12, 2),
	"sellPricePerMt" numeric(12, 2),
	"tradeCurrency" varchar(8) DEFAULT 'USD' NOT NULL,
	"inspectionBasis" "orders_inspection_basis" DEFAULT 'SELLER_CERT' NOT NULL,
	"documentaryInstructions" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_orderNumber_unique" UNIQUE("orderNumber")
);

CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "organizations_type" NOT NULL,
	"country" varchar(128),
	"address" text,
	"vatNumber" varchar(64),
	"contactPerson" varchar(255),
	"wechatId" varchar(128),
	"bankDetails" text,
	"marginProfilePct" numeric(5, 2) DEFAULT 0 NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "otp_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"purpose" "otp_codes_purpose" NOT NULL,
	"codeHash" varchar(128) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"usedAt" timestamp,
	"ip" varchar(64),
	"userAgent" varchar(512),
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "otp_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"event" "otp_events_event" NOT NULL,
	"ip" varchar(64),
	"userAgent" varchar(512),
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "price_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" varchar(512) NOT NULL,
	"licenceType" varchar(255) NOT NULL,
	"attributionText" text NOT NULL,
	"redistributionAllowed" boolean NOT NULL,
	"refreshCadence" varchar(64) NOT NULL,
	"lastFetchedAt" timestamp,
	"dataAsOf" timestamp,
	"owner" varchar(255) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "price_sources_code_unique" UNIQUE("code")
);

CREATE TABLE "prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"product" varchar(64) NOT NULL,
	"grade" varchar(64),
	"basis" varchar(64) NOT NULL,
	"region" varchar(64) NOT NULL,
	"location" varchar(128) NOT NULL,
	"currency" varchar(8) NOT NULL,
	"unit" varchar(32) NOT NULL,
	"value" numeric(12, 2) NOT NULL,
	"previousValue" numeric(12, 2),
	"changeAbs" numeric(12, 2),
	"changePct" numeric(8, 2),
	"direction" "prices_direction" NOT NULL,
	"sourceId" bigint NOT NULL,
	"dataAsOf" timestamp NOT NULL,
	"ingestedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "promo_impressions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" bigint NOT NULL,
	"promoKey" "promo_impressions_promo_key" NOT NULL,
	"action" "promo_impressions_action" NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "protected_entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" bigint NOT NULL,
	"entityName" varchar(255) NOT NULL,
	"role" "protected_entities_role" DEFAULT 'OTHER' NOT NULL,
	"aliases" jsonb,
	"phones" jsonb,
	"addresses" jsonb,
	"bankAccounts" jsonb,
	"contacts" jsonb,
	"notes" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"requestId" bigint NOT NULL,
	"supplierId" bigint,
	"adminId" bigint,
	"productCost" numeric(14, 2) NOT NULL,
	"shippingCost" numeric(14, 2) NOT NULL,
	"clearingCost" numeric(14, 2) NOT NULL,
	"margin" numeric(14, 2) DEFAULT 0 NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"marginPercentage" numeric(5, 2) DEFAULT 0 NOT NULL,
	"status" "quotes_status" DEFAULT 'DRAFT' NOT NULL,
	"aiMessage" text,
	"supplierNotes" text,
	"rejectReason" text,
	"validUntil" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"requestNumber" varchar(32) NOT NULL,
	"buyerId" bigint NOT NULL,
	"product" "requests_product" NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"unit" "requests_unit" DEFAULT 'TONS' NOT NULL,
	"destination" varchar(255) NOT NULL,
	"deliveryDate" timestamp,
	"incoterms" "requests_incoterms" DEFAULT 'CIF' NOT NULL,
	"specialInstructions" text,
	"status" "request_status" DEFAULT 'NEW' NOT NULL,
	"originChannel" "requests_origin_channel" DEFAULT 'PORTAL' NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "requests_requestNumber_unique" UNIQUE("requestNumber")
);

CREATE TABLE "shipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" bigint NOT NULL,
	"containerNumber" varchar(32),
	"vesselName" varchar(128),
	"bolNumber" varchar(64),
	"carrier" varchar(128),
	"departurePort" varchar(128),
	"destinationPort" varchar(128),
	"milestones" jsonb,
	"route" jsonb,
	"currentLocation" varchar(255),
	"currentLat" numeric(10, 5),
	"currentLng" numeric(10, 5),
	"eta" timestamp,
	"delayed" boolean DEFAULT false NOT NULL,
	"delayDays" integer DEFAULT 0 NOT NULL,
	"status" "shipments_status" DEFAULT 'BOOKED' NOT NULL,
	"lastAdvancedAt" timestamp DEFAULT now() NOT NULL,
	"trackingData" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "supplier_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplierId" bigint NOT NULL,
	"product" "supplier_products_product" NOT NULL,
	"specSheet" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "supplier_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"requestId" bigint NOT NULL,
	"supplierId" bigint NOT NULL,
	"status" "supplier_requests_status" DEFAULT 'NEW' NOT NULL,
	"supplierMessage" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "telex_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"product" varchar(32) NOT NULL,
	"geography" varchar(64) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "tour_progress" (
	"userId" bigint PRIMARY KEY NOT NULL,
	"lastStepCompleted" integer DEFAULT 0 NOT NULL,
	"status" "tour_progress_status" DEFAULT 'not_started' NOT NULL,
	"resumeOffered" boolean DEFAULT false NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "user_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" bigint NOT NULL,
	"email" varchar(320) NOT NULL,
	"passwordHash" varchar(255) NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"totpSecret" varchar(64),
	"totpEnabled" boolean DEFAULT false NOT NULL,
	"company" varchar(255),
	"country" varchar(128),
	"phone" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_credentials_email_unique" UNIQUE("email")
);

CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"unionId" varchar(255) NOT NULL,
	"name" varchar(255),
	"email" varchar(320),
	"avatar" text,
	"role" "users_role" DEFAULT 'user' NOT NULL,
	"portalRole" "users_portal_role",
	"phone" varchar(64),
	"organizationId" bigint,
	"demoUserId" bigint,
	"language" "users_language" DEFAULT 'EN' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignInAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_unionId_unique" UNIQUE("unionId")
);

CREATE INDEX "agent_drafts_status_idx" ON "agent_drafts" USING btree ("status");
CREATE INDEX "agent_drafts_order_idx" ON "agent_drafts" USING btree ("orderId");
CREATE UNIQUE INDEX "aq_usage_user_kind_period_uidx" ON "aq_usage" USING btree ("userId","kind","periodKey");
CREATE INDEX "eng_prompt_user_idx" ON "engagement_prompt_events" USING btree ("userId");
CREATE INDEX "fb_order_idx" ON "freight_bids" USING btree ("orderId");
CREATE INDEX "library_access_user_idx" ON "library_access_log" USING btree ("userId");
CREATE INDEX "library_access_report_idx" ON "library_access_log" USING btree ("reportId");
CREATE INDEX "library_genlog_status_idx" ON "library_generation_log" USING btree ("status");
CREATE INDEX "library_sources_report_idx" ON "library_report_sources" USING btree ("reportId");
CREATE INDEX "library_versions_report_idx" ON "library_report_versions" USING btree ("reportId");
CREATE INDEX "library_reports_status_idx" ON "library_reports" USING btree ("status");
CREATE INDEX "library_reports_type_idx" ON "library_reports" USING btree ("reportType");
CREATE INDEX "library_reports_published_idx" ON "library_reports" USING btree ("publishedAt");
CREATE INDEX "login_attempts_key_idx" ON "login_attempts" USING btree ("keyType","keyValue");
CREATE INDEX "md_commodity_idx" ON "market_data" USING btree ("commodity");
CREATE INDEX "md_date_idx" ON "market_data" USING btree ("date");
CREATE INDEX "news_url_idx" ON "news_items" USING btree ("url");
CREATE INDEX "news_src_idx" ON "news_items" USING btree ("sourceId");
CREATE INDEX "news_pub_idx" ON "news_items" USING btree ("publishedAt");
CREATE INDEX "nitrogen_reports_user_idx" ON "nitrogen_reports" USING btree ("userId");
CREATE INDEX "notif_user_idx" ON "notifications" USING btree ("userId");
CREATE INDEX "otp_email_idx" ON "otp_codes" USING btree ("email");
CREATE INDEX "prices_region_idx" ON "prices" USING btree ("region");
CREATE INDEX "prices_source_idx" ON "prices" USING btree ("sourceId");
CREATE INDEX "pe_order_idx" ON "protected_entities" USING btree ("orderId");
CREATE INDEX "quote_request_idx" ON "quotes" USING btree ("requestId");
CREATE INDEX "quote_status_idx" ON "quotes" USING btree ("status");
CREATE INDEX "req_buyer_idx" ON "requests" USING btree ("buyerId");
CREATE INDEX "req_status_idx" ON "requests" USING btree ("status");
CREATE INDEX "telex_prod_idx" ON "telex_items" USING btree ("product");
CREATE INDEX "telex_geo_idx" ON "telex_items" USING btree ("geography");
CREATE INDEX "telex_created_idx" ON "telex_items" USING btree ("createdAt");

-- =============================================================================
-- Foreign keys (logical relationships used by the app; not declared in Drizzle)
-- ON DELETE behaviors: RESTRICT for money/trade spine; CASCADE for user-owned rows
-- =============================================================================

ALTER TABLE "users"
  ADD CONSTRAINT "users_organizationId_fk"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL;

ALTER TABLE "memberships"
  ADD CONSTRAINT "memberships_userId_fk"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "user_credentials"
  ADD CONSTRAINT "user_credentials_userId_fk"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "requests"
  ADD CONSTRAINT "requests_buyerId_fk"
  FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT;

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_requestId_fk"
  FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE;

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_supplierId_fk"
  FOREIGN KEY ("supplierId") REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_adminId_fk"
  FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_quoteId_fk"
  FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE RESTRICT;

ALTER TABLE "protected_entities"
  ADD CONSTRAINT "protected_entities_orderId_fk"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE;

ALTER TABLE "shipments"
  ADD CONSTRAINT "shipments_orderId_fk"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE;

ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_requestId_fk"
  FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE SET NULL;

ALTER TABLE "financing_applications"
  ADD CONSTRAINT "financing_applications_buyerId_fk"
  FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT;

ALTER TABLE "financing_applications"
  ADD CONSTRAINT "financing_applications_orderId_fk"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE;

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_orderId_fk"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE;

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_orderId_fk"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE;

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_uploadedBy_fk"
  FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_clearedBy_fk"
  FOREIGN KEY ("clearedBy") REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "agent_drafts"
  ADD CONSTRAINT "agent_drafts_requestId_fk"
  FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE SET NULL;

ALTER TABLE "agent_drafts"
  ADD CONSTRAINT "agent_drafts_orderId_fk"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL;

ALTER TABLE "agent_drafts"
  ADD CONSTRAINT "agent_drafts_conversationId_fk"
  FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL;

ALTER TABLE "agent_drafts"
  ADD CONSTRAINT "agent_drafts_decidedBy_fk"
  FOREIGN KEY ("decidedBy") REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "freight_bids"
  ADD CONSTRAINT "freight_bids_orderId_fk"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE;

ALTER TABLE "freight_bids"
  ADD CONSTRAINT "freight_bids_forwarderOrgId_fk"
  FOREIGN KEY ("forwarderOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_userId_fk"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "activities"
  ADD CONSTRAINT "activities_userId_fk"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "supplier_requests"
  ADD CONSTRAINT "supplier_requests_requestId_fk"
  FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE;

ALTER TABLE "supplier_requests"
  ADD CONSTRAINT "supplier_requests_supplierId_fk"
  FOREIGN KEY ("supplierId") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "supplier_products"
  ADD CONSTRAINT "supplier_products_supplierId_fk"
  FOREIGN KEY ("supplierId") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "prices"
  ADD CONSTRAINT "prices_sourceId_fk"
  FOREIGN KEY ("sourceId") REFERENCES "price_sources"("id") ON DELETE RESTRICT;

ALTER TABLE "news_items"
  ADD CONSTRAINT "news_items_sourceId_fk"
  FOREIGN KEY ("sourceId") REFERENCES "news_sources"("id") ON DELETE CASCADE;

ALTER TABLE "hub_prefs"
  ADD CONSTRAINT "hub_prefs_userId_fk"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "engagement_prompt_events"
  ADD CONSTRAINT "engagement_prompt_events_userId_fk"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "newsletter_subs"
  ADD CONSTRAINT "newsletter_subs_userId_fk"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "nitrogen_reports"
  ADD CONSTRAINT "nitrogen_reports_userId_fk"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "library_report_sources"
  ADD CONSTRAINT "library_report_sources_reportId_fk"
  FOREIGN KEY ("reportId") REFERENCES "library_reports"("id") ON DELETE CASCADE;

ALTER TABLE "library_access_log"
  ADD CONSTRAINT "library_access_log_reportId_fk"
  FOREIGN KEY ("reportId") REFERENCES "library_reports"("id") ON DELETE CASCADE;

ALTER TABLE "library_access_log"
  ADD CONSTRAINT "library_access_log_userId_fk"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "library_report_versions"
  ADD CONSTRAINT "library_report_versions_reportId_fk"
  FOREIGN KEY ("reportId") REFERENCES "library_reports"("id") ON DELETE CASCADE;

ALTER TABLE "library_report_versions"
  ADD CONSTRAINT "library_report_versions_changedBy_fk"
  FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT;

ALTER TABLE "library_generation_log"
  ADD CONSTRAINT "library_generation_log_reportId_fk"
  FOREIGN KEY ("reportId") REFERENCES "library_reports"("id") ON DELETE SET NULL;

ALTER TABLE "library_reports"
  ADD CONSTRAINT "library_reports_createdBy_fk"
  FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "library_reports"
  ADD CONSTRAINT "library_reports_aiReviewedBy_fk"
  FOREIGN KEY ("aiReviewedBy") REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "order_requirements"
  ADD CONSTRAINT "order_requirements_userId_fk"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "community_call_registrations"
  ADD CONSTRAINT "community_call_registrations_sessionId_fk"
  FOREIGN KEY ("sessionId") REFERENCES "community_call_sessions"("id") ON DELETE CASCADE;

ALTER TABLE "community_call_registrations"
  ADD CONSTRAINT "community_call_registrations_userId_fk"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "promo_impressions"
  ADD CONSTRAINT "promo_impressions_userId_fk"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "tour_progress"
  ADD CONSTRAINT "tour_progress_userId_fk"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "aq_usage"
  ADD CONSTRAINT "aq_usage_userId_fk"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "aq_saved_reports"
  ADD CONSTRAINT "aq_saved_reports_userId_fk"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "aq_generation_log"
  ADD CONSTRAINT "aq_generation_log_userId_fk"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;


-- =============================================================================
-- Auth sync: auth.users → public.users (see also db/supabase_auth_sync.sql)
-- =============================================================================


-- Sync Supabase Auth (auth.users) â†’ public.users + public.user_credentials
-- Matches app mapping: unionId = 'supabase:' || auth.users.id
-- Run in Supabase SQL Editor after supabase_init.sql

CREATE OR REPLACE FUNCTION public.handle_supabase_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_union_id text;
  v_name text;
  v_email text;
  v_phone text;
  v_company text;
  v_country text;
  v_user_id bigint;
BEGIN
  v_union_id := 'supabase:' || NEW.id::text;
  v_email := lower(NEW.email);

  v_name := coalesce(
    nullif(trim(NEW.raw_user_meta_data->>'name'), ''),
    nullif(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    nullif(split_part(coalesce(NEW.email, ''), '@', 1), ''),
    'User'
  );

  v_phone := coalesce(
    nullif(trim(NEW.raw_user_meta_data->>'phone'), ''),
    nullif(NEW.phone, '')
  );

  v_company := nullif(trim(NEW.raw_user_meta_data->>'company'), '');
  v_country := nullif(trim(NEW.raw_user_meta_data->>'country'), '');

  INSERT INTO public.users (
    "unionId",
    "name",
    "email",
    "phone",
    "lastSignInAt"
  )
  VALUES (
    v_union_id,
    v_name,
    v_email,
    v_phone,
    now()
  )
  ON CONFLICT ("unionId") DO UPDATE SET
    "name" = COALESCE(EXCLUDED."name", public.users."name"),
    "email" = COALESCE(EXCLUDED."email", public.users."email"),
    "phone" = COALESCE(EXCLUDED."phone", public.users."phone"),
    "updatedAt" = now(),
    "lastSignInAt" = now()
  RETURNING id INTO v_user_id;

  IF v_email IS NOT NULL THEN
    INSERT INTO public.user_credentials (
      "userId",
      "email",
      "passwordHash",
      "emailVerified",
      "company",
      "country",
      "phone"
    )
    VALUES (
      v_user_id,
      v_email,
      'supabase:managed',
      (NEW.email_confirmed_at IS NOT NULL),
      v_company,
      v_country,
      v_phone
    )
    ON CONFLICT ("email") DO UPDATE SET
      "userId" = EXCLUDED."userId",
      "emailVerified" = EXCLUDED."emailVerified",
      "company" = COALESCE(EXCLUDED."company", public.user_credentials."company"),
      "country" = COALESCE(EXCLUDED."country", public.user_credentials."country"),
      "phone" = COALESCE(EXCLUDED."phone", public.user_credentials."phone");
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_supabase_auth_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email, phone, raw_user_meta_data, email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_supabase_auth_user();

-- Optional: backfill existing auth users into public.users
INSERT INTO public.users ("unionId", "name", "email", "phone", "lastSignInAt")
SELECT
  'supabase:' || u.id::text,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'name'), ''),
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'User'
  ),
  lower(u.email),
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'phone'), ''),
    nullif(u.phone, '')
  ),
  coalesce(u.last_sign_in_at, u.created_at, now())
FROM auth.users u
ON CONFLICT ("unionId") DO NOTHING;

INSERT INTO public.user_credentials (
  "userId",
  "email",
  "passwordHash",
  "emailVerified",
  "company",
  "country",
  "phone"
)
SELECT
  pu.id,
  lower(au.email),
  'supabase:managed',
  (au.email_confirmed_at IS NOT NULL),
  nullif(trim(au.raw_user_meta_data->>'company'), ''),
  nullif(trim(au.raw_user_meta_data->>'country'), ''),
  coalesce(
    nullif(trim(au.raw_user_meta_data->>'phone'), ''),
    nullif(au.phone, '')
  )
FROM auth.users au
JOIN public.users pu ON pu."unionId" = 'supabase:' || au.id::text
WHERE au.email IS NOT NULL
ON CONFLICT ("email") DO NOTHING;
