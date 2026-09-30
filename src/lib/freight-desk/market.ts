import "server-only";

import { EXTRACTION_MODEL, generateText, geminiKey } from "@/lib/aquibot-engine/gemini";
import { pageText, parseAiBdi, parseBdiPage, parseBunkerPrices } from "@/lib/freight-desk/parse";
import { getFreightDesk, logFreightDebug, updateFreightDesk } from "@/lib/freight-desk/store";
import { BDI_SOURCE, BUNKER_SOURCE } from "@/lib/freight-desk/types";

const BROWSER_HEADERS = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-GB,en;q=0.9",
  "cache-control": "no-cache",
};

type Outcome = { ok: true; message: string } | { ok: false; message: string };

async function fetchPage(url: string) {
  const response = await fetch(url, { headers: BROWSER_HEADERS, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  const body = await response.text();
  if (!response.ok || !body) throw new Error(`Unexpected response: HTTP ${response.status}.`);
  return body;
}

const errorText = (error: unknown) =>
  error instanceof Error ? (error.name === "TimeoutError" ? "The source did not respond within 15 seconds." : error.message) : "Could not reach the source.";

export async function refreshBunkerPrices(): Promise<Outcome> {
  const attemptAt = new Date().toISOString();
  const cities = (await getFreightDesk()).bunker.prices.map((hub) => hub.city);
  try {
    const html = await fetchPage(BUNKER_SOURCE);
    const found = parseBunkerPrices(html, cities);
    if (!found.length) {
      const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
      throw new Error(`Could not find VLSFO prices on the page${title ? ` (page title: ${title})` : ""}. The layout may have changed.`);
    }
    const byCity = new Map(found.map((hub) => [hub.city, hub.price]));
    await updateFreightDesk((desk) => {
      desk.bunker = {
        ...desk.bunker,
        prices: desk.bunker.prices.map((hub) => ({ city: hub.city, price: byCity.get(hub.city) ?? hub.price })),
        lastAttemptAt: attemptAt,
        lastSuccessAt: new Date().toISOString(),
        lastError: null,
      };
    });
    const missing = cities.filter((city) => !byCity.has(city));
    await logFreightDebug("info", "Bunker prices refreshed", { found: found.length, missing });
    return { ok: true, message: missing.length ? `Updated ${found.length} hubs. ${missing.join(", ")} kept the previous price.` : `Updated all ${found.length} hubs.` };
  } catch (error) {
    const message = errorText(error);
    await updateFreightDesk((desk) => {
      desk.bunker = { ...desk.bunker, lastAttemptAt: attemptAt, lastError: message };
    });
    await logFreightDebug("error", "Bunker price refresh failed", { error: message });
    return { ok: false, message };
  }
}

async function bdiFromGemini(html: string) {
  if (!geminiKey()) return null;
  const { text } = await generateText({
    model: EXTRACTION_MODEL,
    temperature: 0.1,
    fast: true,
    timeoutMs: 30_000,
    turns: [
      {
        role: "user",
        text: `Extract the Baltic Dry Index (BDI) value and its trade date from this Trading Economics page text. Respond ONLY with JSON like {"value": 2634, "trade_date": "2026-06-24"}. If you cannot find both, respond {"error": "could not extract"}.\n\nPage text:\n${pageText(html)}`,
      },
    ],
  });
  return parseAiBdi(text);
}

export async function refreshBdi(): Promise<Outcome> {
  const attemptAt = new Date().toISOString();
  try {
    const html = await fetchPage(BDI_SOURCE);
    let parsed = parseBdiPage(html);
    let source: "fetched" | "fetched-ai" = "fetched";
    if (!parsed) {
      parsed = await bdiFromGemini(html).catch(() => null);
      source = "fetched-ai";
    }
    if (!parsed) throw new Error(geminiKey() ? "The page did not show a readable BDI, and Gemini could not extract one." : "The page did not show a readable BDI.");
    const { value, tradeDate } = parsed;
    await updateFreightDesk((desk) => {
      desk.bdi = { ...desk.bdi, value, tradeDate, source, lastAttemptAt: attemptAt, lastSuccessAt: new Date().toISOString(), lastError: null };
    });
    await logFreightDebug("info", "BDI refreshed", { value, tradeDate, via: source === "fetched" ? "page" : "gemini" });
    return { ok: true, message: `BDI ${value.toLocaleString()} for ${tradeDate}.` };
  } catch (error) {
    const message = errorText(error);
    await updateFreightDesk((desk) => {
      desk.bdi = { ...desk.bdi, lastAttemptAt: attemptAt, lastError: message };
    });
    await logFreightDebug("error", "BDI refresh failed", { error: message });
    return { ok: false, message };
  }
}

const DAY = 86_400_000;
let refreshing: Promise<unknown> | null = null;

/** The daily refresh WordPress ran on cron: runs when a calculator page is opened and the last attempt is over a day old. */
export function refreshStaleMarketData() {
  refreshing ??= (async () => {
    const { bunker, bdi } = await getFreightDesk();
    const stale = (at: string | null) => !at || Date.now() - Date.parse(at) > DAY;
    await Promise.allSettled([stale(bunker.lastAttemptAt) ? refreshBunkerPrices() : null, stale(bdi.lastAttemptAt) ? refreshBdi() : null]);
  })()
    .catch(() => undefined)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}
