"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import { refreshBdi, refreshBunkerPrices } from "@/lib/freight-desk/market";
import { cleanFixture, fixtureProblem } from "@/lib/freight-desk/parse";
import { clearFreightDebug as clearDebugLog, deleteCalcLogs, getFreightDesk, logFreightDebug, updateFreightDesk } from "@/lib/freight-desk/store";
import {
  DEFAULT_FREIGHT_SETTINGS,
  type BunkerHub,
  type Fixture,
  type FixtureBatch,
  type FixtureInput,
  type FixtureStatus,
  type FreightSettings,
} from "@/lib/freight-desk/types";
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

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};
const money = (value: unknown, max = 1000) => Math.round(clamp(value, 0, max, 0) * 100) / 100;

function cleanSettings(input: FreightSettings): FreightSettings {
  const base = DEFAULT_FREIGHT_SETTINGS;
  const premiums = (raw: Record<string, number>, keep: string[]) => {
    const out: Record<string, number> = {};
    for (const [label, value] of Object.entries(raw ?? {})) {
      const name = label.replace(/\s+/g, " ").trim().slice(0, 60);
      if (name) out[name] = money(value, 200);
    }
    for (const label of keep) if (!(label in out)) out[label] = 0;
    return out;
  };
  const cargo = premiums(input.cargoPremiums, []);
  return {
    limitCore: Math.round(clamp(input.limitCore, 0, 100_000, base.limitCore)),
    limitGrowth: Math.round(clamp(input.limitGrowth, 0, 100_000, base.limitGrowth)),
    limitEnterprise: Math.round(clamp(input.limitEnterprise, 0, 100_000, base.limitEnterprise)),
    showBunkerBar: Boolean(input.showBunkerBar),
    iranEnabled: Boolean(input.iranEnabled),
    iranPremium: money(input.iranPremium, 200),
    iranLabel: String(input.iranLabel ?? "").trim().slice(0, 60) || base.iranLabel,
    cargoPremiums: Object.keys(cargo).length ? cargo : { ...base.cargoPremiums },
    originPremiums: premiums(input.originPremiums, Object.keys(base.originPremiums)),
    seasonalPremium: money(input.seasonalPremium, 200),
    taper: {
      baseDistanceNm: Math.round(clamp(input.taper?.baseDistanceNm, 0, 30_000, base.taper.baseDistanceNm)),
      capeFloor: clamp(input.taper?.capeFloor, 0, 1, base.taper.capeFloor),
      capeSpanNm: Math.round(clamp(input.taper?.capeSpanNm, 1, 50_000, base.taper.capeSpanNm)),
      nonCapeFloor: clamp(input.taper?.nonCapeFloor, 0, 1, base.taper.nonCapeFloor),
      nonCapeSpanNm: Math.round(clamp(input.taper?.nonCapeSpanNm, 1, 50_000, base.taper.nonCapeSpanNm)),
    },
    fixtureMaxWeight: clamp(input.fixtureMaxWeight, 0, 1, base.fixtureMaxWeight),
    algoMinWeight: clamp(input.algoMinWeight, 0, 1, base.algoMinWeight),
  };
}

export async function saveFreightSettings(input: FreightSettings): Promise<{ ok: true; settings: FreightSettings; savedAt: string }> {
  await requireAdmin();
  const settings = cleanSettings(input);
  const desk = await updateFreightDesk((draft) => {
    draft.settings = settings;
  });
  refresh();
  return { ok: true, settings: desk.settings, savedAt: desk.updatedAt ?? now() };
}

export async function refreshBunkerNow(): Promise<Result<{ message: string }>> {
  await requireAdmin();
  const outcome = await refreshBunkerPrices();
  refresh();
  return outcome;
}

export async function saveBunkerPrices(prices: BunkerHub[]): Promise<Result> {
  await requireAdmin();
  const byCity = new Map(prices.map((hub) => [hub.city, Number(hub.price)]));
  if ([...byCity.values()].some((price) => !Number.isFinite(price) || price < 50 || price > 3000)) {
    return { ok: false, message: "Bunker prices must be between $50 and $3,000 per tonne." };
  }
  await updateFreightDesk((desk) => {
    desk.bunker = {
      ...desk.bunker,
      prices: desk.bunker.prices.map((hub) => ({ city: hub.city, price: Math.round((byCity.get(hub.city) ?? hub.price) * 100) / 100 })),
      manualAt: now(),
    };
  });
  refresh();
  return { ok: true };
}

export async function refreshBdiNow(): Promise<Result<{ message: string }>> {
  await requireAdmin();
  const outcome = await refreshBdi();
  refresh();
  return outcome;
}

export async function saveManualBdi(value: number, tradeDate: string): Promise<Result> {
  await requireAdmin();
  const bdi = Math.round(Number(value));
  if (!Number.isFinite(bdi) || bdi < 1 || bdi > 20_000) return { ok: false, message: "The BDI must be a whole number between 1 and 20,000." };
  if (tradeDate && !/^\d{4}-\d{2}-\d{2}$/.test(tradeDate)) return { ok: false, message: "Use a YYYY-MM-DD trade date." };
  await updateFreightDesk((desk) => {
    desk.bdi = { ...desk.bdi, value: bdi, tradeDate: tradeDate || null, source: "manual", manualAt: now() };
  });
  refresh();
  return { ok: true };
}

