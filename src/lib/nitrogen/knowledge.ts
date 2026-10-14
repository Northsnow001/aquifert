import "server-only";

import { effectiveSynonyms, parseStopWords, previewQuery } from "@/lib/aquibot";
import { stripChunkLabel } from "@/lib/aquibot-engine/chunking";
import { citation, retrieve } from "@/lib/aquibot-engine/retrieval";
import { engineStatus } from "@/lib/aquibot-engine/store";
import { telexProduct } from "@/lib/aq-modules/telex";
import type { TelexProduct } from "@/lib/aq-modules/types";
import { telexHeadline, type TelexAccess } from "@/lib/content-types";
import { getHubContent } from "@/lib/hub-content";
import { knowledgeQuery, type DeskPassage } from "@/lib/nitrogen/ai-brief";
import type { NitrogenAnswers } from "@/lib/nitrogen/engine";

export type DeskKnowledge = {
  passages: DeskPassage[];
  /** Real titles of the sources used, for the desk's records. */
  sources: string[];
  ms: number;
  /** Why no passages were found, when the search could not run. */
  problem?: string;
};

const MAX_PASSAGES = 10;
const MAX_CHARS = 14_000;

const NOTE_WINDOW_DAYS = 28;
const MIN_NOTES = 4;
const MAX_NOTES = 14;
const MAX_NOTE_CHARS = 3_000;
const MAX_NOTES_CHARS = 16_000;
const NOTE_PRODUCTS = new Set<TelexProduct>(["Nitrogen", "Freight", "General"]);

/** The people who write the desk's telex notes, kept out of every brief. Desk and team bylines are not people. */
export async function deskAuthors(): Promise<string[]> {
  const telex = (await getHubContent()).telex;
  const names = telex.map((item) => item.author?.trim() ?? "").filter((name) => /\S+\s+\S+/.test(name) && !/desk|team|aquifert|admin|editor|staff/i.test(name));
  return [...new Set(names)];
}

/**
 * The desk's latest published telex notes on nitrogen, freight and the wider market that the buyer's plan may read,
 * newest first. The last four weeks give the model both this week's read and the one before it; when the desk has
 * been quiet, the latest few notes are used whatever their age.
 */
export async function recentDeskNotes(access: TelexAccess[], now = new Date()): Promise<{ notes: DeskPassage[]; sources: string[] }> {
  const telex = (await getHubContent()).telex;
  const cutoff = new Date(now.getTime() - NOTE_WINDOW_DAYS * 864e5).toISOString().slice(0, 10);
  const relevant = telex
    .filter((item) => item.status === "published" && access.includes(item.access) && NOTE_PRODUCTS.has(telexProduct(item)))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const recent = relevant.filter((item) => item.publishedAt.slice(0, 10) >= cutoff);
  const picked = (recent.length >= MIN_NOTES ? recent : relevant.slice(0, MIN_NOTES)).slice(0, MAX_NOTES);

  const notes: DeskPassage[] = [];
  const sources: string[] = [];
  let used = 0;
  for (const item of picked) {
    const headline = telexHeadline(item);
    const text = [headline, ...item.paragraphs].join(" ").replace(/\s+/g, " ").trim().slice(0, MAX_NOTE_CHARS);
    if (!text || used + text.length > MAX_NOTES_CHARS) continue;
    notes.push({ source: "Desk telex", date: item.publishedAt.slice(0, 10), text });
    sources.push(`Telex: ${headline}`);
    used += text.length;
  }
  return { notes, sources };
}

/**
 * Searches the Aquibot knowledge base for passages relevant to this buyer, limited to what their plan may use.
 * Gives up after `timeoutMs` so a slow search never holds the report past the page's time limit.
 */
export async function deskKnowledge(answers: NitrogenAnswers, access: TelexAccess[], timeoutMs = 15_000): Promise<DeskKnowledge> {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<DeskKnowledge>((resolve) => {
    timer = setTimeout(() => resolve({ passages: [], sources: [], ms: Date.now() - started, problem: "The knowledge search took too long, so the brief was written without it." }), timeoutMs);
  });
  try {
    return await Promise.race([search(answers, access, started), late]);
  } finally {
    clearTimeout(timer);
  }
}

async function search(answers: NitrogenAnswers, access: TelexAccess[], started: number): Promise<DeskKnowledge> {
  const none = (problem: string): DeskKnowledge => ({ passages: [], sources: [], ms: Date.now() - started, problem });
  try {
    const status = await engineStatus();
    if (!status.ready) return none(status.problem ?? "The knowledge base is not connected.");
    const config = (await getHubContent()).aquibot;
    const stopWords = parseStopWords(config.stopWords).words;
    const query = knowledgeQuery(answers);
    const synonymQuery = previewQuery(query, effectiveSynonyms(config.synonyms).entries, stopWords).rewritten;
    const result = await retrieve({
      query,
      synonymQuery,
      stopWords,
      resolution: null,
      settings: { ...config.settings, maxTopChunks: MAX_PASSAGES },
      followUp: false,
      access,
    });

    const passages: DeskPassage[] = [];
    const sources = new Set<string>();
    let used = 0;
    for (const candidate of result.candidates) {
      if (!candidate.selected) continue;
      const text = stripChunkLabel(candidate.content).trim();
      if (!text || used + text.length > MAX_CHARS) continue;
      const date = candidate.publishedAt?.slice(0, 10);
      passages.push({ source: candidate.visibility === "private" ? "Desk research" : citation(candidate), ...(date ? { date } : {}), text });
      sources.add(citation(candidate));
      used += text.length;
    }
    return { passages, sources: Array.from(sources), ms: Date.now() - started, ...(passages.length ? {} : { problem: "Nothing in the knowledge base matched this request." }) };
  } catch (error) {
    return none(error instanceof Error ? error.message : "The knowledge search failed.");
  }
}
