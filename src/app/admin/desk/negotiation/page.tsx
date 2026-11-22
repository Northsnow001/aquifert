import Link from "next/link";
import { Card, EmptyState, PageHeader, Pill } from "@/components/admin/ui";
import { listDeskDeals } from "@/lib/desk-hitl/store";

export const dynamic = "force-dynamic";

export default async function NegotiationPage() {
  const deals = await listDeskDeals();
  const live = deals.filter((deal) => deal.mattThread && deal.status === "negotiating");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Negotiation"
        description="The buyer asked to change the indication. This thread is yours. Reply here, hand it to the firm offer agent when you agree, or end it."
        crumbs={[{ href: "/admin/trade", label: "Trade book" }]}
      />
      <Card>
        {live.length === 0 ? (
          <EmptyState
            title="No live negotiations"
            body="When a buyer replies to an indication with a change — not a yes, and not a flat no — the thread shows up here and the agent stays quiet."
          />
        ) : (
          <ul>
            {live.map((deal) => {
              const last = [...deal.messages].reverse().find((msg) => msg.from === "buyer");
              return (
                <li key={deal.id} className="border-b border-border last:border-b-0">
                  <Link href={`/admin/desk/${deal.id}`} className="block px-4 py-3.5 no-underline hover:bg-s2/50">
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-semibold text-ink">{deal.product}</span>
                        <span className="mt-0.5 block text-[12.5px] text-mid">
                          {deal.buyerName || deal.buyerCompany || deal.buyerPhone || "Buyer"}
                          {deal.quantityMt ? ` · ${deal.quantityMt} MT` : ""}
                          {deal.buyerPrice != null ? ` · ${deal.currency} ${deal.buyerPrice} / MT` : ""}
                        </span>
                      </span>
                      <Pill tone="blue">With you</Pill>
                    </span>
                    {last ? <span className="mt-2 block truncate text-[12.5px] text-dim">{last.text}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
