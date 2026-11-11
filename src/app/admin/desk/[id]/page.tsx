import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/ui";
import { DeskDealBoard } from "@/components/admin/desk/deal-board";
import { getDeskDeal } from "@/lib/desk-hitl/store";

export const dynamic = "force-dynamic";

export default async function DeskDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await getDeskDeal(id);
  if (!deal) notFound();
  return (
    <div className={`mx-auto pb-24 md:pb-8 ${deal.pi ? "max-w-6xl" : "max-w-lg md:max-w-3xl"}`}>
      <PageHeader
        title={deal.product}
        description={`${deal.buyerName || deal.buyerCompany || "Buyer"}${deal.quantityMt ? ` · ${deal.quantityMt} MT` : ""}${deal.destination ? ` → ${deal.destination}` : ""}`}
        crumbs={[{ href: "/admin/desk", label: "Desk shortlists" }]}
      />
      <DeskDealBoard deal={deal} />
    </div>
  );
}
