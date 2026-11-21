import { PageHeader } from "@/components/admin/ui";
import { FreightBoard } from "@/components/admin/trade/book-tables";
import { listTradeFreightQuotes } from "@/lib/trade/store";

export const dynamic = "force-dynamic";

export default async function TradeFreightPage() {
  const rows = await listTradeFreightQuotes().catch(() => []);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader crumbs={[{ href: "/admin/trade", label: "Trade book" }]} title="Freight quotes" description="Forwarder responses, weekly and per RFQ." />
      <FreightBoard initial={rows} />
    </div>
  );
}
