import { NextResponse } from "next/server";
import { sentBuyerDocument } from "@/lib/buyer-trades/live";
import { getDeskDeal } from "@/lib/desk-hitl/store";
import { buyerDocumentFromDeal, firmOfferDraftFromDeal, salesContractDraftFromDeal } from "@/lib/firm-order/from-deal";
import { buildFirmOrderPdf, firmOrderFilename } from "@/lib/firm-order/pdf";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

const mail = (value: string | null | undefined) => value?.trim().toLowerCase() ?? "";

export async function GET(request: Request, { params }: { params: Promise<{ ref: string; kind: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Sign in to open this document." }, { status: 401 });
  const { ref, kind } = await params;
  const deal = await getDeskDeal(decodeURIComponent(ref));
  if (!deal || mail(deal.buyerEmail) !== mail(user.email)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!sentBuyerDocument(deal, kind)) return NextResponse.json({ error: "That document has not been sent." }, { status: 404 });

  const order =
    kind === "proforma" ? (deal.pi?.order ?? buyerDocumentFromDeal(deal, "proforma")) : kind === "firm_offer" ? firmOfferDraftFromDeal(deal) : salesContractDraftFromDeal(deal);
  if (!order) return NextResponse.json({ error: "That document is not ready yet." }, { status: 404 });

  const bytes = await buildFirmOrderPdf(order);
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${firmOrderFilename(order)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
