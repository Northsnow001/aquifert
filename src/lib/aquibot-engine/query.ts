export type QueryIntent = "technical" | "price" | "news" | "general";
export type TechnicalSubtype = "" | "spec" | "process" | "compound_spec_and_process";

const SPEC_CUE = /\b(specs?|specifications?|grades?|purity|assay|composition|chemical|nutrient content|moisture|biuret|particle size)\b/i;
const PROCESS_CUE =
  /\b(formulation|granulation|granular|granules?|prill(?:ed|ing|s)?|production|produced|produce|process(?:es|ing)?|methods?|manufactur\w*|synthesis|reaction|plant operations?)\b|\bhow\s+(?:is|are)\s+[\w\s-]{1,40}?\s+(?:made|produced|manufactured)\b/i;
const PRICE_CUE = /\b(prices?|pricing|priced|quotes?|quoted|fob|cfr|cif|spot|netback|offers?|bids?|assessment|benchmark)\b|\$\s?\d|\/\s?mt\b|\bper\s+(?:tonne|ton|mt)\b|\busd\s?\d/i;
const NEWS_CUE =
  /\b(news|headlines?|updates?|happening|summary|summari[sz]e|recap|latest|recent|current|today|bullish|bearish|sentiment|outlook)\b|\bthis\s+(?:week|month)\b|\bmarket\s+(?:mood|sentiment|update)\b/i;

export function detectIntent(text: string): { intent: QueryIntent; technicalSubtype: TechnicalSubtype } {
  const spec = SPEC_CUE.test(text);
  const process = PROCESS_CUE.test(text);
  if (spec || process) {
    return { intent: "technical", technicalSubtype: spec && process ? "compound_spec_and_process" : spec ? "spec" : "process" };
  }
  if (PRICE_CUE.test(text)) return { intent: "price", technicalSubtype: "" };
  if (NEWS_CUE.test(text)) return { intent: "news", technicalSubtype: "" };
  return { intent: "general", technicalSubtype: "" };
}

export const DOMAIN_CODES = new Set(["dap", "map", "tsp", "ssp", "mop", "sop", "nop", "cfr", "cif", "fob", "fca", "uan", "npk", "ams", "nh3", "uk", "eu"]);

const FILLER = new Set([
  "what", "whats", "which", "where", "when", "whom", "whose", "about", "there", "their", "these", "those", "that", "this", "with", "from",
  "have", "has", "been", "were", "will", "would", "could", "should", "shall", "into", "onto", "over", "under", "than", "then", "them",
  "they", "your", "yours", "mine", "ours", "tell", "give", "show", "please", "know", "need", "want", "like", "some", "much", "many",
  "more", "most", "also", "just", "does", "doing", "done", "being", "here", "only", "very", "such", "each", "other", "info",
  "information", "details", "detail", "anything", "something", "explain", "describe", "can", "you",
]);

const TOKEN = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

export function tokens(text: string) {
  return (text.toLowerCase().match(TOKEN) ?? []).map((token) => token.replace(/['’]s$/, ""));
}

/** Meaningful query words: 4+ letters or a domain code, minus stop words and filler. Order is kept for phrase matching. */
export function keywordTokens(text: string, stopWords: string[]) {
  const stop = new Set(stopWords.map((word) => word.toLowerCase()));
  const out: string[] = [];
  for (const token of tokens(text)) {
    if (stop.has(token) || FILLER.has(token)) continue;
    if (token.length >= 4 || DOMAIN_CODES.has(token) || /\d/.test(token)) {
      if (!out.includes(token)) out.push(token);
    }
  }
  return out;
}

function escape(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const hasWord = (haystack: string, needle: string) => new RegExp(`(?:^|[^\\p{L}\\p{N}])${escape(needle)}(?:$|[^\\p{L}\\p{N}])`, "u").test(haystack);

/** Single-word hits plus double credit for 2–3 word query phrases found verbatim. */
export function countKeywordHits(content: string, keywords: string[]) {
  if (keywords.length === 0) return 0;
  const haystack = content.toLowerCase();
  let hits = 0;
  for (const keyword of keywords) if (hasWord(haystack, keyword)) hits += 1;
  for (let size = 2; size <= 3; size += 1) {
    for (let i = 0; i + size <= keywords.length; i += 1) {
      if (hasWord(haystack, keywords.slice(i, i + size).join(" "))) hits += 2;
    }
  }
  return hits;
}

export const GEO_TERMS = [
  "algeria", "angola", "arab gulf", "argentina", "australia", "baltic", "bangladesh", "benin", "black sea", "brazil", "bulgaria", "cameroon",
  "canada", "chile", "china", "colombia", "cote d'ivoire", "egypt", "ethiopia", "europe", "france", "germany", "ghana", "india", "indonesia",
  "iran", "iraq", "ivory coast", "jordan", "kenya", "lithuania", "malaysia", "mexico", "middle east", "morocco", "mozambique", "nigeria",
  "nola", "oman", "pakistan", "peru", "philippines", "poland", "qatar", "romania", "russia", "saudi arabia", "senegal", "south africa",
  "south korea", "spain", "sri lanka", "sudan", "tanzania", "thailand", "togo", "trinidad", "tunisia", "turkey", "uganda", "ukraine",
  "united kingdom", "united states", "us gulf", "uzbekistan", "vietnam", "west africa", "east africa", "southeast asia", "latin america",
  "yuzhny", "tampa", "rostock", "odesa", "novorossiysk", "jorf lasfar", "ruwais", "jubail", "lagos", "apapa", "onne", "mombasa",
  "dar es salaam", "durban", "paranagua", "rio grande", "santos", "chittagong", "karachi", "kandla", "mundra", "paradip", "vizag",
];

export function geoTerms(text: string) {
  const haystack = text.toLowerCase();
  return GEO_TERMS.filter((term) => hasWord(haystack, term));
}

export function weekFromTitle(title: string) {
  const match = title.match(/week\s*(\d{1,2})[_\-\s]*(20\d{2})/i);
  return match ? { week: Number(match[1]), year: Number(match[2]) } : null;
}

const BENCHMARK = /\b(benchmark|price data|price assessment|weekly price|price report|prices?\s+week)\b/i;
const TECHNICAL_SOURCE = /\b(unido|product spec\w*|specifications?|fertili[sz]er manual)\b/i;

export function isBenchmarkSource(title: string) {
  return BENCHMARK.test(title);
}

export function isTechnicalSource(title: string) {
  return TECHNICAL_SOURCE.test(title);
}
