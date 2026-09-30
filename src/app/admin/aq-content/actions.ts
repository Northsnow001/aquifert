"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DEFAULT_AUTHOR, type AnalysisInput, type BalanceInput, type BriefingInput } from "@/components/admin/aq-content/options";
import { isAdminUser } from "@/lib/admin-access";
import { getAqModules, updateAqModules } from "@/lib/aq-modules/store";
import { MODULES, type AccessRules, type Aq1Limits, type AnalysisNote, type BalanceRow, type BriefingIssue, type PlanLimits, type PublishState, type Trend } from "@/lib/aq-modules/types";
import { newId, slugify } from "@/lib/content-types";
import { getSession } from "@/lib/session";
import type { Plan } from "@/lib/session-shared";

async function requireAdmin() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) redirect("/login");
  return user;
}

type Fail = { ok: false; message: string };

const PLANS: Plan[] = ["core", "growth", "enterprise"];
const STATES: PublishState[] = ["published", "draft"];
const TRENDS: Trend[] = ["up", "down", "flat"];
const STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_LIMIT = 100_000;

const fail = (message: string): Fail => ({ ok: false, message });
const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const list = (value: unknown, max = 40) =>
  Array.from(new Set((Array.isArray(value) ? value : []).map((item) => text(item, 80)).filter(Boolean))).slice(0, max);

function refresh() {
  revalidatePath("/hub", "layout");
  revalidatePath("/admin", "layout");
}

function planLimits(raw: PlanLimits | undefined): PlanLimits | null {
  if (!raw) return null;
  const out = {} as PlanLimits;
  for (const plan of PLANS) {
    const value = Number(raw[plan]);
    if (!Number.isInteger(value) || value < 0 || value > MAX_LIMIT) return null;
    out[plan] = value;
  }
  return out;
}

export async function saveAqAccess(input: { access: AccessRules; limits: Aq1Limits }): Promise<{ ok: true; savedAt: string | null } | Fail> {
  await requireAdmin();
  const access = {} as AccessRules;
  for (const item of MODULES) {
    const plan = input.access?.[item.key];
    if (!PLANS.includes(plan)) return fail(`Choose a plan for ${item.label}.`);
    access[item.key] = plan;
  }
  const nitrogenReports = planLimits(input.limits?.nitrogenReports);
  const savedReports = planLimits(input.limits?.savedReports);
  if (!nitrogenReports || !savedReports) return fail("Allowances must be whole numbers of 0 or more.");
  const saved = await updateAqModules((modules) => {
    modules.access = { ...access };
    modules.limits = { nitrogenReports: { ...nitrogenReports }, savedReports: { ...savedReports } };
  });
  refresh();
  return { ok: true, savedAt: saved.updatedAt };
}

export async function saveAnalysisNote(input: AnalysisInput): Promise<{ ok: true; id: string; slug: string } | Fail> {
  await requireAdmin();
  const title = text(input.title, 200);
  if (!title) return fail("Give the note a title.");
  const slug = slugify(text(input.slug, 120) || title).replace(/^-+|-+$/g, "");
  if (!slug) return fail("The slug needs at least one letter or number.");
  const body = String(input.body ?? "").trim().slice(0, 60_000);
  if (!body) return fail("Write the note before saving.");
  if (!STATES.includes(input.status)) return fail("Choose Draft or Published.");
  const publishedAt = text(input.publishedAt, 16);
  if (!STAMP.test(publishedAt)) return fail("Set a valid publish time.");

  const id = text(input.id, 80) || newId("an");
  const note: AnalysisNote = {
    id,
    slug,
    title,
    body,
    products: list(input.products),
    regions: list(input.regions),
    status: input.status,
    author: text(input.author, 80) || DEFAULT_AUTHOR,
    publishedAt,
    relatedTelexIds: list(input.relatedTelexIds, 50),
  };

  const current = await getAqModules();
  if (input.id && !current.analysis.some((item) => item.id === id)) return fail("That note no longer exists.");
  if (current.analysis.some((item) => item.id !== id && item.slug === slug)) return fail("Another note already uses that slug.");

  const outcome = { problem: "" };
  await updateAqModules((modules) => {
    outcome.problem = "";
    if (modules.analysis.some((item) => item.id !== id && item.slug === slug)) {
      outcome.problem = "Another note already uses that slug.";
      return;
    }
    const index = modules.analysis.findIndex((item) => item.id === id);
    if (index >= 0) modules.analysis[index] = { ...note };
    else if (input.id) outcome.problem = "That note no longer exists.";
    else modules.analysis.unshift({ ...note });
  });
  if (outcome.problem) return fail(outcome.problem);
  refresh();
  return { ok: true, id, slug };
}

