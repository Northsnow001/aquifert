export type AquibotPrompt = {
  /** Replaces the built-in prompt for every member when set. */
  published: string;
  /** Draft used only in admin test mode on the hub chat. */
  test: string;
  /** The published prompt before the last publish, restore or reset. */
  previous: string;
  publishedAt: string | null;
  testSavedAt: string | null;
};

export type AquibotSettings = {
  limitCore: number;
  limitGrowth: number;
  limitEnterprise: number;
  contextWindow: number;
  pruneAgeMonths: number;
  dateGraceDays: number;
  ragTotalBudget: number;
  publicFileBudget: number;
  privateFileBudget: number;
  maxTopChunks: number;
  chatHistoryWindow: number;
  freightRouting: boolean;
  introMessage: string;
  recencyFilter: boolean;
  recencyYears: number;
  benchmarkPriority: boolean;
  monthTokenMatching: boolean;
  answerModel: string;
  rewriteModel: string;
};

export const AQUIBOT_MODELS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", hint: "Fast, low cost" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", hint: "Deeper reasoning, slower" },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", hint: "Fastest, lightest" },
] as const;

export type ExtractionRules = { pdf: string; image: string; telex: string };

export type AquibotConfig = {
  prompt: AquibotPrompt;
  settings: AquibotSettings;
  synonyms: string;
  stopWords: string;
  extraction: ExtractionRules;
  updatedAt: string | null;
};

export const DEFAULT_PROMPT = `# Aquibot System Prompt
*Market Intelligence AI for Aquifert*

---

## Role

You are Aquibot, a market intelligence assistant for Aquifert. Produce accurate, practical answers grounded in the retrieved context. Be direct and data-led — cite specific figures, dates, and routes rather than generalities.

This chat uses a three-stage workflow upstream:
- Present context: recent chat history for continuity
- Past context: retrieved Aquifert RAG content for grounding
- Current user input: the latest message to answer

Treat the retrieved context as the primary source of truth for market facts, and use the present context only to preserve conversation flow and reference resolution.

---

## Response Length

Answer in as few words as the question requires. Simple factual queries may need only 2–3 sentences. Complex market questions may need up to 200 words. Never pad to reach a word count.

---

## Source Routing

Use the right source for each query type:

- **Price queries** — answer from the PRICE DATA FILE chunks only. Do not use telex posts for price figures.
- **Market intelligence queries** — answer from TELEX chunks first (trends, news, supply/demand, outlook).
- **Mixed queries** — give the price from the file, then add market context from telex.

If neither source contains a relevant answer, clearly state what is and isn't available rather than inferring or generalising.

---

## Telex & Market Intelligence

Telex posts are your primary source for market trends, news, supply/demand signals, and general intelligence.
For company/entity lookups, answer from the retrieved chunk that directly mentions the entity when one exists. Do not say the entity is absent if the retrieved context clearly contains it.
Only state a deal, relationship, or transactional connection when one retrieved chunk directly supports that claim. Do not merge separate mentions into a stronger statement.

Weekly intelligence files cover January 2025 to May 2026. Columns: \`Date | Sender | Products | Intelligence\`.

---

## Price Data

Price data files are your primary source for specific benchmark prices. You have weekly and monthly files covering January 2023 to May 2026.

These files appear under the \`--- PRIVATE PRICE DATA & INTELLIGENCE FILES ---\` section of the context. Always scan that section for price entries before concluding any price is unavailable.

**Weekly price file format:**
\`\`\`
Week 21 2026 (19 May 2026): DAP CFR Pakistan = 945-955 USD/t (midpoint 950.0 USD/t).
\`\`\`
Each line encodes: week label, report date, product + incoterm + destination, price range, and midpoint.

Some older files use a column table format with headers: \`PriceDate | Year | Granularity | Series | Price\`.

### Steps to answer a price query

1. Scan **all** retrieved file chunks for the product (e.g. DAP), incoterm (e.g. CFR/FOB), and destination (e.g. Egypt, Pakistan, India). If the user omits the incoterm, return whatever incoterm is found in the data.
2. Match the time period against the pre-resolved date range in \`## DETECTED DATE RANGE\`. Do not re-interpret relative terms like "last week" yourself.
3. Apply this logic:
   - **Entry exists within the resolved window** → return it directly, stating the report date.
   - **No entry in the resolved window, but one exists in the grace window** → respond: *"I don't have data for [requested period], but the most recent available is [report date and period]: [price entry]."*
   - **No entry at all** → only then say the data is unavailable.
4. Return the exact price range and midpoint, and state the report date and product/route.

> **Critical:** Never say a price is unavailable until you have scanned every file chunk, including the PRIVATE PRICE DATA section, and confirmed the product + destination combination is genuinely absent.

---

## File & Source Rules

- If retrieved files answer the question, respond from file facts directly. Do not pivot to market commentary when a file answer exists.
- Tables, charts, or graphs should be read as structured data — rows represent time periods or products; values represent prices or indicators.
- If context uses \`|\` separators or Row/Column labels, treat it as structured data.

### Citation rules

- **Private files:** use content freely but **do not cite the source** in any form — no file name, report name, collection name, or series title. You may quote dates and values (e.g. *"as of 19 May 2026"*) but never phrases like *"according to…"*, *"sourced from…"*, or *"the Aquifert Weekly Price Data…"*. Present figures as direct answers.
- **Public files:** reference normally — cite the file or report name as given.

---

## Closing Question

End each response with one natural follow-up question, only if there is a genuinely useful next topic to explore. Format:

> Would you like to know more about [concrete topic phrase]?

Omit the closing question if no meaningful follow-up exists. Do not use square brackets in the question itself.`;

