import "server-only";

import { cache } from "react";
import { readDocument, updateDocument } from "@/lib/data/documents";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-content/defaults";
import { normalizePage, normalizeSiteContent } from "@/lib/site-content/normalize";
import { SITE_PAGE_KEYS, type SiteContent, type SiteContentMeta, type SitePageKey } from "@/lib/site-content/schema";

type Stored = { content: SiteContent; meta: SiteContentMeta };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function parse(raw: unknown): Stored {
  const value = isRecord(raw) ? raw : {};
  const meta = isRecord(value.meta) ? value.meta : {};
  return {
    content: normalizeSiteContent(value),
    meta: Object.fromEntries(
      SITE_PAGE_KEYS.flatMap((key) => {
        const entry = meta[key];
        return isRecord(entry) && typeof entry.at === "string" ? [[key, { at: entry.at, by: typeof entry.by === "string" ? entry.by : "" }]] : [];
      }),
    ),
  };
}

const read = cache(async (): Promise<Stored> => parse(await readDocument("site-content")));

/** For the admin editor: throws when storage cannot be read, so an outage is never shown as the defaults. */
export const getSiteContentForEdit = read;

/** For the public site: falls back to the launch wording rather than failing the page. */
export const getSiteContent = cache(async (): Promise<SiteContent> => {
  try {
    return (await read()).content;
  } catch (error) {
    console.error("[site-content] Could not read the saved website content, showing the defaults.", error);
    return DEFAULT_SITE_CONTENT;
  }
});

export async function saveSitePage<K extends SitePageKey>(key: K, value: unknown, by: string) {
  const page = normalizePage(key, value);
  const at = new Date().toISOString();
  await updateDocument("site-content", (raw) => {
    const current = isRecord(raw) ? raw : {};
    const meta = isRecord(current.meta) ? current.meta : {};
    return { ...current, [key]: page, meta: { ...meta, [key]: { at, by } } };
  });
  return { page, at };
}
