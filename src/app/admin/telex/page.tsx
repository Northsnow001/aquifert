import Link from "next/link";
import { ChevronLeft, ChevronRight, Copy, PenLine, Search, Trash2 } from "lucide-react";
import { bulkTelex, deleteTelex, duplicateTelex } from "@/app/admin/actions";
import { BulkApply, BulkBar, ConfirmSubmit, FilterSelect, SelectAll } from "@/components/admin/form-controls";
import { Card, EmptyState, Flash, PageHeader, Pill, StatusBadge, btnGhost, btnPrimary, btnSecondary, field } from "@/components/admin/ui";
import { TELEX_ACCESS, excerpt, formatStamp, telexHeadline, type PublishStatus } from "@/lib/content-types";
import { getHubContent, sortTelex } from "@/lib/hub-content";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type Search = { status?: string; q?: string; tag?: string; access?: string; page?: string; done?: string; count?: string };

const DONE_LABEL: Record<string, string> = {
  delete: "deleted.",
  published: "published.",
  draft: "moved to drafts.",
  private: "made private.",
};

export default async function TelexAdminPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const all = sortTelex(getHubContent().telex);
  const status = (["published", "draft", "private"].includes(params.status ?? "") ? params.status : "all") as PublishStatus | "all";
  const q = (params.q ?? "").trim().toLowerCase();
  const tags = Array.from(new Set(all.flatMap((item) => item.tags))).sort((a, b) => a.localeCompare(b));

  const counts = {
    all: all.length,
    published: all.filter((item) => item.status === "published").length,
    draft: all.filter((item) => item.status === "draft").length,
    private: all.filter((item) => item.status === "private").length,
  };

  const filtered = all.filter((item) => {
    if (status !== "all" && item.status !== status) return false;
    if (params.tag && !item.tags.includes(params.tag)) return false;
    if (params.access && item.access !== params.access) return false;
    if (q) {
      const haystack = [item.headline, ...item.paragraphs, ...item.tags, item.author].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(params.page) || 1));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const query = (patch: Partial<Search>) => {
    const next = new URLSearchParams();
    const merged = { status: status === "all" ? undefined : status, q: params.q, tag: params.tag, access: params.access, page: String(page), ...patch };
    Object.entries(merged).forEach(([key, value]) => {
      if (value && !(key === "page" && value === "1")) next.set(key, value);
    });
    const str = next.toString();
    return str ? `/admin/telex?${str}` : "/admin/telex";
  };

  const tabs: { key: PublishStatus | "all"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "published", label: "Published" },
    { key: "draft", label: "Drafts" },
    { key: "private", label: "Private" },
  ];

  const doneCount = Number(params.count ?? 1);
  const doneMessage = params.done
    ? params.done === "deleted"
      ? "Message deleted."
      : `${doneCount} ${doneCount === 1 ? "message" : "messages"} ${DONE_LABEL[params.done] ?? "updated."}`
    : undefined;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Telex"
        description="The intel feed on the hub home page. Published messages appear in the order of their publish time, filtered by each member's plan."
        actions={
          <Link href="/admin/telex/new" className={btnPrimary}>
            <PenLine className="h-4 w-4" />
            New message
          </Link>
        }
      />
      <Flash saved={doneMessage} message={doneMessage} />

      <Card>
        <div className="border-b border-border px-4 pt-3">
          <div className="-mb-px flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const active = status === tab.key;
              return (
                <Link
                  key={tab.key}
                  href={query({ status: tab.key === "all" ? undefined : tab.key, page: "1" })}
                  className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-[13px] font-semibold no-underline transition ${
                    active ? "border-blue text-blue" : "border-transparent text-mid hover:text-ink"
                  }`}
                >
                  {tab.label}
                  <span className={`rounded-full px-1.5 font-mono text-[10.5px] ${active ? "bg-blue-light text-blue" : "bg-s2 text-dim"}`}>{counts[tab.key]}</span>
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <form key={`${status}|${params.q ?? ""}|${params.tag ?? ""}|${params.access ?? ""}`} action="/admin/telex" className="flex flex-wrap items-center gap-2">
            {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
            <label className="relative">
              <span className="sr-only">Search Telex</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dim" />
              <input name="q" defaultValue={params.q} placeholder="Search messages" className={`${field} h-9 w-64 pl-8`} />
            </label>
            <FilterSelect name="tag" defaultValue={params.tag ?? ""} className={`${field} h-9 w-36`} aria-label="Filter by tag">
              <option value="">All tags</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect name="access" defaultValue={params.access ?? ""} className={`${field} h-9 w-36`} aria-label="Filter by access">
              <option value="">All access</option>
              {TELEX_ACCESS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </FilterSelect>
            {params.q || params.tag || params.access ? (
              <Link href={query({ q: undefined, tag: undefined, access: undefined, page: "1" })} className="text-[12.5px] font-semibold text-blue no-underline">
                Clear
              </Link>
            ) : null}
          </form>
          <span className="font-mono text-[11.5px] text-dim">
            {filtered.length} {filtered.length === 1 ? "message" : "messages"}
          </span>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title={all.length ? "No messages match these filters" : "No Telex messages yet"}
            body={all.length ? "Clear the search or pick another tab." : "Write the first message and it will appear on the hub straight away."}
            action={
              all.length ? (
                <Link href="/admin/telex" className={btnSecondary}>
                  Clear filters
                </Link>
              ) : (
                <Link href="/admin/telex/new" className={btnPrimary}>
                  New message
                </Link>
              )
            }
          />
        ) : (
          <>
          <form action={bulkTelex}>
            <input type="hidden" name="back" value={query({})} />
            <div className="flex items-center gap-3 border-b border-border bg-s2/40 px-4 py-2">
              <BulkBar>
                <select name="bulk" defaultValue="published" className={`${field} h-8 w-40 text-[12.5px]`} aria-label="Bulk action">
                  <option value="published">Publish</option>
                  <option value="draft">Move to drafts</option>
                  <option value="private">Make private</option>
                  <option value="delete">Delete</option>
                </select>
                <BulkApply className={`${btnSecondary} h-8`} />
              </BulkBar>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] table-fixed text-left">
                <thead>
                  <tr className="border-b border-border font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim">
                    <th className="w-12 px-4 py-2.5">
                      <SelectAll />
                    </th>
                    <th className="py-2.5 pr-6 font-medium">Summary</th>
                    <th className="w-28 py-2.5 pr-4 font-medium">Access</th>
                    <th className="w-44 py-2.5 pr-4 font-medium">Tags</th>
                    <th className="w-44 py-2.5 pr-4 font-medium">Status</th>
                    <th className="w-28 py-2.5 pr-4" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <tr key={item.id} className="group border-b border-border align-top last:border-b-0 hover:bg-s2/40">
                      <td className="px-4 py-3.5">
                        <input type="checkbox" name="ids" value={item.id} aria-label="Select message" className="h-4 w-4 accent-[#2e6da4]" />
                      </td>
                      <td className="py-3.5 pr-6">
                        <Link href={`/admin/telex/${item.id}`} className="block no-underline">
                          <span className="line-clamp-2 text-[13px] font-semibold uppercase leading-snug tracking-wide text-blue group-hover:text-blue-dim">
                            {telexHeadline(item)}
                          </span>
                          <span className="mt-1 line-clamp-1 text-[12.5px] text-mid">{excerpt(item.paragraphs, 28)}</span>
                        </Link>
                      </td>
                      <td className="py-3.5 pr-4">
                        <Pill tone={item.access === "public" ? "teal" : "amber"}>{TELEX_ACCESS.find((a) => a.value === item.access)?.label}</Pill>
                      </td>
                      <td className="py-3.5 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {item.tags.length ? (
                            item.tags.map((tag) => (
                              <Link key={tag} href={query({ tag, page: "1" })} className="no-underline">
                                <Pill tone="blue">{tag}</Pill>
                              </Link>
                            ))
                          ) : (
                            <span className="text-[12px] text-dim">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <StatusBadge status={item.status} />
                        <p className="mt-1 font-mono text-[11px] text-dim">{formatStamp(item.publishedAt)}</p>
                        <p className="mt-0.5 truncate text-[11.5px] text-mid">{item.author}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex justify-end gap-0.5 opacity-70 transition group-hover:opacity-100">
                          <Link href={`/admin/telex/${item.id}`} className={btnGhost} title="Edit">
                            <PenLine className="h-3.5 w-3.5" />
                          </Link>
                          <button type="submit" form={`dup-${item.id}`} className={btnGhost} title="Duplicate as draft">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <ConfirmSubmit
                            form={`del-${item.id}`}
                            message="Delete this Telex message? Members will no longer see it."
                            className={`${btnGhost} hover:bg-red-50 hover:text-danger`}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </ConfirmSubmit>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </form>
          {rows.map((item) => (
            <div key={item.id} hidden>
              <form id={`dup-${item.id}`} action={duplicateTelex}>
                <input type="hidden" name="id" value={item.id} />
              </form>
              <form id={`del-${item.id}`} action={deleteTelex}>
                <input type="hidden" name="id" value={item.id} />
              </form>
            </div>
          ))}
          </>
        )}

        {pages > 1 ? (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[12.5px] text-mid">
            <span>
              Page {page} of {pages}
            </span>
            <div className="flex gap-2">
              <Link aria-disabled={page <= 1} href={query({ page: String(page - 1) })} className={`${btnSecondary} h-8 ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Link>
              <Link aria-disabled={page >= pages} href={query({ page: String(page + 1) })} className={`${btnSecondary} h-8 ${page >= pages ? "pointer-events-none opacity-40" : ""}`}>
                Next <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
