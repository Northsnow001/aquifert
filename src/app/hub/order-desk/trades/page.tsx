import { OrderSectionNav } from "@/components/hub/order-section-nav";
import { TradesHome } from "@/components/hub/trades/trades-home";
import { requireAqPreview } from "@/lib/aq-preview";

export const dynamic = "force-dynamic";

export default async function TradesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAqPreview("/hub/order-desk");
  const { tab } = await searchParams;
  const view = tab === "completed" || tab === "all" ? tab : "active";
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <OrderSectionNav current="trades" />
      <TradesHome tab={view} />
    </div>
  );
}
