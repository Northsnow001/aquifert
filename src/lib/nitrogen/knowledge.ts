import "server-only";

import { effectiveSynonyms, parseStopWords, previewQuery } from "@/lib/aquibot";
import { stripChunkLabel } from "@/lib/aquibot-engine/chunking";
import { citation, retrieve } from "@/lib/aquibot-engine/retrieval";
import { engineStatus } from "@/lib/aquibot-engine/store";
import type { TelexAccess } from "@/lib/content-types";
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

/** Searches the Aquibot knowledge base for passages relevant to this buyer, limited to what their plan may use. */
export async function deskKnowledge(answers: NitrogenAnswers, access: TelexAccess[]): Promise<DeskKnowledge> {
  const started = Date.now();
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
      passages.push({ source: candidate.visibility === "private" ? "Desk research" : citation(candidate), text });
      sources.add(citation(candidate));
      used += text.length;
    }
    return { passages, sources: Array.from(sources), ms: Date.now() - started, ...(passages.length ? {} : { problem: "Nothing in the knowledge base matched this request." }) };
  } catch (error) {
    return none(error instanceof Error ? error.message : "The knowledge search failed.");
  }
}
