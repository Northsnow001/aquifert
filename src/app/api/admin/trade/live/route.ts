import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminUser } from "@/lib/admin-access";
import { DEMO_COOKIE, DEV_LOGIN } from "@/lib/dev-access";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { listTradeBuyers, listTradeFreightQuotes, listTradeQuotes, listTradeRfqs, listTradeSuppliers, tradeCounts } from "@/lib/trade/store";

/** Confirms an admin from the signed JWT. The trade grids poll this every few seconds, so it does not repeat the full session lookup. */
async function isTradeAdmin() {
  const jar = await cookies();
  if (DEV_LOGIN && jar.has(DEMO_COOKIE)) {
    const user = await getSession();
    return Boolean(user && isAdminUser(user));
  }
  const supabase = await createClient();
  if (!supabase) return false;
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return false;
  const meta = data.claims.app_metadata;
  const role = meta && typeof meta === "object" && "role" in meta ? meta.role : undefined;
  return isAdminUser({ email: typeof data.claims.email === "string" ? data.claims.email : "", admin: role === "admin" });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isTradeAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  const resource = req.nextUrl.searchParams.get("resource") || "counts";
  try {
    if (resource === "counts") return NextResponse.json({ ok: true, counts: await tradeCounts() });
    if (resource === "suppliers") return NextResponse.json({ ok: true, rows: await listTradeSuppliers() });
    if (resource === "buyers") return NextResponse.json({ ok: true, rows: await listTradeBuyers() });
    if (resource === "rfqs") return NextResponse.json({ ok: true, rows: await listTradeRfqs() });
    if (resource === "quotes") return NextResponse.json({ ok: true, rows: await listTradeQuotes() });
    if (resource === "freight") return NextResponse.json({ ok: true, rows: await listTradeFreightQuotes() });
    return NextResponse.json({ ok: false, error: "Unknown resource" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Read failed" }, { status: 500 });
  }
}
