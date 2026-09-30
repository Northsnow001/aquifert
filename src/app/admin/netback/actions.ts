"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import { NETBACK_CONSTANTS, type NetbackCosts } from "@/lib/netback/calculate";
import { parseNitrogenFile, selectBenchmarks } from "@/lib/netback-desk/parse";
import { deleteNetbackLogs, pruneNetbackLogs, updateNetbackDesk } from "@/lib/netback-desk/store";
import { DEFAULT_NETBACK_SETTINGS, DEFAULT_WEEK, DUTY_TONES, seedBenchmarks, type DutyRecord, type NetbackDesk, type NetbackSettings } from "@/lib/netback-desk/types";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) redirect("/login");
  return user;
}

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/hub", "layout");
}

type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};
const cleanDate = (value: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "")) ? String(value) : "");
const cleanWeek = (value: unknown) => String(value ?? "").replace(/[^0-9]/g, "").slice(0, 2);

/** Records the current prices for this week, replacing an earlier save of the same week. */
function snapshot(desk: NetbackDesk) {
  const entry = { week: desk.week, date: desk.date, savedAt: new Date().toISOString(), prices: Object.fromEntries(desk.benchmarks.map((item) => [item.key, item.fob])) };
  const last = desk.history.at(-1);
  const kept = last && last.week === entry.week && last.date === entry.date ? desk.history.slice(0, -1) : desk.history;
  desk.history = [...kept, entry].slice(-52);
}

/** Keeps the prices being replaced when nothing has been recorded yet, so the first change has something to compare against. */
function keepOutgoing(desk: NetbackDesk) {
  if (!desk.history.length) snapshot(desk);
}

export type PricingInput = { week: string; date: string; prices: Record<string, { fob: number; active: boolean }> };

export async function savePricing(input: PricingInput): Promise<Result<{ savedAt: string }>> {
  await requireAdmin();
  const date = cleanDate(input.date);
  if (!date) return { ok: false, message: "Enter the data date as a full date." };
  const desk = updateNetbackDesk((draft) => {
    keepOutgoing(draft);
    draft.week = cleanWeek(input.week);
    draft.date = date;
    draft.benchmarks = draft.benchmarks.map((item) => {
      const next = input.prices?.[item.key];
      if (!next) return item;
      const fob = Math.round(clamp(next.fob, 0, 5000, item.fob) * 100) / 100;
      return { ...item, fob, active: Boolean(next.active), ...(fob !== item.fob ? { source: "manual" as const } : {}) };
    });
    snapshot(draft);
  });
  refresh();
  return { ok: true, savedAt: desk.updatedAt };
}

export async function applyPriceFile(input: { text: string; fileName: string }): Promise<Result<{ applied: number; week: string; date: string }>> {
  await requireAdmin();
  const text = String(input.text ?? "");
  if (text.length > 2_000_000) return { ok: false, message: "That file is too large for a weekly price list." };
  const parsed = parseNitrogenFile(text);
  if (!parsed.rows.length) return { ok: false, message: "No price rows matched the weekly nitrogen format." };
  const matches = selectBenchmarks(parsed.rows);
  const applied = Object.keys(matches).length;
  if (!applied) return { ok: false, message: "The file has prices, but none are FOB urea rows for the nine benchmark origins." };
  const date = cleanDate(parsed.priceDate);
  const desk = updateNetbackDesk((draft) => {
    keepOutgoing(draft);
    draft.benchmarks = draft.benchmarks.map((item) => {
      const match = matches[item.key];
      return match ? { ...item, fob: match.mid, low: match.low || null, high: match.high || null, series: match.series, product: match.product, source: "file" as const } : item;
    });
    if (parsed.week) draft.week = cleanWeek(parsed.week);
    if (date) draft.date = date;
    draft.priceFile = {
      fileName: String(input.fileName ?? "").trim().slice(0, 160) || "Pasted price list",
      uploadedAt: new Date().toISOString(),
      week: parsed.week,
      year: parsed.year,
      priceDate: parsed.priceDate,
      lineCount: parsed.lineCount,
      rawLength: parsed.rawLength,
      rows: parsed.rows,
    };
    snapshot(draft);
  });
  refresh();
  return { ok: true, applied, week: desk.week, date: desk.date };
}

