import { PageHeader } from "@/components/admin/ui";
import { BuyersBoard } from "@/components/admin/trade/buyers-board";
import { listTradeBuyers } from "@/lib/trade/store";

export const dynamic = "force-dynamic";

export default async function TradeBuyersPage() {
  const rows = await listTradeBuyers().catch(() => []);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        crumbs={[{ href: "/admin/trade", label: "Trade book" }]}
        title="Buyers"
        description="Invite known buyers by email to the WhatsApp desk. Unknown numbers go through full onboarding; invited buyers only fill any blanks."
      />
      <BuyersBoard initial={rows} />
    </div>
  );
}
