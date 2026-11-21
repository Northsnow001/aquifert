import { PageHeader } from "@/components/admin/ui";
import { QuotesBoard } from "@/components/admin/trade/book-tables";
import { listTradeQuotes } from "@/lib/trade/store";

export const dynamic = "force-dynamic";

export default async function TradeQuotesPage() {
  const rows = await listTradeQuotes().catch(() => []);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader crumbs={[{ href: "/admin/trade", label: "Trade book" }]} title="Mill quotes" description="RFQ replies and weekly rates. Ready means price, product, quantity and load port are present." />
      <QuotesBoard initial={rows} />
    </div>
  );
}
