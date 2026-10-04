import { MEMBERSHIP_OFFERS, type MembershipOffer } from "@/lib/aq-modules/membership";

export type ZeroProgrammeId = MembershipOffer["id"];

/** The membership offers shown on the Aquifert Zero tab. */
export const ZERO_PROGRAMMES = MEMBERSHIP_OFFERS.map((offer) => ({
  id: offer.id,
  name: offer.name,
  tagline: offer.tagline,
  features: offer.features,
  missing: offer.missing,
  popular: offer.popular ?? false,
}));

export const isZeroProgramme = (value: unknown): value is ZeroProgrammeId => ZERO_PROGRAMMES.some((item) => item.id === value);

export const programmeName = (id: string | null | undefined) => ZERO_PROGRAMMES.find((item) => item.id === id)?.name ?? "";

export const ZERO_INTENTS = ["waitlist", "call"] as const;
export type ZeroIntent = (typeof ZERO_INTENTS)[number];

export const isZeroIntent = (value: unknown): value is ZeroIntent => ZERO_INTENTS.includes(value as ZeroIntent);

export const ZERO_INTENT_LABEL: Record<ZeroIntent, string> = {
  waitlist: "Join the waitlist",
  call: "Book a call for early discounted access",
};

export const ZERO_INTENT_SHORT: Record<ZeroIntent, string> = { waitlist: "Waitlist", call: "Call request" };

/** What the member is told happens next, in the confirmation email and on screen. */
export const ZERO_NEXT_STEP: Record<ZeroIntent, string> = {
  waitlist: "You are on the Aquifert Zero waitlist. We will get back to you as soon as Aquifert Zero is live.",
  call: "The desk will email you to confirm a call time. Early callers get discounted access when Aquifert Zero goes live.",
};

export const CALL_WINDOWS = ["Morning (09:00–12:00)", "Afternoon (12:00–17:00)", "Evening (17:00–20:00)"] as const;

export const ZERO_STATUSES = ["new", "contacted", "scheduled", "offered", "declined"] as const;
export type ZeroStatus = (typeof ZERO_STATUSES)[number];

export const ZERO_STATUS_LABEL: Record<ZeroStatus, string> = {
  new: "New",
  contacted: "Contacted",
  scheduled: "Call booked",
  offered: "Slot offered",
  declined: "Not a fit",
};

/** Registrations saved before members chose between the waitlist and a call were waitlist sign-ups. */
export const intentOf = (row: { intent?: ZeroIntent }): ZeroIntent => row.intent ?? "waitlist";

export type ZeroRegistration = {
  id: string;
  at: string;
  userId: string;
  name: string;
  email: string;
  company: string;
  /** Missing on registrations made before members picked a programme. */
  programme?: ZeroProgrammeId;
  /** Missing on registrations made before the waitlist or call choice existed. */
  intent?: ZeroIntent;
  phone?: string;
  /** Preferred call day as YYYY-MM-DD, when the member asked for a call. */
  callDate?: string;
  callWindow?: string;
  timezone?: string;
  annualVolume: string;
  product: string;
  notes: string;
  status: ZeroStatus;
  adminNote: string;
  updatedAt: string | null;
};
