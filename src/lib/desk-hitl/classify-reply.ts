import "server-only";

import { EXTRACTION_MODEL, generateText, geminiKey } from "@/lib/aquibot-engine/gemini";
import {
  classifyBuyerReply,
  looksLikeNewRfq,
  parseFollowUpIntent,
  parseReplyIntent,
  type FollowUpIntent,
} from "@/lib/desk-hitl/logic";
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

const DETAILS =
  /\b(bag|packing|jumbo|bulk|sgs|bv|coa|coo|bl\s*\+?|bl\b|lc|sblc|cad|tt\b|da\b|dp\b|origin|cfr|cif|fob|inspect|permit|25kg|50kg|mt\b|sight|days?|payment)\b/i;
const CONFIRM = /^(yes|yep|yeah|ok|okay|sure|correct|confirmed?|send it|please send|go ahead|email it)[\s!.]*$/i;

/** After firm interest: packing answers vs a brand-new RFQ. */
export async function resolveFirmFollowUp(text: string): Promise<FollowUpIntent> {
  if (CONFIRM.test(text.trim()) || (DETAILS.test(text) && text.length < 240)) return "firm_order";
  if (looksLikeNewRfq(text)) return "chat";
  if (!geminiKey()) return "chat";
  try {
    const result = await generateText({
      model: EXTRACTION_MODEL,
      json: true,
      fast: true,
      maxOutputTokens: 64,
      timeoutMs: 8_000,
      temperature: 0,
      system: `The buyer may already have firm interest on one fertiliser indication. Classify this WhatsApp.
Return JSON only: {"intent":"firm_order"|"chat"}
- firm_order: packing/origin/port/window/payment/inspection/docs answers, recap confirmations, or yes send the firm offer email.
- chat: greeting, a product name only (e.g. SplashFert, urea), or they clearly start a new RFQ.
Payment fragments (BL 60, CAD, LC) and packing/origin answers are firm_order, not a new RFQ.`,
      turns: [{ role: "user", text: text.slice(0, 500) }],
    });
    return parseFollowUpIntent(result.text) ?? "chat";
  } catch {
    return "chat";
  }
}
