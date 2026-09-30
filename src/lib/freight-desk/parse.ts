import { REGIONS, type BunkerHub, type FixtureInput } from "@/lib/freight-desk/types";

const today = () => new Date().toISOString().slice(0, 10);
const num = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};
const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;
const clip = (value: unknown, max = 120) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** `10-15`, `28/29`, `28 to 29` or a single number. */
export function parseRange(value: string): [number, number] {
  const range = value.match(/(\d+(?:\.\d+)?)\s*(?:-|–|\/|to)\s*(\d+(?:\.\d+)?)/i);
  if (range) return [Number(range[1]), Number(range[2])];
  const single = value.match(/(\d+(?:\.\d+)?)/);
  return single ? [Number(single[1]), Number(single[1])] : [0, 0];
}

const isoDate = (value: string) => {
  const match = value.trim().match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
};

/** Normalises a fixture from any source: trims text, orders ranges and fills a missing side of a range. */
export function cleanFixture(input: Partial<FixtureInput>): FixtureInput {
  let [low, high] = [round(Math.max(0, num(input.rateLow))), round(Math.max(0, num(input.rateHigh)))];
  if (low <= 0) low = high;
  if (high <= 0) high = low;
  let [min, max] = [round(Math.max(0, num(input.cargoMinKt)), 1), round(Math.max(0, num(input.cargoMaxKt)), 1)];
  if (min <= 0) min = max;
  if (max <= 0) max = min;
  const region = (value: unknown) => REGIONS.find((item) => item.toLowerCase() === clip(value).toLowerCase()) ?? "";
  return {
    loadName: clip(input.loadName),
    loadCode: clip(input.loadCode, 8).toUpperCase(),
    loadRegion: region(input.loadRegion),
    dischargeName: clip(input.dischargeName),
    dischargeCode: clip(input.dischargeCode, 8).toUpperCase(),
    dischargeRegion: region(input.dischargeRegion),
    cargoMinKt: Math.min(min, max),
    cargoMaxKt: Math.max(min, max),
    rateLow: Math.min(low, high),
    rateHigh: Math.max(low, high),
    cargoType: clip(input.cargoType, 80),
    source: clip(input.source, 80) || "Manual entry",
    fixtureDate: isoDate(String(input.fixtureDate ?? "")) || today(),
    confidence: Math.min(1, Math.max(0, input.confidence === undefined ? 0.9 : num(input.confidence))),
    excerpt: String(input.excerpt ?? "").trim().slice(0, 500),
  };
}

export function fixtureProblem(fixture: FixtureInput) {
  if (!fixture.loadName && !fixture.loadRegion) return "Add a load port, country or region.";
  if (!fixture.dischargeName && !fixture.dischargeRegion) return "Add a discharge port, country or region.";
  if (fixture.rateLow <= 0) return "Add a rate in $/MT.";
  if (fixture.rateHigh > 500) return "Rates above $500/MT look like a typo.";
  return null;
}

/** RFC 4180-ish split that respects quotes, for one line. */
function splitLine(line: string, separator: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === separator) {
      cells.push(cell);
      cell = "";
    } else cell += char;
  }
  cells.push(cell);
  return cells.map((value) => value.trim());
}

const REGION_LINE = new RegExp(`^(${REGIONS.join("|")})$`, "i");

export type ParsedRows = { rows: (FixtureInput & { line: number })[]; errors: { line: number; message: string }[] };

/**
 * Pasted broker sheets: `load, discharge, cargo kT, rate, cargo type, source, date`, comma or tab separated.
 * A line holding only a region name sets the load for the rows under it (`discharge, cargo, rate`).
 */
