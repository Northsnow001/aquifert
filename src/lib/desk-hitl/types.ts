export const DEAL_STATUSES = ["waiting_desk", "indication_sent", "negotiating", "firm_interest"] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number];

export const DEAL_STATUS_LABEL: Record<DealStatus, string> = {
  waiting_desk: "Needs Matt",
  indication_sent: "Sent to buyer",
  negotiating: "Negotiating",
  firm_interest: "Firm interest",
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
};

export type BuyerReplyKind = "agree" | "negotiate";
