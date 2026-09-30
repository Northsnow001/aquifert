import "server-only";
import type { AquibotSettings } from "@/lib/aquibot";
import type { TelexAccess } from "@/lib/content-types";
import { stripChunkLabel, WEEKLY_FILE } from "./chunking";
import { DAY_MS, rangeMonthTokens, weekRange, type DateResolution } from "./dates";
import { embedQueries } from "./gemini";
import { countKeywordHits, detectIntent, geoTerms, isBenchmarkSource, isTechnicalSource, keywordTokens, weekFromTitle, type QueryIntent, type TechnicalSubtype } from "./query";
import { matchChunks, type MatchRow } from "./store";

const CANDIDATE_POOL = 150;

export type ScoredCandidate = {
  id: number;
  documentId: string;
  chunkIndex: number;
  title: string;
  sourceType: "telex" | "file";
  visibility: "public" | "private";
  access: TelexAccess;
  publishedAt: string | null;
  content: string;
  similarity: number;
  score: number;
  boosts: Record<string, number>;
  dateMatch: "in" | "grace" | "out" | null;
  selected: boolean;
  dropped: string | null;
};

export type RetrievalResult = {
  intent: QueryIntent;
  technicalSubtype: TechnicalSubtype;
  searchQueries: string[];
  keywords: string[];
  geo: string[];
  candidates: ScoredCandidate[];
  publicSection: string;
  privateSection: string;
  dateFallback: boolean;
  budgets: { total: number; public: number; private: number; used: number; publicUsed: number; privateUsed: number; maxChunks: number };
  timings: { embedMs: number; searchMs: number; rankMs: number };
};

export type RetrievalInput = {
  /** Standalone query from the rewrite stage. */
  query: string;
  /** The same query after the synonym rewrite. */
  synonymQuery: string;
  stopWords: string[];
  resolution: DateResolution | null;
  settings: AquibotSettings;
  followUp: boolean;
  access: TelexAccess[];
  now?: number;
};

const round = (value: number) => Math.round(value * 1000) / 1000;

