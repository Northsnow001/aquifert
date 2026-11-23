import { OrderSectionNav } from "@/components/hub/order-section-nav";
import { DocumentsBoard } from "@/components/hub/trades/documents-board";
import { requireAqPreview } from "@/lib/aq-preview";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  await requireAqPreview("/hub/order-desk");
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <OrderSectionNav current="documents" />
      <DocumentsBoard />
    </div>
  );
}
