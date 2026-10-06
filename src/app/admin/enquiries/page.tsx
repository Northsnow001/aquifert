import Link from "next/link";
import { Inbox, Mail, ShoppingCart } from "lucide-react";
import { Card, EmptyState, PageHeader, Pill } from "@/components/admin/ui";
import { listInbox } from "@/lib/inbox";

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  product: "Product",
  quantity: "Quantity (Mt)",
  origin: "Origin",
  destination: "Destination",
  incoterm: "Incoterm",
  notes: "Notes",
  name: "Name",
  email: "Email",
  company: "Company",
  message: "Message",
  channel: "Channel",
  packaging: "Packaging",
  shipping: "Shipping period",
  target: "Target price",
  payment: "Payment",
  frequency: "Frequency",
  volume: "Over 1,000 t a year",
  call: "Interested in a call",
  account: "Signed in as",
};

export default async function EnquiriesAdminPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const params = await searchParams;
  const all = await listInbox();
  const type = params.type === "order" ? "order_enquiries" : params.type === "contact" ? "contact_messages" : null;
  const items = type ? all.filter((item) => item.table === type) : all;
  const tabs = [
    { key: undefined, label: "All", count: all.length },
    { key: "order", label: "Order Desk", count: all.filter((item) => item.table === "order_enquiries").length },
    { key: "contact", label: "Contact", count: all.filter((item) => item.table === "contact_messages").length },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Enquiries" description="Order Desk requests and Contact messages sent from the hub, newest first." />
      <Card>
        <div className="flex gap-1 border-b border-border px-4 pt-3">
          {tabs.map((tab) => {
            const active = (params.type ?? undefined) === tab.key;
            return (
              <Link
                key={tab.label}
                href={tab.key ? `/admin/enquiries?type=${tab.key}` : "/admin/enquiries"}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 text-[13px] font-semibold no-underline ${
                  active ? "border-blue text-blue" : "border-transparent text-mid hover:text-ink"
                }`}
              >
                {tab.label}
                <span className={`rounded-full px-1.5 font-mono text-[10.5px] ${active ? "bg-blue-light text-blue" : "bg-s2 text-dim"}`}>{tab.count}</span>
              </Link>
            );
          })}
        </div>
        {items.length === 0 ? (
          <EmptyState title="Nothing received yet" body="Order Desk requests and Contact messages from members land here as soon as they are sent." />
        ) : (
          <ul>
            {items.map((item) => {
              const order = item.table === "order_enquiries";
              const Icon = order ? ShoppingCart : Mail;
              const headline = order
                ? `${item.payload.product ?? "Product"} · ${item.payload.quantity ?? "?"} Mt → ${item.payload.destination ?? ""}`
                : `${item.payload.name ?? "Member"}${item.payload.company ? ` · ${item.payload.company}` : ""}`;
              return (
                <li key={item.id} className="border-b border-border px-5 py-4 last:border-b-0">
                  <div className="flex items-start gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${order ? "bg-blue-light text-blue" : "bg-[#eaf5f0] text-[#2f6f57]"}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13.5px] font-semibold text-ink">{headline}</p>
                        <Pill tone={order ? "blue" : "teal"}>{order ? "Order Desk" : "Contact"}</Pill>
                        <span className="ml-auto font-mono text-[11px] text-dim">{item.at.slice(0, 16).replace("T", " ")} UTC</span>
                      </div>
                      <dl className="mt-2 grid gap-x-6 gap-y-1 text-[12.5px] sm:grid-cols-2">
                        {Object.entries(item.payload)
                          .filter(([, value]) => value)
                          .map(([key, value]) => (
                            <div key={key} className={`grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2 ${key === "message" || key === "notes" ? "sm:col-span-2" : ""}`}>
                              <dt className="text-dim">{LABELS[key] ?? key}</dt>
                              <dd className="whitespace-pre-wrap text-ink">
                                {key === "email" ? (
                                  <a href={`mailto:${value}`} className="text-blue">
                                    {value}
                                  </a>
                                ) : (
                                  value
                                )}
                              </dd>
                            </div>
                          ))}
                      </dl>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <p className="mt-4 flex items-center gap-1.5 text-[12px] text-dim">
        <Inbox className="h-3.5 w-3.5" />
        Keeps the latest 200 enquiries.
      </p>
    </div>
  );
}
