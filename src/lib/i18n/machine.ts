import "server-only";

import { EXTRACTION_MODEL, generateText, geminiKey } from "@/lib/aquibot-engine/gemini";
import { readDocument, updateDocument } from "@/lib/data/documents";
import { languageFor, type LangCode } from "@/lib/i18n/locales";
import { acceptTranslations, batchTexts, parseTranslationArray, protectTerms, restoreTerms } from "@/lib/i18n/machine-text";

const MODEL = EXTRACTION_MODEL;
const GOOGLE_URL = "https://translate.googleapis.com/translate_a/t?client=gtx&dt=t&sl=en&tl=";
const GOOGLE_LANG: Partial<Record<LangCode, string>> = { zh: "zh-CN" };
const BATCH_CHARS = 4500;
const BATCH_ITEMS = 50;
const PARALLEL = 4;
const RELOAD_MS = 10 * 60_000;

type Cache = { entries: Map<string, string>; loadedAt: number };
const caches = new Map<LangCode, Cache>();
const loading = new Map<LangCode, Promise<Cache>>();

const docKey = (lang: LangCode) => `ui-translations-${lang}` as const;

function entriesOf(raw: unknown): Record<string, string> {
  if (typeof raw !== "object" || raw === null) return {};
  const entries = (raw as { entries?: unknown }).entries;
  if (typeof entries !== "object" || entries === null) return {};
  return Object.fromEntries(Object.entries(entries).filter((pair): pair is [string, string] => typeof pair[1] === "string"));
}

async function loadCache(lang: LangCode): Promise<Cache> {
  const current = caches.get(lang);
  if (current && Date.now() - current.loadedAt < RELOAD_MS) return current;
  const pending = loading.get(lang);
  if (pending) return pending;
  const task = (async () => {
    const stored = await readDocument(docKey(lang)).catch(() => null);
    const entries = new Map(Object.entries(entriesOf(stored)));
    for (const [source, text] of current?.entries ?? []) if (!entries.has(source)) entries.set(source, text);
    const next = { entries, loadedAt: Date.now() };
    caches.set(lang, next);
    return next;
  })().finally(() => loading.delete(lang));
  loading.set(lang, task);
  return task;
}

function systemPrompt(lang: LangCode) {
  const language = languageFor(lang).englishName;
  return [
    `You translate the interface and content of Aquifert, a fertilizer trading and market intelligence platform, from English into ${language}.`,
    `You receive a JSON array of strings. Reply with only a JSON array of the same length, holding the ${language} translation of each string in the same order.`,
    "Rules:",
    "- Keep every placeholder such as {0} or {1} exactly as written; they stand for numbers. Reorder them only when the grammar needs it.",
    "- Keep these unchanged: brand and product names (Aquifert, Aquifert ONE, Aquibot, AQ ONE, AQ Zero, AQ Analytics, AQ Signal, AQ TELEX, Telex, Netback); currencies and units (USD, USD/t, $/t, MT, Mt, kt, t); Incoterms (FOB, CFR, CIF, DES, FCA); fertilizer codes (DAP, MAP, MOP, SOP, TSP, NPK, UAN, AN, CAN, AS); vessel classes (Handysize, Supramax, Ultramax, Panamax, Kamsarmax, Capesize); port and company names; email addresses, URLs and Markdown markup.",
    "- Use the standard terminology of the fertilizer and shipping trade. Keep the tone short and clear, like product UI.",
    "- A string may be a fragment of a longer sentence; translate it so it still reads naturally next to its neighbours, keeping any leading or trailing punctuation.",
    "- If a string is already in the target language, or is only a name or code, return it unchanged.",
  ].join("\n");
}

async function translateBatch(lang: LangCode, batch: string[]): Promise<Record<string, string>> {
  const { text } = await generateText({
    model: MODEL,
    system: systemPrompt(lang),
    turns: [{ role: "user", text: JSON.stringify(batch) }],
    temperature: 0.2,
    maxOutputTokens: 16_384,
    timeoutMs: 45_000,
    fast: true,
  });
  const translated = parseTranslationArray(text, batch.length);
  if (!translated) {
    if (batch.length === 1) return {};
    const half = Math.ceil(batch.length / 2);
    const [left, right] = await Promise.all([translateBatch(lang, batch.slice(0, half)), translateBatch(lang, batch.slice(half))]);
    return { ...left, ...right };
  }
  return acceptTranslations(batch, translated);
}

