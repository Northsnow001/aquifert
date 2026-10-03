import type { BillingCycle, MembershipTier } from "@/lib/aq-modules/membership";
import type { NitrogenAnswers } from "@/lib/nitrogen/engine";
import type { Plan } from "@/lib/session-shared";
import type { Persona, TelexProduct } from "@/lib/aq-modules/types";

export type NitrogenReport = {
  id: string;
  refNo: string;
  at: string;
  userId: string;
  email: string;
  /** Member's first name at the time; reports saved earlier lack it. */
  preparedFor?: string;
  answers: NitrogenAnswers;
  reportMd: string;
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
  /** Sprout, Harvest or Scale when the request is for AQ ZERO membership. */
  tier?: MembershipTier | null;
  cycle?: BillingCycle | null;
  /** The locked module that sent them here, if any. */
  source: string;
  message: string;
  status: RequestStatus;
  adminNote: string;
  updatedAt: string | null;
};
