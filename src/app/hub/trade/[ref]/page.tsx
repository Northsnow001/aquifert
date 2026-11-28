import { notFound } from "next/navigation";
import { TradeDetail } from "@/components/hub/trades/trade-detail";
import { TradeSectionNav } from "@/components/hub/trades/trade-section-nav";
import { tradeByRef } from "@/lib/buyer-trades/book";

export const dynamic = "force-dynamic";

export default async function TradeDetailPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const trade = tradeByRef(decodeURIComponent(ref));
  if (!trade) notFound();
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <TradeSectionNav current="trades" />
      <TradeDetail trade={trade} />
    </div>
  );
}
