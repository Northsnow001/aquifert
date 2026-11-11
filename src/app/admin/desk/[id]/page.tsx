import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/ui";
import { DealRecord } from "@/components/admin/desk/deal-record";
import { getDeskDeal } from "@/lib/desk-hitl/store";

export const dynamic = "force-dynamic";

export default async function DeskDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await getDeskDeal(id);
  if (!deal) notFound();
  return (
    <div className="mx-auto max-w-6xl pb-24 md:pb-8">
      <PageHeader
        title={deal.product}
        description={`${deal.buyerName || deal.buyerCompany || "Buyer"}${deal.quantityMt ? ` · ${deal.quantityMt} MT` : ""}${deal.destination ? ` → ${deal.destination}` : ""}`}
        crumbs={[{ href: "/admin/desk", label: "Desk shortlists" }]}
      />
      <DealRecord deal={deal} />
    </div>
  );
}
