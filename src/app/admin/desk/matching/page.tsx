import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { listDeskDeals } from "@/lib/desk-hitl/store";
import { getDeskSettings } from "@/lib/desk-settings/store";
import { readTradeInbox } from "@/lib/trade/inbound-mail";
import { assignMailAction } from "@/app/admin/desk/matching/actions";

export const dynamic = "force-dynamic";

function when(iso: string) {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return iso;
  return new Date(time).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function MatchingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const [inbox, deals, settings] = await Promise.all([readTradeInbox(), listDeskDeals(), getDeskSettings()]);
  const waiting = inbox.mails.filter((mail) => mail.status === "needs_matching");
  const openDeals = deals.filter((deal) => deal.status !== "closed");

  return (
    <div className="mx-auto max-w-5xl pb-16">
      <PageHeader
        crumbs={[{ href: "/admin/desk", label: "Desk shortlists" }]}
        title="Needs matching"
        description="Supplier email is matched to a trade by the inquiry ID in the subject or body. Anything still unmatched waits here. Market notes from the analytics inbox are listed underneath."
      />
      {error ? <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-ink">{error}</p> : null}
      <section className="space-y-3">
        {waiting.length === 0 ? <p className="rounded-2xl border border-border bg-white px-4 py-6 text-[13.5px] text-mid">No unmatched supplier email.</p> : null}
        {waiting.map((mail) => (
          <article key={mail.id} className="rounded-2xl border border-border bg-white px-4 py-3">
            <p className="text-[12px] text-dim">{when(mail.at)} · {mail.from}</p>
            <h2 className="mt-1 text-[14px] font-semibold text-ink">{mail.subject || "(no subject)"}</h2>
            <p className="mt-2 whitespace-pre-wrap text-[13px] text-mid">{mail.body.slice(0, 600)}</p>
            <form action={assignMailAction} className="mt-3 flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={mail.id} />
              <select name="dealId" className="h-9 rounded-lg border border-border bg-white px-2 text-[13px]" required>
                <option value="">Assign to a trade</option>
                {openDeals.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.requestId} · {deal.product} · {deal.buyerCompany || deal.buyerName || "Buyer"}
                  </option>
                ))}
              </select>
              <button type="submit" className="h-9 rounded-full bg-blue px-4 text-[13px] font-semibold text-white">
                Assign
              </button>
            </form>
          </article>
        ))}
      </section>
      <section className="mt-8">
        <h2 className="text-[15px] font-semibold text-ink">Matched</h2>
        <ul className="mt-2 divide-y divide-border rounded-2xl border border-border bg-white">
          {inbox.mails.filter((mail) => mail.status === "matched").slice(0, 20).map((mail) => (
            <li key={mail.id} className="px-4 py-2 text-[13px]">
              <span className="text-dim">{when(mail.at)}</span> {mail.subject || mail.from}{" "}
              {mail.dealId ? (
                <Link href={`/admin/desk/${mail.dealId}`} className="font-semibold text-blue no-underline">
                  {mail.requestId}
                </Link>
              ) : null}
            </li>
          ))}
          {inbox.mails.every((mail) => mail.status !== "matched") ? <li className="px-4 py-3 text-[13px] text-mid">None yet.</li> : null}
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="text-[15px] font-semibold text-ink">AQ Analytics data</h2>
        <p className="mt-1 text-[13px] text-mid">
          Phil sends market data to {settings.marketInbox || "the address you set under Settings → Trade templates"}. Posted notes land here until the provider APIs are connected.
        </p>
        <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-white">
          {inbox.market.length === 0 ? <li className="px-4 py-3 text-[13px] text-mid">No market notes yet.</li> : null}
          {inbox.market.slice(0, 20).map((note) => (
            <li key={note.id} className="px-4 py-3 text-[13px]">
              <p className="text-dim">{when(note.at)} · {note.from}</p>
              <p className="font-semibold text-ink">{note.subject || "Market note"}</p>
              <p className="mt-1 whitespace-pre-wrap text-mid">{note.body.slice(0, 400)}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
