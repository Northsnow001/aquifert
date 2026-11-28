/** A member's own trade, built from live enquiries and desk deals. */

export type MemberStage = "quote" | "confirmed" | "completed";

export type MemberDoc = {
  name: string;
  kind: "firm_offer" | "proforma" | "sales_contract";
  status: string;
  updated: string;
  href: string;
};

export type MemberTrade = {
  id: string;
  ref: string;
  product: string;
  detail: string;
  quantityMt: number | null;
  route: string;
  stage: MemberStage;
  stageLabel: string;
  stageNote: string;
  shipment: string;
  shipmentNote: string;
  payment: string;
  paymentNote: string;
  documents: MemberDoc[];
  terms: { label: string; value: string }[];
  updates: { when: string; text: string }[];
  updatedAt: string;
};

export const MEMBER_STAGES: { stage: MemberStage; label: string }[] = [
  { stage: "quote", label: "Quote" },
  { stage: "confirmed", label: "Confirmed" },
  { stage: "completed", label: "Completed" },
];
