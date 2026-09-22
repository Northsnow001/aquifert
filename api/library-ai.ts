/**
 * Library AI pipeline, weekly market report generation.
 *
 * Follows the project's established AI pattern (see api/ai.ts): a
 * deterministic desk-logic implementation of the generation contract,
 * structured so a real LLM client can be swapped in behind the same
 * interface without touching callers. The generator ONLY writes figures,
 * names and dates present in the assembled corpus, the same hard rule the
 * brief imposes on a language model.
 *
 * Corpus (nothing else may be used):
 *  a) TELEX posts published in the period
 *  b) market prices table, week-on-week changes by product and region
 *  c) ingested publisher RSS/ATOM news items (headline, source, date, link,
 *     short snippet only, never more than 200 chars reproduced)
 *  d) open datasets already wired up (their data_as_of context)
 *  e/f) tender and freight records we hold (freight enquiries)
 *  g) Aquifert desk assessments
 *  h) the previous published weekly report, for continuity
 *
 * No scraper touches any price reporting agency or paywalled source.
 */
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "./queries/connection";
import * as s from "../db/schema";
import type { LibraryBodySection, LibraryValidationFlag } from "../db/schema";

export const AI_MODEL_ID = "aquifert-desk-generator 1.0 (deterministic)";
export const AI_PROMPT_VERSION = "weekly-report-v1";

/* ------------------------------------------------------------------ */
/* Corpus                                                              */
/* ------------------------------------------------------------------ */
export type CorpusItem = {
  refId: string; // "telex:12" | "price:101" | "news:55" | ...
  type: "telex_post" | "market_price" | "news_item" | "open_dataset" | "tender" | "freight_record" | "desk_assessment";
  title: string;
  url: string | null;
  date: Date;
  text: string; // our own words / data sentence, used in the draft
  numbers: string[]; // every numeric token appearing in text
};

const numTokens = (text: string): string[] =>
  text.match(/\d+(?:,\d{3})*(?:\.\d+)?%?/g) ?? [];

export async function assembleCorpus(periodStart: Date, periodEnd: Date): Promise<CorpusItem[]> {
  const db = getDb();
  const items: CorpusItem[] = [];

  // a) TELEX posts in period
  const telex = await db
    .select()
    .from(s.telexItems)
    .where(and(gte(s.telexItems.createdAt, periodStart), lte(s.telexItems.createdAt, periodEnd)))
    .orderBy(desc(s.telexItems.createdAt))
    .limit(60);
  for (const t of telex) {
    const text = `${t.title}. ${t.body.slice(0, 180)}`;
    items.push({
      refId: `telex:${t.id}`, type: "telex_post", title: t.title, url: null,
      date: t.createdAt, text, numbers: numTokens(text),
    });
  }

  // b + g) market prices (all sources incl. desk assessments) with w/w change
  const prices = await db
    .select()
    .from(s.prices)
    .where(and(gte(s.prices.dataAsOf, periodStart), lte(s.prices.dataAsOf, periodEnd)))
    .orderBy(desc(s.prices.dataAsOf))
    .limit(200);
  const sourceRows = await db.select().from(s.priceSources);
  const srcById = new Map(sourceRows.map((x) => [Number(x.id), x]));
  for (const p of prices) {
    const src = srcById.get(Number(p.sourceId));
    if (!src || !src.redistributionAllowed || !src.enabled) continue;
    const change =
      p.changeAbs != null && p.changePct != null
        ? `, ${p.direction === "UP" ? "up" : p.direction === "DOWN" ? "down" : "unchanged at"} $${Math.abs(p.changeAbs).toFixed(2)} (${p.changePct > 0 ? "+" : ""}${p.changePct.toFixed(2)}%) week on week`
        : "";
    const text = `${p.product}${p.grade ? ` (${p.grade})` : ""} ${p.basis} ${p.location}, ${p.region}: $${p.value.toFixed(2)} per ${p.unit}${change}.`;
    items.push({
      refId: `price:${p.id}`,
      type: src.code === "AQUIFERT_DESK" ? "desk_assessment" : "market_price",
      title: `${p.product} ${p.basis} ${p.location}`, url: src.url ?? null,
      date: p.dataAsOf, text, numbers: numTokens(text),
    });
  }

  // c) publisher RSS news items, headline + short snippet only
  const news = await db
    .select()
    .from(s.newsItems)
    .where(and(gte(s.newsItems.publishedAt, periodStart), lte(s.newsItems.publishedAt, periodEnd)))
    .orderBy(desc(s.newsItems.publishedAt))
    .limit(60);
  const newsSources = await db.select().from(s.newsSources);
  const nsById = new Map(newsSources.map((x) => [Number(x.id), x.name]));
  for (const n of news) {
    const snippet = (n.snippet ?? "").slice(0, 200);
    const text = `${n.headline} (${nsById.get(Number(n.sourceId)) ?? "trade press"}). ${snippet}`.trim();
    items.push({
      refId: `news:${n.id}`, type: "news_item", title: n.headline, url: n.url,
      reportText: `${n.headline} (${nsById.get(Number(n.sourceId)) ?? "trade press"}).`,
      date: n.publishedAt, text, numbers: numTokens(text),
    });
  }

  // d) open dataset context, data_as_of per enabled source
  for (const src of sourceRows) {
    if (!src.enabled || !src.redistributionAllowed || src.code === "AQUIFERT_DESK") continue;
    if (!src.dataAsOf) continue;
    const text = `${src.name}: open dataset current to ${src.dataAsOf.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`;
    items.push({
      refId: `dataset:${src.code}`, type: "open_dataset", title: src.name, url: src.url,
      date: src.dataAsOf, text, numbers: numTokens(text),
    });
  }

  // f) freight enquiry records we hold (anonymised account codes only)
  const freight = await db
    .select()
    .from(s.freightEnquiries)
    .where(and(gte(s.freightEnquiries.createdAt, periodStart), lte(s.freightEnquiries.createdAt, periodEnd)))
    .orderBy(desc(s.freightEnquiries.createdAt))
    .limit(40);
  for (const f of freight) {
    const text = `Open enquiry: ${f.qtyMt.toLocaleString("en-GB")} MT ${f.product}, ${f.origin} to ${f.destination}, laycan ${f.laycan}.`;
    items.push({
      refId: `freight:${f.id}`, type: "freight_record", title: `${f.origin} to ${f.destination}`, url: null,
      date: f.createdAt, text, numbers: numTokens(text),
    });
  }

  return items;
}

