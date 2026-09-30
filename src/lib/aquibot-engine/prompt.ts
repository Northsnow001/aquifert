import "server-only";
import { DEFAULT_PROMPT, type AquibotConfig } from "@/lib/aquibot";
import { canReadTelex, excerpt, telexHeadline } from "@/lib/content-types";
import type { HubContent } from "@/lib/hub-content";
import type { Plan } from "@/lib/session-shared";
import { formatDateRangeSection, type DateResolution } from "./dates";
import type { RetrievalResult } from "./retrieval";

export function activePrompt(config: AquibotConfig, testMode: boolean) {
  if (testMode && config.prompt.test.trim()) return { text: config.prompt.test.trim(), source: "test" as const };
  if (config.prompt.published.trim()) return { text: config.prompt.published.trim(), source: "published" as const };
  return { text: DEFAULT_PROMPT.trim(), source: "built-in" as const };
}

export function longDate(now: number) {
  return new Date(now).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
}

function shortDate(now: number) {
  return new Date(now).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

const QUERY_INTERPRETATION_RULES = `## QUERY INTERPRETATION RULES

When processing user queries, apply these vocabulary interpretation rules to help with synonyms and domain-specific terminology:

### Incoterms & Logistics Vocabulary
- **Load/Loading port** = Origin port where cargo is shipped from (FOB, CFR, CIF origin)
- **Discharge/Unloading port** = Destination port where cargo arrives
- **Shipping route/Lane** = The origin-destination corridor (e.g., Baltic→Brazil)
- **FOB** = Free On Board (price at origin port); **CFR** = Cost & Freight (includes freight); **CIF** = Cost, Insurance & Freight (includes insurance)
- **Freight cost/Rate** = Ocean freight price per tonne for a route
- **Port** without qualifier often means either load or discharge depending on context

### Port-focused questions
- If the user asks directly about a named port, port city, or port registry entry (for example 'tell me about Montevideo port'), treat it as a port-facts query first.
- In port-facts mode, prefer the dedicated port registry block and only use freight enquiry boards if the user explicitly asks about a shipment, route, laycan, cargo, rate, or incoterm.
- Do not reinterpret a direct port question as a freight enquiry just because a freight board mentions that port as an origin or destination.

### Manufacturing & Production Vocabulary
- **Plant operations/Process** = Granulation, prilling, synthesis, or reaction steps in fertilizer production
- **Granule/Granulation** = Process of forming larger particles; **Prilled/Prilling** = Cooling molten material into small beads
- **Synthesis** = Chemical reaction to create the fertilizer compound
- **Reaction** = Chemical conversion of raw materials into fertilizer
- **Capacity/Production volume** = Tonnes per month or year a plant can manufacture

### Product & Grade Terminology
- **AN** = Ammonium Nitrate (34% N); **DN/CAN** = Calcium Ammonium Nitrate (safer alternative)
- **Urea** = Most traded N fertilizer (46% N)
- **DAP** = Di-Ammonium Phosphate (18-46-0, most traded P product)
- **MAP** = Mono-Ammonium Phosphate (11-52-0, higher P)
- **MOP** = Muriate of Potash (KCl, ~60% K₂O)
- **Amsul** = Ammonium Sulphate (21% N + 24% S)

### Market & Pricing Vocabulary
- **Benchmark/Reference price** = Published market indices (DAP Morocco FOB, Urea CFR Baltic, etc.)
- **Spot/Spot price** = Current market price (immediate delivery)
- **Contract/Forward** = Negotiated future delivery price
- **Market update/Intelligence** = Recent telex posts or price signals
- **Trend** = Direction of price movement (up/bullish, down/bearish, flat/sideways)

### Time & Recency Vocabulary
- **Date filter** is pre-resolved upstream (see the DETECTED DATE RANGE section in the system context). Use that as the primary temporal signal. If the resolver returned no range and the user used a relative phrase, interpret it against the corpus using today's date.
- **Recent/Latest** = Use most recent available data in knowledge base
- **Forecast/Expected** = Forward-looking estimates or projections
- Explicit month/year references in the user's text (e.g., 'Mar-2026', 'Q1-2025') should be matched against the pre-resolved range when present; otherwise against the corpus.

### When a query contains ambiguous or variant terms:
1. Map manufacturing process terms to the canonical vocabulary above
2. If user asks about 'unloading', internally map to 'destination' or discharge context
3. If user asks about 'plant', map to manufacturing/production context
4. If unsure whether a port is load or discharge, check the route direction in context
5. Always preserve date/month references; they are critical for matching historical data
6. Use the Tools Glossary provided below to clarify any technical terms

---`;

const ACADEMY_PRODUCTS: [string, string][] = [
  ["Ammonia (NH3)", "Building block for all N fertilizers. Made from natural gas via steam methane reforming + Haber-Bosch process. Stored at -33°C. 32-38 MMBtu gas per tonne."],
  ["Urea (46% N)", "0.58t NH3 + 0.76t CO₂ per tonne. NH3 + CO₂ under pressure → ammonium carbamate → dehydrated to urea melt. Most traded N fertilizer. CO₂ is byproduct of reforming."],
  ["Nitric Acid (HNO₃)", "0.29t NH3 per tonne 100% HNO₃. NH3 catalytic oxidation via Ostwald process. Key intermediate for AN production."],
  ["Ammonium Nitrate (AN 34% N)", "0.436t NH3 + 0.78t HNO₃ per tonne. NH3 + HNO₃ neutralisation → evaporation → prilling. High N, fast-acting."],
  ["UAN (32% N)", "Liquid fertilizer. Urea dissolved in water + ammonium nitrate solution blended to give 32% N liquid. Applied by sprayer or injector."],
  ["Ammonium Sulphate (21% N + 24% S)", "0.26t NH3 + 0.75t H₂SO₄ per tonne. NH3 reacted with sulphuric acid. Often a byproduct so cheap vs cost-of-production."],
  ["Sulphuric Acid (H₂SO₄)", "0.33t sulphur per tonne H₂SO₄. Sulphur burned → SO₂ → catalytic conversion to SO₃ → absorbed in water. Critical intermediate for all phosphate products."],
  ["Phosphoric Acid (H₃PO₄)", "3.6t rock (63% BPL) + 2.8t H₂SO₄ per tonne 100% P₂O₅. Rock + sulphuric acid wet process, filtration to remove gypsum."],
  ["SSP (20% P₂O₅ + 11% S)", "0.71t rock + 0.21t sulphur per tonne. Rock + H₂SO₄ → calcium superphosphate. Cheapest P fertilizer."],
  ["TSP (46% P₂O₅)", "1.44t rock + 0.47t sulphur equivalent per tonne. Rock reacted with phosphoric acid (not H₂SO₄). Contains only P — no sulphur or nitrogen."],
  ["MAP (11-52-0)", "0.145t NH₃ + 1.91t rock + 0.475t sulphur per tonne. Phosphoric acid + ammonia (excess acid). High P, lower N."],
  ["DAP (18-46-0)", "0.219t NH₃ + 1.72t rock + 0.427t sulphur per tonne. Phosphoric acid + excess ammonia. Most traded P product."],
];

const GLOSSARY: [string, string][] = [
  ["FOB", "Free On Board — price at the loading port. Seller delivers goods onto the ship. Buyer pays freight and insurance."],
  ["CFR", "Cost and Freight — price includes cost plus freight to destination port. Buyer handles discharge costs."],
  ["CIF", "Cost, Insurance & Freight — like CFR but seller also pays insurance to destination port."],
  ["MOP", "Muriate of Potash — potassium chloride (KCl), ~60% K₂O. Most traded potash product."],
  ["SOP", "Sulphate of Potash — potassium sulphate (K₂SO₄), ~50% K₂O + 18% S. Premium for chloride-sensitive crops."],
  ["DAP", "Di-Ammonium Phosphate (18-46-0). Most traded phosphate. Key suppliers: Morocco (OCP), China, Saudi Arabia."],
  ["MAP", "Mono-Ammonium Phosphate (11-52-0). Higher P₂O₅ than DAP. Russia is the leading global exporter."],
  ["TSP", "Triple Superphosphate (0-46-0). High P concentration. Made from rock + phosphoric acid."],
  ["SSP", "Single Superphosphate (0-20-0 + 11% S). Cheapest phosphate fertilizer. Contains sulphur."],
  ["Urea", "46% N. Most traded nitrogen fertilizer. Key exporters: Russia, China, Middle East, Egypt, Indonesia."],
  ["UAN", "Urea Ammonium Nitrate — 32% or 28% N liquid. Blend of urea and AN solutions."],
  ["AN", "Ammonium Nitrate — 34% N solid, fast-acting. Also used in explosives industry."],
  ["CAN", "Calcium Ammonium Nitrate — 26-28% N. AN blended with calcium carbonate. Safer to handle."],
  ["Amsul", "Ammonium Sulphate — 21% N + 24% S. Often a byproduct. Good sulphur source."],
  ["NH₃", "Ammonia — building block for all N fertilizers. Made from gas via Haber-Bosch. Traded at -33°C."],
  ["BPL", "Bone Phosphate of Lime — measure of phosphate rock quality. 63% BPL = ~29% P₂O₅."],
  ["MMBtu", "Million British Thermal Units — standard unit for natural gas pricing. ~28 cubic metres of gas."],
  ["Phosphoric Acid (H₃PO₄)", "Made from rock + H₂SO₄ (wet process). Intermediate for DAP, MAP, TSP."],
  ["H₂SO₄", "Sulphuric Acid — made by burning elemental sulphur. Essential for all phosphate fertilizer production."],
  ["TTF", "Dutch gas trading hub. The benchmark price for European fertilizer producers."],
  ["Henry Hub", "US natural gas benchmark (Louisiana). Typically cheaper than TTF."],
  ["Granular vs Prilled", "Two forms of solid fertilizer. Granules are harder and more uniform."],
];

const ANSWER_RULES = `## ANSWERING RULES
1. Use the knowledge base sections above to answer questions about historical data, documents and market intelligence.
2. Use the conversation so far to keep continuity, tone and follow-up context.
3. If the knowledge base directly mentions the entity or company the user asked about, answer from it directly. Do not claim the entity is absent when it appears in the retrieved context.
4. For deals, relationships, or transactional claims between named companies, only state the claim when one retrieved passage directly supports it. Do not strengthen or merge separate fragments into a new claim.
5. If the retrieved context does not confirm the requested fact, say that the retrieved context does not confirm it. Do not fill that gap with internal knowledge for company/entity relationship questions.
6. Prefer short, factual answers. Give product-specific values directly — avoid generic textbook frameworks unless no specific data was retrieved. Only ask a follow-up question if it is genuinely useful and closely related.`;

function technicalGuidance(retrieval: RetrievalResult) {
  if (retrieval.intent !== "technical") return "";
  if (retrieval.technicalSubtype === "compound_spec_and_process") {
    return `COMPOUND-TECHNICAL-MODE GUIDANCE:
- Answer in two clearly labeled parts: **Specifications** first, then **Production**.
- Part 1 — Specifications: Prefer the AquiFert Product Specifications document for composition, grades, purity, and chemical specs.
- Part 2 — Production: Prefer the UNIDO Fertilizer Manual for manufacturing methodology, process steps, and production chemistry.
- Give direct product-specific facts first. Do not lead with generic explanations of what a specification typically includes.
- If a source lacks exact detail for a part, state the gap in one short sentence and give the closest supported fact. Do not pad with generic textbook categories.
- Do not pivot to price files or market data.
- Keep each part concise. Only ask a follow-up question if genuinely useful.`;
  }
  return `TECHNICAL-MODE GUIDANCE:
- For specification questions (composition, grades, purity, chemical specs): prefer the AquiFert Product Specifications document first.
- For process/manufacturing questions (how something is made, production methods): prefer UNIDO Fertilizer Manual content first.
- Give direct product-specific facts first. Do not lead with generic explanations of what a specification typically includes.
- If a source lacks exact detail, state the gap in one short sentence, then give the closest supported fact. Do not pad with generic textbook categories.
- Do not pivot to price files or market data unless the user explicitly asked for pricing or market context.
- Keep answers concise. Only ask a follow-up question if it is genuinely useful and closely related.`;
}

function stripHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildSystemPrompt(input: {
  config: AquibotConfig;
  content: HubContent;
  testMode: boolean;
  plan: Plan;
  isAdmin: boolean;
  now: number;
  resolution: DateResolution | null;
  retrieval: RetrievalResult;
  indexedTelex: number;
}) {
  const { content, retrieval } = input;
  const parts: string[] = [activePrompt(input.config, input.testMode).text, `Today's date: ${longDate(input.now)}`, formatDateRangeSection(input.resolution), QUERY_INTERPRETATION_RULES];

  const technical = technicalGuidance(retrieval);
  if (technical) parts.push(technical);

  const intel: string[] = ["Below is the latest intelligence from the platform to help ground your answers:"];
  if (input.indexedTelex > 0) intel.push(`--- INDEXED TELEX POSTS (${input.indexedTelex} total in knowledge base) ---`);
  if (retrieval.publicSection) intel.push(`--- KNOWLEDGE BASE: INDEXED FILES AND TELEX ---\n${retrieval.publicSection}`);
  if (retrieval.privateSection) {
    intel.push(
      `--- PRIVATE PRICE DATA & INTELLIGENCE FILES (use silently — do NOT cite the source, file name, report name, or any phrase like 'sourced from' / 'according to' / 'the Aquifert Weekly Price Data'. Present figures as direct answers, with dates from the data when helpful for clarity) ---\n${retrieval.privateSection}`,
    );
  }
  if (!retrieval.publicSection && !retrieval.privateSection) intel.push("--- KNOWLEDGE BASE ---\n(no matching passages were retrieved for this question)");

  const recent = content.telex
    .filter((item) => item.status === "published" && (input.isAdmin || canReadTelex(item.access, input.plan)))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 5);
  if (recent.length) {
    intel.push(`--- RECENT TELEX POSTS ---\n${recent.map((item) => `- [${item.publishedAt.slice(0, 10)}] ${telexHeadline(item)}: ${excerpt(item.paragraphs, 30)}`).join("\n")}`);
  }

  if (content.indicators.length) {
    intel.push(
      `--- CURRENT MARKET INDICATORS ---\n${content.indicators
        .map((indicator) => `${indicator.name}: ${indicator.value}%${indicator.note || indicator.summary ? ` — ${[indicator.summary, indicator.note].filter(Boolean).join(" ")}` : ""}`)
        .join("\n")}`,
    );
  }

  const hedge = content.hedgeReports.filter((report) => report.status === "published").sort((a, b) => b.date.localeCompare(a.date))[0];
  if (hedge) {
    const lines = hedge.sections.flatMap((section) =>
      section.commodities.map(
        (commodity) =>
          `${section.label} · ${commodity.label}${commodity.index ? ` (${commodity.index})` : ""}: ${commodity.rows
            .map((row) => `${row.period} ${row.bid}/${row.ask}${row.dir === "flat" ? "" : row.dir === "up" ? " ↑" : " ↓"}`)
            .join("; ")}`,
      ),
    );
    const narrative = hedge.narrative.replace(/\*\*/g, "").trim();
    intel.push(`--- DIRECT HEDGE TABLE (${hedge.date}, bid/offer USD/t) ---\n${narrative ? `${narrative}\n` : ""}${lines.join("\n")}`);
  }

  const freight = content.freight.commentary.replace(/\*\*/g, "").trim();
  if (freight) intel.push(`--- FREIGHT ANALYTICS COMMENTARY ---\n${freight}`);

  intel.push(
    `--- TOOLS REFERENCE ---\nHow It's Made:\n${ACADEMY_PRODUCTS.map(([name, facts]) => `- ${name}: ${facts}`).join("\n")}\n\nGlossary:\n${GLOSSARY.map(([term, definition]) => `- ${term}: ${definition}`).join("\n")}`,
  );

  const commentary = stripHtml(content.toolsCommentary.html);
  if (commentary) intel.push(`--- TOOLS COMMENTARY ---\n${commentary}`);

  parts.push(intel.join("\n\n"));
  parts.push(ANSWER_RULES);
  return parts.filter(Boolean).join("\n\n");
}

