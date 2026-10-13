/**
 * The admin-controlled Nitrogen report template, in two halves:
 * - content: whether AI writes the brief, the prompt it follows and the desk market views it writes from;
 * - design: colours, header and footer wording, section headings, order and visibility.
 * Content applies to briefs written after a save. Design applies to every brief, old and new, when it is shown.
 */

import { AQUIBOT_MODELS } from "@/lib/aquibot";
import { PACKING, PRODUCTS, SHIPMENT_TYPES, upcomingMonths, type NitrogenAnswers } from "@/lib/nitrogen/engine";
import { DEFAULT_REFERENCE, type DeskReference, type PulseSignal } from "@/lib/nitrogen/reference";

export const PULSE_SIGNALS: PulseSignal[] = ["Firm", "Balanced", "Soft", "Watch"];

export type BriefContent = {
  aiEnabled: boolean;
  model: string;
  /** Ground each brief on passages from the Aquibot knowledge base, limited to the buyer's plan. */
  useKnowledge: boolean;
  prompt: string;
  /** The prompt before the last save that changed it, for one-step undo. */
  previousPrompt: string;
  reference: DeskReference;
};

export const BRIEF_SECTION_KEYS = ["requirement", "pulse", "position", "products", "logistics", "recommendations"] as const;
export type BriefSectionKey = (typeof BRIEF_SECTION_KEYS)[number];

export const BRIEF_SECTION_INFO: Record<BriefSectionKey, { name: string; about: string }> = {
  requirement: { name: "Supply requirement", about: "The table of what the member asked for." },
  pulse: { name: "Market pulse", about: "One row per product plus freight, with a signal." },
  position: { name: "The position", about: "The desk's read of the programme, in AQ View boxes." },
  products: { name: "Product sections", about: "One section per product. {product} becomes the product name." },
  logistics: { name: "Logistics and shipment plan", about: "Shipment mode, packing and parcel plan." },
  recommendations: { name: "Recommendations", about: "What to do now, watch and avoid, in AQ View boxes." },
};

export const BRIEF_COLOR_KEYS = ["header", "accent", "accentLight", "notice", "noticeText", "body", "muted"] as const;
export type BriefColorKey = (typeof BRIEF_COLOR_KEYS)[number];

export const BRIEF_COLOR_INFO: Record<BriefColorKey, { name: string; about: string }> = {
  header: { name: "Header and table heads", about: "The band at the top and the table heading rows." },
  accent: { name: "Accent", about: "Section rules, the AQ View label and the Firm signal." },
  accentLight: { name: "Accent tint", about: "AQ View boxes and every other table row." },
  notice: { name: "Disclaimer strip", about: "The strip under the header." },
  noticeText: { name: "Disclaimer text", about: "Text on the disclaimer strip." },
  body: { name: "Body text", about: "Paragraphs and table cells." },
  muted: { name: "Quiet text", about: "The quote, footer and page numbers." },
};

export const TEXT_SIZES = [
  { value: "compact", label: "Compact", scale: 0.92 },
  { value: "standard", label: "Standard", scale: 1 },
  { value: "large", label: "Large", scale: 1.1 },
] as const;
export type TextSize = (typeof TEXT_SIZES)[number]["value"];

export type BriefDesign = {
  colors: Record<BriefColorKey, string>;
  textSize: TextSize;
  showLogo: boolean;
  title: string;
  subtitle: string;
  preparedBy: string;
  confidential: string;
  disclaimer: string;
  viewLabel: string;
  sections: { key: BriefSectionKey; heading: string; hidden: boolean }[];
  quote: { text: string; source: string; hidden: boolean };
  footer: string;
};

export type NitrogenTemplate = {
  content: BriefContent;
  design: BriefDesign;
  meta: { content?: { at: string; by: string }; design?: { at: string; by: string } };
};

/* -------------------------------------------------------------- defaults */