const SHARED_SYNONYMS = `what is the difference = compare
what's the difference = compare
difference between = compare
versus = vs
compare with = compare
compare to = compare
unloading port = discharge port
load port = loading port
latest = most recent
current = most recent
fertiliser = fertilizer`;

const SHARED_SYNONYMS_TAIL = `prills = prilled
gran = granular
ammonium sulphate = amsul
ammonium nitrate = AN
calcium ammonium nitrate = CAN
di-ammonium phosphate = DAP
mono-ammonium phosphate = MAP
triple super phosphate = TSP
single super phosphate = SSP
muriate of potash = MOP
potassium chloride = MOP
urea ammonium nitrate = UAN
sulphate of potash = SOP
nitrate of potash = NOP
potassium nitrate = NOP
phosphoric acid = phos acid
cfr = cost and freight
cif = cost insurance and freight
fob = free on board
indicative = indication
offer = quote
inquiry = enquiry
vessel = ship
metric tons = MT
tonnes = MT
laycan = laydays
demurrage = dem
despatch = dispatch
bill of lading = BL
discharge port = destination port`;

const SHARED_SYNONYMS_END = `former soviet union = FSU
CIS = FSU
spot = prompt
nearby = prompt
q1 = first quarter
q2 = second quarter
q3 = third quarter
q4 = fourth quarter
annually = yearly
supplier = seller
importer = buyer
purchaser = buyer
exporter = seller
producer = supplier
letter of credit = LC
telegraphic transfer = TT
wire transfer = TT
cash against documents = CAD`;

export const DEFAULT_SYNONYMS = [
  SHARED_SYNONYMS,
  "urea = prilled urea",
  SHARED_SYNONYMS_TAIL,
  "arabian gulf = arab gulf\npersian gulf = arab gulf\nmiddle east = arab gulf",
  SHARED_SYNONYMS_END,
].join("\n");

const LIVE_SYNONYMS = [
  "germany = germany inland\ngermany inland = germany",
  SHARED_SYNONYMS,
  SHARED_SYNONYMS_TAIL,
  "AG = arab gulf\narabian gulf = arab gulf\npersian gulf = arab gulf\nmiddle east = arab gulf",
  SHARED_SYNONYMS_END,
].join("\n");

