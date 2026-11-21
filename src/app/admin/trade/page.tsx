import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { BOOK_SPECS } from "@/lib/trade/book";
import { listAllBookCounts } from "@/lib/trade/book-store";
import { tradeCounts } from "@/lib/trade/store";

export const dynamic = "force-dynamic";

export default async function TradeBookPage() {
  const [counts, bookCounts] = await Promise.all([
    tradeCounts().catch(() => null),
    listAllBookCounts().catch(() => ({}) as Record<string, number>),
  ]);
  const people = [
    { href: "/admin/trade/suppliers", title: "Suppliers", body: "WeChat invite, OpenID, last RFQ. Click a row to read the conversation.", stat: counts ? `${counts.suppliers} suppliers · ${counts.toInvite} to invite` : "—" },
    { href: "/admin/trade/buyers", title: "Buyers", body: "WhatsApp invite, then the buyer desk. Click a row for the thread.", stat: counts ? `${counts.buyers} buyers` : "—" },
    { href: "/admin/trade/rfqs", title: "Buyer requests", body: "Send a confirmed enquiry to every WeChat supplier. Track quotes and threads on the trade.", stat: counts ? `${counts.openRfqs} open` : "—" },
    { href: "/admin/trade/agents", title: "Desk agents", body: "Matt, unknown-supplier desk, and buyer WhatsApp agents.", stat: "Named prompts" },
  ];
  const tables = BOOK_SPECS.map((spec) => ({
    href: `/admin/trade/${spec.slug}`,
    title: spec.title,
    body: spec.description,
    stat: `${bookCounts[spec.slug] ?? 0} rows · ${spec.sheet}`,
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Trade book"
        description="Each workbook sheet is a menu item. Click a table to add, edit or delete rows. To load the Excel file: run 015_trade_workbook_rest.sql in Supabase, then npm run trade:import -- --apply with .env.local set."
      />
      {!counts ? (
        <p className="mb-4 rounded-xl border border-[#f2d9a0] bg-[#fffaf0] px-4 py-3 text-[13.5px] text-[#7a5200]">
          Trade tables are not reachable. Run supabase/migrations/010_trade_book.sql through 015_trade_workbook_rest.sql in the SQL editor.
        </p>
      ) : null}
      <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-dim">People</h2>
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {people.map((card) => (
          <Link key={card.href} href={card.href} className="aq-card p-5 no-underline transition hover:border-blue/40">
            <p className="text-[15px] font-semibold text-ink">{card.title}</p>
            <p className="mt-1 text-[13px] text-mid">{card.body}</p>
            <p className="mt-3 text-[12.5px] font-semibold text-blue">{card.stat}</p>
          </Link>
        ))}
      </div>
      <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-dim">Workbook tables</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {tables.map((card) => (
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
