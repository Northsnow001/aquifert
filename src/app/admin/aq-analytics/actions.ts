"use server";

import { revalidatePath } from "next/cache";
import { isAdminUser } from "@/lib/admin-access";
import { estimateLane } from "@/lib/aq-analytics/queries";
import { updateAqAnalytics } from "@/lib/aq-analytics/store";
import type { LaneEstimate, LaneEstimateInput } from "@/lib/aq-analytics/contracts";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) throw new Error("Admin only.");
  return user;
}

function refresh() {
  revalidatePath("/admin/aq-analytics", "layout");
}

export async function saveMarketsAction(form: FormData) {
  await requireAdmin();
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

export async function addScheduleAction(form: FormData) {
  await requireAdmin();
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

export async function recordReportRunAction(market: string, period: string) {
  await requireAdmin();
  await updateAqAnalytics((state) => ({
    ...state,
    runs: [
      { id: `run-${Date.now()}`, name: `${market} brief`, market, period, at: new Date().toISOString() },
      ...state.runs,
    ].slice(0, 40),
  }));
  refresh();
}

export async function requestAccessAction(form: FormData) {
  await requireAdmin();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const company = String(form.get("company") ?? "").trim();
  const message = String(form.get("message") ?? "").trim();
  const plan = String(form.get("plan") ?? "premium").trim();
  if (!name || !email.includes("@")) throw new Error("Name and a valid email are required.");
  await updateAqAnalytics((state) => ({
    ...state,
    accessRequests: [
      { id: `req-${Date.now()}`, plan, name, email, company, message, at: new Date().toISOString() },
      ...state.accessRequests,
    ],
  }));
  refresh();
}

export async function estimateLaneAction(input: LaneEstimateInput): Promise<{ ok: true; data: LaneEstimate } | { ok: false; message: string }> {
  await requireAdmin();
  try {
    return { ok: true, data: await estimateLane(input) };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Could not price that lane." };
  }
}
