import Link from "next/link";
import { Card, EmptyState, PageHeader, Pill } from "@/components/admin/ui";
import { CopyText } from "@/components/admin/copy-text";
import { filterInquiries, inquiryView, listInquiries, rowsInView, type InquiryRow } from "@/lib/desk-inquiries/model";

export const dynamic = "force-dynamic";

const PAGE = 25;

function when(at: string) {
  const time = Date.parse(at);
  if (!Number.isFinite(time)) return "—";
  const mins = Math.max(0, Math.round((Date.now() - time) / 60000));
  const rel = mins < 60 ? `${mins}m ago` : mins < 60 * 24 ? `${Math.round(mins / 60)}h ago` : `${Math.round(mins / 1440)}d ago`;
  const local = new Date(time).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  return { local, rel };
}

function cell(value: string) {
  return value || "—";
}

function sourceLabel(row: InquiryRow) {
  if (row.source === "ai_agent") return `AI · ${row.channel}`;
  if (row.source === "contact") return "Contact";
  return "Trade Desk App";
}

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; tab?: string; q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const view = inquiryView(params.view);
  const all = await listInquiries();
  const inView = rowsInView(all, view);
  const rows = filterInquiries(all, params);
  const page = Math.max(1, Number(params.page) || 1);
  const slice = rows.slice((page - 1) * PAGE, page * PAGE);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const statuses = [...new Set(inView.map((row) => row.status))];
  const inquiriesCount = rowsInView(all, "inquiries").length;
  const enquiriesCount = rowsInView(all, "enquiries").length;
  const tabs =
    view === "enquiries"
      ? [
          { key: "", label: "All", count: inView.length },
          { key: "contact", label: "Contact form", count: inView.filter((row) => row.source === "contact").length },
        ]
      : [
          { key: "", label: "All", count: inView.length },
          { key: "app", label: "Trade Desk (App)", count: inView.filter((row) => row.source === "trade_desk_app").length },
          { key: "ai", label: "AI Agent", count: inView.filter((row) => row.source === "ai_agent").length },
        ];
  const query = (extra: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { view: view === "enquiries" ? "enquiries" : undefined, tab: params.tab, q: params.q, status: params.status, ...extra };
    for (const [key, value] of Object.entries(merged)) if (value) next.set(key, value);
    const text = next.toString();
    return text ? `?${text}` : "";
  };

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        crumbs={[{ href: "/admin/desk", label: "Desk shortlists" }]}
        title={view === "enquiries" ? "General inquiries" : "Trade inquiries"}
        description={
          view === "enquiries"
            ? "Contact form and other general questions. Trade requests stay on Trade inquiries."
            : "Trade desk requests and AI agent inquiries. Open a row for the full request. Supplier choice and margin approval stay on the shortlist."
        }
        actions={
          <a href={`/admin/desk/inquiries/export${query({})}`} className="inline-flex h-9 items-center rounded-full border border-border bg-white px-4 text-[13px] font-semibold text-ink no-underline">
            Export CSV
          </a>
        }
      />
      <div className="mb-4 inline-flex rounded-full bg-s2 p-1" role="tablist" aria-label="Inbox">
        {(
          [
            { key: "inquiries", label: "Trade inquiries", count: inquiriesCount },
            { key: "enquiries", label: "General inquiries", count: enquiriesCount },
          ] as const
        ).map((item) => {
          const on = view === item.key;
          return (
            <Link
              key={item.key}
              href={`/admin/desk/inquiries${item.key === "enquiries" ? "?view=enquiries" : ""}`}
              role="tab"
              aria-selected={on}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-semibold no-underline ${on ? "bg-white text-ink shadow-sm" : "text-mid hover:text-ink"}`}
            >
              {item.label}
              <span className={`rounded-full px-1.5 font-mono text-[10.5px] ${on ? "bg-blue-light text-blue" : "bg-white/80 text-dim"}`}>{item.count}</span>
            </Link>
          );
        })}
      </div>
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-4 pt-3">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const active = (params.tab ?? "") === tab.key;
              return (
                <Link
                  key={tab.label}
                  href={`/admin/desk/inquiries${query({ tab: tab.key || undefined, page: undefined })}`}
                  className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 text-[13px] font-semibold no-underline ${active ? "border-blue text-blue" : "border-transparent text-mid hover:text-ink"}`}
                >
                  {tab.label}
                  <span className={`rounded-full px-1.5 font-mono text-[10.5px] ${active ? "bg-blue-light text-blue" : "bg-s2 text-dim"}`}>{tab.count}</span>
                </Link>
              );
            })}
          </div>
          <form className="flex flex-wrap gap-2 pb-3" action="/admin/desk/inquiries">
            {view === "enquiries" ? <input type="hidden" name="view" value="enquiries" /> : null}
            {params.tab ? <input type="hidden" name="tab" value={params.tab} /> : null}
            <input name="q" defaultValue={params.q ?? ""} placeholder="Buyer, company, product, ID" className="h-9 w-56 rounded-full border border-border px-3 text-[13px]" />
            <select name="status" defaultValue={params.status ?? ""} className="h-9 rounded-full border border-border bg-white px-3 text-[13px]">
              <option value="">Any status</option>
              {statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            <button type="submit" className="h-9 rounded-full bg-ink px-3 text-[13px] font-semibold text-white">
              Filter
            </button>
          </form>
        </div>
        {slice.length === 0 ? (
          <EmptyState
            title={view === "enquiries" ? "No general inquiries" : "No trade inquiries"}
            body={view === "enquiries" ? "Contact form messages land here as soon as they are sent." : "Trade desk requests and AI agent inquiries appear here as soon as they are received."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-left text-[12.5px]">
              <thead className="bg-s2 text-[11px] uppercase tracking-wide text-dim">
                <tr>
                  {["Inquiry", "Received", "Source", "Buyer", "Company", "Contact", "Product", "Qty", "Packaging", "Incoterm", "Destination", "Window", "Target", "Quotes", "AI", "Status", ""].map((heading) => (
                    <th key={heading} className="whitespace-nowrap px-3 py-2 font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slice.map((row) => (
                  <InquiryLine key={`${row.source}-${row.id}`} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 ? (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[12.5px] text-mid">
            <span>
              Page {page} of {pages}
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link href={`/admin/desk/inquiries${query({ page: String(page - 1) })}`} className="font-semibold text-blue no-underline">
                  Previous
                </Link>
              ) : null}
              {page < pages ? (
                <Link href={`/admin/desk/inquiries${query({ page: String(page + 1) })}`} className="font-semibold text-blue no-underline">
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function InquiryLine({ row }: { row: InquiryRow }) {
  const stamp = when(row.at);
  return (
    <tr className="border-t border-border hover:bg-s2/60">
      <td className="px-3 py-2.5">
        <Link href={row.href} className="font-semibold text-blue no-underline">
          {row.ref}
        </Link>
      </td>
      <td className="whitespace-nowrap px-3 py-2.5" title={typeof stamp === "object" ? stamp.rel : ""}>
        {typeof stamp === "object" ? stamp.local : stamp}
      </td>
      <td className="px-3 py-2.5">
        <Pill tone={row.source === "ai_agent" ? "teal" : row.source === "contact" ? "amber" : "blue"}>{sourceLabel(row)}</Pill>
      </td>
      <td className="px-3 py-2.5">{cell(row.buyerName)}</td>
      <td className="px-3 py-2.5">{cell(row.company)}</td>
      <td className="px-3 py-2.5">
        <CopyText value={row.contact} />
      </td>
      <td className="px-3 py-2.5">
        {cell(row.product)}
        {row.grade ? <span className="block text-[11px] text-dim">{row.grade}</span> : null}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5">{cell(row.quantity)}</td>
      <td className="px-3 py-2.5">{cell(row.packaging)}</td>
      <td className="px-3 py-2.5">{cell(row.incoterm)}</td>
      <td className="px-3 py-2.5">{cell(row.destination)}</td>
      <td className="px-3 py-2.5">{cell(row.window)}</td>
      <td className="whitespace-nowrap px-3 py-2.5">{cell(row.targetPrice)}</td>
      <td className="px-3 py-2.5">{row.quotes}</td>
      <td className="px-3 py-2.5">{row.completeness || "—"}</td>
      <td className="whitespace-nowrap px-3 py-2.5">{row.status}</td>
      <td className="px-3 py-2.5">
        <Link href={row.href} className="font-semibold text-blue no-underline">
          View
        </Link>
      </td>
    </tr>
  );
}
