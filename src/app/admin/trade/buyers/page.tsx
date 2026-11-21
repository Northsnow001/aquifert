import { PageHeader } from "@/components/admin/ui";
import { BuyersBoard } from "@/components/admin/trade/buyers-board";
import { listTradeBuyers } from "@/lib/trade/store";

export const dynamic = "force-dynamic";

export default async function TradeBuyersPage() {
  const rows = await listTradeBuyers().catch(() => []);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        crumbs={[{ href: "/admin/trade", label: "Trade book" }]}
        title="Buyers"
        description="Click a buyer to read the WhatsApp thread. Invite by email — they send START plus that email so we can link the number."
      />
      <BuyersBoard initial={rows} />
    </div>
  );
}
