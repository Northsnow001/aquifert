import "server-only";

import { cache } from "react";
import { readDocument, updateDocument } from "@/lib/data/documents";
import {
  DEFAULT_ACCESS,
  DEFAULT_LIMITS,
  MODULES,
  SERIES_GROUPS,
  type AccessRules,
  type AqModules,
  type BalanceRow,
  type BriefingIssue,
  type CommunityCall,
  type AnalysisNote,
  type MarketSeries,
  type PlanLimits,
} from "@/lib/aq-modules/types";

function weekly(end: string, values: number[]) {
  const last = Date.parse(`${end}T00:00:00Z`);
  return values.map((value, i) => ({ date: new Date(last - (values.length - 1 - i) * 7 * 86_400_000).toISOString().slice(0, 10), value }));
}

const SEED_END = "2026-09-25";

const SEED_SERIES: MarketSeries[] = [
  { id: "urea-me", label: "Urea granular", group: "Nitrogen", basis: "FOB Middle East", unit: "USD/t", points: weekly(SEED_END, [352, 356, 361, 358, 364, 371, 378, 383, 380, 376, 382, 389, 395, 402, 398, 405, 411, 407, 399, 394, 401, 408, 414, 419, 416, 422]) },
  { id: "urea-egypt", label: "Urea granular", group: "Nitrogen", basis: "FOB Egypt", unit: "USD/t", points: weekly(SEED_END, [398, 401, 405, 404, 410, 418, 425, 431, 428, 422, 426, 433, 440, 447, 444, 449, 455, 452, 446, 441, 447, 454, 460, 465, 463, 468]) },
  { id: "ammonia-nwe", label: "Ammonia", group: "Nitrogen", basis: "CFR NW Europe", unit: "USD/t", points: weekly(SEED_END, [512, 508, 505, 499, 494, 490, 488, 485, 489, 493, 497, 495, 492, 488, 485, 481, 478, 480, 484, 487, 485, 482, 479, 476, 478, 475]) },
  { id: "dap-morocco", label: "DAP", group: "Phosphate", basis: "FOB Morocco", unit: "USD/t", points: weekly(SEED_END, [618, 621, 624, 626, 631, 635, 638, 642, 645, 648, 650, 653, 657, 660, 662, 665, 668, 671, 673, 676, 679, 681, 684, 686, 689, 692]) },
  { id: "map-brazil", label: "MAP", group: "Phosphate", basis: "CFR Brazil", unit: "USD/t", points: weekly(SEED_END, [640, 643, 648, 652, 655, 659, 662, 664, 667, 671, 674, 676, 679, 683, 686, 688, 690, 693, 697, 700, 702, 704, 707, 709, 712, 715]) },
  { id: "mop-brazil", label: "MOP granular", group: "Potash", basis: "CFR Brazil", unit: "USD/t", points: weekly(SEED_END, [352, 351, 350, 350, 349, 348, 348, 347, 347, 346, 346, 347, 348, 348, 349, 350, 350, 351, 351, 352, 352, 353, 353, 354, 354, 355]) },
  { id: "mop-sea", label: "MOP standard", group: "Potash", basis: "CFR SE Asia", unit: "USD/t", points: weekly(SEED_END, [338, 338, 337, 336, 336, 335, 335, 335, 334, 334, 333, 333, 334, 334, 335, 335, 336, 336, 336, 337, 337, 337, 338, 338, 338, 339]) },
  { id: "freight-ag-india", label: "Supramax freight", group: "Freight", basis: "Arab Gulf to India", unit: "USD/t", points: weekly(SEED_END, [18.5, 18.8, 19.1, 19.4, 19.2, 18.9, 18.6, 18.4, 18.7, 19.0, 19.6, 20.1, 20.4, 20.8, 21.1, 20.7, 20.3, 19.9, 19.6, 19.8, 20.2, 20.6, 21.0, 21.3, 21.1, 21.5]) },
];

