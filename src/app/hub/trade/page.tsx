import { redirect } from "next/navigation";
import { TradeSectionNav } from "@/components/hub/trades/trade-section-nav";
import { TradesHome } from "@/components/hub/trades/trades-home";
import { memberTrades } from "@/lib/buyer-trades/live";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TradePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await getSession();
  if (!user) redirect("/login?redirect_to=/hub/trade");
  const { tab } = await searchParams;
  const view = tab === "completed" || tab === "all" ? tab : "active";
  const trades = await memberTrades(user);
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <TradeSectionNav current="trades" />
      <TradesHome tab={view} trades={trades} />
    </div>
  );
}
