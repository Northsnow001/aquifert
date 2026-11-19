import "server-only";

import { cache } from "react";
import { readDocument, updateDocument } from "@/lib/data/documents";
import { seedAqAnalytics } from "@/lib/aq-analytics/seed";
import type { AqAnalyticsState } from "@/lib/aq-analytics/types";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function fromStored(raw: unknown): AqAnalyticsState {
  const seed = seedAqAnalytics();
  if (!isRecord(raw) || raw.version !== 1) return seed;
  const value = raw as Partial<AqAnalyticsState>;
  return {
    ...seed,
    ...value,
    version: 1,
    imports: Array.isArray(value.imports) && value.imports.length ? value.imports : seed.imports,
    orders: Array.isArray(value.orders) && value.orders.length ? value.orders : seed.orders,
    lineups: Array.isArray(value.lineups) && value.lineups.length ? value.lineups : seed.lineups,
    producers: Array.isArray(value.producers) && value.producers.length ? value.producers : seed.producers,
    profiles: Array.isArray(value.profiles) && value.profiles.length ? value.profiles : seed.profiles,
    view: Array.isArray(value.view) && value.view.length ? value.view : seed.view,
    markets: value.markets ?? seed.markets,
    schedules: Array.isArray(value.schedules) ? value.schedules : seed.schedules,
    runs: Array.isArray(value.runs) ? value.runs : seed.runs,
    accessRequests: Array.isArray(value.accessRequests) ? value.accessRequests : [],
  };
}

export const getAqAnalytics = cache(async () => fromStored(await readDocument("aq-analytics")));

export async function updateAqAnalytics(change: (state: AqAnalyticsState) => AqAnalyticsState) {
  return updateDocument("aq-analytics", (raw) => change(fromStored(raw)));
}
