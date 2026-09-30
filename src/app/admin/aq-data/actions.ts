"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CALL_ZONES, wallToUtc } from "@/components/admin/aq-data/zones";
import { isAdminUser } from "@/lib/admin-access";
import { REQUEST_STATUSES, type RequestStatus } from "@/lib/aq-modules/member-types";
import { deleteMembershipRequest, updateMembershipRequest } from "@/lib/aq-modules/members";
import { parsePoints } from "@/lib/aq-modules/signal";
import { updateAqModules } from "@/lib/aq-modules/store";
import { SERIES_GROUPS, type CommunityCall, type MarketSeries, type PricePoint, type SeriesGroup } from "@/lib/aq-modules/types";
import { newId, slugify } from "@/lib/content-types";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) redirect("/login");
  return user;
}

type Result = { ok: true } | { ok: false; message: string };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const text = (value: unknown, max: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function refresh() {
  revalidatePath("/hub", "layout");
  revalidatePath("/admin", "layout");
}

function failure(error: unknown, fallback: string): Result {
  if (error instanceof Error && /table is missing/.test(error.message)) {
    return { ok: false, message: "That table is not in Supabase yet. Run supabase/migrations/005_aq_modules.sql in the SQL editor, then try again." };
  }
  return { ok: false, message: error instanceof Error ? error.message : fallback };
}

async function save(mutate: Parameters<typeof updateAqModules>[0], fallback: string): Promise<Result> {
  try {
    await updateAqModules(mutate);
  } catch (error) {
    return failure(error, fallback);
  }
  refresh();
  return { ok: true };
}

const byDate = (a: PricePoint, b: PricePoint) => a.date.localeCompare(b.date);

function upsertPoint(series: MarketSeries, point: PricePoint) {
  series.points = [...series.points.filter((item) => item.date !== point.date), point].sort(byDate);
}

/* ---------------- Market data ---------------- */

export async function saveWeeklyPrices(date: string, values: Record<string, number>): Promise<Result> {
  await requireAdmin();
  if (!DAY.test(String(date)) || Number.isNaN(Date.parse(date))) return { ok: false, message: "Choose the date these prices are for." };
  const entries = Object.entries(values ?? {}).filter(([, value]) => typeof value === "number" && Number.isFinite(value));
  if (!entries.length) return { ok: false, message: "Enter at least one price." };
  if (entries.some(([, value]) => value < 0)) return { ok: false, message: "Prices cannot be negative." };
  return save((modules) => {
    for (const [id, value] of entries) {
      const series = modules.series.find((item) => item.id === id);
      if (series) upsertPoint(series, { date, value });
    }
  }, "The prices could not be saved.");
}

type SeriesInput = { label: string; group: SeriesGroup; basis: string; unit: string };

function cleanSeries(input: SeriesInput): SeriesInput | string {
  const label = text(input?.label, 80);
  const basis = text(input?.basis, 80);
  const unit = text(input?.unit, 24) || "USD/t";
  if (!label) return "Give the series a name.";
  if (!(SERIES_GROUPS as readonly string[]).includes(input?.group)) return "Choose a group.";
  return { label, group: input.group, basis, unit };
}

export async function addSeries(input: SeriesInput): Promise<Result> {
  await requireAdmin();
  const clean = cleanSeries(input);
  if (typeof clean === "string") return { ok: false, message: clean };
  const base = slugify(`${clean.label} ${clean.basis}`) || newId("series");
  return save((modules) => {
    const taken = new Set(modules.series.map((item) => item.id));
    let id = base;
    for (let n = 2; taken.has(id); n += 1) id = `${base}-${n}`;
    modules.series.push({ id, ...clean, points: [] });
  }, "The series could not be added.");
}

export async function saveSeriesMeta(id: string, input: SeriesInput): Promise<Result> {
  await requireAdmin();
  const clean = cleanSeries(input);
  if (typeof clean === "string") return { ok: false, message: clean };
  return save((modules) => {
    const series = modules.series.find((item) => item.id === id);
    if (series) Object.assign(series, clean);
  }, "The series could not be saved.");
}

export async function deleteSeries(id: string): Promise<Result> {
  await requireAdmin();
  return save((modules) => {
    modules.series = modules.series.filter((item) => item.id !== id);
  }, "The series could not be deleted.");
}

export async function importSeriesPoints(id: string, pasted: string, mode: "merge" | "replace"): Promise<Result> {
  await requireAdmin();
  const { points } = parsePoints(String(pasted ?? "").slice(0, 200_000));
  if (!points.length) return { ok: false, message: "No lines read as a date and a price." };
  return save((modules) => {
    const series = modules.series.find((item) => item.id === id);
    if (!series) return;
    if (mode === "replace") series.points = points.map((point) => ({ ...point }));
    else for (const point of points) upsertPoint(series, { ...point });
  }, "The points could not be saved.");
}

/* ---------------- Community calls ---------------- */

export type CallInput = {
  id: string | null;
  topic: string;
  host: string;
  description: string;
  date: string;
  time: string;
  zone: string;
  durationMinutes: number;
  joinUrl: string;
  recordingUrl: string;
  status: CommunityCall["status"];
};

const url = (value: unknown) => {
  const raw = String(value ?? "").trim().slice(0, 500);
  return !raw || /^https?:\/\/\S+$/i.test(raw) ? raw : null;
};

export async function saveCall(input: CallInput): Promise<Result> {
  await requireAdmin();
  const topic = text(input?.topic, 140);
  if (!topic) return { ok: false, message: "Give the call a topic." };
  if (!CALL_ZONES.some((zone) => zone.value === input?.zone)) return { ok: false, message: "Choose the time zone the time is in." };
  const startsAt = wallToUtc(String(input?.date ?? ""), String(input?.time ?? ""), input.zone);
  if (!startsAt) return { ok: false, message: "Enter the date and start time." };
  const durationMinutes = Math.round(Number(input?.durationMinutes));
  if (!Number.isFinite(durationMinutes) || durationMinutes < 5 || durationMinutes > 480) return { ok: false, message: "Duration must be between 5 and 480 minutes." };
  const joinUrl = url(input?.joinUrl);
  const recordingUrl = url(input?.recordingUrl);
  if (joinUrl === null) return { ok: false, message: "The join link must start with https://." };
  if (recordingUrl === null) return { ok: false, message: "The recording link must start with https://." };
  const call: CommunityCall = {
    id: input.id || newId("call"),
    topic,
    host: text(input?.host, 80) || "Aquifert Desk",
    description: String(input?.description ?? "").trim().slice(0, 2000),
    startsAt,
    durationMinutes,
    joinUrl,
    recordingUrl,
    status: input?.status === "cancelled" ? "cancelled" : "scheduled",
  };
  return save((modules) => {
    const index = modules.calls.findIndex((item) => item.id === call.id);
    if (index >= 0) modules.calls[index] = { ...call };
    else modules.calls.push({ ...call });
  }, "The call could not be saved.");
}

export async function deleteCall(id: string): Promise<Result> {
  await requireAdmin();
  return save((modules) => {
    modules.calls = modules.calls.filter((item) => item.id !== id);
  }, "The call could not be deleted.");
}

/* ---------------- Membership requests ---------------- */

export async function saveMembershipRequest(id: string, input: { status: RequestStatus; adminNote: string }): Promise<Result> {
  await requireAdmin();
  if (!REQUEST_STATUSES.includes(input?.status)) return { ok: false, message: "Choose a status." };
  try {
    const row = await updateMembershipRequest(String(id), { status: input.status, adminNote: String(input.adminNote ?? "").trim().slice(0, 2000) });
    if (!row) return { ok: false, message: "That request no longer exists." };
  } catch (error) {
    return failure(error, "The request could not be saved.");
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function removeMembershipRequest(id: string): Promise<Result> {
  await requireAdmin();
  try {
    await deleteMembershipRequest(String(id));
  } catch (error) {
    return failure(error, "The request could not be deleted.");
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}
