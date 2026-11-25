import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader, Pill } from "@/components/admin/ui";
import { listInbox } from "@/lib/inbox";

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  reference: "Inquiry ID",
  name: "Name",
  email: "Email",
  company: "Company",
  account: "Hub account",
  product: "Product",
  quantity: "Quantity (MT)",
  origin: "Origin preference",
  packaging: "Packaging",
  destination: "Destination",
  incoterm: "Incoterm",
  shipping: "Delivery window",
  target: "Target price",
  payment: "Payment terms",
  volume: "Over 1,000 t a year",
  call: "Interested in a call",
  notes: "Notes",
  message: "Message",
  channel: "Channel",
};

export default async function AppInquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = (await listInbox()).find((row) => row.id === id && (row.table === "order_enquiries" || row.table === "contact_messages"));
  if (!item) notFound();
  const contact = item.table === "contact_messages";
  const entries = Object.entries(item.payload).filter(([, value]) => value?.trim());
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        crumbs={[{ href: contact ? "/admin/desk/inquiries?view=enquiries" : "/admin/desk/inquiries", label: contact ? "General inquiries" : "Trade inquiries" }]}
        title={item.payload.reference || (contact ? item.payload.name || "Contact message" : "Trade Desk inquiry")}
        description={`Received ${new Date(item.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`}
        actions={<Pill tone={contact ? "amber" : "blue"}>{contact ? "Contact" : "Trade Desk App"}</Pill>}
      />
      <Card>
        <CardHeader title="Submitted form" meta="Every field the buyer sent from Buy Fertiliser." />
        <dl className="divide-y divide-border">
          {entries.map(([key, value]) => (
            <div key={key} className="grid gap-1 px-5 py-3 sm:grid-cols-[180px_1fr]">
              <dt className="text-[12.5px] font-medium text-dim">{LABELS[key] ?? key}</dt>
              <dd className="whitespace-pre-wrap text-[13.5px] text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <p className="mt-4 text-[13px] text-mid">
        This inquiry was typed into the hub. It is not an AI conversation, so there is no supplier thread yet.{" "}
        <Link href="/admin/desk" className="font-semibold text-blue no-underline">
          Desk shortlists
        </Link>{" "}
        open when a WhatsApp enquiry has supplier quotes.
      </p>
    </div>
  );
}
