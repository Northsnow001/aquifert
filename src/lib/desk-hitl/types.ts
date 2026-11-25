import type { FirmOrderDraft } from "@/lib/firm-order/types";

export const DEAL_STATUSES = ["waiting_desk", "indication_sent", "negotiating", "firm_interest", "closed"] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number];

export type DeskPiStatus = "review" | "sent";

export const FO_ATTACHMENT_KINDS = ["coa", "tds", "photo"] as const;
export type FoAttachmentKind = (typeof FO_ATTACHMENT_KINDS)[number];

export const FO_ATTACHMENT_LABEL: Record<FoAttachmentKind, string> = {
  coa: "COA",
  tds: "TDS",
  photo: "Photo",
};

/** Buyer-facing pack files. Never supplier cost sheets. */
export type DeskFoAttachment = {
  id: string;
  kind: FoAttachmentKind;
  filename: string;
  contentType: string;
  uploadedAt: string;
};

export type DeskFoPack = {
  attachments: DeskFoAttachment[];
  /** Matt confirmed the supplier OK’d this FO (WeChat until WF2 is wired). */
  supplierConfirmedAt: string | null;
  supplierConfirmedBy: string | null;
};

/** Proforma parked on the deal for Matt. Buyer never sees this until he sends it. */
export type DeskPi = {
  status: DeskPiStatus;
  updatedAt: string;
  sentAt: string | null;
  sentTo: string | null;
  order: FirmOrderDraft;
};

export const DEAL_STATUS_LABEL: Record<DealStatus, string> = {
  waiting_desk: "Needs Matt",
  indication_sent: "Sent to buyer",
  negotiating: "Negotiating",
  firm_interest: "Firm interest",
  closed: "Closed",
};

export type BuyerPlan = "aq_one" | "aq_zero" | "aq_analytics";

export type OfferChannel = "email" | "wechat" | "whatsapp";

export type SupplierDoc = { filename: string; href: string; receivedAt: string };

export type SupplierMessage = {
  id: string;
  at: string;
  from: "desk" | "supplier" | "system";
  channel: OfferChannel;
  text: string;
  actor?: string;
};

export type DeskOffer = {
  id: string;
  supplierName: string;
  unitPrice: number;
  currency: string;
  incoterm: string;
  quantityMt: number | null;
  loadPort: string;
  destination: string;
  receivedAt: string;
  notes: string;
  wechatOpenId?: string;
  /** Absent on older deals, which stay on the shortlist. */
  shortlisted?: boolean;
  channel?: OfferChannel;
  product?: string;
  supplierEmail?: string;
  messages?: SupplierMessage[];
  documents?: {
    coa?: SupplierDoc | null;
    tds?: SupplierDoc | null;
    photos?: SupplierDoc[];
    firmOffer?: SupplierDoc | null;
  };
};

export type IndicationDraft = {
  text: string;
  savedAt: string | null;
  savedBy: string | null;
};

export type FirmEmailDraft = {
  subject: string;
  note: string;
  savedAt: string | null;
  savedBy: string | null;
};

export type DealSend = {
  id: string;
  at: string;
  actor: string;
  channel: string;
  to: string;
  subject: string;
  body: string;
};

/** Collected after YES. Buyer price stays on the deal; these are the commercial terms for PDFs. */
export type DeskExecution = {
  packing: string;
  origin: string;
  destinationPort: string;
  incoterm: string;
  shipmentWindow: string;
  paymentTerms: string;
  inspection: string;
  documentation: string;
  specification: string;
  urgency: string;
  notes: string;
  confirmedAt: string;
};

export type DeskMessage = {
  id: string;
  at: string;
  from: "desk" | "buyer" | "system";
  text: string;
  channel: "app" | "whatsapp" | "email";
  outboundStatus?: "queued" | "sent" | "failed";
};

export type DeskDeal = {
  id: string;
  at: string;
  updatedAt: string;
  status: DealStatus;
  requestId: string;
  product: string;
  quantityMt: number | null;
  destination: string;
  incoterm: string;
  buyerName: string;
  buyerPhone: string;
  buyerCompany: string;
  /** From Buyers sheet / shortlist / firm-terms. FO Email (send to) uses this. */
  buyerEmail: string;
  /** Which membership this buyer is on. AQ Zero locks the margin and skips the indication. */
  buyerPlan?: BuyerPlan;
  packing?: string;
  shipmentWindow?: string;
  offers: DeskOffer[];
  selectedOfferId: string | null;
  marginPct: number | null;
  buyerPrice: number | null;
  currency: string;
  messages: DeskMessage[];
  /** n8n Wait resume URL, if WF8 is paused on this deal. */
  callbackUrl: string | null;
  /**
   * Set while this phone is collecting a different supply.
   * The locked request is left unchanged until they name it again.
   */
  newEnquiry?: { product: string; at: string } | null;
  firmInterestAt: string | null;
  /**
   * Matt is talking to the buyer on this indication.
   * Buyer messages stay on the desk until he hands the thread to the firm offer agent or ends it.
   */
  mattThread?: boolean;
  mattNotifiedAt?: string | null;
  /** WhatsApp firm-order agent terms. These fill FO / PI / contracts / supplier pack. */
  execution?: DeskExecution | null;
  /** Parked when terms are confirmed. Buyer does not see this until Matt sends. */
  firmOffer?: DeskPi | null;
  foPack?: DeskFoPack | null;
  pi?: DeskPi | null;
  salesContract?: DeskPi | null;
  supplierPackSentAt?: string | null;
  indicationDraft?: IndicationDraft | null;
  firmEmail?: FirmEmailDraft | null;
  sends?: DealSend[];
};

export type BuyerReplyKind = "agree" | "negotiate" | "chat";
