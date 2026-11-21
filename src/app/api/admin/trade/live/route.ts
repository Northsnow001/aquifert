import { NextResponse, type NextRequest } from "next/server";
import { isAdminUser } from "@/lib/admin-access";
import { getSession } from "@/lib/session";
import { listTradeBuyers, listTradeFreightQuotes, listTradeQuotes, listTradeRfqs, listTradeSuppliers, tradeCounts } from "@/lib/trade/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user || !isAdminUser(user)) return NextResponse.json({ ok: false }, { status: 401 });
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
