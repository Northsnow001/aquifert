import type { NitrogenRow } from "@/lib/netback-desk/types";

export type ParsedPriceFile = {
  rows: NitrogenRow[];
  week: string;
  year: string;
  priceDate: string;
  lineCount: number;
  rawLength: number;
  skipped: { line: number; text: string; reason: string }[];
};

/** Series names that feed each benchmark, most specific first. Earlier needles win over later ones. */
export const SERIES_PATTERNS: Record<string, string[]> = {
  egypt: ["egypt europe", "egypt"],
  algeria: ["algeria full range", "algeria"],
  nigeria: ["nigeria"],
  black_sea: ["black sea"],
  baltic: ["baltic"],
  middle_east: ["arab gulf full range", "middle east all netbacks", "arab gulf spot", "middle east", "arab gulf"],
  se_asia: ["southeast asia", "se asia"],
  iran: ["iran full range", "iran"],
  china: ["china full range", "china"],
};

const number = (value: string | undefined) => {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

function toRow(record: Record<string, string>): NitrogenRow | null {
  const get = (key: string) => (record[key] ?? record[key.toLowerCase()] ?? "").trim();
  const mid = number(get("Price_Mid"));
  if (mid <= 0) return null;
  return {
    priceDate: get("PriceDate"),
    week: get("Week"),
    year: get("Year"),
    granularity: get("Granularity"),
    product: get("Product"),
    packaging: get("Packaging"),
    incoterm: get("Incoterm").toUpperCase(),
    series: get("Series"),
    low: number(get("Price_Low")),
    mid,
    high: number(get("Price_High")),
    unit: get("Unit") || "USD/t",
  };
}

/**
 * Reads the weekly nitrogen file: a `key=value` metadata line, then a pipe-delimited header and rows.
 * Older exports put every row as `key=value` pairs, which is also accepted. Tabs work in place of pipes.
 */
export function parseNitrogenFile(text: string): ParsedPriceFile {
  const lines = String(text ?? "").split(/\r\n|\r|\n/);
  const meta: Record<string, string> = {};
  const rows: NitrogenRow[] = [];
  const skipped: ParsedPriceFile["skipped"] = [];
  let header: string[] = [];

  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    const delimiter = line.includes("|") ? "|" : line.includes("\t") ? "\t" : null;
    if (!delimiter) return;
    const parts = line.split(delimiter).map((part) => part.trim());

    if (parts[0]?.toLowerCase() === "pricedate" && parts.some((part) => part.toLowerCase() === "price_mid")) {
      header = parts;
      return;
    }

    if (header.length && !line.includes("=")) {
      if (parts.length < header.length) {
        skipped.push({ line: index + 1, text: line, reason: `Has ${parts.length} of ${header.length} columns` });
        return;
      }
      const record = Object.fromEntries(header.map((key, i) => [key, parts[i]]));
      for (const key of ["PriceDate", "Week", "Year"]) if (!record[key] && meta[key]) record[key] = meta[key];
      const row = toRow(record);
      if (row) rows.push(row);
      else skipped.push({ line: index + 1, text: line, reason: "No mid price" });
      return;
    }

    if (!line.includes("=")) return;
    const record: Record<string, string> = {};
    for (const part of parts) {
      const at = part.indexOf("=");
      if (at < 1) continue;
      const key = part.slice(0, at).replace(/^Row\s+\d+:\s*/i, "").trim();
      record[key] = part.slice(at + 1).trim();
    }
    for (const key of ["PriceDate", "Week", "Year"]) {
      if (record[key]) meta[key] = record[key];
      else if (meta[key]) record[key] = meta[key];
    }
    if (!("Price_Mid" in record) && !("price_mid" in record)) return;
    const row = toRow(record);
    if (row) rows.push(row);
    else skipped.push({ line: index + 1, text: line, reason: "No mid price" });
  });

  const first = rows[0];
  return {
    rows,
    week: meta.Week ?? first?.week ?? "",
    year: meta.Year ?? first?.year ?? "",
    priceDate: meta.PriceDate ?? first?.priceDate ?? "",
    lineCount: text ? lines.length : 0,
    rawLength: text.length,
    skipped,
  };
}

export type BenchmarkMatch = NitrogenRow & { key: string; needle: string; priority: number };

/**
 * Picks the FOB urea row for each benchmark. A more specific series name wins; at equal
 * specificity granular beats prilled, since the calculator prices granular urea.
 */
export function selectBenchmarks(rows: NitrogenRow[]): Record<string, BenchmarkMatch> {
  const selected: Record<string, BenchmarkMatch> = {};
  const granular = (row: NitrogenRow) => row.product.toLowerCase().includes("granular");
  for (const row of rows) {
    const product = row.product.toLowerCase();
    const series = row.series.toLowerCase();
    if (row.mid <= 0 || row.incoterm !== "FOB" || !product.includes("urea")) continue;
    for (const [key, needles] of Object.entries(SERIES_PATTERNS)) {
      const priority = needles.findIndex((needle) => series.includes(needle));
      if (priority === -1) continue;
      const current = selected[key];
      if (!current || priority < current.priority || (priority === current.priority && granular(row) && !granular(current))) {
        selected[key] = { ...row, key, needle: needles[priority], priority };
      }
      break;
    }
  }
  return selected;
}