export const DEFAULT_BRIEF_PROMPT = `# AQ View Nitrogen Brief: writing guide

You are the Aquifert Trading Desk writing an AQ VIEW SPECIAL EDITION Nitrogen Brief for one buyer. The buyer completed a short survey: products, annual tonnage, destination, preferred origin, arrival months, shipment type, packing and preferred cargo size. You receive their answers, the desk's draft brief built from house rules, and the desk's current market views.

## Voice

- Write as an experienced physical fertiliser trader advising a client. Calm, specific, commercial.
- Address the buyer by their company name, never as "you guys" or "the client".
- One point per paragraph. Keep sentences under 20 words where possible.
- State genuine uncertainty plainly. Never invent prices, deals, vessels, suppliers or transactions.
- Prices are never quoted. Any pricing is landed cost: supplier cost plus pass-through freight and a stated fee.

## House style

- British spelling (fertiliser, programme, sulphur, harbour).
- Metric tonnes written as "MT", with thousands separated by commas (12,000 MT).
- No em dashes, no exclamation marks, no ellipses, no bullet points inside paragraphs, no Markdown formatting.

## What each part must do

- Market pulse: one short view per product and one for freight, based on the desk's market views. Keep each signal unless the desk view clearly says otherwise.
- The position: three to five paragraphs on what this programme means. Cover the product mix, volume and arrival window, the shipment mode and parcel structure, and the origin approach.
- Product sections: for each product, a short product note and the desk's read for a buyer into this destination.
- Logistics and shipment plan: the shipment mode, the packing and the parcel schedule against the preferred cargo size.
- Recommendations: exactly three, labelled "What to do now", "What to watch" and "What to avoid". The first always invites the buyer to send the brief to the desk as a sourcing request on Aquifert ONE.

## Grounding

- Use the figures in the desk draft (parcels, parcel size, months, tonnage) exactly. Do not recalculate them.
- Use only the desk's market views and the desk knowledge passages for market direction. Do not add outside market news.`;

export const DEFAULT_CONTENT: BriefContent = {
  aiEnabled: true,
  model: "gemini-3.8-flash",
  useKnowledge: true,
  prompt: DEFAULT_BRIEF_PROMPT,
  previousPrompt: "",
  reference: DEFAULT_REFERENCE,
};

export const DEFAULT_DESIGN: BriefDesign = {
  colors: {
    header: "#1a2b4a",
    accent: "#2e9e8f",
    accentLight: "#e9f5f3",
    notice: "#fff8e1",
    noticeText: "#8a6508",
    body: "#2d3748",
    muted: "#6b7280",
  },
  textSize: "standard",
  showLogo: true,
  title: "AQ VIEW SPECIAL EDITION | Nitrogen Brief",
  subtitle: "{partner} Partnership Intelligence",
  preparedBy: "Prepared by the Aquifert Trading Desk",
  confidential: "Confidential. Not for redistribution.",
  disclaimer: "Prepared exclusively for {partner}. Assessments are indicative and drawn from desk reference data. Prices are not quotations and do not constitute trading recommendations.",
  viewLabel: "AQ View",
  sections: [
    { key: "requirement", heading: "Supply Requirement", hidden: false },
    { key: "pulse", heading: "Market Pulse | {week}", hidden: false },
    { key: "position", heading: "The Position", hidden: false },
    { key: "products", heading: "{product}", hidden: false },
    { key: "logistics", heading: "Logistics and Shipment Plan", hidden: false },
    { key: "recommendations", heading: "Recommendations", hidden: false },
  ],
  quote: {
    text: "The intelligent investor is a realist who sells to optimists and buys from pessimists.",
    source: "Benjamin Graham, The Intelligent Investor, 1949",
    hidden: false,
  },
  footer: "Aquifert ONE Hub | aquifert.com | 71-75 Shelton Street, London WC2H 9JQ",
};

export const DEFAULT_TEMPLATE: NitrogenTemplate = { content: DEFAULT_CONTENT, design: DEFAULT_DESIGN, meta: {} };

