export const ONBOARDING_STATUSES = ["to_invite", "invited", "subscribed", "skipped"] as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

export const ONBOARDING_LABEL: Record<OnboardingStatus, string> = {
  to_invite: "To invite",
  invited: "Invite sent",
  subscribed: "On WeChat",
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
  lastContactAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type TradeBuyer = {
  id: string;
  code: string;
  companyName: string;
  contactName: string;
  email: string;
  whatsappE164: string | null;
  country: string;
  kycStatus: string;
  status: string;
  createdAt: string;
  updatedAt: string;
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
