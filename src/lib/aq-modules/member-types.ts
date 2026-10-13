import type { BillingCycle, MembershipTier } from "@/lib/aq-modules/membership";
import type { NitrogenBrief, StoredNitrogenAnswers } from "@/lib/nitrogen/engine";
import type { Plan } from "@/lib/session-shared";
import type { Persona, TelexProduct } from "@/lib/aq-modules/types";

export type NitrogenReport = {
  id: string;
  refNo: string;
  at: string;
  userId: string;
  email: string;
  /** Who the report is addressed to: the member's company or name at the time (first name on older reports, missing on the oldest). */
  preparedFor?: string;
  answers: StoredNitrogenAnswers;
  reportMd: string;
  /** The brief as written when the report was generated. Older reports rebuild it from their answers. */
  brief?: NitrogenBrief;
  /** Who wrote the brief's wording: Gemini following the admin prompt, or the desk rules. */
  writer?: "ai" | "desk";
  model?: string;
  /** Knowledge-base sources the AI was given when writing, by title. For the desk, not shown to members. */
  knowledge?: string[];
};

export type CallRegistration = {
  id: string;
  at: string;
  callId: string;
  userId: string;
  email: string;
  name: string;
  company: string;
  country: string;
  question: string;
  reminders: boolean;
  status: "registered" | "cancelled";
  updatedAt: string | null;
};

export type MemberAlert = {
  id: string;
  at: string;
  userId: string;
  email: string;
  seriesId: string;
  direction: "above" | "below";
  threshold: number;
  note: string;
  active: boolean;
  /** Date of the price point that last met the condition. */
  lastTriggered: string | null;
};

/** One row per member; the id is the account id. */
export type MemberPrefs = {
  id: string;
  at: string;
  userId: string;
  email: string;
  telexProducts: TelexProduct[];
  persona: Persona;
  signalWindow: number;
  briefProducts: string[];
  briefByEmail: boolean;
};

export const REQUEST_STATUSES = ["new", "contacted", "done"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export type MembershipRequest = {
  id: string;
  at: string;
  userId: string;
  email: string;
  name: string;
  company: string;
  currentPlan: Plan;
  requestedPlan: Plan;
  /** AQ Zero Sprout, AQ Zero Harvest or AQ Zero Scale when the request is for AQ ZERO membership. */
  tier?: MembershipTier | null;
  cycle?: BillingCycle | null;
  /** The locked module that sent them here, if any. */
  source: string;
  message: string;
  status: RequestStatus;
  adminNote: string;
  updatedAt: string | null;
};
