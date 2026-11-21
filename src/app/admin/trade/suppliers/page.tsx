import { PageHeader } from "@/components/admin/ui";
import { SuppliersBoard } from "@/components/admin/trade/suppliers-board";
import { listTradeSuppliers } from "@/lib/trade/store";

export const dynamic = "force-dynamic";

export default async function TradeSuppliersPage() {
  const rows = await listTradeSuppliers().catch(() => []);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        crumbs={[{ href: "/admin/trade", label: "Trade book" }]}
        title="Suppliers"
        description="Invite mills to the WeChat Official Account. Status moves to Invite sent as soon as the email goes out, then On WeChat when they scan (Workflow 2 still stamps the OpenID until that slice is in the app)."
      />
      <SuppliersBoard initial={rows} />
    </div>
  );
}