export async function saveFixture(input: FixtureInput, fixtureId?: string): Promise<Result<{ fixture: Fixture }>> {
  await requireAdmin();
  const clean = cleanFixture(input);
  const problem = fixtureProblem(clean);
  if (problem) return { ok: false, message: problem };
  const out: { fixture?: Fixture } = {};
  await updateFreightDesk((desk) => {
    const existing = fixtureId ? desk.fixtures.find((item) => item.id === fixtureId) : undefined;
    const stamp = now();
    const fixture: Fixture = existing
      ? { ...existing, ...clean, confidence: existing.origin === "manual" ? 1 : (clean.confidence ?? existing.confidence), excerpt: clean.excerpt || existing.excerpt, updatedAt: stamp }
      : { ...clean, id: id("fix"), origin: "manual", batchId: null, confidence: 1, excerpt: clean.excerpt ?? "", status: "active", createdAt: stamp, updatedAt: stamp };
    desk.fixtures = existing ? desk.fixtures.map((item) => (item.id === fixtureId ? fixture : item)) : [fixture, ...desk.fixtures];
    out.fixture = fixture;
  });
  refresh();
  return out.fixture ? { ok: true, fixture: out.fixture } : { ok: false, message: "Could not save the fixture." };
}

export async function setFixtureStatus(ids: string[], status: FixtureStatus): Promise<Result<{ count: number }>> {
  await requireAdmin();
  const selected = new Set(ids);
  let count = 0;
  await updateFreightDesk((desk) => {
    desk.fixtures = desk.fixtures.map((item) => {
      if (!selected.has(item.id) || item.status === status) return item;
      count += 1;
      return { ...item, status, updatedAt: now() };
    });
  });
  refresh();
  return { ok: true, count };
}

export async function deleteFixtures(ids: string[] | "all" | "imported"): Promise<Result<{ count: number }>> {
  await requireAdmin();
  let count = 0;
  await updateFreightDesk((desk) => {
    const selected = Array.isArray(ids) ? new Set(ids) : null;
    const keep = desk.fixtures.filter((item) => (selected ? !selected.has(item.id) : ids === "imported" ? item.origin === "manual" : false));
    count = desk.fixtures.length - keep.length;
    desk.fixtures = keep;
    const batchIds = new Set(keep.map((item) => item.batchId).filter(Boolean));
    desk.batches = desk.batches.filter((batch) => batchIds.has(batch.id));
  });
  refresh();
  return { ok: true, count };
}

export async function clearFixtureBatch(batchId: string): Promise<Result<{ count: number }>> {
  await requireAdmin();
  let count = 0;
  await updateFreightDesk((desk) => {
    const keep = desk.fixtures.filter((item) => item.batchId !== batchId);
    count = desk.fixtures.length - keep.length;
    desk.fixtures = keep;
    desk.batches = desk.batches.filter((batch) => batch.id !== batchId);
  });
  refresh();
  return { ok: true, count };
}

export async function importFixtures(rows: FixtureInput[], origin: FixtureBatch["origin"], label: string): Promise<Result<{ count: number; skipped: number; batchId: string }>> {
  await requireAdmin();
  if (!Array.isArray(rows) || !rows.length) return { ok: false, message: "There are no rows to import." };
  if (rows.length > 2000) return { ok: false, message: "Import up to 2,000 rows at a time." };
  const batchId = id(origin === "ai" ? "ai" : "csv");
  const stamp = now();
  const fixtures: Fixture[] = [];
  let skipped = 0;
  for (const row of rows) {
    const clean = cleanFixture(row);
    if (fixtureProblem(clean)) {
      skipped += 1;
      continue;
    }
    fixtures.push({ ...clean, id: id("fix"), origin, batchId, confidence: clean.confidence ?? 0.8, excerpt: clean.excerpt ?? "", status: "active", createdAt: stamp, updatedAt: stamp });
  }
  if (!fixtures.length) return { ok: false, message: "None of the rows had a route and a rate." };
  await updateFreightDesk((desk) => {
    desk.fixtures = [...fixtures, ...desk.fixtures];
    desk.batches = [{ id: batchId, origin, label: String(label ?? "").slice(0, 120) || (origin === "ai" ? "AI import" : "Pasted sheet"), count: fixtures.length, createdAt: stamp }, ...desk.batches].slice(0, 50);
  });
  await logFreightDebug("info", `${origin === "ai" ? "AI" : "Sheet"} fixtures imported`, { batch: batchId, imported: fixtures.length, skipped });
  refresh();
  return { ok: true, count: fixtures.length, skipped, batchId };
}

export async function deleteCalculationLogs(ids: string[]): Promise<Result<{ count: number }>> {
  await requireAdmin();
  const count = await deleteCalcLogs(ids.map(String));
  refresh();
  return { ok: true, count };
}

export async function clearFreightDebug(): Promise<Result> {
  await requireAdmin();
  await clearDebugLog();
  refresh();
  return { ok: true };
}

export async function lastExtractionRows() {
  await requireAdmin();
  return (await getFreightDesk()).lastExtraction;
}
