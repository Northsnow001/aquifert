import { plainText } from "@/lib/content-types";
import type { TelexView } from "@/lib/aq-modules/telex";
import { TELEX_PRODUCTS, type TelexProduct } from "@/lib/aq-modules/types";
import { csvCell, param, type SearchParams } from "@/components/hub/analytics/format";

export const TELEX_PAGE = 25;

export type TelexFilter = { q: string; product: TelexProduct | ""; tag: string; from: string; to: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseTelexFilter(params: SearchParams): TelexFilter {
  const product = param(params, "product");
  let from = DATE.test(param(params, "from")) ? param(params, "from") : "";
  let to = DATE.test(param(params, "to")) ? param(params, "to") : "";
  if (from && to && from > to) [from, to] = [to, from];
  return {
    q: param(params, "q").slice(0, 120),
    product: (TELEX_PRODUCTS as readonly string[]).includes(product) ? (product as TelexProduct) : "",
    tag: param(params, "tag").slice(0, 60),
    from,
    to,
  };
}

export function parseCount(params: SearchParams) {
  const n = Number(param(params, "n"));
  return Number.isFinite(n) && n > TELEX_PAGE ? Math.min(Math.ceil(n / TELEX_PAGE) * TELEX_PAGE, 2000) : TELEX_PAGE;
}

export const isFiltered = (filter: TelexFilter) => Boolean(filter.q || filter.product || filter.tag || filter.from || filter.to);

/** Every search word must appear in the headline, body or tags. */
export function filterTelex(items: TelexView[], filter: TelexFilter) {
  const words = filter.q.toLowerCase().split(/\s+/).filter(Boolean);
  const tag = filter.tag.toLowerCase();
  return items.filter((item) => {
    const day = item.publishedAt.slice(0, 10);
    if (filter.product && item.product !== filter.product) return false;
    if (tag && !item.tags.some((value) => value.toLowerCase() === tag)) return false;
    if (filter.from && day < filter.from) return false;
    if (filter.to && day > filter.to) return false;
    if (!words.length) return true;
    const text = `${item.headline} ${plainText(item.paragraphs.join("\n\n"))} ${item.tags.join(" ")}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
}

export function allTags(items: TelexView[]) {
  const seen = new Map<string, string>();
  for (const item of items) for (const tag of item.tags) if (tag.trim() && !seen.has(tag.toLowerCase())) seen.set(tag.toLowerCase(), tag.trim());
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/** Query string for the filter with `patch` applied; blank values drop out. */
export function telexQuery(filter: TelexFilter, patch: Partial<TelexFilter & { n: number }> = {}) {
  const merged = { ...filter, ...patch };
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) if (value !== "" && value !== undefined && value !== null) query.set(key, String(value));
  const text = query.toString();
  return text ? `?${text}` : "";
}

export function telexCsv(items: TelexView[]) {
  const rows = [["Published", "Headline", "Product", "Direction", "Access", "Tags", "Text"]];
  for (const item of items) rows.push([item.publishedAt.replace("T", " "), item.headline, item.product, item.tone, item.access, item.tags.join("; "), plainText(item.paragraphs.join("\n\n"))]);
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
