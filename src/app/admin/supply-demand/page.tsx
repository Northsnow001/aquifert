import Link from "next/link";
import { SupplyDemandEditor } from "@/components/admin/aq-content/supply-demand-editor";
import { PageHeader } from "@/components/admin/ui";
import { getAqModules } from "@/lib/aq-modules/store";

export const dynamic = "force-dynamic";

export default async function SupplyDemandAdminPage() {
  const { supplyDemand } = await getAqModules();
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Supply & Demand"
        description="Season balance sheets for the major nutrients, shown in the Supply & Demand module on the hub. Save stamps the table with today's date for members."
        actions={
          <Link href="/hub/analytics/supply-demand" className="text-[12.5px] font-semibold text-blue no-underline">
            Open on the hub
          </Link>
        }
      />
      <SupplyDemandEditor data={supplyDemand} />
    </div>
  );
}
