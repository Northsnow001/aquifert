"use server";

import { revalidatePath } from "next/cache";
import { getHubAccess } from "@/lib/aq-modules/access";
import { addAlert, deleteAlert, listAlerts, savePrefs, updateAlert } from "@/lib/aq-modules/members";
import { SERIES_GROUPS } from "@/lib/aq-modules/types";
import { MAX_ALERTS } from "@/components/hub/analytics/format";

type Result = { ok: true; message?: string } | { ok: false; message: string };

const failed = (error: unknown, what: "Alerts" | "Brief preferences"): Result => ({
  ok: false,
  message: error instanceof Error && /table is missing/i.test(error.message) ? `${what} need the latest database update. Ask the desk to run it.` : "That did not save. Try again in a moment.",
});

function refresh() {
  revalidatePath("/hub/analytics/alerts");
  revalidatePath("/hub/analytics/briefing", "layout");
  revalidatePath("/hub/dashboard");
}

export async function createAlert(input: { seriesId: string; direction: string; threshold: number; note: string }): Promise<Result> {
  const { user, modules, can } = await getHubAccess();
  if (!can("alerts")) return { ok: false, message: "Alerts are not included in your plan yet." };
  const series = modules.series.find((item) => item.id === String(input?.seriesId ?? ""));
  if (!series) return { ok: false, message: "Choose a price series." };
  const direction = input.direction === "above" || input.direction === "below" ? input.direction : null;
  if (!direction) return { ok: false, message: "Choose above or below." };
  const threshold = Number(input.threshold);
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1_000_000) return { ok: false, message: "Enter a threshold price greater than zero." };
  const note = String(input.note ?? "").trim().slice(0, 200);
  try {
    const mine = await listAlerts(user);
    if (mine.length >= MAX_ALERTS) return { ok: false, message: `You have ${MAX_ALERTS} alerts, the most a member can hold. Delete one to add another.` };
    if (mine.some((item) => item.seriesId === series.id && item.direction === direction && item.threshold === threshold)) return { ok: false, message: "You already have this alert." };
    await addAlert(user, { seriesId: series.id, direction, threshold: Math.round(threshold * 100) / 100, note });
  } catch (error) {
    return failed(error, "Alerts");
  }
  refresh();
  return { ok: true, message: `Alert set: ${series.label} ${series.basis} ${direction} ${threshold} ${series.unit}.` };
}

export async function toggleAlert(id: string, active: boolean): Promise<Result> {
  const { user, can } = await getHubAccess();
  if (!can("alerts")) return { ok: false, message: "Alerts are not included in your plan yet." };
  if (typeof id !== "string" || !id) return { ok: false, message: "That alert no longer exists." };
  try {
    const row = await updateAlert(user, id, { active: Boolean(active) });
    if (!row) return { ok: false, message: "That alert no longer exists." };
  } catch (error) {
    return failed(error, "Alerts");
  }
  refresh();
  return { ok: true, message: active ? "Alert switched on." : "Alert paused." };
}

export async function removeAlert(id: string): Promise<Result> {
  const { user, can } = await getHubAccess();
  if (!can("alerts")) return { ok: false, message: "Alerts are not included in your plan yet." };
  if (typeof id !== "string" || !id) return { ok: false, message: "That alert no longer exists." };
  try {
    if (!(await deleteAlert(user, id))) return { ok: false, message: "That alert no longer exists." };
  } catch (error) {
    return failed(error, "Alerts");
  }
  refresh();
  return { ok: true, message: "Alert deleted." };
}

export async function saveBriefPrefs(products: string[]): Promise<Result> {
  const { user, can } = await getHubAccess();
  if (!can("alerts")) return { ok: false, message: "The brief is not included in your plan yet." };
  const clean = SERIES_GROUPS.filter((group) => Array.isArray(products) && products.includes(group));
  try {
    await savePrefs(user, { briefProducts: clean });
  } catch (error) {
    return failed(error, "Brief preferences");
  }
  refresh();
  return { ok: true, message: clean.length ? `Your brief covers ${clean.join(", ")}.` : "Your brief covers every product." };
}

export async function saveBriefEmail(enabled: boolean): Promise<Result> {
  const { user, can } = await getHubAccess();
  if (!can("briefing") && !can("alerts")) return { ok: false, message: "The Briefing is not included in your plan yet." };
  try {
    await savePrefs(user, { briefByEmail: Boolean(enabled) });
  } catch (error) {
    return failed(error, "Brief preferences");
  }
  refresh();
  return { ok: true, message: enabled ? `Saved. Each issue will go to ${user.email} once email delivery is switched on for your account.` : "Email copies switched off." };
}
