import { TradeTablePage } from "@/components/admin/trade/trade-table-page";

export const dynamic = "force-dynamic";

export default async function Page() {
  return <TradeTablePage slug="pricing" />;
}
