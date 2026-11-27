import Link from "next/link";
import { notFound } from "next/navigation";
import { btnPrimary, Card, CardHeader, PageHeader, Pill } from "@/components/admin/ui";
import { listDeskDeals } from "@/lib/desk-hitl/store";
import { DEAL_STATUS_LABEL } from "@/lib/desk-hitl/types";
import { RFQ_ASK_LABEL } from "@/lib/trade/types";
import { getTradeRfqDesk } from "@/lib/trade/store";
import { rfqStatusLabel } from "@/lib/desk-inquiries/model";
import { displayRfqCode } from "@/lib/trade/rfq-code";

export const dynamic = "force-dynamic";

export default async function AiInquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [desk, deals] = await Promise.all([getTradeRfqDesk(id).catch(() => null), listDeskDeals().catch(() => [])]);
  if (!desk) notFound();
  const deal = deals.find((row) => row.requestId.toLowerCase() === desk.code.toLowerCase()) ?? null;
  const fields: [string, string][] = [
    ["Buyer", desk.buyerContact],
    ["Company", desk.buyerCompany],
    ["Email", desk.buyerEmail],
    ["WhatsApp", desk.buyerPhone],
    ["Product", desk.productLabel],
    ["Specification", desk.specification],
    ["Quantity", desk.quantityMt ? `${desk.quantityMt} MT` : ""],
    ["Packaging", desk.packing],
    ["Incoterm", desk.incoterm],
    ["Destination port", desk.destinationPort],
    ["Destination country", desk.destinationCountry],
    ["Delivery window", desk.shipmentWindow],
    ["Buyer message", desk.rawMessage],
  ];
  const quoted = [...desk.asks].sort((a, b) => (a.unitPrice ?? Number.POSITIVE_INFINITY) - (b.unitPrice ?? Number.POSITIVE_INFINITY));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        crumbs={[{ href: "/admin/desk/inquiries", label: "Enquiries" }]}
        title={displayRfqCode(desk.code) || "AI enquiry"}
        description="Captured by the WhatsApp desk. Supplier choice, margin and the buyer indication continue on the existing shortlist."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="teal">AI Agent · WhatsApp</Pill>
            <Pill>{rfqStatusLabel(desk.status)}</Pill>
            {deal ? (
              <Link href={`/admin/desk/${deal.id}`} className={btnPrimary}>
                Continue on shortlist
              </Link>
            ) : null}
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Captured request" meta="Fields taken from the buyer conversation and saved on the trade." />
          <dl className="divide-y divide-border">
            {fields.map(([label, value]) => (
              <div key={label} className="grid gap-1 px-5 py-3 sm:grid-cols-[160px_1fr]">
                <dt className="text-[12.5px] font-medium text-dim">{label}</dt>
                <dd className={`whitespace-pre-wrap text-[13.5px] ${value ? "text-ink" : "text-amber-700"}`}>{value || "Missing"}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Supplier responses" meta={`${quoted.length} contacted`} />
            {quoted.length === 0 ? (
              <p className="px-5 py-8 text-[13.5px] text-mid">No suppliers have been asked yet. The fan-out writes quotes here, and the shortlist opens once they arrive.</p>
            ) : (
              <ul className="divide-y divide-border">
                {quoted.map((ask) => (
                  <li key={ask.id} className="px-5 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[13.5px] font-semibold text-ink">{ask.companyName}</p>
                      <span className="text-[12px] text-dim">{RFQ_ASK_LABEL[ask.status]}</span>
                    </div>
                    <p className="mt-1 text-[13px] text-mid">
                      {ask.unitPrice ? `${ask.unitPrice} USD/MT` : "No price yet"}
                      {ask.incoterm ? ` · ${ask.incoterm}` : ""}
                      {ask.loadPort ? ` · ${ask.loadPort}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader title="Workflow activity" meta="Messages the WeChat and WhatsApp workflows wrote for this request." />
            {desk.activity.length === 0 ? (
              <p className="px-5 py-6 text-[13.5px] text-mid">No workflow messages on this request yet. Fan-out and supplier replies show up here.</p>
            ) : (
              <ul className="max-h-[280px] space-y-2 overflow-y-auto px-5 py-4">
                {desk.activity.map((item) => (
                  <li key={item.id} className="rounded-2xl bg-s2 px-3 py-2 text-[13px] text-ink">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-dim">
                      {item.direction === "out" ? "Sent" : "Received"} · {item.channel}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{item.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader title="Buyer conversation" meta={deal ? DEAL_STATUS_LABEL[deal.status] : "No shortlist yet"} />
            {deal?.messages.length ? (
              <ul className="max-h-[420px] space-y-2 overflow-y-auto px-5 py-4">
                {deal.messages.map((message) => (
                  <li key={message.id} className={`rounded-2xl px-3 py-2 text-[13px] ${message.from === "buyer" ? "bg-s2 text-ink" : message.from === "desk" ? "bg-blue-light text-ink" : "text-dim"}`}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-dim">
                      {message.from} · {message.channel}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{message.text}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-[13.5px] text-mid">
                {deal
                  ? "The shortlist has no messages yet."
                  : "The shortlist, including the thread and the margin, is created when quotes are in. Nothing is sent to the buyer from this page."}
              </p>
            )}
            {deal?.marginPct != null ? <p className="border-t border-border px-5 py-3 text-[13px] text-mid">Approved margin on the shortlist: {deal.marginPct}%</p> : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