export function parseFixtureSheet(text: string, source = "CSV import"): ParsedRows {
  const out: ParsedRows = { rows: [], errors: [] };
  let groupRegion = "";
  text.split(/\r\n|\r|\n/).forEach((raw, index) => {
    const line = index + 1;
    if (!raw.trim()) return;
    const cells = splitLine(raw, raw.includes("\t") ? "\t" : ",").filter(Boolean);
    if (out.rows.length === 0 && out.errors.length === 0 && /^(load|discharge|cargo|rate|route|from|origin)\b/i.test(cells[0] ?? "")) return;
    if (cells.length === 1 && REGION_LINE.test(cells[0])) {
      groupRegion = cells[0];
      return;
    }
    const grouped = Boolean(groupRegion) && cells.length >= 3 && /^\d/.test(cells[1]) && !/^\d/.test(cells[0]);
    const need = grouped ? 3 : 4;
    if (cells.length < need) {
      out.errors.push({ line, message: grouped ? "Expected discharge, cargo and rate." : "Expected at least load, discharge, cargo and rate." });
      return;
    }
    const [loadName, dischargeName, cargo, rate, ...rest] = grouped ? [groupRegion, ...cells] : cells;
    const [cargoMinKt, cargoMaxKt] = parseRange(cargo);
    const [rateLow, rateHigh] = parseRange(rate);
    if (rateLow <= 0 && rateHigh <= 0) {
      out.errors.push({ line, message: `Could not read a rate from “${rate}”.` });
      return;
    }
    const date = rest.find((cell) => isoDate(cell));
    const [cargoType = "", rowSource = ""] = rest.filter((cell) => !isoDate(cell));
    const fixture = cleanFixture({
      loadName,
      loadRegion: grouped ? groupRegion : "",
      dischargeName,
      cargoMinKt,
      cargoMaxKt,
      rateLow,
      rateHigh,
      cargoType,
      source: rowSource || source,
      fixtureDate: date,
      excerpt: raw.trim(),
    });
    const problem = fixtureProblem(fixture);
    if (problem) out.errors.push({ line, message: problem });
    else out.rows.push({ ...fixture, line });
  });
  return out;
}

export const AI_FIXTURE_PROMPT = `Extract every freight fixture row from this rate sheet. Return ONLY valid JSON, no markdown, no code fences, no explanation, in exactly this shape:
{"fixtures":[{"load":"Damietta","discharge":"Constanta","cargo_min_kt":10,"cargo_max_kt":10,"rate_low_usd_mt":28,"rate_high_usd_mt":29,"cargo_type":"Fertilizer / DAP / Urea","source":"Uploaded rate sheet","fixture_date":"2026-07-01","confidence":0.9,"raw_source_excerpt":"Damietta Constanta 10kt 28/29"}]}
Rules:
- One object per route and cargo size. Keep port, country, area or region names exactly as written (for example "US Gulf", "Baltic", "Brazil").
- Cargo sizes are in thousand tonnes (kT). Rates are USD per metric tonne. Give a single number twice when there is no range.
- Use the sheet's own date for fixture_date when it has one (YYYY-MM-DD), otherwise leave it empty.
- confidence is 0 to 1: how sure you are that the row was read correctly.`;

function stripFences(text: string) {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
}