export async function deleteAnalysisNote(id: string): Promise<{ ok: true } | Fail> {
  await requireAdmin();
  const outcome = { found: false };
  await updateAqModules((modules) => {
    outcome.found = modules.analysis.some((item) => item.id === id);
    modules.analysis = modules.analysis.filter((item) => item.id !== id);
  });
  if (!outcome.found) return fail("That note no longer exists.");
  refresh();
  return { ok: true };
}

export async function saveBriefingIssue(input: BriefingInput): Promise<{ ok: true; id: string } | Fail> {
  await requireAdmin();
  const title = text(input.title, 200);
  if (!title) return fail("Give the issue a title.");
  const date = text(input.date, 10);
  if (!DAY.test(date)) return fail("Set a valid issue date.");
  const body = String(input.body ?? "").trim().slice(0, 60_000);
  if (!body) return fail("Write the issue before saving.");
  if (!STATES.includes(input.status)) return fail("Choose Draft or Published.");

  const id = text(input.id, 80) || newId("brief");
  const issue: BriefingIssue = { id, title, date, summary: text(input.summary, 600), body, status: input.status };

  const outcome = { problem: "" };
  await updateAqModules((modules) => {
    outcome.problem = "";
    const index = modules.briefings.findIndex((item) => item.id === id);
    if (index >= 0) modules.briefings[index] = { ...issue };
    else if (input.id) outcome.problem = "That issue no longer exists.";
    else modules.briefings.unshift({ ...issue });
  });
  if (outcome.problem) return fail(outcome.problem);
  refresh();
  return { ok: true, id };
}

export async function deleteBriefingIssue(id: string): Promise<{ ok: true } | Fail> {
  await requireAdmin();
  const outcome = { found: false };
  await updateAqModules((modules) => {
    outcome.found = modules.briefings.some((item) => item.id === id);
    modules.briefings = modules.briefings.filter((item) => item.id !== id);
  });
  if (!outcome.found) return fail("That issue no longer exists.");
  refresh();
  return { ok: true };
}

export async function saveSupplyDemand(input: { balances: BalanceInput[]; commentary: string }): Promise<{ ok: true; updatedAt: string } | Fail> {
  await requireAdmin();
  const rows = Array.isArray(input.balances) ? input.balances : [];
  if (rows.length > 200) return fail("Keep the table to 200 rows or fewer.");
  const balances: BalanceRow[] = [];
  for (const [index, row] of rows.entries()) {
    const product = text(row.product, 80);
    if (!product) return fail(`Row ${index + 1} needs a product.`);
    const numbers = {} as Pick<BalanceRow, "production" | "consumption" | "imports" | "exports" | "stocks">;
    for (const key of ["production", "consumption", "imports", "exports", "stocks"] as const) {
      const value = Number(row[key]);
      if (!Number.isFinite(value) || value < 0) return fail(`Row ${index + 1}: ${key} must be a number of 0 or more.`);
      numbers[key] = value;
    }
    balances.push({
      id: text(row.id, 80) || newId("sd"),
      product,
      region: text(row.region, 80),
      season: text(row.season, 40),
      unit: text(row.unit, 20) || "Mt",
      ...numbers,
      trend: TRENDS.includes(row.trend) ? row.trend : "flat",
      note: text(row.note, 400),
    });
  }
  const commentary = String(input.commentary ?? "").trim().slice(0, 20_000);
  const updatedAt = new Date().toISOString();
  await updateAqModules((modules) => {
    modules.supplyDemand = { balances: balances.map((row) => ({ ...row })), commentary, updatedAt };
  });
  refresh();
  return { ok: true, updatedAt };
}