async function googleRequest(lang: LangCode, texts: string[]): Promise<string[]> {
  const body = new URLSearchParams();
  for (const text of texts) body.append("q", text);
  const response = await fetch(`${GOOGLE_URL}${GOOGLE_LANG[lang] ?? lang}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body,
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Google Translate returned HTTP ${response.status}.`);
  const json = (await response.json()) as unknown;
  const translated = Array.isArray(json) ? json.map((item) => (typeof item === "string" ? item : Array.isArray(item) && typeof item[0] === "string" ? item[0] : "")) : [];
  if (translated.length !== texts.length) throw new Error(`Google Translate returned ${translated.length} strings for ${texts.length}.`);
  return translated;
}

/**
 * Google's keyless translate endpoint, used when Gemini is not configured or misses strings. Brand names and
 * codes are shielded first; a string whose shield got lost is sent again as plain text rather than left in English.
 */
async function translateWithGoogle(lang: LangCode, batch: string[]): Promise<Record<string, string>> {
  const prepared = batch.map(protectTerms);
  const shielded = acceptTranslations(
    prepared.map((item) => item.text),
    await googleRequest(lang, prepared.map((item) => item.text)),
  );
  const out: Record<string, string> = {};
  const retry: string[] = [];
  prepared.forEach((item, i) => {
    const result = shielded[item.text];
    if (result) out[batch[i]] = restoreTerms(result, item.terms);
    else retry.push(batch[i]);
  });
  if (retry.length) Object.assign(out, acceptTranslations(retry, await googleRequest(lang, retry)));
  return out;
}

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function translateChunk(lang: LangCode, batch: string[]) {
  const out: Record<string, string> = {};
  if (geminiKey()) {
    Object.assign(
      out,
      await translateBatch(lang, batch).catch((error: unknown) => {
        warnOnce(`Gemini translation failed, using Google Translate: ${describe(error)}`);
        return {};
      }),
    );
  }
  const rest = batch.filter((text) => !(text in out));
  if (rest.length) {
    Object.assign(
      out,
      await translateWithGoogle(lang, rest).catch((error: unknown) => {
        warnOnce(`Google Translate failed: ${describe(error)}`);
        return {};
      }),
    );
  }
  return out;
}

/**
 * Translations for `texts`, from the shared cache first and the translators for the rest (at most `maxNew` new strings).
 * `fresh` holds what was newly translated, for the caller to persist with `saveTranslations`.
 */
export async function translateTexts(lang: LangCode, texts: string[], maxNew: number) {
  const cache = await loadCache(lang);
  const translations: Record<string, string> = {};
  const missing: string[] = [];
  for (const text of new Set(texts)) {
    const hit = cache.entries.get(text);
    if (hit !== undefined) translations[text] = hit;
    else missing.push(text);
  }

  const fresh: Record<string, string> = {};
  const todo = missing.slice(0, Math.max(0, maxNew));
  if (todo.length) {
    const queue = batchTexts(todo, BATCH_ITEMS, BATCH_CHARS);
    const worker = async () => {
      for (let batch = queue.shift(); batch; batch = queue.shift()) Object.assign(fresh, await translateChunk(lang, batch));
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, worker));
    for (const [source, text] of Object.entries(fresh)) cache.entries.set(source, text);
    Object.assign(translations, fresh);
  }
  return { translations, fresh, attempted: todo.length };
}

const warnedAt = new Map<string, number>();

function warnOnce(message: string) {
  const last = warnedAt.get(message) ?? 0;
  if (Date.now() - last < RELOAD_MS) return;
  warnedAt.set(message, Date.now());
  console.error(`[i18n] ${message}`);
}

export async function saveTranslations(lang: LangCode, fresh: Record<string, string>) {
  if (!Object.keys(fresh).length) return;
  try {
    await updateDocument(docKey(lang), (current) => ({ entries: { ...entriesOf(current), ...fresh } }));
  } catch (error) {
    warnOnce(`Could not save translations; they stay cached in memory. ${describe(error)}`);
  }
}
