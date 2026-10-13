import { createHash, timingSafeEqual } from "crypto";
import { isAdminUser } from "@/lib/admin-access";
import { indexPending } from "@/lib/aquibot-engine/indexer";
import { engineStatus } from "@/lib/aquibot-engine/store";
import { getSession } from "@/lib/session";

export const maxDuration = 300;

/** Leaves room for the slowest file (a long PDF read by Gemini) to finish before the 300s limit. */
const BUDGET_MS = 180_000;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 40;

const digest = (value: string) => createHash("sha256").update(value).digest();

function hasSecret(request: Request) {
  const secret = process.env.AQUIBOT_INDEX_SECRET || process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7).trim() : (request.headers.get("x-index-secret") ?? "").trim();
  return given.length > 0 && timingSafeEqual(digest(given), digest(secret));
}

/**
 * Background indexing for the knowledge base. A scheduler (n8n, or Vercel Cron) calls it every few minutes
 * with `Authorization: Bearer <AQUIBOT_INDEX_SECRET>`; each call indexes up to `?limit=` pending sources.
 */
async function handle(request: Request) {
  if (!hasSecret(request)) {
    const user = await getSession();
    if (!user || !isAdminUser(user)) return Response.json({ ok: false, message: "Not allowed." }, { status: 401 });
  }
  const status = await engineStatus();
  if (!status.ready) return Response.json({ ok: false, message: status.problem ?? "The Aquibot engine is not ready." }, { status: 503 });

  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(new URL(request.url).searchParams.get("limit")) || DEFAULT_LIMIT));
  try {
    const sweep = await indexPending({ limit, budgetMs: BUDGET_MS, concurrency: 2 });
    return Response.json({
      ok: true,
      indexed: sweep.indexed,
      failed: sweep.failed,
      removed: sweep.removed,
      remaining: sweep.remaining,
      ms: sweep.ms,
      failures: sweep.results.filter((result) => !result.ok).map((result) => ({ key: result.key, message: result.message })),
    });
  } catch (error) {
    return Response.json({ ok: false, message: error instanceof Error ? error.message : "Indexing failed." }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
