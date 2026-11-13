import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin-access";
import { getDeskDeal } from "@/lib/desk-hitl/store";
import { firmOfferDraftFromDeal } from "@/lib/firm-order/from-deal";
import { buildFirmOrderPdf, firmOrderFilename } from "@/lib/firm-order/pdf";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

/** Live PDF from the stored firm-offer draft (after Matt’s edits). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const deal = await getDeskDeal(id);
  if (!deal) return NextResponse.json({ error: "Deal not found." }, { status: 404 });
  const order = firmOfferDraftFromDeal(deal);
  if (!order) return NextResponse.json({ error: "No firm offer on this deal yet." }, { status: 404 });
  const bytes = await buildFirmOrderPdf(order);
  const filename = firmOrderFilename(order);
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
