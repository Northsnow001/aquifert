/**
 * The fixed half of AI writing: what the model is sent besides the admin's prompt, and how its reply is
 * checked. The reply only replaces wording. Reference, partner, dates and the requirement table always come
 * from the desk draft, and anything missing or malformed in the reply keeps the desk's text.
 */

import { monthLabel, type NitrogenAnswers, type NitrogenBrief, type PulseRow, type PulseSignal } from "@/lib/nitrogen/engine";
import type { DeskReference } from "@/lib/nitrogen/reference";

/** One passage from the knowledge base. Knowledge-only documents are labelled generically so the model never names them. */
export type DeskPassage = { source: string; date?: string; text: string };

/** The knowledge-base search a brief is grounded on: products, destination, origin, timing and freight from the buyer's answers. */
export function knowledgeQuery(answers: NitrogenAnswers) {
  const products = answers.products.join(", ") || "nitrogen fertilizer";
  const destination = [answers.destinationPort, answers.destinationCountry].filter(Boolean).join(", ");
  const months = [...answers.arrivalMonths].sort().map((month) => monthLabel(month, "long")).join(", ");
  return [
    `${products} market outlook, prices, supply and demand`,
    destination ? `imports into ${destination}` : "",
    answers.preferredOrigin ? `origin ${answers.preferredOrigin}` : "",
    months ? `arrivals ${months}` : "",
    answers.shipmentType ? `${answers.shipmentType.toLowerCase()} freight` : "",
  ]
    .filter(Boolean)
    .join("; ");
}

const SIGNALS: PulseSignal[] = ["Firm", "Balanced", "Soft", "Watch"];
const MAX_TEXT = 900;
const MAX_CELL = 300;
const MAX_DRIVERS = 7;

export const OUTPUT_CONTRACT = `## Output format (set by the system, always applies)

Reply with one JSON object and nothing else, in this shape:
{"pulse":[{"driver":"","prior":"","now":"","signal":"Firm|Balanced|Soft|Watch","read":""}],"products":[{"name":"","paragraphs":[""]}],"macro":[""],"position":[""],"logistics":[""],"call":"","risk":"","recommendations":[{"label":"","text":""}]}

- pulse: four to six rows. driver is two to four words; prior, now and read are each under 25 words; signal is one of the four words given.
- products: one entry per product in the desk draft, with the same names, two to four paragraphs each.
- macro: one or two paragraphs, or an empty list when there is nothing on rates, currencies or policy.
- position and logistics: two or three paragraphs each, one string per paragraph.
- call: one paragraph of 60 to 110 words. risk: one or two sentences.
- Never write the name of a person anywhere: not traders, analysts, authors, desk staff, officials, contacts or the buyer's staff. Refer to the organisation or the role instead ("a European trader", "the Fed", "the desk"). Company, producer, port and institution names are fine.
- Every string is plain text: no Markdown, no line breaks, no bullet characters.`;

/** Added to the system prompt when desk notes or knowledge-base passages are sent with the request. */
export const KNOWLEDGE_RULES = `## Desk knowledge (set by the system, always applies)

The request includes recentDeskNotes (the desk's latest telex notes, newest first) and deskKnowledge (passages from Aquifert's knowledge base chosen for this buyer), each with its date where known.
- These are the desk's current intelligence. Write the market pulse, product sections, macro context, freight and the call from them wherever they cover the topic. Use deskViews only where they are silent. This overrides any instruction above to use only the desk's market views.
- Prior read comes from notes before the latest week; This week comes from the newest notes. When only one week is covered, Prior read states the standing desk view.
- Carry over the concrete developments: trades with price, tonnage and shipment month, tenders, export quotas and policy, plant outages, freight and port conditions. Market prices and tonnages in the notes may be cited as indicative levels. This overrides any instruction above not to quote prices; never present them as an Aquifert offer.
- Prefer the newest note when sources disagree. Ignore material that does not bear on this buyer's products, route or months.
- Take prices, tonnages and other figures only from the notes, the passages, deskViews or deskDraft. Never invent figures.
- Name producers, origins and buying companies as the notes do, but never a person, and never name or cite the note, file or report a fact came from.`;

