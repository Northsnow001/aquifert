import { PageHeader } from "@/components/admin/ui";
import { RfqsBoard } from "@/components/admin/trade/book-tables";
import { listTradeRfqs } from "@/lib/trade/store";

export const dynamic = "force-dynamic";

export default async function TradeRfqsPage() {
  const rows = await listTradeRfqs().catch(() => []);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader crumbs={[{ href: "/admin/trade", label: "Trade book" }]} title="Buyer requests" description="Every RFQ. Quantity is stored in MT and shown as 3000 MT on the desk." />
      <RfqsBoard initial={rows} />
    </div>
  );
}
