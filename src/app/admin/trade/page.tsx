import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { tradeCounts } from "@/lib/trade/store";

export const dynamic = "force-dynamic";

export default async function TradeBookPage() {
  const counts = await tradeCounts().catch(() => null);
  const cards = [
    { href: "/admin/trade/suppliers", title: "Suppliers", body: "WeChat invite, OpenID, last RFQ.", stat: counts ? `${counts.suppliers} mills · ${counts.toInvite} to invite` : "—" },
    { href: "/admin/trade/buyers", title: "Buyers", body: "WhatsApp identity and KYC.", stat: counts ? `${counts.buyers} buyers` : "—" },
    { href: "/admin/trade/rfqs", title: "Buyer requests", body: "RFQ spine (old Buyer Requests sheet).", stat: counts ? `${counts.openRfqs} open / ${counts.rfqs}` : "—" },
    { href: "/admin/trade/quotes", title: "Mill quotes", body: "RFQ replies and weekly rates.", stat: counts ? `${counts.readyQuotes} ready / ${counts.quotes}` : "—" },
    { href: "/admin/trade/freight", title: "Freight quotes", body: "Forwarder weekly and RFQ rates.", stat: counts ? `${counts.freightQuotes} quotes` : "—" },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Trade book"
        description="Live mill, buyer, RFQ and quote records in Supabase. Invite suppliers on WeChat from the suppliers list. n8n still sends mill chat until those workflows move across."
      />
      {!counts ? (
        <p className="rounded-xl border border-[#f2d9a0] bg-[#fffaf0] px-4 py-3 text-[13.5px] text-[#7a5200]">
          Trade tables are not reachable. Run supabase/migrations/010_trade_book.sql and 011_trade_onboarding_realtime.sql in the SQL editor.
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