/** The user turn: the buyer's answers, the desk-rules draft, the desk's market views, the latest desk notes and any knowledge-base passages. */
export function briefRequest(answers: NitrogenAnswers, draft: NitrogenBrief, reference: DeskReference, knowledge: DeskPassage[] = [], notes: DeskPassage[] = []) {
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
      deskDraft: { pulse: draft.pulse, position: draft.position, products: draft.products, logistics: draft.logistics, call: draft.call, recommendations: draft.recommendations },
      ...(notes.length ? { recentDeskNotes: notes } : {}),
      ...(knowledge.length ? { deskKnowledge: knowledge } : {}),
    },
    null,
    2,
  );
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Plain text: no Markdown emphasis or headings, single spaces, capped length. */
export function cleanText(value: unknown, max = MAX_TEXT) {
  if (typeof value !== "string") return "";
  return value
    .replace(/\*\*|__|`/g, "")
    .replace(/^\s*(#+|[-*•]|\d+[.)])\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

const paragraphs = (value: unknown, max: number) => (Array.isArray(value) ? value.map((item) => cleanText(item)).filter(Boolean).slice(0, max) : []);
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

const signalOf = (value: unknown, fallback: PulseSignal) => (SIGNALS.includes(value as PulseSignal) ? (value as PulseSignal) : fallback);

/** The model's own market drivers, used when it gives at least two complete rows. */
function driverRows(rows: Record<string, unknown>[]): PulseRow[] {
  const drivers = rows
    .map((item) => ({ market: cleanText(item.driver, 60), prior: cleanText(item.prior, MAX_CELL), view: cleanText(item.now, MAX_CELL), signal: signalOf(item.signal, "Balanced"), read: cleanText(item.read, 120) }))
    .filter((row) => row.market && row.view)
    .slice(0, MAX_DRIVERS)
    .map(({ prior, read, ...row }) => ({ ...row, ...(prior ? { prior } : {}), ...(read ? { read } : {}) }));
  return drivers.length >= 2 ? drivers : [];
}

/** Puts the model's wording onto the desk draft. `parts` counts how many parts the model supplied. */
export function mergeReply(draft: NitrogenBrief, reply: Record<string, unknown>): { brief: NitrogenBrief; parts: number } {
  let parts = 0;
  const rows = Array.isArray(reply.pulse) ? reply.pulse.filter(isRecord) : [];
  const drivers = driverRows(rows);
  const pulse = drivers.length
    ? drivers
    : draft.pulse.map((row) => {
        const match = rows.find((item) => typeof item.market === "string" && same(item.market, row.market));
        const view = cleanText(match?.view);
        return view ? { market: row.market, view, signal: signalOf(match?.signal, row.signal) } : row;
      });
  if (drivers.length || pulse.some((row, index) => row !== draft.pulse[index])) parts += 1;

  const position = paragraphs(reply.position, 6);
  if (position.length) parts += 1;

  const items = Array.isArray(reply.products) ? reply.products.filter(isRecord) : [];
  const products = draft.products.map((product) => {
    const match = items.find((item) => typeof item.name === "string" && same(item.name, product.name));
    const written = paragraphs(match?.paragraphs, 5);
    return {
      name: product.name,
      note: cleanText(match?.note) || product.note,
      view: cleanText(match?.view) || product.view,
      ...(written.length ? { paragraphs: written } : {}),
    };
  });
  if (products.some((item, index) => item.paragraphs || item.note !== draft.products[index].note || item.view !== draft.products[index].view)) parts += 1;

  const macro = paragraphs(reply.macro, 3);
  if (macro.length) parts += 1;

  const logistics = paragraphs(reply.logistics, 6);
  if (logistics.length) parts += 1;

  const call = cleanText(reply.call, 1200);
  const risk = cleanText(reply.risk, 600);
  if (call) parts += 1;

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
      ...(macro.length ? { macro } : {}),
      logistics: logistics.length ? logistics : draft.logistics,
      call: call || draft.call,
      ...(call && risk ? { risk } : {}),
      recommendations: recommendations.length ? recommendations : draft.recommendations,
    },
    parts,
  };
}