function formatDay(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function citation(candidate: Pick<ScoredCandidate, "sourceType" | "title" | "publishedAt">) {
  return candidate.sourceType === "telex" ? `Telex · ${formatDay(candidate.publishedAt)} · ${candidate.title}` : candidate.title;
}

function score(
  row: MatchRow & { similarity: number },
  context: { intent: QueryIntent; keywords: string[]; geo: string[]; resolution: DateResolution | null; settings: AquibotSettings; now: number },
) {
  const boosts: Record<string, number> = {};
  const title = row.title ?? "";
  const lowerContent = row.content.toLowerCase();
  const hasRanges = Boolean(context.resolution?.ranges.length);

  if (row.source_type === "telex") boosts.telex = context.intent === "news" ? 0.3 : 0.08;
  else if (context.intent === "news") boosts.file = -0.05;
  else if (context.intent === "general") boosts.file = -0.08;

  if (context.settings.benchmarkPriority && context.intent === "price" && row.source_type === "file" && isBenchmarkSource(title)) boosts.benchmark = 0.3;

  const weekly = row.source_type === "file" && WEEKLY_FILE.test(title);
  if (weekly && row.published_at && !((context.intent === "general" || context.intent === "technical") && !hasRanges)) {
    const age = (context.now - new Date(row.published_at).getTime()) / DAY_MS;
    if (age < 14) boosts.recency = 0.35;
    else if (age < 45) boosts.recency = 0.2;
    else if (age < 120) boosts.recency = 0.08;
  }

  if (hasRanges && row.source_type === "file") {
    const week = weekFromTitle(title);
    const span = week ? weekRange(week.year, week.week) : null;
    if (span && context.resolution!.ranges.some((range) => span.start <= range.end && span.end >= range.start)) boosts.weekMatch = 0.2;
  }

  const keywordHits = countKeywordHits(row.content, context.keywords);
  if (keywordHits) boosts.keywords = Math.min(0.25, 0.05 * keywordHits);
  const titleHits = countKeywordHits(title, context.keywords);
  if (titleHits) boosts.title = Math.min(0.2, 0.08 * titleHits);

  const geoHits = context.geo.filter((term) => lowerContent.includes(term)).length;
  if (geoHits) boosts.geo = Math.min(0.6, 0.2 * geoHits);

  if (context.intent === "technical" && isTechnicalSource(title)) boosts.technical = 0.5;

  const total = row.similarity + Object.values(boosts).reduce((sum, value) => sum + value, 0);
  return { score: round(total), boosts: Object.fromEntries(Object.entries(boosts).map(([key, value]) => [key, round(value)])) };
}

function dateMatch(publishedAt: string | null, resolution: DateResolution | null) {
  if (!resolution?.ranges.length || !publishedAt) return null;
  const at = new Date(publishedAt).getTime();
  if (resolution.ranges.some((range) => at >= range.start && at <= range.end)) return "in" as const;
  const grace = resolution.graceDays * DAY_MS;
  if (resolution.ranges.some((range) => at >= range.start - grace && at <= range.end + grace)) return "grace" as const;
  return "out" as const;
}

export async function retrieve(input: RetrievalInput): Promise<RetrievalResult> {
  const now = input.now ?? Date.now();
  const { settings } = input;
  const { intent, technicalSubtype } = detectIntent(input.query);
  const monthTokens = settings.monthTokenMatching ? rangeMonthTokens(input.resolution) : [];
  const keywords = [...keywordTokens(input.synonymQuery, input.stopWords), ...monthTokens.filter((token) => token.length > 3)];
  const geo = geoTerms(`${input.query} ${input.synonymQuery}`);
  const searchQueries = Array.from(new Set([input.query.trim(), input.synonymQuery.trim()].filter(Boolean)));

  const t0 = Date.now();
  const vectors = await embedQueries(searchQueries);
  const t1 = Date.now();

  const minPublished = settings.recencyFilter ? new Date(now - settings.recencyYears * 365.25 * DAY_MS).toISOString() : null;
  const results = await Promise.all(vectors.map((vector) => matchChunks(vector, { count: CANDIDATE_POOL, minPublished, access: input.access })));
  const t2 = Date.now();

  const best = new Map<number, MatchRow>();
  for (const rows of results) {
    for (const row of rows) {
      const seen = best.get(row.id);
      if (!seen || row.similarity > seen.similarity) best.set(row.id, row);
    }
  }

  let candidates: ScoredCandidate[] = Array.from(best.values()).map((row) => {
    const scored = score(row, { intent, keywords, geo, resolution: input.resolution, settings, now });
    return {
      id: row.id,
      documentId: row.document_id,
      chunkIndex: row.chunk_index,
      title: row.title,
      sourceType: row.source_type,
      visibility: row.visibility,
      access: row.access,
      publishedAt: row.published_at,
      content: row.content,
      similarity: round(row.similarity),
      score: scored.score,
      boosts: scored.boosts,
      dateMatch: dateMatch(row.published_at, input.resolution),
      selected: false,
      dropped: null,
    };
  });

  let dateFallback = false;
  if (input.resolution?.ranges.length) {
    const telex = candidates.filter((candidate) => candidate.sourceType === "telex");
    const inWindow = telex.some((candidate) => candidate.dateMatch === "in");
    const inGrace = telex.some((candidate) => candidate.dateMatch === "grace");
    const keep = inWindow ? new Set(["in"]) : inGrace ? new Set(["grace"]) : new Set<string>();
    dateFallback = !inWindow;
    for (const candidate of telex) {
      if (!keep.has(candidate.dateMatch ?? "")) candidate.dropped = "Outside the date window";
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const spanDays = input.resolution?.ranges.length
    ? (Math.max(...input.resolution.ranges.map((range) => range.end)) - Math.min(...input.resolution.ranges.map((range) => range.start))) / DAY_MS
    : 0;
  let factor = 1;
  if (input.followUp && !input.resolution?.ranges.length) factor = 0.4;
  if ((input.resolution?.ranges.length ?? 0) > 1) factor = Math.max(factor, 1.5);
  if (spanDays > 60) factor = 2;
  const budgets = {
    total: Math.round(settings.ragTotalBudget * factor),
    public: Math.round(settings.publicFileBudget * factor),
    private: Math.round(settings.privateFileBudget * factor),
    used: 0,
    publicUsed: 0,
    privateUsed: 0,
    maxChunks: Math.max(1, settings.maxTopChunks),
  };

  const publicItems: string[] = [];
  const privateItems: string[] = [];
  let selectedCount = 0;
  for (const candidate of candidates) {
    if (candidate.dropped) continue;
    if (selectedCount >= budgets.maxChunks) {
      candidate.dropped = "Below the top-chunk cut-off";
      continue;
    }
    const isPrivate = candidate.visibility === "private";
    const item = isPrivate ? `- ${candidate.content}` : `- [${citation(candidate)}] ${stripChunkLabel(candidate.content)}`;
    const length = item.length + 1;
    const sectionUsed = isPrivate ? budgets.privateUsed : budgets.publicUsed;
    const sectionBudget = isPrivate ? budgets.private : budgets.public;
    if (sectionUsed + length > sectionBudget || budgets.used + length > budgets.total) {
      candidate.dropped = "Over the context budget";
      continue;
    }
    (isPrivate ? privateItems : publicItems).push(item);
    if (isPrivate) budgets.privateUsed += length;
    else budgets.publicUsed += length;
    budgets.used += length;
    candidate.selected = true;
    selectedCount += 1;
  }

  candidates = candidates.filter((candidate, index) => candidate.selected || index < 60);
  const t3 = Date.now();

  return {
    intent,
    technicalSubtype,
    searchQueries,
    keywords,
    geo,
    candidates,
    publicSection: publicItems.join("\n"),
    privateSection: privateItems.join("\n"),
    dateFallback,
    budgets,
    timings: { embedMs: t1 - t0, searchMs: t2 - t1, rankMs: t3 - t2 },
  };
}
