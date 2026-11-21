import { PageHeader } from "@/components/admin/ui";
import { BuyersBoard } from "@/components/admin/trade/book-tables";
import { listTradeBuyers } from "@/lib/trade/store";

export const dynamic = "force-dynamic";

export default async function TradeBuyersPage() {
  const rows = await listTradeBuyers().catch(() => []);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader crumbs={[{ href: "/admin/trade", label: "Trade book" }]} title="Buyers" description="Buyer master data. WhatsApp number is the live identity for inbound RFQs." />
      <BuyersBoard initial={rows} />
    </div>
  );
}
