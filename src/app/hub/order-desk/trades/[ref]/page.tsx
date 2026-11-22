import { notFound } from "next/navigation";
import { OrderSectionNav } from "@/components/hub/order-section-nav";
import { TradeDetail } from "@/components/hub/trades/trade-detail";
import { tradeByRef } from "@/lib/buyer-trades/book";

export const dynamic = "force-dynamic";

export default async function TradePage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const trade = tradeByRef(decodeURIComponent(ref));
  if (!trade) notFound();
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <OrderSectionNav current="trades" />
      <TradeDetail trade={trade} />
    </div>
  );
}
