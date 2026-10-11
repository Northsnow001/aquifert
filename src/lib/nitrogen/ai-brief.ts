/**
 * The fixed half of AI writing: what the model is sent besides the admin's prompt, and how its reply is
 * checked. The reply only replaces wording. Reference, partner, dates and the requirement table always come
 * from the desk draft, and anything missing or malformed in the reply keeps the desk's text.
 */

import type { NitrogenAnswers, NitrogenBrief, PulseSignal } from "@/lib/nitrogen/engine";
import type { DeskReference } from "@/lib/nitrogen/reference";

const SIGNALS: PulseSignal[] = ["Firm", "Balanced", "Soft", "Watch"];
const MAX_TEXT = 900;

export const OUTPUT_CONTRACT = `## Output format (set by the system, always applies)

Reply with one JSON object and nothing else, in this shape:
{"pulse":[{"market":"","view":"","signal":"Firm|Balanced|Soft|Watch"}],"position":[""],"products":[{"name":"","note":"","view":""}],"logistics":[""],"recommendations":[{"label":"","text":""}]}

- pulse: one row per market in the desk draft, with the same market names in the same order.
- products: one entry per product in the desk draft, with the same names.
- position and logistics: one string per paragraph.
- Every string is plain text: no Markdown, no line breaks, no bullet characters.`;

/** The user turn: the buyer's answers, the desk-rules draft and the desk's market views for the products asked about. */
export function briefRequest(answers: NitrogenAnswers, draft: NitrogenBrief, reference: DeskReference) {
  const products = draft.products.map((item) => item.name);
  const type = answers.shipmentType || "Bulk";
  return JSON.stringify(
    {
      buyer: draft.partner,
      week: draft.week,
      date: draft.date,
      survey: Object.fromEntries(draft.requirement),
      deskViews: {
        products: Object.fromEntries(products.map((name) => [name, reference.products[name] ?? null])),
        freight: { [type]: reference.freight[type] ?? null },
        shipping: reference.shipping[type] ?? "",
        packing: reference.packing[answers.packing] ?? "",
      },
      deskDraft: { pulse: draft.pulse, position: draft.position, products: draft.products, logistics: draft.logistics, recommendations: draft.recommendations },
    },
    null,
    2,
  );
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Plain text: no Markdown emphasis or headings, single spaces, capped length. */
export function cleanText(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .replace(/\*\*|__|`/g, "")
    .replace(/^\s*(#+|[-*•]|\d+[.)])\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT);
}

const paragraphs = (value: unknown, max: number) => (Array.isArray(value) ? value.map(cleanText).filter(Boolean).slice(0, max) : []);
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Reads the model's reply, tolerating a fenced code block around the JSON. */
export function parseReply(text: string): Record<string, unknown> | null {
  const body = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const value = JSON.parse(body.slice(start, end + 1));
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

/** Puts the model's wording onto the desk draft. `parts` counts how many of the five parts the model supplied. */
export function mergeReply(draft: NitrogenBrief, reply: Record<string, unknown>): { brief: NitrogenBrief; parts: number } {
  let parts = 0;
  const rows = Array.isArray(reply.pulse) ? reply.pulse.filter(isRecord) : [];
  const pulse = draft.pulse.map((row) => {
    const match = rows.find((item) => typeof item.market === "string" && same(item.market, row.market));
    const view = cleanText(match?.view);
    return view ? { market: row.market, view, signal: SIGNALS.includes(match?.signal as PulseSignal) ? (match!.signal as PulseSignal) : row.signal } : row;
  });
  if (pulse.some((row, index) => row !== draft.pulse[index])) parts += 1;

  const position = paragraphs(reply.position, 6);
  if (position.length) parts += 1;

  const items = Array.isArray(reply.products) ? reply.products.filter(isRecord) : [];
  const products = draft.products.map((product) => {
    const match = items.find((item) => typeof item.name === "string" && same(item.name, product.name));
    return { name: product.name, note: cleanText(match?.note) || product.note, view: cleanText(match?.view) || product.view };
  });
  if (products.some((item, index) => item.note !== draft.products[index].note || item.view !== draft.products[index].view)) parts += 1;

  const logistics = paragraphs(reply.logistics, 6);
  if (logistics.length) parts += 1;

  const recommendations = (Array.isArray(reply.recommendations) ? reply.recommendations.filter(isRecord) : [])
    .map((item) => ({ label: cleanText(item.label).replace(/[.:]$/, "").slice(0, 60), text: cleanText(item.text) }))
    .filter((item) => item.label && item.text)
    .slice(0, 5);
  if (recommendations.length) parts += 1;

  return {
    brief: {
      ...draft,
      pulse,
      position: position.length ? position : draft.position,
      products,
      logistics: logistics.length ? logistics : draft.logistics,
      recommendations: recommendations.length ? recommendations : draft.recommendations,
    },
    parts,
  };
}