/* ---------------------------------------------------------------- limits */

export const LIMITS = {
  prompt: 20_000,
  view: 800,
  title: 120,
  line: 200,
  disclaimer: 600,
  label: 24,
  heading: 80,
  quote: 400,
} as const;

/* ------------------------------------------------------------- normalise */

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const str = (value: unknown, max: number, fallback: string) => (typeof value === "string" ? value.slice(0, max) : fallback);
const signal = (value: unknown, fallback: PulseSignal) => (PULSE_SIGNALS.includes(value as PulseSignal) ? (value as PulseSignal) : fallback);
export const isHexColor = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

function textMap(raw: unknown, keys: string[], defaults: Record<string, string>) {
  const value = isRecord(raw) ? raw : {};
  return Object.fromEntries(keys.map((key) => [key, str(value[key], LIMITS.view, defaults[key] ?? "")]));
}

export function normalizeReference(raw: unknown): DeskReference {
  const value = isRecord(raw) ? raw : {};
  const products = isRecord(value.products) ? value.products : {};
  const freight = isRecord(value.freight) ? value.freight : {};
  return {
    products: Object.fromEntries(
      PRODUCTS.map((name) => {
        const base = DEFAULT_REFERENCE.products[name];
        const item = isRecord(products[name]) ? products[name] : {};
        return [name, { view: str(item.view, LIMITS.view, base.view), signal: signal(item.signal, base.signal), note: str(item.note, LIMITS.view, base.note) }];
      }),
    ),
    freight: Object.fromEntries(
      SHIPMENT_TYPES.map((type) => {
        const base = DEFAULT_REFERENCE.freight[type];
        const item = isRecord(freight[type]) ? freight[type] : {};
        return [type, { view: str(item.view, LIMITS.view, base.view), signal: signal(item.signal, base.signal) }];
      }),
    ),
    shipping: textMap(value.shipping, SHIPMENT_TYPES, DEFAULT_REFERENCE.shipping),
    packing: textMap(value.packing, PACKING, DEFAULT_REFERENCE.packing),
  };
}

export function normalizeContent(raw: unknown): BriefContent {
  const value = isRecord(raw) ? raw : {};
  return {
    aiEnabled: typeof value.aiEnabled === "boolean" ? value.aiEnabled : DEFAULT_CONTENT.aiEnabled,
    model: AQUIBOT_MODELS.some((item) => item.value === value.model) ? String(value.model) : DEFAULT_CONTENT.model,
    useKnowledge: typeof value.useKnowledge === "boolean" ? value.useKnowledge : DEFAULT_CONTENT.useKnowledge,
    prompt: str(value.prompt, LIMITS.prompt, DEFAULT_CONTENT.prompt),
    previousPrompt: str(value.previousPrompt, LIMITS.prompt, ""),
    reference: normalizeReference(value.reference),
  };
}

/** Keeps the saved section order, drops unknown or repeated keys, and appends any section the saved list lacks. */
export function normalizeSections(raw: unknown): BriefDesign["sections"] {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<BriefSectionKey>();
  const out: BriefDesign["sections"] = [];
  for (const item of list) {
    if (!isRecord(item) || !BRIEF_SECTION_KEYS.includes(item.key as BriefSectionKey) || seen.has(item.key as BriefSectionKey)) continue;
    const key = item.key as BriefSectionKey;
    const base = DEFAULT_DESIGN.sections.find((section) => section.key === key)!;
    seen.add(key);
    out.push({ key, heading: str(item.heading, LIMITS.heading, base.heading), hidden: item.hidden === true });
  }
  for (const base of DEFAULT_DESIGN.sections) if (!seen.has(base.key)) out.push({ ...base });
  return out;
}

