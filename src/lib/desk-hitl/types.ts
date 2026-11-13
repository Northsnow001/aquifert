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
  /** Matt confirmed the mill OK’d this FO (WeChat until WF2 is wired). */
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
  channel: "app" | "whatsapp";
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
  offers: DeskOffer[];
  selectedOfferId: string | null;
  marginPct: number | null;
  buyerPrice: number | null;
  currency: string;
  messages: DeskMessage[];
  /** n8n Wait resume URL, if WF8 is paused on this deal. */
  callbackUrl: string | null;
  firmInterestAt: string | null;
  /** WhatsApp firm-order agent terms. These fill FO / PI / contracts / supplier pack. */
  execution?: DeskExecution | null;
  /** Parked when terms are confirmed. Buyer does not see this until Matt sends. */
  firmOffer?: DeskPi | null;
  foPack?: DeskFoPack | null;
  pi?: DeskPi | null;
  salesContract?: DeskPi | null;
  supplierPackSentAt?: string | null;
};

export type BuyerReplyKind = "agree" | "negotiate" | "chat";
