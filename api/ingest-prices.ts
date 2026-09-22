/**
 * Price ingestion jobs, one per source, each at its own cadence.
 *
 * Rules (licensing & integrity):
 * - Never scrape a PRA / paywalled / terms-restricted source.
 * - Ingest only from published open datasets, official APIs, CSV/XLSX
 *   downloads the publisher offers for reuse, or our own desk entries.
 * - A source with redistributionAllowed = false is never ingested for
 *   public rendering (its rows are excluded at read time as well).
 * - On fetch failure, never overwrite a good value with null, keep the
 *   last good value; staleness is surfaced via dataAsOf vs cadence.
 */
import "dotenv/config";
import { getDb } from "../api/queries/connection";
import * as s from "../db/schema";
import { eq } from "drizzle-orm";

/** Cadence in days, used for scheduling and staleness detection. */
export const CADENCE_DAYS: Record<string, number> = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 31,
  ANNUAL: 366,
};

export function isStale(dataAsOf: Date | null, cadence: string): boolean {
  if (!dataAsOf) return true;
  const days = CADENCE_DAYS[cadence] ?? 7;
  return Date.now() - dataAsOf.getTime() > days * 2 * 864e5;
}

/**
 * Fetch one source. Each fetcher must return parsed rows or throw.
 * On throw, existing rows are left untouched (last-good preserved).
 */
async function ingestSource(code: string): Promise<void> {
  const db = getDb();
  const [src] = await db
    .select()
    .from(s.priceSources)
    .where(eq(s.priceSources.code, code))
    .limit(1);
  if (!src || !src.enabled) return;

  // Open-data fetchers would live here (World Bank Pink Sheet XLSX,
  // IMF PCP JSON, USDA AMS CSV, FAOSTAT bulk download, desk CSV upload).
  // Each fetcher returns rows; a failed fetch throws and we keep the
  // last good rows, we only stamp lastFetchedAt on a successful parse.
  console.log(`[ingest] ${code}: no live fetcher configured; keeping last good values.`);
}

export async function runIngestion(): Promise<void> {
  const db = getDb();
  const sources = await db.select().from(s.priceSources);
  for (const src of sources) {
    const due =
      !src.lastFetchedAt ||
      Date.now() - src.lastFetchedAt.getTime() >
        (CADENCE_DAYS[src.refreshCadence] ?? 7) * 864e5;
    if (due && src.enabled) await ingestSource(src.code);
  }
}

if (process.argv[1] && process.argv[1].endsWith("ingest-prices.ts")) {
  runIngestion()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
