import type { Plan } from "@/lib/session-shared";

export const PLAN_ORDER: Plan[] = ["core", "growth", "enterprise"];

export const PLAN_PRICE: Record<Plan, string> = { core: "Free", growth: "£299 / month", enterprise: "From £2,000 / month" };

export const PLAN_PITCH: Record<Plan, string> = {
  core: "The free AQ ONE plan: the hub, Telex, analysis, AQ Signal, the library, the calculators and Aquibot.",
  growth: "Analytics and licensed market data with no physical trading: the full wire, market data, signals, freight and alerts.",
  enterprise: "Sprout, Harvest or Scale membership. One flat fee replaces the margin on every quote, with every AQ Analytics module.",
};

export type Allowances = { nitrogen: number; saved: number; freight: number; netback: number; aquibot: number };

export const ALLOWANCE_LABEL: Record<keyof Allowances, string> = {
  nitrogen: "Nitrogen reports a month",
  saved: "Saved reports kept",
  freight: "Freight calculator runs a month",
  netback: "Netback calculations a month",
  aquibot: "Aquibot questions a month",
};

export const isPlan = (value: unknown): value is Plan => value === "core" || value === "growth" || value === "enterprise";

/** 0 means unlimited everywhere in the plan settings. */
export const amount = (limit: number) => (limit > 0 ? limit.toLocaleString("en-GB") : "Unlimited");

/** `2026-10-01` or an ISO timestamp to `1 Oct`. */
export function shortDay(value: string) {
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function longDay(value: string) {
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
