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
        description="Click a supplier to read every WeChat message. Add the company first. OpenID is written when they follow."
      />
      <SuppliersBoard initial={rows} />
    </div>
  );
}