/* ------------------------------------------------------------------ */
/* Structured report generation (template of section 5.3)              */
/* ------------------------------------------------------------------ */
const SECTION_DEFS: { key: string; heading: string; match: RegExp }[] = [
  { key: "nitrogen", heading: "Nitrogen", match: /urea|ammonia|ammonium|\bAN\b|\bCAN\b|\bUAN\b|nitrogen/i },
  { key: "phosphates", heading: "Phosphates", match: /dap|map|tsp|ssp|phosphate/i },
  { key: "potash", heading: "Potash", match: /mop|sop|potash|potassium/i },
  { key: "feedstock_and_inputs", heading: "Feedstock and inputs", match: /gas|sulphur|feedstock|ammonia/i },
  { key: "freight_and_logistics", heading: "Freight and logistics", match: /freight|handysize|supramax|vessel|laycan|enquiry|container/i },
  { key: "tenders_and_trade", heading: "Tenders and trade", match: /tender|import|export|trade/i },
];

export type GeneratedReport = {
  title: string;
  summary: string;
  weekNumber: number;
  year: number;
  sections: LibraryBodySection[];
  sources: Omit<s.LibraryReportSource, "reportId">[];
  tags: string[];
  corpusIds: string[];
};

function isoWeek(d: Date): { week: number; year: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return { week: Math.ceil(((date.getTime() - yearStart.getTime()) / 864e5 + 1) / 7), year: date.getUTCFullYear() };
}