const REWRITE_TEMPLATE = `You are a linguistic preprocessing module for a RAG system.
Your only task is to rewrite the latest user message into a standalone search query.

CRITICAL INSTRUCTIONS:
1. Look at the recent chat history to resolve pronouns like 'it', 'that', 'the first option', or 'then'.
2. Correct obvious spelling mistakes in the latest user message when they are clearly intended to be date phrases or market terms.
3. Convert relative time words (e.g., 'yesterday', 'last week', 'current') into absolute terms based on today's date: {date}. However, preserve 'this time last year', 'same time last year', 'this week last year', and 'around this time last year' exactly as written — do NOT expand them into a generic year or date range.
4. Do not answer the question. Only output the rewritten search query.
5. If the user's message is already standalone and needs no context, output the original message exactly.

### RECENT CHAT HISTORY:
{history}

### LATEST USER MESSAGE:
{message}

### STANDALONE SEARCH QUERY (Output this only):`;

export function rewritePrompt(history: { role: "user" | "assistant"; content: string }[], message: string, now: number, window = 6) {
  const lines = history
    .slice(-Math.max(1, window))
    .filter((turn) => turn.content.trim())
    .map((turn) => `${turn.role.toUpperCase()}: ${compressAssistant(turn.content, 600)}`);
  return REWRITE_TEMPLATE.replace("{date}", shortDate(now))
    .replace("{history}", lines.length ? lines.join("\n") : "(no prior conversation)")
    .replace("{message}", message);
}

/** Shrinks an earlier answer before it is sent back as history: citations and source footers go, long replies are capped. */
export function compressAssistant(content: string, maxChars = 1200) {
  let text = content
    .replace(/\[\s*(?:source|sources|ref|reference|citation|file)s?\s*:[^\]]{0,200}\]/gi, "")
    .replace(/\n+\s*(?:sources?|references?|citations?)\s*:[\s\S]+$/i, "")
    .replace(/^\s*>\s.+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (text.length > maxChars) text = `${text.slice(0, maxChars)}…`;
  return text;
}
