import type { Plan } from "@/lib/session-shared";

export const PLAN_ORDER: Plan[] = ["core", "growth", "enterprise"];

export const PLAN_PRICE: Record<Plan, string> = { core: "$99 / month", growth: "$249 / month", enterprise: "Tailored" };

export const PLAN_PITCH: Record<Plan, string> = {
  core: "The AQ1 hub, the calculators and Aquibot, with monthly allowances that suit occasional buyers.",
  growth: "AQ Analytics for teams that buy every month: the full wire, market data, signals and alerts.",
  enterprise: "Everything, with unlimited allowances, freight analytics and supply and demand balances.",
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
