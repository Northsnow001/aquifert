const NUMBER = /\d+(?:[.,:]\d+)*/g;
const TEMPLATE_MAX = 80;
const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;

/**
 * Lifts numbers out of short labels as {0}, {1}… so "USD 400" and "USD 410" share one translation.
 * Longer prose keeps its numbers: translators drop placeholders in dense sentences.
 */
export function toTemplate(text: string) {
  if (text.length > TEMPLATE_MAX) return { key: text, numbers: [] as string[] };
  const numbers: string[] = [];
  const key = text.replace(NUMBER, (match) => `{${numbers.push(match) - 1}}`);
  return { key, numbers };
}

export function fillTemplate(translated: string, numbers: string[]) {
  return translated.replace(ZERO_WIDTH, "").replace(/\{(\d+)\}/g, (match, index: string) => numbers[Number(index)] ?? match);
}

const PROTECTED_TERMS = [
  "Aquifert ONE",
  "Aquifert",
  "Aquibot",
  "AQ ONE",
  "AQ Zero",
  "AQ Analytics",
  "AQ Signal",
  "AQ TELEX",
  "Telex",
  "TELEX",
  "Netback",
  "netback",
  "USD/t",
  "USD",
  "FOB",
  "CFR",
  "CIF",
  "DES",
  "FCA",
  "DAP",
  "MAP",
  "MOP",
  "SOP",
  "TSP",
  "NPK",
  "UAN",
  "CSV",
];
const TERM_PATTERN = new RegExp(`(?<![\\w/])(${PROTECTED_TERMS.map((term) => term.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")).join("|")})(?![\\w/])`, "g");
const TERM_BASE = 500;

/** Swaps brand names and trade codes for {500}, {501}… so a general-purpose translator leaves them alone. */
export function protectTerms(text: string) {
  const terms: string[] = [];
  const protectedText = text.replace(TERM_PATTERN, (match) => `{${TERM_BASE + terms.push(match) - 1}}`);
  return { text: protectedText, terms };
}

export function restoreTerms(translated: string, terms: string[]) {
  return translated.replace(/\{(\d+)\}/g, (match, index: string) => (Number(index) >= TERM_BASE ? (terms[Number(index) - TERM_BASE] ?? match) : match));
}

const placeholders = (text: string) => (text.match(/\{\d+\}/g) ?? []).sort().join(" ");

/** The model's reply as one string per input, or null when it is not a JSON array of the right length. */
export function parseTranslationArray(text: string, length: number): string[] | null {
  const body = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    const parsed = JSON.parse(body) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== length || !parsed.every((item) => typeof item === "string")) return null;
    return parsed as string[];
  } catch {
    return null;
  }
}

/** Pairs sources with translations, dropping empty answers and any that lost or invented a placeholder. */
export function acceptTranslations(sources: string[], translated: string[]) {
  const out: Record<string, string> = {};
  sources.forEach((source, i) => {
    const result = translated[i]?.replace(ZERO_WIDTH, "").trim();
    if (result && placeholders(result) === placeholders(source)) out[source] = result;
  });
  return out;
}

export function batchTexts(texts: string[], maxItems: number, maxChars: number) {
  const out: string[][] = [];
  let current: string[] = [];
  let size = 0;
  for (const text of texts) {
    if (current.length && (current.length >= maxItems || size + text.length > maxChars)) {
      out.push(current);
      current = [];
      size = 0;
    }
    current.push(text);
    size += text.length;
  }
  if (current.length) out.push(current);
  return out;
}
