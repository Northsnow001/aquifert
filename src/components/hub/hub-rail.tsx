import Link from "next/link";
import { myRegistrations } from "@/lib/aq-modules/members";
import { upcomingCalls } from "@/lib/aq-modules/store";
import type { AqModules } from "@/lib/aq-modules/types";
import { listRecords } from "@/lib/data/records";
import { INBOX } from "@/lib/data/tables";
import type { SessionUser } from "@/lib/session-shared";

const CARDS: { eyebrow: string; title: string; body: string; href: string; cta: string; accent?: boolean }[] = [
  { eyebrow: "Free · Weekly", title: "Nitrogen Report", body: "Urea, UAN and AN prices and the week's drivers, every Thursday.", href: "/hub/nitrogen-report", cta: "Read this week's" },
  { eyebrow: "Free · Daily", title: "Library: Telex & AQ View", body: "Market flashes and desk analysis: tenders, plant news, freight.", href: "/hub/library", cta: "Open library" },
  { eyebrow: "Free · Anytime", title: "Aquibot", body: "Ask any fertiliser market question and get an answer from our data.", href: "/hub/aquibot", cta: "Ask a question" },
  { eyebrow: "Free · Weekly", title: "Weekly Market Call", body: "A live briefing from the desk on what moved and what's next.", href: "/hub/community-call", cta: "Register for the call" },
  { eyebrow: "We trade, too", title: "Order Fertiliser", body: "Send the desk the product, quantity and months you need.", href: "/hub/order-desk?tab=desk", cta: "Request a price", accent: true },
];

export function HubFreeStrip() {
  return (
    <section className="aq-card min-w-0 px-4 py-5 sm:px-7 sm:py-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 sm:mb-5">
        <h2 className="text-[20px] font-bold tracking-[-0.02em] text-ink sm:text-[24px]">Everything in AQ ONE is free</h2>
        <p className="text-[14px] text-mid sm:text-[14.5px]">General market information from the Aquifert desk, every week.</p>
      </div>
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-5">
        {CARDS.map((card) => (
          <article
            key={card.title}
            className={`flex w-[min(78vw,280px)] shrink-0 snap-start flex-col gap-2 rounded-xl border p-4 sm:p-5 md:w-auto md:min-h-[190px] ${
              card.accent ? "border-2 border-amber-400 bg-amber-50" : "border-border bg-white"
            }`}
          >
            <p className={`text-[11px] font-bold uppercase tracking-[0.1em] ${card.accent ? "text-amber-800" : "text-teal-700"}`}>{card.eyebrow}</p>
            <h3 className="text-[18px] font-bold text-ink">{card.title}</h3>
            {card.body ? <p className="text-[14px] leading-relaxed text-mid">{card.body}</p> : null}
            <Link
              href={card.href}
              className={`mt-auto inline-flex w-fit text-[15px] font-bold no-underline ${
                card.accent ? "rounded-lg bg-amber-600 px-4 py-2.5 text-white hover:bg-amber-700" : card.cta === "Register for the call" ? "rounded-lg border border-blue px-3.5 py-2 text-blue" : "text-blue hover:underline"
              }`}
            >
              {card.cta}
              {card.accent || card.cta === "Register for the call" ? "" : " →"}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

export async function HubRail({ user, modules, className = "" }: { user: SessionUser; modules: AqModules; className?: string }) {
  const [registrations, requests] = await Promise.all([myRegistrations(user), listRecords(INBOX, { email: user.email, limit: 8 })]);
  const orders = requests.filter((item) => item.table === "order_enquiries").slice(0, 3);
  const { next } = upcomingCalls(modules);
  const registered = Boolean(next && registrations.some((row) => row.callId === next.id && row.status === "registered"));

  return (
    <aside className={`flex w-full min-w-0 flex-col gap-5 lg:w-[300px] lg:shrink-0 ${className}`}>
      <section className="aq-card p-5">
        <h2 className="text-[18px] font-bold text-ink">My orders</h2>
        <p className="mt-1 text-[14.5px] leading-relaxed text-mid">Track quotes and shipments here once you trade with us.</p>
        {orders.length ? (
          <ul className="mt-4 flex flex-col gap-2">
            {orders.map((item) => (
              <li key={item.id}>
                <Link href="/hub/trade" className="block rounded-xl border border-border px-3 py-2.5 no-underline hover:border-blue/30">
                  <p className="text-[14.5px] font-semibold text-ink">
                    {item.payload.quantity ? `${item.payload.quantity} t ` : ""}
                    {item.payload.product || "Enquiry"}
                  </p>
                  <p className="text-[13px] text-mid">{item.payload.destination || "With the desk"}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-[10px] border border-dashed border-border px-4 py-4 text-center text-[15px]">
            <p className="text-mid">No orders yet</p>
            <Link href="/hub/order-desk?tab=desk" className="font-bold text-blue no-underline hover:underline">
              Request a price →
            </Link>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-[#0C1C2E] p-6 text-white">
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-teal-300">Next Market Call</p>
        <h2 className="mt-2 text-[20px] font-bold">Weekly Market Call</h2>
        <p className="mt-1 text-[14.5px] text-slate-200">
          {next ? `${when(next.startsAt)} UTC · ${next.durationMinutes} min · Free` : "A free live briefing with the desk"}
        </p>
        <Link href="/hub/community-call" className="mt-4 flex h-11 items-center justify-center rounded-lg bg-blue text-[16px] font-bold text-white no-underline hover:bg-blue-dim">
          {registered ? "You're registered" : "Register"}
        </Link>
      </section>

      <section className="aq-card p-5">
        <h2 className="text-[18px] font-bold text-ink">Want more depth?</h2>
        <Link href="/hub/plans/aq-analytics" className="mt-4 block text-[17px] font-semibold text-blue no-underline hover:underline">
          AQ Analytics →
        </Link>
        <p className="text-[14px] text-mid">Full price history and forecasts</p>
        <div className="my-3 h-px bg-border" />
        <Link href="/hub/plans/aq-zero" className="block text-[17px] font-semibold text-blue no-underline hover:underline">
          AQ Zero →
        </Link>
        <p className="text-[14px] text-mid">Buy at supplier cost with a fixed operations fee.</p>
      </section>
    </aside>
  );
}