export const DEFAULT_STOP_WORDS =
  "today,todays,yesterday,yesterdays,tomorrow,tomorrows,this week,last week,next week,this month,last month,next month,this year,last year,next year,this quarter,last quarter,next quarter,q1,q2,q3,q4,jan,feb,mar,apr,may,jun,jul,aug,sep,oct,nov,dec,january,february,march,april,june,july,august,september,october,november,december,monday,tuesday,wednesday,thursday,friday,saturday,sunday,mon,tue,wed,thu,fri,sat,sun,recent,recently,latest,current,currently,now,today's,yesterday's,this morning,this afternoon,this evening,earlier,soon,upcoming,previous,previously,last,next";

export const DEFAULT_EXTRACTION: ExtractionRules = {
  pdf: `Perform a deep analysis and extraction of this PDF document.
Rules:
1. Extract ALL text content accurately.
2. For any TABLES, preserve their structure exactly using Markdown format.
3. For any CHARTS, GRAPHS, or INFOGRAPHICS, provide a detailed textual description of all data points, trends, and values shown.
4. If there are IMAGES that contain relevant context (like products or facilities), describe them briefly.
5. Maintain the logical order of the document.`,
  image: `Please provide a highly detailed textual description of this image for a knowledge base.
Rules:
1. If the image contains TEXT or TABLES, extract them exactly (use Markdown for tables).
2. If the image is a CHART or GRAPH, explain all data points, axes, and trends.
3. If it is a PHOTO or ILLUSTRATION, describe the subjects, context, and any relevant technical details.
4. If it's a technical drawing or schematic, describe the components and their relationships.`,
  telex: `You are processing a market intelligence telex message for a knowledge base. Extract and structure the content clearly.
Rules:
1. Preserve all dates, times, prices, quantities, and numerical data exactly as given.
2. Identify and highlight key market signals, trends, or alerts.
3. Extract any geographic or product-specific details.
4. Note any source attributions or confidence levels mentioned.
5. Organize by topic/market segment if the message covers multiple areas.`,
};

export const DEFAULT_SETTINGS: AquibotSettings = {
  limitCore: 50,
  limitGrowth: 500,
  limitEnterprise: 1000,
  contextWindow: 5,
  pruneAgeMonths: 3,
  dateGraceDays: 14,
  ragTotalBudget: 96000,
  publicFileBudget: 48000,
  privateFileBudget: 48000,
  maxTopChunks: 30,
  chatHistoryWindow: 10,
  freightRouting: false,
  introMessage:
    "I'm Aquibot, your Aquifert market assistant. Ask me about fertiliser markets, trade flows, freight, pricing, technical production and manufacturing processes, or anything across your ONE Hub intelligence.\nAquibot can make mistakes. Always verify before acting on anything market-critical.",
  recencyFilter: true,
  recencyYears: 2,
  benchmarkPriority: true,
  monthTokenMatching: true,
  answerModel: "gemini-2.5-flash",
  rewriteModel: "gemini-2.5-flash",
};

export const AQUIBOT_SEED: AquibotConfig = {
  prompt: { published: "", test: "", previous: "", publishedAt: null, testSavedAt: null },
  settings: DEFAULT_SETTINGS,
  synonyms: LIVE_SYNONYMS,
  stopWords: DEFAULT_STOP_WORDS,
  extraction: DEFAULT_EXTRACTION,
  updatedAt: null,
};

/* ---------------- Synonyms ---------------- */

export type SynonymEntry = { line: number; phrase: string; canonical: string; key: string };
export type VocabularyIssue = { line: number; kind: "invalid" | "duplicate" | "loop" | "self"; message: string };

const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
const words = (value: string) => value.toLowerCase().match(WORD) ?? [];

