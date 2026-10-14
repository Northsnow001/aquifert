import "server-only";

import { generateText, geminiKey } from "@/lib/aquibot-engine/gemini";
import type { TelexAccess } from "@/lib/content-types";
import { briefRequest, KNOWLEDGE_RULES, mergeReply, OUTPUT_CONTRACT, parseReply } from "@/lib/nitrogen/ai-brief";
import { buildBrief, type NitrogenAnswers, type NitrogenBrief } from "@/lib/nitrogen/engine";
import { deskKnowledge } from "@/lib/nitrogen/knowledge";
import type { BriefContent } from "@/lib/nitrogen/template";

export type BriefWriter = "ai" | "desk";

export type WrittenBrief = {
  brief: NitrogenBrief;
  writer: BriefWriter;
  model?: string;
  /** Why the desk text was used when AI writing was expected. */
  fallback?: string;
  /** Knowledge-base sources the AI was given, by title. */
  knowledge?: string[];
  /** Why no knowledge was used when the knowledge base is switched on. */
  knowledgeNote?: string;
  ms: number;
};

export const aiAvailable = () => Boolean(geminiKey());

/** With the 15-second knowledge search, keeps a report well inside the 120-second page limit. */
const AI_TIMEOUT_MS = 80_000;

/**
 * Writes the brief with Gemini when AI writing is on, following the admin's prompt and grounded on passages
 * from the knowledge base the buyer's plan may use; otherwise, or when the model fails or replies with nothing
 * usable, returns the desk-rules brief.
 */
export async function writeBrief(
  answers: NitrogenAnswers,
  details: { refNo: string; partner?: string; date?: Date; access?: TelexAccess[] },
  content: BriefContent,
): Promise<WrittenBrief> {
  const started = Date.now();
  const { access, ...header } = details;
  const draft = buildBrief(answers, { ...header, reference: content.reference });
  const desk = (fallback?: string): WrittenBrief => ({ brief: draft, writer: "desk", fallback, ms: Date.now() - started });
  if (!content.aiEnabled) return desk();
  if (!aiAvailable()) return desk("AI writing is on but the Gemini key is not set, so the desk text was used.");

  const knowledge = content.useKnowledge ? await deskKnowledge(answers, access ?? ["public"]) : null;
  const used = knowledge?.passages.length ? { knowledge: knowledge.sources } : knowledge?.problem ? { knowledgeNote: knowledge.problem } : {};

  try {
    const { text } = await generateText({
      model: content.model,
      system: [content.prompt.trim(), OUTPUT_CONTRACT, knowledge?.passages.length ? KNOWLEDGE_RULES : ""].filter(Boolean).join("\n\n"),
      turns: [{ role: "user", text: briefRequest(answers, draft, content.reference, knowledge?.passages) }],
      maxOutputTokens: 8192,
      timeoutMs: AI_TIMEOUT_MS,
      json: true,
    });
    const reply = parseReply(text);
    if (!reply) return { ...desk("The AI reply could not be read, so the desk text was used."), ...used };
    const { brief, parts } = mergeReply(draft, reply);
    if (!parts) return { ...desk("The AI reply had nothing usable, so the desk text was used."), ...used };
    return { brief, writer: "ai", model: content.model, ...used, ms: Date.now() - started };
  } catch (error) {
    console.error("[nitrogen-report] AI writing failed, using the desk text.", error);
    return { ...desk(error instanceof Error ? `AI writing failed (${error.message}), so the desk text was used.` : "AI writing failed, so the desk text was used."), ...used };
  }
}
