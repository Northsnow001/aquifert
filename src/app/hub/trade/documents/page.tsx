import { redirect } from "next/navigation";
import { DocumentsBoard } from "@/components/hub/trades/documents-board";
import { TradeSectionNav } from "@/components/hub/trades/trade-section-nav";
import { memberTrades } from "@/lib/buyer-trades/live";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TradeDocumentsPage() {
  const user = await getSession();
  if (!user) redirect("/login?redirect_to=/hub/trade/documents");
  const trades = await memberTrades(user);
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <TradeSectionNav current="documents" />
      <DocumentsBoard trades={trades} />
    </div>
  );
}
