import { DocumentsBoard } from "@/components/hub/trades/documents-board";
import { TradeSectionNav } from "@/components/hub/trades/trade-section-nav";

export const dynamic = "force-dynamic";

export default function TradeDocumentsPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <TradeSectionNav current="documents" />
      <DocumentsBoard />
    </div>
  );
}
