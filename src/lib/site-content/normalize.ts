import { DEFAULT_SITE_CONTENT } from "@/lib/site-content/defaults";
import { SITE_PAGE_KEYS, SITE_SCHEMA, type Field, type LeafField, type SiteContent, type SitePageKey } from "@/lib/site-content/schema";

export const SITE_ICON_NAMES = [
  "radio", "ship", "line-chart", "file-stack", "route", "bot", "calculator", "book-open", "compass", "wallet",
  "shield-check", "globe", "handshake", "leaf", "landmark", "refresh", "factory", "shopping-cart", "sprout", "wheat",
  "rocket", "check", "star", "zap", "truck", "package", "anchor", "bar-chart", "users", "lock",
  "clock", "target", "lightbulb", "award", "briefcase", "map", "search", "flask", "droplets", "sun",
  "mail", "phone", "message", "trending-up", "layers", "sparkles",
] as const;
export type SiteIconName = (typeof SITE_ICON_NAMES)[number];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Site paths, in-page anchors, email, phone and web addresses. */
export function isValidLink(value: string) {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  if (/^#[\w-]+$/.test(value)) return true;
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+(\?.*)?$/i.test(value)) return true;
  if (/^tel:\+?[\d\s()-]{5,}$/i.test(value)) return true;
  return /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(value);
}

/** Files shipped with the site, uploaded pictures, or web addresses. */
export function isValidMedia(value: string) {
  if (!value) return true;
  if (/^\/(media|brand|site-media)\/[\w./-]+$/.test(value) && !value.includes("..")) return true;
  return /^https:\/\/[^\s/]+\.[^\s]+$/i.test(value);
}

const clean = (value: string) => value.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();

function leafValue(field: LeafField, raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const value = clean(raw);
  switch (field.kind) {
    case "text":
      return value.replace(/\s+/g, " ").slice(0, field.max);
    case "textarea":
    case "lines":
      return value.slice(0, field.max);
    case "link":
      return isValidLink(value) ? value : fallback;
    case "image":
    case "video":
      return isValidMedia(value) ? value : fallback;
    case "icon":
      return (SITE_ICON_NAMES as readonly string[]).includes(value) ? value : fallback;
  }
}

function fieldValue(field: Field, raw: unknown, fallback: unknown): unknown {
  if (field.kind !== "list") return leafValue(field, raw, typeof fallback === "string" ? fallback : "");
  if (!Array.isArray(raw)) return fallback;
  return raw
    .filter(isRecord)
    .slice(0, field.max)
    .map((row) => Object.fromEntries(Object.entries(field.item).map(([key, leaf]) => [key, leafValue(leaf, row[key], "")])));
}

/** A stored page with every missing or invalid value replaced by the launch wording. */
export function normalizePage<K extends SitePageKey>(key: K, raw: unknown): SiteContent[K] {
  const page = SITE_SCHEMA[key];
  const stored = isRecord(raw) ? raw : {};
  const defaults = DEFAULT_SITE_CONTENT[key] as Record<string, Record<string, unknown>>;
  const out: Record<string, Record<string, unknown>> = {};
  for (const [sectionKey, section] of Object.entries(page.sections)) {
    const rawSection = isRecord(stored[sectionKey]) ? (stored[sectionKey] as Record<string, unknown>) : {};
    const fields = section.fields as Record<string, Field>;
    out[sectionKey] = Object.fromEntries(Object.entries(fields).map(([fieldKey, field]) => [fieldKey, fieldValue(field, rawSection[fieldKey], defaults[sectionKey][fieldKey])]));
  }
  return out as SiteContent[K];
}

export function normalizeSiteContent(raw: unknown): SiteContent {
  const stored = isRecord(raw) ? raw : {};
  return Object.fromEntries(SITE_PAGE_KEYS.map((key) => [key, normalizePage(key, stored[key])])) as SiteContent;
}

/** `row` and `leaf` locate a problem inside one row of a list. */
export type ContentIssue = { section: string; field: string; row?: number; leaf?: string; message: string };

const describe = (leaf: LeafField, value: string): string | null => {
  if (leaf.required && !value.trim()) return `${leaf.label} is required.`;
  if ((leaf.kind === "text" || leaf.kind === "textarea" || leaf.kind === "lines") && value.length > leaf.max) return `${leaf.label} is ${value.length - leaf.max} characters too long.`;
  if (leaf.kind === "link" && !isValidLink(value.trim())) return `${leaf.label} must start with /, #, mailto:, tel: or https://.`;
  if ((leaf.kind === "image" || leaf.kind === "video") && !isValidMedia(value.trim())) return `${leaf.label} must be a file from the library or an https:// address.`;
  return null;
};

/** Problems that would stop an edited page saving, in page order. */
export function validatePage(key: SitePageKey, value: unknown): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const stored = isRecord(value) ? value : {};
  for (const [sectionKey, section] of Object.entries(SITE_SCHEMA[key].sections)) {
    const rawSection = isRecord(stored[sectionKey]) ? (stored[sectionKey] as Record<string, unknown>) : {};
    for (const [fieldKey, field] of Object.entries(section.fields as Record<string, Field>)) {
      const raw = rawSection[fieldKey];
      if (field.kind !== "list") {
        const message = describe(field, typeof raw === "string" ? raw : "");
        if (message) issues.push({ section: sectionKey, field: fieldKey, message });
        continue;
      }
      const rows = Array.isArray(raw) ? raw.filter(isRecord) : [];
      if (rows.length < field.min) issues.push({ section: sectionKey, field: fieldKey, message: `${field.label} needs at least ${field.min}.` });
      if (rows.length > field.max) issues.push({ section: sectionKey, field: fieldKey, message: `${field.label} can hold at most ${field.max}.` });
      rows.forEach((row, index) => {
        for (const [leafKey, leaf] of Object.entries(field.item)) {
          const message = describe(leaf, typeof row[leafKey] === "string" ? (row[leafKey] as string) : "");
          if (message) issues.push({ section: sectionKey, field: fieldKey, row: index, leaf: leafKey, message: `${field.label} ${index + 1}: ${message}` });
        }
      });
    }
  }
  return issues;
}

/** Splits a one-per-line field into its entries. */
export const splitLines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/** Comma-separated keywords, lower-cased. */
export const splitKeywords = (value: string) =>
  value
    .split(",")
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean);

/** The answer whose keywords best match the question (longer keyword matches weigh more), else the fallback. */
export function pickAnswer(question: string, answers: { keywords: string; answer: string }[], fallback: string) {
  const lower = question.toLowerCase();
  let best = { score: 0, text: fallback };
  for (const entry of answers) {
    const score = splitKeywords(entry.keywords).reduce((sum, word) => sum + (lower.includes(word) ? word.length : 0), 0);
    if (score > best.score) best = { score, text: entry.answer };
  }
  return best.text;
}

export const fillYear = (value: string, year = new Date().getFullYear()) => value.replace(/\{year\}/g, String(year));
