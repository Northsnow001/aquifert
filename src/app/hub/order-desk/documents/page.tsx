import { OrderSectionNav } from "@/components/hub/order-section-nav";
import { DocumentsBoard } from "@/components/hub/trades/documents-board";

export const dynamic = "force-dynamic";

export default function DocumentsPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <OrderSectionNav current="documents" />
      <DocumentsBoard />
    </div>
  );
}