export function normalizeDesign(raw: unknown): BriefDesign {
  const value = isRecord(raw) ? raw : {};
  const colors = isRecord(value.colors) ? value.colors : {};
  const quote = isRecord(value.quote) ? value.quote : {};
  const d = DEFAULT_DESIGN;
  return {
    colors: Object.fromEntries(BRIEF_COLOR_KEYS.map((key) => [key, isHexColor(colors[key]) ? String(colors[key]).toLowerCase() : d.colors[key]])) as BriefDesign["colors"],
    textSize: TEXT_SIZES.some((size) => size.value === value.textSize) ? (value.textSize as TextSize) : d.textSize,
    showLogo: typeof value.showLogo === "boolean" ? value.showLogo : d.showLogo,
    title: str(value.title, LIMITS.title, d.title),
    subtitle: str(value.subtitle, LIMITS.line, d.subtitle),
    preparedBy: str(value.preparedBy, LIMITS.line, d.preparedBy),
    confidential: str(value.confidential, LIMITS.line, d.confidential),
    disclaimer: str(value.disclaimer, LIMITS.disclaimer, d.disclaimer),
    viewLabel: str(value.viewLabel, LIMITS.label, d.viewLabel),
    sections: normalizeSections(value.sections),
    quote: { text: str(quote.text, LIMITS.quote, d.quote.text), source: str(quote.source, LIMITS.line, d.quote.source), hidden: quote.hidden === true },
    footer: str(value.footer, LIMITS.line, d.footer),
  };
}

/** Returns the first problem that should stop a save, or null. */
export function contentProblem(content: BriefContent): string | null {
  if (content.aiEnabled && content.prompt.trim().length < 40) return "The prompt is too short to guide the writing. Add more, or switch AI writing off.";
  for (const [name, item] of Object.entries(content.reference.products)) if (!item.view.trim() || !item.note.trim()) return `Add the market view and product note for ${name}.`;
  for (const [type, item] of Object.entries(content.reference.freight)) if (!item.view.trim()) return `Add the freight view for ${type}.`;
  return null;
}

export function designProblem(design: BriefDesign): string | null {
  if (!design.title.trim()) return "The report needs a title.";
  if (!design.viewLabel.trim()) return "Add the label shown on the commentary boxes, such as AQ View.";
  if (design.sections.every((section) => section.hidden)) return "Show at least one section.";
  const blank = design.sections.find((section) => !section.hidden && !section.heading.trim());
  if (blank) return `Add a heading for ${BRIEF_SECTION_INFO[blank.key].name}, or hide it.`;
  return null;
}

/* ---------------------------------------------------------------- sample */

/** The made-up buyer used for previews and test runs in admin. */
export function sampleAnswers(from = new Date()): NitrogenAnswers {
  const months = upcomingMonths(from);
  return {
    destinationCountry: "Kenya",
    destinationPort: "Mombasa",
    preferredOrigin: "",
    products: ["Urea", "CAN"],
    annualTonnage: "24,000",
    arrivalMonths: [months[2], months[3], months[5]],
    shipmentType: "Bulk",
    packing: "Big Bags",
    cargoSize: "6,000",
  };
}

export const SAMPLE_PARTNER = "Example Agri Ltd";

/* ------------------------------------------------------------- rendering */

export type Fill = { partner?: string; week?: string; product?: string };

/** Swaps {partner}, {week} and {product} for the brief's values. */
export const fill = (text: string, values: Fill) =>
  text.replace(/\{(partner|week|product)\}/g, (match, key: keyof Fill) => (values[key] !== undefined ? String(values[key]) : match));

export const visibleSections = (design: BriefDesign) => design.sections.filter((section) => !section.hidden);

export const textScale = (design: BriefDesign) => TEXT_SIZES.find((size) => size.value === design.textSize)?.scale ?? 1;

export function hexToRgb(hex: string): [number, number, number] {
  const value = isHexColor(hex) ? hex : "#000000";
  return [parseInt(value.slice(1, 3), 16), parseInt(value.slice(3, 5), 16), parseInt(value.slice(5, 7), 16)];
}