export function generateWeeklyReport(corpus: CorpusItem[], periodStart: Date, periodEnd: Date): GeneratedReport | null {
  if (corpus.length < 3) return null; // nothing real to say, publish nothing

  const { week, year } = isoWeek(periodEnd);
  const sources: GeneratedReport["sources"] = [];
  const sections: LibraryBodySection[] = [];
  let marker = 0;

  const cite = (items: CorpusItem[], sectionKey: string) => {
    const citations: LibraryBodySection["citations"] = [];
    for (const it of items) {
      const existing = sources.findIndex((x) => x.sourceId === it.refId.split(":")[1] && x.sourceType === it.type);
      let m: number;
      if (existing >= 0) {
        m = existing + 1;
      } else {
        marker += 1;
        m = marker;
        sources.push({
          id: crypto.randomUUID(),
          sectionKey,
          claimExcerpt: it.text.slice(0, 240),
          sourceType: it.type,
          sourceId: it.refId.split(":")[1],
          sourceTitle: it.title,
          sourceUrl: it.url,
          sourceDate: it.date,
        });
      }
      citations.push({ sourceRefId: it.refId, marker: m });
    }
    return citations;
  };

  // 1. executive summary, 120-180 words target, top movers only
  const priceItems = corpus.filter((c) => c.type === "market_price" || c.type === "desk_assessment");
  const telexItems = corpus.filter((c) => c.type === "telex_post");
  const movers = priceItems.filter((p) => /up \$|down \$/.test(p.text)).slice(0, 6);
  const execParas: string[] = [];
  if (movers.length > 0) {
    execParas.push(
      `Week ${week} brought measurable movement across the complex. ` +
        movers.slice(0, 3).map((m) => m.text).join(" ")
    );
  }
  if (telexItems.length > 0) {
    execParas.push(`Desk wires through the period flagged: ${telexItems.slice(0, 3).map((t) => t.title).join("; ")}.`);
  }
  execParas.push(
    `This report covers ${periodStart.toLocaleDateString("en-GB", { day: "numeric", month: "long" })} to ${periodEnd.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} and is compiled from ${corpus.length} desk and open-source inputs listed in the Sources block.`
  );
  const execCitations = cite([...movers.slice(0, 3), ...telexItems.slice(0, 2)], "executive_summary");
  sections.push({ key: "executive_summary", heading: "Executive summary", paragraphs: execParas, citations: execCitations });

  // 2-7. commodity + logistics sections from matching corpus items
  const used = new Set<string>();
  for (const def of SECTION_DEFS) {
    const items = corpus.filter((c) => !used.has(c.refId) && def.match.test(c.text)).slice(0, 8);
    if (items.length === 0) continue;
    items.forEach((i) => used.add(i.refId));
    sections.push({
      key: def.key,
      heading: def.heading,
      paragraphs: items.map((i) => i.reportText ?? i.text),
      citations: cite(items, def.key),
    });
  }

  // 8. regional notes
  const byRegion = new Map<string, CorpusItem[]>();
  for (const p of priceItems) {
    const region = p.title.split(" ").pop() ?? "";
    const m = p.text.match(/, ([A-Za-z ]+):/) ;
    const r = m ? m[1].trim() : region;
    if (!byRegion.has(r)) byRegion.set(r, []);
    byRegion.get(r)!.push(p);
  }
  const regionalParas: string[] = [];
  const regionalItems: CorpusItem[] = [];
  for (const [region, items] of [...byRegion.entries()].slice(0, 6)) {
    regionalParas.push(`${region}: ${items[0].text}`);
    regionalItems.push(items[0]);
  }
  if (regionalParas.length > 0) {
    sections.push({ key: "regional_notes", heading: "Regional notes", paragraphs: regionalParas, citations: cite(regionalItems, "regional_notes") });
  }

  // 9. outlook, framed strictly as expectation
  const up = priceItems.filter((p) => / up \$/.test(p.text)).length;
  const down = priceItems.filter((p) => / down \$/.test(p.text)).length;
  const bias = up > down ? "a firm bias" : down > up ? "a softer bias" : "a balanced tone";
  sections.push({
    key: "outlook",
    heading: "Outlook",
    paragraphs: [
      `Into next week the desk watches ${telexItems[0]?.title.toLowerCase() ?? "the same drivers"} and whether ${bias} seen this week (${up} indications up, ${down} down) extends into new business. These are expectations drawn from the period's data, not recommendations.`,
    ],
    citations: cite(telexItems.slice(0, 1), "outlook"),
  });

  const productTags = [...new Set(priceItems.map((p) => p.title.split(" ")[0]))].slice(0, 8);
  const regionTags = [...byRegion.keys()].slice(0, 8);

  const summary =
    `Week ${week}, ${year}: ${movers.length > 0 ? movers[0].text : "a quiet week across tracked indications"} ` +
    `${telexItems.length > 0 ? `Desk wires covered ${telexItems.length} market development${telexItems.length > 1 ? "s" : ""} in the period.` : ""}`.trim();

  return {
    title: `Weekly Fertilizer Market Report, Week ${week}, ${year}`,
    summary: summary.slice(0, 500),
    weekNumber: week,
    year,
    sections,
    sources,
    tags: [...productTags, ...regionTags],
    corpusIds: corpus.map((c) => c.refId),
  };
}