const SEED_ANALYSIS: AnalysisNote[] = [
  {
    id: "an-urea-india",
    slug: "urea-india-tender-sets-the-floor",
    title: "India's tender sets the floor for urea into Q4",
    body: "India's latest purchase tender drew offers well above the previous award, and the lowest offer landed close to where Middle East producers were already selling.\n\n**What it means:** the tender has confirmed a floor rather than set a new high. Producers with October loading positions are sold out, which removes the pressure to discount.\n\n**What to watch:** the volume India actually books. A full award keeps granular firm into November; a partial award would let Egypt and the Baltic soften first.\n\n- Buyers with Q4 needs: cover part of the requirement now and leave the balance open.\n- Traders: watch the Egypt spread to the Middle East; it has widened for three weeks.",
    products: ["Urea"],
    regions: ["South Asia", "Middle East"],
    status: "published",
    author: "Aquifert Desk",
    publishedAt: "2026-09-24T08:30",
    relatedTelexIds: [],
  },
  {
    id: "an-phosphate-brazil",
    slug: "phosphate-brazil-affordability",
    title: "Phosphate: Brazil's affordability problem is getting harder to ignore",
    body: "MAP into Brazil is up for the sixth straight month while soybean prices have moved sideways. The ratio of MAP to soybeans is now the least favourable in two years.\n\n**What it means:** demand destruction is the risk to watch. Retailers report farmers cutting application rates rather than skipping phosphate altogether.\n\n**What to watch:** Moroccan export pricing. If OCP holds, the market stays firm through the Brazilian safra; if it cuts to protect volume, expect a fast correction.",
    products: ["MAP", "DAP"],
    regions: ["South America", "Africa"],
    status: "published",
    author: "Aquifert Desk",
    publishedAt: "2026-09-19T09:00",
    relatedTelexIds: [],
  },
];

const SEED_CALLS: CommunityCall[] = [
  {
    id: "call-oct",
    topic: "Q4 nitrogen and freight outlook",
    host: "Aquifert Desk",
    description: "The desk walks through urea, ammonia and freight into the fourth quarter, then takes questions from buyers and traders.",
    startsAt: "2026-10-15T14:00:00.000Z",
    durationMinutes: 45,
    joinUrl: "",
    recordingUrl: "",
    status: "scheduled",
  },
];

const SEED_BALANCES: BalanceRow[] = [
  { id: "sd-urea", product: "Urea", region: "World", season: "2026/27", unit: "Mt", production: 192.4, consumption: 189.8, imports: 54.1, exports: 54.1, stocks: 11.2, trend: "up", note: "Chinese export quotas and Indian tender volume decide the balance." },
  { id: "sd-dap", product: "DAP/MAP", region: "World", season: "2026/27", unit: "Mt", production: 74.6, consumption: 75.9, imports: 31.8, exports: 31.8, stocks: 5.1, trend: "up", note: "Tight: China's export restrictions keep the trade balance short." },
  { id: "sd-mop", product: "MOP", region: "World", season: "2026/27", unit: "Mt", production: 76.3, consumption: 74.8, imports: 58.2, exports: 58.2, stocks: 9.4, trend: "flat", note: "Comfortable: new Canadian and Laos capacity offsets strong Brazilian demand." },
];

const SEED_BRIEFINGS: BriefingIssue[] = [
  {
    id: "brief-39",
    title: "The Briefing, week 39: tenders, tight phosphate and a steadier potash market",
    date: "2026-09-25",
    summary: "India's tender puts a floor under urea, phosphate affordability worsens in Brazil, and potash stays well supplied.",
    body: "## Nitrogen\nIndia's tender confirmed a floor rather than a new high. October positions in the Middle East are sold out.\n\n## Phosphate\nMAP into Brazil rose again. Watch Moroccan export pricing for the first sign of a turn.\n\n## Potash\nSteady. New supply continues to meet demand, so buyers have time.\n\n## What to do this week\n- Cover part of Q4 urea needs.\n- Hold off on forward phosphate beyond immediate needs.\n- Potash: buy to requirement.",
    status: "published",
  },
];

