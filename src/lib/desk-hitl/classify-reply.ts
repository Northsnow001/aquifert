import "server-only";

import { EXTRACTION_MODEL, generateText, geminiKey } from "@/lib/aquibot-engine/gemini";
import { classifyBuyerReply, parseReplyIntent } from "@/lib/desk-hitl/logic";
import type { BuyerReplyKind } from "@/lib/desk-hitl/types";

/** Gemini only when keywords are unsure and this phone has an indication waiting. */
export async function resolveBuyerReply(text: string, openIndication: boolean): Promise<BuyerReplyKind> {
  const quick = classifyBuyerReply(text);
  if (quick !== "chat" || !openIndication) return quick;
  if (!geminiKey()) return "chat";

  try {
    const result = await generateText({
      model: EXTRACTION_MODEL,
      json: true,
      fast: true,
      maxOutputTokens: 64,
      timeoutMs: 8_000,
      temperature: 0,
      system: `You classify one WhatsApp from a fertiliser buyer who was sent a price indication.
Return JSON only: {"intent":"agree"|"negotiate"|"chat"}
- agree: they confirm they want to proceed at that indication (yeah, go ahead, send it, let's do it, sounds good).
- negotiate: they want a different price, volume, port, or terms.
- chat: greeting, product name, new enquiry, or anything that is not a decision on this indication.
Do not treat a product name or a new RFQ as agree.`,
      turns: [{ role: "user", text: text.slice(0, 500) }],
    });
    return parseReplyIntent(result.text) ?? "chat";
  } catch {
    return "chat";
  }
}
