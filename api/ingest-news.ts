/**
 * News ingestion, PUBLISHER RSS/ATOM FEEDS ONLY.
 *
 * Hard rules enforced here:
 *  - We fetch the publisher's own syndication feed and nothing else.
 *  - We store headline, link, timestamp and AT MOST a 200-character snippet.
 *  - Article bodies are never fetched, stored or rendered.
 *  - No price reporting agency (Argus, CRU, ICIS, Profercy, Fertilizer Week,
 *    or similar) may ever be registered here; their assessments are licensed
 *    products. If a licence is signed, add the row and enable it then.
 *  - On fetch failure we keep the last good items, raise the staleness flag
 *    (via dataAsOf) and alert the data owner. Never write null over good data.
 */
import { eq, sql } from "drizzle-orm";
import { getDb } from "./queries/connection";
import * as s from "@db/schema";
import { notify } from "./rbac";

const MAX_SNIPPET = 200;

const PRODUCT_KEYWORDS: [string, RegExp][] = [
  ["NITROGEN", /\b(urea|ammonia|ammonium|nitrate|UAN|nitrogen|gas)\b/i],
  ["PHOSPHATE", /\b(phosphate|DAP|MAP|TSP|phosacid|NPK)\b/i],
  ["POTASSIUM", /\b(potash|potassium|MOP|SOP|chloride)\b/i],
  ["FREIGHT", /\b(freight|vessel|shipping|charter|handysize|supramax|baltic)\b/i],
];

const GEO_KEYWORDS: [string, RegExp][] = [
  ["MIDDLE_EAST", /\b(middle east|gulf|qatar|saudi|oman|uae|iran|arabian)\b/i],
  ["NORTH_AMERICA", /\b(us |u\.s\.|united states|america|canada|corn belt|midwest)\b/i],
  ["SOUTH_AMERICA", /\b(brazil|argentina|latin america|south america)\b/i],
  ["EUROPE", /\b(europe|eu\b|euro|uk\b|britain|france|germany|spain|black sea)\b/i],
  ["SOUTH_ASIA", /\b(india|pakistan|bangladesh|south asia)\b/i],
  ["EAST_ASIA", /\b(china|southeast asia|indonesia|vietnam|malaysia|philippines|korea|japan)\b/i],
  ["FSU", /\b(russia|belarus|ukraine|baltic)\b/i],
  ["AFRICA", /\b(africa|nigeria|morocco|egypt|ethiopia|kenya)\b/i],
];

function classify(text: string, table: [string, RegExp][], fallback: string): string {
  for (const [tag, re] of table) if (re.test(text)) return tag;
  return fallback;
}

export function classifyItem(headline: string, snippet: string) {
  const text = `${headline} ${snippet}`;
  return {
    product: classify(text, PRODUCT_KEYWORDS, "GENERAL"),
    geography: classify(text, GEO_KEYWORDS, "GLOBAL"),
  };
}

function stripTags(html: string): string {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, " ")
    .trim();
}

function truncateSnippet(text: string): string {
  if (text.length <= MAX_SNIPPET) return text;
  return text.slice(0, MAX_SNIPPET - 1).replace(/\s+\S*$/, "") + "…";
}

interface ParsedItem { title: string; link: string; date: Date; snippet: string; }

/** Minimal RSS 2.0 / Atom parser, extracts headline, link, date, summary only. */
export function parseFeed(xml: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  for (const block of blocks.slice(0, 50)) {
    const pick = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
      return m ? stripTags(m[1]) : "";
    };
    const title = pick("title");
    let link = pick("link");
    if (!link) {
      const m = block.match(/<link[^>]*href=["']([^"']+)["']/i);
      link = m ? m[1] : "";
    }
    const dateStr = pick("pubDate") || pick("published") || pick("updated") || pick("dc:date");
    const date = dateStr ? new Date(dateStr) : new Date();
    const snippet = truncateSnippet(pick("description") || pick("summary") || pick("content"));
    if (title && link && !isNaN(date.getTime())) items.push({ title, link, date, snippet });
  }
  return items;
}

async function alertDataOwner(sourceName: string, error: string) {
  const admins = await getDb().query.users.findMany({
    where: eq(s.users.role, "admin"),
    limit: 5,
  });
  for (const a of admins) {
    await notify(a.id, "NEWS_INGEST_FAIL", `News feed failed: ${sourceName}`,
      `Last good items retained; staleness flag raised. Error: ${error.slice(0, 180)}`, "/hub");
  }
}

export async function ingestNewsSource(sourceId: number): Promise<{ added: number; error?: string }> {
  const db = getDb();
  const source = await db.query.newsSources.findFirst({ where: eq(s.newsSources.id, sourceId) });
  if (!source || !source.enabled) return { added: 0 };

  try {
    const res = await fetch(source.feedUrl, {
      headers: { "User-Agent": "Aquifert-Hub/1.0 (+https://aquifert.com)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const items = parseFeed(xml);
    if (items.length === 0) throw new Error("Feed parsed to zero items");

    let added = 0;
    for (const it of items) {
      const exists = await db.query.newsItems.findFirst({ where: eq(s.newsItems.url, it.link) });
      if (exists) continue;
      const { product, geography } = classifyItem(it.title, it.snippet);
      await db.insert(s.newsItems).values({
        sourceId,
        headline: it.title.slice(0, 500),
        url: it.link.slice(0, 1000),
        snippet: it.snippet,
        publishedAt: it.date,
        product,
        geography,
      });
      added++;
    }

    const latest = items.reduce((a, b) => (a.date > b.date ? a : b)).date;
    await db.update(s.newsSources)
      .set({ lastFetchedAt: new Date(), dataAsOf: latest, lastError: null })
      .where(eq(s.newsSources.id, sourceId));
    return { added };
  } catch (err) {
    // Last-good: existing items are untouched; staleness shows via dataAsOf.
    const message = err instanceof Error ? err.message : String(err);
    await db.update(s.newsSources)
      .set({ lastFetchedAt: new Date(), lastError: message.slice(0, 500) })
      .where(eq(s.newsSources.id, sourceId));
    await alertDataOwner(source.name, message);
    return { added: 0, error: message };
  }
}

export async function ingestAllNews(): Promise<{ source: string; added: number; error?: string }[]> {
  const sources = await getDb().query.newsSources.findMany({ where: eq(s.newsSources.enabled, true) });
  const out = [];
  for (const src of sources) {
    const r = await ingestNewsSource(src.id);
    out.push({ source: src.code, ...r });
  }
  // Housekeeping: drop items older than 90 days (keeps the table bounded).
  await getDb().execute(sql`DELETE FROM news_items WHERE "publishedAt" < NOW() - INTERVAL '90 days'`);
  return out;
}