function seed(): AqModules {
  return JSON.parse(
    JSON.stringify({
      access: DEFAULT_ACCESS,
      limits: DEFAULT_LIMITS,
      analysis: SEED_ANALYSIS,
      series: SEED_SERIES,
      calls: SEED_CALLS,
      supplyDemand: { balances: SEED_BALANCES, commentary: "Nitrogen and phosphate balances are tighter than a year ago; potash is the one nutrient where supply growth runs ahead of demand.", updatedAt: null },
      briefings: SEED_BRIEFINGS,
      updatedAt: null,
    }),
  ) as AqModules;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const PLANS = ["core", "growth", "enterprise"] as const;

function normalizeAccess(raw: unknown): AccessRules {
  const out = { ...DEFAULT_ACCESS };
  if (!isRecord(raw)) return out;
  for (const item of MODULES) {
    const value = raw[item.key];
    if (typeof value === "string" && (PLANS as readonly string[]).includes(value)) out[item.key] = value as AccessRules[typeof item.key];
  }
  return out;
}

function normalizeLimits(raw: unknown, base: PlanLimits): PlanLimits {
  if (!isRecord(raw)) return { ...base };
  const pick = (key: keyof PlanLimits) => (Number.isFinite(Number(raw[key])) && Number(raw[key]) >= 0 ? Math.floor(Number(raw[key])) : base[key]);
  return { core: pick("core"), growth: pick("growth"), enterprise: pick("enterprise") };
}

function normalize(raw: unknown): AqModules {
  const base = seed();
  if (!isRecord(raw)) return base;
  const limits = isRecord(raw.limits) ? raw.limits : {};
  const sd = isRecord(raw.supplyDemand) ? raw.supplyDemand : {};
  return {
    access: normalizeAccess(raw.access),
    limits: {
      nitrogenReports: normalizeLimits(limits.nitrogenReports, base.limits.nitrogenReports),
      savedReports: normalizeLimits(limits.savedReports, base.limits.savedReports),
    },
    analysis: Array.isArray(raw.analysis) ? (raw.analysis as AnalysisNote[]) : base.analysis,
    series: Array.isArray(raw.series)
      ? (raw.series as MarketSeries[]).map((item) => ({ ...item, group: (SERIES_GROUPS as readonly string[]).includes(item.group) ? item.group : "Nitrogen", points: Array.isArray(item.points) ? item.points : [] }))
      : base.series,
    calls: Array.isArray(raw.calls) ? (raw.calls as CommunityCall[]) : base.calls,
    supplyDemand: {
      balances: Array.isArray(sd.balances) ? (sd.balances as BalanceRow[]) : base.supplyDemand.balances,
      commentary: typeof sd.commentary === "string" ? sd.commentary : base.supplyDemand.commentary,
      updatedAt: typeof sd.updatedAt === "string" ? sd.updatedAt : null,
    },
    briefings: Array.isArray(raw.briefings) ? (raw.briefings as BriefingIssue[]) : base.briefings,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
  };
}

const cached = cache(async () => normalize(await readDocument("aq-modules")));

/** Read once per request; each caller gets its own copy. */
export async function getAqModules(): Promise<AqModules> {
  return JSON.parse(JSON.stringify(await cached())) as AqModules;
}

/** `mutate` can run more than once if another save lands first, so it must only change `modules`. */
export function updateAqModules(mutate: (modules: AqModules) => void | Promise<void>) {
  return updateDocument("aq-modules", async (raw) => {
    const modules = normalize(raw);
    await mutate(modules);
    return { ...modules, updatedAt: new Date().toISOString() };
  });
}

export const publishedAnalysis = (modules: AqModules) =>
  modules.analysis.filter((note) => note.status === "published").sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

export const publishedBriefings = (modules: AqModules) =>
  modules.briefings.filter((issue) => issue.status === "published").sort((a, b) => b.date.localeCompare(a.date));

/** Upcoming call first; cancelled calls drop out. */
export function upcomingCalls(modules: AqModules, now = Date.now()) {
  const live = modules.calls.filter((call) => call.status === "scheduled");
  const next = live.filter((call) => Date.parse(call.startsAt) + call.durationMinutes * 60_000 > now).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const past = live.filter((call) => Date.parse(call.startsAt) + call.durationMinutes * 60_000 <= now).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  return { next: next[0] ?? null, later: next.slice(1), past };
}
