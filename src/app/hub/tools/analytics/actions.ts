"use server";

import { revalidatePath } from "next/cache";
import { estimateLane } from "@/lib/aq-analytics/queries";
import { updateAqAnalytics } from "@/lib/aq-analytics/store";
import type { LaneEstimate, LaneEstimateInput } from "@/lib/aq-analytics/contracts";
import { isAdminUser } from "@/lib/admin-access";
import { getSession } from "@/lib/session";

async function requirePreview() {
  const user = await getSession();
  if (!user) throw new Error("Sign in to use AQ Trader Tools.");
  if (!isAdminUser(user)) throw new Error("AQ Analytics is not on this account yet.");
  return user;
}

function refresh() {
  revalidatePath("/hub/tools/analytics", "layout");
}

export async function saveHubMarketsAction(form: FormData) {
  await requirePreview();
  const countries = String(form.get("countries") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const originCountries = String(form.get("originCountries") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const products = String(form.get("products") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const alertTypes = form.getAll("alertTypes").map(String);
  const channels = form.getAll("channels").map(String);
  if (!channels.length) throw new Error("Keep at least one alert channel.");
  const timing = String(form.get("timing") ?? "instant");
  await updateAqAnalytics((state) => ({
    ...state,
    markets: {
      ...state.markets,
      countries: countries.length ? countries : state.markets.countries,
      originCountries: originCountries.length ? originCountries : state.markets.originCountries,
      products: products.length ? products : state.markets.products,
      alertTypes: alertTypes.length ? alertTypes : state.markets.alertTypes,
      channels,
      timing: timing === "daily" || timing === "weekly" ? timing : "instant",
      reportEmail: form.get("reportEmail") === "on",
    },
  }));
  refresh();
}

export async function addHubScheduleAction(form: FormData) {
  await requirePreview();
  const name = String(form.get("name") ?? "").trim();
  const cadence = String(form.get("cadence") ?? "").trim();
  const market = String(form.get("market") ?? "").trim();
  if (!name || !cadence || !market) throw new Error("Name, cadence and market are required.");
  await updateAqAnalytics((state) => ({
    ...state,
    schedules: [...state.schedules, { id: `sch-${Date.now()}`, name, cadence, market, active: true }],
  }));
  refresh();
}

export async function requestHubAccessAction(form: FormData) {
  const user = await requirePreview();
  const plan = String(form.get("plan") ?? "premium").trim();
  const message = String(form.get("message") ?? "").trim();
  const company = String(form.get("company") ?? "").trim();
  await updateAqAnalytics((state) => ({
    ...state,
    accessRequests: [
      { id: `req-${Date.now()}`, plan, name: user.name || user.email, email: user.email, company, message, at: new Date().toISOString() },
      ...state.accessRequests,
    ],
  }));
  refresh();
}

export async function estimateHubLaneAction(input: LaneEstimateInput): Promise<{ ok: true; data: LaneEstimate } | { ok: false; message: string }> {
  await requirePreview();
  try {
    return { ok: true, data: await estimateLane(input) };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Could not price that lane." };
  }
}