function parseJson(text: string): unknown {
  const body = stripFences(text);
  try {
    return JSON.parse(body);
  } catch {
    const start = body.indexOf("{");
    const end = body.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(body.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

const first = (row: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
};

function rangeFrom(row: Record<string, unknown>, lowKey: string, highKey: string, loose: string[]): [number, number] {
  const low = num(row[lowKey]);
  const high = num(row[highKey]);
  if (low > 0 || high > 0) return [low, high];
  const value = first(row, loose);
  return value ? parseRange(value) : [0, 0];
}

/** Reads Gemini's fixture JSON, tolerating fences, alternate keys and range strings. */
export function parseAiFixtures(text: string, fallbackSource = "AI import"): FixtureInput[] {
  const parsed = parseJson(text);
  const record = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  const list = Array.isArray(parsed)
    ? parsed
    : ((record?.fixtures ?? record?.proposed ?? record?.rows ?? []) as unknown[]);
  if (!Array.isArray(list)) return [];
  return list
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => {
      const row: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(item)) row[key.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")] = value;
      const [cargoMinKt, cargoMaxKt] = rangeFrom(row, "cargo_min_kt", "cargo_max_kt", ["cargo_size_kt", "cargo_size", "cargo", "tonnage", "size_kt"]);
      const [rateLow, rateHigh] = rangeFrom(row, "rate_low_usd_mt", "rate_high_usd_mt", ["rate", "rate_usd_mt", "freight_rate", "freight"]);
      return cleanFixture({
        loadName: first(row, ["load", "load_name", "origin", "load_port", "from", "region"]),
        loadCode: first(row, ["load_code"]),
        loadRegion: first(row, ["load_region"]),
        dischargeName: first(row, ["discharge", "discharge_name", "destination", "dest", "to", "port"]),
        dischargeCode: first(row, ["discharge_code"]),
        dischargeRegion: first(row, ["discharge_region"]),
        cargoMinKt,
        cargoMaxKt,
        rateLow,
        rateHigh,
        cargoType: first(row, ["cargo_type", "commodity", "product", "grade"]),
        source: first(row, ["source", "worksheet", "sheet", "reference"]) || fallbackSource,
        fixtureDate: first(row, ["fixture_date", "date", "trade_date", "published_date"]),
        confidence: row.confidence === undefined ? 0.8 : num(row.confidence),
        excerpt: first(row, ["raw_source_excerpt", "excerpt", "notes"]),
      });
    })
    .filter((fixture) => fixture.loadName && fixture.dischargeName && fixture.rateLow > 0);
}

const decode = (value: string) =>
  value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

/** VLSFO prices by city from the Ship & Bunker prices page: table rows first, then a text scan. */
export function parseBunkerPrices(html: string, cities: string[]): BunkerHub[] {
  const found = new Map<string, number>();
  for (const row of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => decode(cell[1]));
    if (cells.length < 2) continue;
    const city = cities.find((name) => name.toLowerCase() === cells[0].toLowerCase());
    const price = Number(cells[1].replace(/[^0-9.]/g, ""));
    if (city && !found.has(city) && price > 0) found.set(city, price);
  }
  if (found.size < cities.length) {
    const text = decode(html);
    for (const city of cities) {
      if (found.has(city)) continue;
      const match = text.match(new RegExp(`${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^0-9]{0,80}([0-9]{3,4}(?:\\.[0-9]{1,2})?)`, "i"));
      if (match) found.set(city, Number(match[1]));
    }
  }
  return cities.filter((city) => found.has(city)).map((city) => ({ city, price: round(found.get(city)!) }));
}

const toIsoDate = (value: string) => {
  const at = Date.parse(`${value.replace(",", "")} UTC`);
  return Number.isNaN(at) ? null : new Date(at).toISOString().slice(0, 10);
};

/** The BDI and its trade date from the Trading Economics Baltic page text. */
export function parseBdiPage(html: string): { value: number; tradeDate: string } | null {
  const text = decode(html);
  const headline = text.match(/Baltic\s+Dry\s+\w+\s+to\s+([\d,]+(?:\.\d+)?)\s+Index\s+Points\s+on\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
  if (headline) {
    const value = Math.round(Number(headline[1].replace(/,/g, "")));
    const tradeDate = toIsoDate(headline[2]);
    if (value > 0 && tradeDate) return { value, tradeDate };
  }
  const point = text.match(/([\d,]+(?:\.\d+)?)\s*Index\s+Points/i);
  const date = text.match(/[A-Z][a-z]+\s+\d{1,2},?\s+\d{4}/);
  if (point && date) {
    const value = Math.round(Number(point[1].replace(/,/g, "")));
    const tradeDate = toIsoDate(date[0]);
    if (value > 0 && tradeDate) return { value, tradeDate };
  }
  return null;
}

export function pageText(html: string, max = 8000) {
  return decode(html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")).slice(0, max);
}

export function parseAiBdi(text: string): { value: number; tradeDate: string } | null {
  const parsed = parseJson(text) as { value?: unknown; trade_date?: unknown; error?: unknown } | null;
  if (!parsed || parsed.error) return null;
  const value = Math.round(num(parsed.value));
  const tradeDate = isoDate(String(parsed.trade_date ?? ""));
  return value > 0 && tradeDate ? { value, tradeDate } : null;
}
