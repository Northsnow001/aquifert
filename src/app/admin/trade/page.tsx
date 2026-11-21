import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { tradeCounts } from "@/lib/trade/store";

export const dynamic = "force-dynamic";

export default async function TradeBookPage() {
  const counts = await tradeCounts().catch(() => null);
  const cards = [
    { href: "/admin/trade/suppliers", title: "Suppliers", body: "WeChat invite, OpenID, last RFQ. Click a row to read the conversation.", stat: counts ? `${counts.suppliers} suppliers · ${counts.toInvite} to invite` : "—" },
    { href: "/admin/trade/agents", title: "WeChat agents", body: "Matt (known suppliers) and the desk that registers people who are not on the list. Edit prompts here.", stat: "2 agents" },
    { href: "/admin/trade/buyers", title: "Buyers", body: "WhatsApp invite (START + email), then the buyer desk. Click a row for the thread.", stat: counts ? `${counts.buyers} buyers` : "—" },
    { href: "/admin/trade/rfqs", title: "Buyer requests", body: "RFQ spine (old Buyer Requests sheet).", stat: counts ? `${counts.openRfqs} open / ${counts.rfqs}` : "—" },
    { href: "/admin/trade/quotes", title: "Supplier quotes", body: "RFQ replies and weekly rates.", stat: counts ? `${counts.readyQuotes} ready / ${counts.quotes}` : "—" },
    { href: "/admin/trade/freight", title: "Freight quotes", body: "Forwarder weekly and RFQ rates.", stat: counts ? `${counts.freightQuotes} quotes` : "—" },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Trade book"
        description="Live supplier, buyer, RFQ and quote records in Supabase. WeChat inbound is handled here: Matt for known suppliers, the supplier desk for unknown OpenIDs."
      />
      {!counts ? (
        <p className="rounded-xl border border-[#f2d9a0] bg-[#fffaf0] px-4 py-3 text-[13.5px] text-[#7a5200]">
          Trade tables are not reachable. Run supabase/migrations/010_trade_book.sql through 014_trade_buyer_onboarding.sql in the SQL editor.
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="aq-card p-5 no-underline transition hover:border-blue/40">
            <p className="text-[15px] font-semibold text-ink">{card.title}</p>
            <p className="mt-1 text-[13px] text-mid">{card.body}</p>
            <p className="mt-3 text-[12.5px] font-semibold text-blue">{card.stat}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
