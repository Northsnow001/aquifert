import { OrderSectionNav } from "@/components/hub/order-section-nav";
import { TradesHome } from "@/components/hub/trades/trades-home";

export const dynamic = "force-dynamic";

export default async function TradesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const view = tab === "completed" || tab === "all" ? tab : "active";
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <OrderSectionNav current="trades" />
      <TradesHome tab={view} />
    </div>
  );
}