export async function resetBenchmarks(): Promise<Result> {
  await requireAdmin();
  updateNetbackDesk((draft) => {
    draft.benchmarks = seedBenchmarks();
    draft.week = DEFAULT_WEEK.week;
    draft.date = DEFAULT_WEEK.date;
  });
  refresh();
  return { ok: true };
}

export async function saveDuties(records: DutyRecord[]): Promise<Result<{ duties: DutyRecord[]; savedAt: string }>> {
  await requireAdmin();
  const seen = new Set<string>();
  const duties: DutyRecord[] = [];
  for (const record of Array.isArray(records) ? records : []) {
    const country = String(record?.country ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
    if (!country) continue;
    const key = country.toLowerCase();
    if (seen.has(key)) return { ok: false, message: `${country} is listed twice. Keep one row per country.` };
    seen.add(key);
    duties.push({
      country,
      rate: Math.round(clamp(record.rate, 0, 50, 0) * 100) / 100,
      active: Boolean(record.active),
      afrmm: Boolean(record.afrmm),
      note: String(record.note ?? "").trim().slice(0, 600),
      tone: DUTY_TONES.some((tone) => tone.value === record.tone) ? record.tone : record.active ? "active" : "dim",
    });
  }
  duties.sort((a, b) => a.country.localeCompare(b.country));
  const desk = updateNetbackDesk((draft) => {
    draft.duties = duties;
  });
  refresh();
  return { ok: true, duties, savedAt: desk.updatedAt };
}

function cleanCosts(input: Partial<NetbackCosts>): NetbackCosts {
  const base = NETBACK_CONSTANTS;
  const money = (key: keyof NetbackCosts, max: number) => Math.round(clamp(input?.[key], 0, max, base[key]) * 100) / 100;
  return {
    discharge: money("discharge", 500),
    margin: money("margin", 500),
    inspection: money("inspection", 100),
    insurance: money("insurance", 100),
    bagged: money("bagged", 200),
    lcRate: clamp(input?.lcRate, 0, 0.5, base.lcRate),
    lcDays: Math.round(clamp(input?.lcDays, 0, 365, base.lcDays)),
    hireBase: Math.round(clamp(input?.hireBase, 100, 20_000, base.hireBase)),
    bunkerPrice: Math.round(clamp(input?.bunkerPrice, 100, 3000, base.bunkerPrice)),
    loadRate: Math.round(clamp(input?.loadRate, 500, 100_000, base.loadRate)),
    dischargeRate: Math.round(clamp(input?.dischargeRate, 500, 100_000, base.dischargeRate)),
    extraDays: clamp(input?.extraDays, 0, 30, base.extraDays),
    portAndAgency: Math.round(clamp(input?.portAndAgency, 0, 1_000_000, base.portAndAgency)),
    cargoPremium: money("cargoPremium", 200),
    seasonalPremium: money("seasonalPremium", 200),
    afrmmRate: clamp(input?.afrmmRate, 0, 0.5, base.afrmmRate),
    haulageLocal: money("haulageLocal", 500),
    haulageRegional: money("haulageRegional", 500),
    haulageRemote: money("haulageRemote", 500),
  };
}

export async function saveNetbackSettings(input: NetbackSettings): Promise<Result<{ settings: NetbackSettings; savedAt: string; pruned: number }>> {
  await requireAdmin();
  const base = DEFAULT_NETBACK_SETTINGS;
  const settings: NetbackSettings = {
    limitCore: Math.round(clamp(input.limitCore, 0, 100_000, base.limitCore)),
    limitGrowth: Math.round(clamp(input.limitGrowth, 0, 100_000, base.limitGrowth)),
    limitEnterprise: Math.round(clamp(input.limitEnterprise, 0, 100_000, base.limitEnterprise)),
    retentionDays: Math.round(clamp(input.retentionDays, 30, 3650, base.retentionDays)),
    costs: cleanCosts(input.costs),
  };
  const desk = updateNetbackDesk((draft) => {
    draft.settings = settings;
  });
  const pruned = pruneNetbackLogs(settings.retentionDays);
  refresh();
  return { ok: true, settings, savedAt: desk.updatedAt, pruned };
}

export async function removeNetbackLogs(ids: string[]): Promise<Result<{ count: number }>> {
  await requireAdmin();
  const list = Array.isArray(ids) ? ids.filter((id) => typeof id === "string").slice(0, 5000) : [];
  if (!list.length) return { ok: false, message: "Select at least one log." };
  const count = deleteNetbackLogs(list);
  refresh();
  return { ok: true, count };
}
