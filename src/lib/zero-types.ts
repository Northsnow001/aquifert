import { MEMBERSHIP_OFFERS, type MembershipOffer } from "@/lib/aq-modules/membership";

export type ZeroProgrammeId = MembershipOffer["id"];

const withAq = (text: string) => text.replace(/\b(Sprout|Harvest|Scale)\b/g, "AQ $1");

/** The membership offers shown on the Aquifert Zero tab: same cards, AQ names, no prices. */
export const ZERO_PROGRAMMES = MEMBERSHIP_OFFERS.map((offer) => ({
  id: offer.id,
  name: offer.name.startsWith("AQ ") ? offer.name : `AQ ${offer.name}`,
  tagline: offer.tagline,
  features: offer.features.map(withAq),
  missing: offer.missing,
  popular: offer.popular ?? false,
}));

export const isZeroProgramme = (value: unknown): value is ZeroProgrammeId => ZERO_PROGRAMMES.some((item) => item.id === value);

export const programmeName = (id: string | null | undefined) => ZERO_PROGRAMMES.find((item) => item.id === id)?.name ?? "";

export const ZERO_STATUSES = ["new", "contacted", "offered", "declined"] as const;
export type ZeroStatus = (typeof ZERO_STATUSES)[number];

export const ZERO_STATUS_LABEL: Record<ZeroStatus, string> = {
  new: "New",
  contacted: "Contacted",
  offered: "Slot offered",
  declined: "Not a fit",
};

export type ZeroRegistration = {
  id: string;
  at: string;
  userId: string;
  name: string;
  email: string;
  company: string;
  /** Missing on registrations made before members picked a programme. */
  programme?: ZeroProgrammeId;
  annualVolume: string;
  product: string;
  notes: string;
  status: ZeroStatus;
  adminNote: string;
  updatedAt: string | null;
};
