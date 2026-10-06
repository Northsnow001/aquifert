import "server-only";

import { cache } from "react";
import { readDocument, updateDocument } from "@/lib/data/documents";
import { indicators as seedIndicators, telex as seedTelex } from "@/data/sample";
import { freightBoard as seedFreight, toolsCommentary as seedToolsCommentary } from "@/data/desk";
import { collections as seedCollections, hedgeReports as seedHedge, libraryDocuments as seedLibrary } from "@/data/library";
import {
  newId,
  slugify,
  type Collection,
  type CurveDirection,
  type FreightBoard,
  type HedgeReport,
  type HedgeSection,
  type Indicator,
  type LibraryDocument,
  type TelexItem,
  type ToolsCommentary,
} from "@/lib/content-types";
import { AQUIBOT_SEED, isAquibotModel, type AquibotConfig } from "@/lib/aquibot";
import { buildVocabulary, isUnslashedText, repairUnslashedText } from "@/lib/wp-import/unslash";

export type { Collection, FreightBoard, HedgeReport, Indicator, LibraryDocument, TelexItem, ToolsCommentary } from "@/lib/content-types";

export type HubContent = {
  telex: TelexItem[];
  indicators: Indicator[];
  indicatorsUpdatedAt: string | null;
  hedgeReports: HedgeReport[];
  collections: Collection[];
  libraryDocuments: LibraryDocument[];
  freight: FreightBoard;
  toolsCommentary: ToolsCommentary;
  aquibot: AquibotConfig;
  updatedAt: string | null;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function seed(): HubContent {
  return clone({
    telex: seedTelex,
    indicators: seedIndicators,
    indicatorsUpdatedAt: null,
    hedgeReports: seedHedge,
    collections: seedCollections,
    libraryDocuments: seedLibrary,
    freight: seedFreight,
    toolsCommentary: seedToolsCommentary,
    aquibot: AQUIBOT_SEED,
    updatedAt: null,
  });
}

const MONTH_INDEX: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/** `Mon · 28 Sep 2026` or `19 Jul 2026` to `2026-09-28`. */
function legacyDay(value: string) {
  const match = value.match(/(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\s+(\d{4})/);
  if (!match) return value.slice(0, 10);
  const [, d, mon, y] = match;
  return `${y}-${MONTH_INDEX[mon.toLowerCase()] ?? "01"}-${d.padStart(2, "0")}`;
}

type LegacyTelex = { id: string; date: string; title: string; paragraphs: string[] };
type LegacyBrief = {
  id: string;
  date: string;
  title: string;
  paragraphs: string[];
  rows: { period: string; market: string; bid: string; ask: string; dir: CurveDirection }[];
};
type LegacyDocument = Omit<LibraryDocument, "collectionIds" | "access" | "private" | "author" | "storedName"> &
  Partial<Pick<LibraryDocument, "access" | "private" | "author" | "storedName">> & { collection?: string; collectionIds?: string[] };

function normalizeTelex(raw: unknown[]): TelexItem[] {
  return raw.map((entry) => {
    const item = entry as Partial<TelexItem> & Partial<LegacyTelex>;
    if (item.publishedAt) return item as TelexItem;
    const legacy = item as LegacyTelex;
    const stamp = `${legacyDay(legacy.date)}T09:00`;
    return {
      id: legacy.id,
      headline: legacy.title ?? "",
      paragraphs: legacy.paragraphs ?? [],
      tags: [],
      access: "public",
      status: "published",
      author: "Aquifert Desk",
      publishedAt: stamp,
      updatedAt: stamp,
    };
  });
}

function briefToReport(brief: LegacyBrief): HedgeReport {
  const section: HedgeSection = { id: `${brief.id}-sec`, label: "Direct Hedge", commodities: [] };
  (brief.rows ?? []).forEach((row, i) => {
    let commodity = section.commodities.find((item) => item.label === row.market);
    if (!commodity) {
      commodity = { id: `${brief.id}-com-${section.commodities.length}`, label: row.market, index: "", rows: [] };
      section.commodities.push(commodity);
    }
    commodity.rows.push({ id: `${brief.id}-row-${i}`, period: row.period, bid: row.bid, ask: row.ask, dir: row.dir });
  });
  const date = legacyDay(brief.date);
  return {
    id: brief.id,
    title: brief.title,
    date,
    status: "published",
    narrative: (brief.paragraphs ?? []).join("\n\n"),
    sections: section.commodities.length ? [section] : [],
    updatedAt: `${date}T07:00`,
  };
}

function normalizeLibrary(raw: LegacyDocument[], collections: Collection[]): LibraryDocument[] {
  return raw.map(({ collection, collectionIds, access, private: hidden, author, storedName, ...rest }) => {
    const file = { ...rest, access: access ?? "public", private: hidden ?? false, author: author ?? "Aquifert Desk", storedName: storedName ?? null };
    if (collectionIds) return { ...file, collectionIds };
    if (!collection) return { ...file, collectionIds: [] };
    let match = collections.find((item) => item.name.toLowerCase() === collection.toLowerCase());
    if (!match) {
      match = { id: newId("col"), name: collection, slug: slugify(collection), parentId: null, description: "", private: false };
      collections.push(match);
    }
    return { ...file, collectionIds: [match.id] };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeAquibot(raw: unknown, base: AquibotConfig): AquibotConfig {
  if (!isRecord(raw)) return base;
  const config = raw as Partial<AquibotConfig>;
  const settings = { ...base.settings, ...(isRecord(config.settings) ? config.settings : {}) };
  if (!isAquibotModel(settings.answerModel)) settings.answerModel = base.settings.answerModel;
  if (!isAquibotModel(settings.rewriteModel)) settings.rewriteModel = base.settings.rewriteModel;
  return {
    prompt: { ...base.prompt, ...(isRecord(config.prompt) ? config.prompt : {}) },
    settings,
    synonyms: typeof config.synonyms === "string" ? config.synonyms : base.synonyms,
    stopWords: typeof config.stopWords === "string" ? config.stopWords : base.stopWords,
    extraction: { ...base.extraction, ...(isRecord(config.extraction) ? config.extraction : {}) },
    updatedAt: typeof config.updatedAt === "string" ? config.updatedAt : null,
  };
}

/** Narratives imported from the old WordPress site lost their line breaks; repair them on read so every reader, and the next save, gets clean text. */
function repairHedgeNarratives(reports: HedgeReport[], telex: TelexItem[]): HedgeReport[] {
  if (!reports.some((report) => typeof report.narrative === "string" && isUnslashedText(report.narrative))) return reports;
  const vocab = buildVocabulary([
    ...telex.flatMap((item) => [item.headline, ...item.paragraphs]),
    ...reports.map((report) => (isUnslashedText(report.narrative) ? "" : report.narrative)),
  ]);
  return reports.map((report) => (isUnslashedText(report.narrative) ? { ...report, narrative: repairUnslashedText(report.narrative, vocab) } : report));
}

function normalize(raw: Record<string, unknown>): HubContent {
  const base = seed();
  const collections = Array.isArray(raw.collections) ? (raw.collections as Collection[]) : base.collections;
  const telex = Array.isArray(raw.telex) ? normalizeTelex(raw.telex) : base.telex;
  const hedgeReports = repairHedgeNarratives(
    Array.isArray(raw.hedgeReports)
      ? (raw.hedgeReports as HedgeReport[])
      : Array.isArray(raw.hedgeBriefs)
        ? (raw.hedgeBriefs as LegacyBrief[]).map(briefToReport)
        : base.hedgeReports,
    telex,
  );
  return {
    telex,
    indicators: Array.isArray(raw.indicators) ? (raw.indicators as Indicator[]) : base.indicators,
    indicatorsUpdatedAt: typeof raw.indicatorsUpdatedAt === "string" ? raw.indicatorsUpdatedAt : null,
    hedgeReports,
    collections,
    libraryDocuments: Array.isArray(raw.libraryDocuments)
      ? normalizeLibrary(raw.libraryDocuments as LegacyDocument[], collections)
      : base.libraryDocuments,
    freight: isRecord(raw.freight) && Array.isArray(raw.freight.fixtures) ? { ...base.freight, ...(raw.freight as FreightBoard) } : base.freight,
    toolsCommentary:
      isRecord(raw.toolsCommentary) && typeof raw.toolsCommentary.html === "string" ? (raw.toolsCommentary as ToolsCommentary) : base.toolsCommentary,
    aquibot: normalizeAquibot(raw.aquibot, base.aquibot),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
  };
}

const fromStored = (raw: unknown) => (isRecord(raw) ? normalize(raw) : seed());

const cachedHubContent = cache(async () => fromStored(await readDocument("hub-content")));

/** Read once per request; each caller gets its own copy to change. */
export async function getHubContent(): Promise<HubContent> {
  return clone(await cachedHubContent());
}

/** Changes the saved content. `mutate` can run more than once if another save lands first, so it must only change `content`. */
export function updateHubContent(mutate: (content: HubContent) => void | Promise<void>) {
  return updateDocument("hub-content", async (raw) => {
    const content = fromStored(raw);
    await mutate(content);
    return { ...content, updatedAt: new Date().toISOString() };
  });
}

export function sortTelex(items: TelexItem[]) {
  return [...items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function sortHedge(items: HedgeReport[]) {
  return [...items].sort((a, b) => b.date.localeCompare(a.date));
}