export function parseSynonyms(text: string) {
  const entries: SynonymEntry[] = [];
  const issues: VocabularyIssue[] = [];
  const seen = new Map<string, SynonymEntry>();

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const value = raw.trim();
    if (!value) return;
    const at = value.indexOf("=");
    const phrase = at >= 0 ? value.slice(0, at).trim() : "";
    const canonical = at >= 0 ? value.slice(at + 1).trim() : "";
    if (!phrase || !canonical) {
      issues.push({ line, kind: "invalid", message: "Needs the form phrase = canonical phrase" });
      return;
    }
    const key = words(phrase).join(" ");
    if (key === words(canonical).join(" ")) {
      issues.push({ line, kind: "self", message: `“${phrase}” maps to itself` });
      return;
    }
    const earlier = seen.get(key);
    if (earlier) {
      issues.push({
        line,
        kind: "duplicate",
        message:
          words(earlier.canonical).join(" ") === words(canonical).join(" ")
            ? `Repeats line ${earlier.line}`
            : `“${phrase}” is already mapped to “${earlier.canonical}” on line ${earlier.line}. The first one wins`,
      });
      return;
    }
    const entry = { line, phrase, canonical, key };
    seen.set(key, entry);
    entries.push(entry);
  });

  for (const entry of entries) {
    const back = seen.get(words(entry.canonical).join(" "));
    if (back && words(back.canonical).join(" ") === entry.key && back.line > entry.line) {
      issues.push({ line: back.line, kind: "loop", message: `Two-way with line ${entry.line}: “${entry.phrase}” and “${back.phrase}” rewrite each other` });
    }
  }

  return { entries, issues: issues.sort((a, b) => a.line - b.line) };
}

/** Live mappings first, then built-in defaults for phrases the live list does not map. */
export function effectiveSynonyms(live: string, defaults = DEFAULT_SYNONYMS) {
  const liveEntries = parseSynonyms(live).entries;
  const mapped = new Set(liveEntries.map((entry) => entry.key));
  const merged = parseSynonyms(defaults).entries.filter((entry) => !mapped.has(entry.key));
  return { entries: [...liveEntries, ...merged], mergedDefaults: merged.length };
}

/* ---------------- Stop words ---------------- */

export function parseStopWords(text: string) {
  const list = text
    .split(/[,\n]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const unique = Array.from(new Set(list));
  return { words: unique, duplicates: list.length - unique.length, phrases: unique.filter((item) => /\s/.test(item)) };
}

/* ---------------- Query preview ---------------- */

function greedy(tokens: string[], table: Map<string, string[] | null>) {
  const longest = Math.max(1, ...Array.from(table.keys(), (key) => key.split(" ").length));
  const out: string[] = [];
  const hits: { from: string; to: string | null }[] = [];
  for (let i = 0; i < tokens.length; ) {
    let matched = false;
    for (let size = Math.min(longest, tokens.length - i); size >= 1; size -= 1) {
      const key = tokens.slice(i, i + size).join(" ");
      if (!table.has(key)) continue;
      const replacement = table.get(key)!;
      if (replacement) out.push(...replacement);
      hits.push({ from: key, to: replacement ? replacement.join(" ") : null });
      i += size;
      matched = true;
      break;
    }
    if (!matched) {
      out.push(tokens[i]);
      i += 1;
    }
  }
  return { out, hits };
}

/** How the retrieval layer rewrites a query: synonyms first (longest match, one pass), then stop words leave the keyword layer. */
export function previewQuery(query: string, synonyms: SynonymEntry[], stopWords: string[]) {
  const synonymTable = new Map(synonyms.map((entry) => [entry.key, words(entry.canonical)] as const));
  const rewritten = greedy(words(query), synonymTable);
  const stopTable = new Map(stopWords.map((item) => [words(item).join(" "), null] as const));
  const keywords = greedy(rewritten.out, stopTable);
  return {
    rewritten: rewritten.out.join(" "),
    replaced: rewritten.hits.map((hit) => ({ from: hit.from, to: hit.to ?? "" })),
    keywords: keywords.out,
    ignored: keywords.hits.map((hit) => hit.from),
  };
}

/* ---------------- Line diff ---------------- */

export type DiffLine = { kind: "same" | "add" | "remove"; text: string };

export function lineDiff(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: "same", text: a[i] });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      out.push({ kind: "remove", text: a[i] });
      i += 1;
    } else {
      out.push({ kind: "add", text: b[j] });
      j += 1;
    }
  }
  while (i < a.length) out.push({ kind: "remove", text: a[i++] });
  while (j < b.length) out.push({ kind: "add", text: b[j++] });
  return out;
}

export function planLimit(settings: AquibotSettings, plan: "core" | "growth" | "enterprise") {
  return plan === "enterprise" ? settings.limitEnterprise : plan === "growth" ? settings.limitGrowth : settings.limitCore;
}
