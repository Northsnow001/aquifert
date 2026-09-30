import Link from "next/link";
import { ExternalLink, PenLine } from "lucide-react";
import { DeleteEntry } from "@/components/admin/aq-content/shared";
import { Card, EmptyState, PageHeader, Pill, StatusBadge, btnGhost, btnPrimary } from "@/components/admin/ui";
import { getAqModules } from "@/lib/aq-modules/store";
import { formatStamp } from "@/lib/content-types";

export const dynamic = "force-dynamic";

export default async function AnalysisAdminPage() {
  const notes = [...(await getAqModules()).analysis].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const published = notes.filter((note) => note.status === "published").length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="AQ Market Analysis"
        description="Longer desk notes for members. Published notes appear under Analysis on the hub, newest first, and can link back to the Telex that prompted them."
        actions={
          <Link href="/admin/analysis/new" className={btnPrimary}>
            <PenLine className="h-4 w-4" />
            New note
          </Link>
        }
      />

      <Card>
        <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
          <p className="text-[12.5px] text-mid">
            {published} published · {notes.length - published} {notes.length - published === 1 ? "draft" : "drafts"}
          </p>
          <Link href="/hub/analysis" className="text-[12.5px] font-semibold text-blue no-underline">
            Open on the hub
          </Link>
        </div>
        {notes.length === 0 ? (
          <EmptyState
            title="No analysis notes yet"
            body="Write the first note and publish it when it is ready for members."
            action={
              <Link href="/admin/analysis/new" className={btnPrimary}>
                New note
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] table-fixed text-left">
              <thead>
                <tr className="border-b border-border font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim">
                  <th className="px-5 py-2.5 font-medium">Title</th>
                  <th className="w-52 py-2.5 pr-4 font-medium">Products</th>
                  <th className="w-40 py-2.5 pr-4 font-medium">Status</th>
                  <th className="w-28 py-2.5 pr-4" />
                </tr>
              </thead>
              <tbody>
                {notes.map((note) => (
                  <tr key={note.id} className="group border-b border-border align-top last:border-b-0 hover:bg-s2/40">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/analysis/${note.id}`} className="block no-underline">
                        <span className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-ink group-hover:text-blue">{note.title}</span>
                        <span className="mt-0.5 block truncate font-mono text-[11px] text-dim">/hub/analysis/{note.slug}</span>
                      </Link>
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {note.products.length ? note.products.map((product) => <Pill key={product} tone="blue">{product}</Pill>) : <span className="text-[12px] text-dim">—</span>}
                      </div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <StatusBadge status={note.status} />
                      <p className="mt-1 font-mono text-[11px] text-dim">{formatStamp(note.publishedAt)}</p>
                      <p className="mt-0.5 truncate text-[11.5px] text-mid">{note.author}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex justify-end gap-0.5 opacity-70 transition group-hover:opacity-100">
                        {note.status === "published" ? (
                          <Link href={`/hub/analysis/${note.slug}`} className={btnGhost} title="View on hub">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        ) : null}
                        <Link href={`/admin/analysis/${note.id}`} className={btnGhost} title="Edit">
                          <PenLine className="h-3.5 w-3.5" />
                        </Link>
                        <DeleteEntry kind="analysis" id={note.id} name={note.title} compact />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
