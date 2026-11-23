import { createHash, timingSafeEqual } from "crypto";
import { isAdminUser } from "@/lib/admin-access";
import { deskUsesAgent } from "@/lib/desk-engine";
import { closeWaitingRfqs } from "@/lib/trade/desk-closer";
import { getSession } from "@/lib/session";

export const maxDuration = 60;

const digest = (value: string) => createHash("sha256").update(value).digest();

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  return given.length > 0 && given.length === secret.length && timingSafeEqual(digest(given), digest(secret));
}

async function handle(request: Request) {
  if (!authorized(request)) {
    const user = await getSession();
    if (!user || !isAdminUser(user)) return Response.json({ ok: false, message: "Not allowed." }, { status: 401 });
  }
  if (!deskUsesAgent("whatsapp")) return Response.json({ ok: true, skipped: "n8n" });
  const results = await closeWaitingRfqs();
  return Response.json({
    ok: true,
    checked: results.length,
    promoted: results.filter((row) => "promote" in row && row.promote).length,
  });
}

export const GET = handle;
export const POST = handle;
