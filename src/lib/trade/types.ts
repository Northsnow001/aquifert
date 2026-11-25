export const ONBOARDING_STATUSES = ["to_invite", "invited", "subscribed", "skipped"] as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

export const ONBOARDING_LABEL: Record<OnboardingStatus, string> = {
  to_invite: "To invite",
  invited: "Invite sent",
  subscribed: "On WeChat",
  skipped: "Skipped",
};

export const BUYER_ONBOARDING_LABEL: Record<OnboardingStatus, string> = {
  to_invite: "To invite",
  invited: "Invite sent",
  subscribed: "On WhatsApp",
  skipped: "Skipped",
};

export const RFQ_STATUSES = [
  "collecting",
  "open",
  "rfq_sent",
  "awaiting_desk",
  "indication_sent",
  "negotiating",
  "firm_interest",
  "firm_offer_sent",
  "won",
  "lost",
  "expired",
  "closed",
] as const;
export type RfqStatus = (typeof RFQ_STATUSES)[number];

export type TradeSupplierDraft = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  country: string;
  address: string;
  productsSupplied: string;
  origins: string;
  loadPorts: string;
  paymentTerms: string;
  notes: string;
  wechatOpenid?: string;
  inviteNow?: boolean;
};

export type TradeMessage = {
  id: string;
  direction: "in" | "out";
  channel: string;
  body: string;
  fromAddress: string;
  toAddress: string;
  createdAt: string;
  payload: Record<string, unknown>;
};

export type TradeAgent = {
  key: string;
  name: string;
  description: string;
  systemPrompt: string;
  updatedAt: string;
};

export type WechatChatState = {
  stage: string;
  quoteType: string;
  rfqId: string;
  missingFields: string[];
  followUpCount: number;
  captured: Record<string, unknown>;
};

export type TradeSupplier = {
  id: string;
  code: string;
  companyName: string;
  contactName: string;
  email: string;
  whatsappE164: string | null;
  wechatOpenid: string | null;
  country: string;
  address: string;
  productsSupplied: string;
  origins: string[];
  loadPorts: string[];
  paymentTerms: string;
  status: string;
  onboardingStatus: OnboardingStatus;
  qrTicket: string | null;
  qrScene: string | null;
  invitedAt: string | null;
  lastRfqCode: string | null;
  awaitingReply: string | null;
  lastContactAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type TradeBuyerDraft = {
  companyName: string;
  contactName: string;
  jobTitle: string;
  email: string;
  phone: string;
  country: string;
  address: string;
  buyerType: string;
  productsOfInterest: string;
  notes: string;
  wechatId?: string;
  partnerName?: string;
  partnerEmail?: string;
  inviteNow?: boolean;
  /** Set when this row is created from an inbound WhatsApp chat, not from admin. */
  linkedOnWhatsApp?: boolean;
};

export type TradeBuyer = {
  id: string;
  code: string;
  companyName: string;
  contactName: string;
  email: string;
  whatsappE164: string | null;
  wechatId: string;
  country: string;
  address: string;
  jobTitle: string;
  buyerType: string;
  productsOfInterest: string;
  kycStatus: string;
  status: string;
  partnerName: string;
  partnerEmail: string;
  onboardingStatus: OnboardingStatus;
  invitedAt: string | null;
  lastContactAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  enquiryCount: number;
  openTrades: number;
  lastEnquiryAt: string | null;
};

export type TradeRfq = {
  id: string;
  code: string;
  buyerCompany: string | null;
  productLabel: string;
  quantityMt: number | null;
  packing: string;
  incoterm: string;
  destinationPort: string;
  destinationCountry: string;
  shipmentWindow: string;
  status: string;
  buyerReady: boolean;
  readyQuoteCount: number;
  buyerUnitPrice: number | null;
  supplierUnitPrice: number | null;
  selectedSupplier: string | null;
  createdAt: string;
  updatedAt: string;
};

export const RFQ_ASK_STATUSES = ["queued", "skipped", "sent", "failed", "quoted", "no_offer"] as const;
export type RfqAskStatus = (typeof RFQ_ASK_STATUSES)[number];

export const RFQ_ASK_LABEL: Record<RfqAskStatus, string> = {
  queued: "Queued",
  skipped: "No WeChat",
  sent: "Awaiting quote",
  failed: "Send failed",
  quoted: "Quoted",
  no_offer: "No offer",
};

export type TradeRfqAsk = {
  id: string;
  rfqId: string;
  supplierId: string;
  companyName: string;
  contactName: string;
  wechatOpenid: string | null;
  status: RfqAskStatus;
  error: string;
  sentAt: string | null;
  unitPrice: number | null;
  incoterm: string;
  loadPort: string;
  quoteAt: string | null;
};

export type TradeRfqActivity = {
  id: string;
  direction: "in" | "out";
  channel: string;
  body: string;
  createdAt: string;
};

export type TradeRfqDesk = {
  id: string;
  code: string;
  status: string;
  productLabel: string;
  specification: string;
  quantityMt: number | null;
  packing: string;
  incoterm: string;
  destinationPort: string;
  destinationCountry: string;
  shipmentWindow: string;
  rawMessage: string;
  buyerCompany: string;
  buyerContact: string;
  buyerEmail: string;
  buyerPhone: string;
  createdAt: string;
  updatedAt: string;
  asks: TradeRfqAsk[];
  activity: TradeRfqActivity[];
};

export type TradeQuote = {
  id: string;
  code: string | null;
  kind: string;
  rfqCode: string | null;
  supplierName: string | null;
  productLabel: string;
  unitPrice: number | null;
  currency: string;
  quantityMt: number | null;
  loadPort: string;
  incoterm: string;
  status: string;
  ready: boolean;
  sourceChannel: string | null;
  receivedAt: string;
};

export type TradeFreightQuote = {
  id: string;
  kind: string;
  originPort: string;
  destinationPort: string;
  rate: number | null;
  currency: string;
  isNoOffer: boolean;
  receivedAt: string;
};

export type TradeCounts = {
  buyers: number;
  suppliers: number;
  toInvite: number;
  invited: number;
  subscribed: number;
  rfqs: number;
  openRfqs: number;
  quotes: number;
  readyQuotes: number;
  freightQuotes: number;
};

export type InviteResult = {
  supplierId: string;
  email: string;
  ok: boolean;
  reusedToken: boolean;
  error?: string;
};

export type BuyerInviteResult = {
  buyerId: string;
  email: string;
  ok: boolean;
  error?: string;
};
