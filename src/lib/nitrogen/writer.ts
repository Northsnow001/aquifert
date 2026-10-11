import "server-only";

import { generateText, geminiKey } from "@/lib/aquibot-engine/gemini";
import { briefRequest, mergeReply, OUTPUT_CONTRACT, parseReply } from "@/lib/nitrogen/ai-brief";
import { buildBrief, type NitrogenAnswers, type NitrogenBrief } from "@/lib/nitrogen/engine";
import type { BriefContent } from "@/lib/nitrogen/template";

export type BriefWriter = "ai" | "desk";

export type WrittenBrief = {
  brief: NitrogenBrief;
  writer: BriefWriter;
  model?: string;
  /** Why the desk text was used when AI writing was expected. */
  fallback?: string;
  ms: number;
};

export const aiAvailable = () => Boolean(geminiKey());

/**
 * Writes the brief with Gemini when AI writing is on, following the admin's prompt; otherwise, or when the
 * model fails or replies with nothing usable, returns the desk-rules brief.
 */
export async function writeBrief(
  answers: NitrogenAnswers,
  details: { refNo: string; partner?: string; date?: Date },
  content: BriefContent,
): Promise<WrittenBrief> {
  const started = Date.now();
  const draft = buildBrief(answers, { ...details, reference: content.reference });
  const desk = (fallback?: string): WrittenBrief => ({ brief: draft, writer: "desk", fallback, ms: Date.now() - started });
  if (!content.aiEnabled) return desk();
  if (!aiAvailable()) return desk("AI writing is on but the Gemini key is not set, so the desk text was used.");

  try {
    const { text } = await generateText({
      model: content.model,
      system: `${content.prompt.trim()}\n\n${OUTPUT_CONTRACT}`,
      turns: [{ role: "user", text: briefRequest(answers, draft, content.reference) }],
      maxOutputTokens: 8192,
      timeoutMs: 45_000,
      json: true,
    });
    const reply = parseReply(text);
    if (!reply) return desk("The AI reply could not be read, so the desk text was used.");
    const { brief, parts } = mergeReply(draft, reply);
    if (!parts) return desk("The AI reply had nothing usable, so the desk text was used.");
    return { brief, writer: "ai", model: content.model, ms: Date.now() - started };
  } catch (error) {
    console.error("[nitrogen-report] AI writing failed, using the desk text.", error);
    return desk(error instanceof Error ? `AI writing failed (${error.message}), so the desk text was used.` : "AI writing failed, so the desk text was used.");
  }
}