/* Numbers the generator legitimately derives from the corpus or period
   (period days, up/down indication counts, corpus size), allowed by the
   numeric validator in addition to literal corpus figures. */
export function derivedNumbers(corpus: CorpusItem[], periodStart: Date, periodEnd: Date): Set<string> {
  const out = new Set<string>();
  const d = new Date(periodStart);
  while (d <= periodEnd) { out.add(String(d.getDate())); d.setDate(d.getDate() + 1); }
  const priceItems = corpus.filter((c) => c.type === "market_price" || c.type === "desk_assessment");
  out.add(String(priceItems.filter((x) => / up \$/.test(x.text)).length));
  out.add(String(priceItems.filter((x) => / down \$/.test(x.text)).length));
  out.add(String(corpus.filter((c) => c.type === "telex_post").length));
  out.add(String(corpus.length));
  return out;
}

/* ------------------------------------------------------------------ */
/* Validation (section 5.4), runs before a human ever sees the draft   */
/* ------------------------------------------------------------------ */
const ADVICE_RE = /\b(you should|we recommend|we advise|buy now|sell now|hold off buying|stock up|take a position|go long|go short)\b/i;

export function validateReport(gen: GeneratedReport, corpus: CorpusItem[], derived: Set<string> = new Set()): LibraryValidationFlag[] {
  const flags: LibraryValidationFlag[] = [];
  const corpusNumbers = new Set(corpus.flatMap((c) => c.numbers.map((n) => n.replace(/,/g, ""))));
  for (const d of derived) corpusNumbers.add(d);
  const corpusText = corpus.map((c) => c.text).join(" ").toLowerCase();

  const push = (check: LibraryValidationFlag["check"], sectionKey: string | null, message: string, blocking: boolean) =>
    flags.push({ check, sectionKey, message, blocking, resolved: false });

  for (const sec of gen.sections) {
    const text = sec.paragraphs.join(" ");
    // NUMERIC CHECK, every figure must trace to the corpus
    for (const n of numTokens(text)) {
      const plain = n.replace(/,/g, "");
      // week/year/period numbers and counts derived from corpus size are allowed
      if (plain === String(gen.weekNumber) || plain === String(gen.year) || plain === String(corpus.length)) continue;
      if (derived.has(plain)) continue;
      if (!corpusNumbers.has(plain.replace(/%$/, "")) && !corpusNumbers.has(plain)) {
        push("numeric", sec.key, `Figure "${n}" does not match any value in the corpus`, true);
      }
    }
    // CITATION CHECK, every section must cite
    if (sec.citations.length === 0 && sec.key !== "outlook") {
      push("citation", sec.key, "Section carries no citations", false);
    }
    // QUOTATION CHECK, no verbatim run over 200 chars from any news item
    for (const para of sec.paragraphs) {
      if (para.length > 200) {
        const newsItems = corpus.filter((c) => c.type === "news_item");
        for (const n of newsItems) {
          if (n.text.length > 100 && para.includes(n.text.slice(0, 200))) {
            push("quotation", sec.key, `Paragraph reproduces 200+ characters of news item "${n.title}"`, false);
          }
        }
      }
    }
    // LENGTH CHECK
    const words = text.split(/\s+/).length;
    if (sec.key === "executive_summary" && (words < 60 || words > 220)) {
      push("length", sec.key, `Executive summary is ${words} words (expected 120-180)`, false);
    }
    if (sec.key !== "executive_summary" && words > 400) {
      push("length", sec.key, `Section is ${words} words (expected at most 400)`, false);
    }
    // ADVICE CHECK
    const advice = text.match(ADVICE_RE);
    if (advice) {
      push("advice", sec.key, `Imperative/advice phrasing detected: "${advice[0]}"`, true);
    }
  }

  // SCOPE CHECK, capitalised entities in draft that appear nowhere in corpus
  for (const sec of gen.sections) {
    const text = sec.paragraphs.join(" ");
    const entities = text.match(/(?:[A-Z][a-z]+(?:\s[A-Z][a-z]+)+)/g) ?? [];
    for (const e of new Set(entities)) {
      if (/^(Week|Desk|Executive|Open Enquiry|Aquifert|Sources|Latest Market)/.test(e)) continue;
      if (!corpusText.includes(e.toLowerCase())) {
        push("scope", sec.key, `Entity "${e}" does not appear in the corpus`, true);
      }
    }
  }

  return flags;
}
