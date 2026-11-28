import { notFound, redirect } from "next/navigation";
import { TradeDetail } from "@/components/hub/trades/trade-detail";
import { TradeSectionNav } from "@/components/hub/trades/trade-section-nav";
import { memberTrade } from "@/lib/buyer-trades/live";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TradeDetailPage({ params }: { params: Promise<{ ref: string }> }) {
  const user = await getSession();
  if (!user) redirect("/login?redirect_to=/hub/trade");
  const { ref } = await params;
  const trade = await memberTrade(user, ref);
  if (!trade) notFound();
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <TradeSectionNav current="trades" />
      <TradeDetail trade={trade} />
    </div>
  );
}
