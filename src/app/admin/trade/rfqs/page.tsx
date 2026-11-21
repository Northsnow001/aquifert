import { PageHeader } from "@/components/admin/ui";
import { RfqBoard } from "@/components/admin/trade/rfq-board";
import { listTradeRfqs } from "@/lib/trade/store";

export const dynamic = "force-dynamic";

export default async function Page() {
  const rows = await listTradeRfqs().catch(() => []);
  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        crumbs={[{ href: "/admin/trade", label: "Trade book" }]}
        title="Buyer requests"
        description="Each confirmed WhatsApp enquiry is a trade. Open a row to send it to every WeChat supplier, then track quotes and conversations in one place."
      />
      <RfqBoard initial={rows} />
    </div>
  );
}
