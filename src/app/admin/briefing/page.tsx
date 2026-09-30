import Link from "next/link";
import { PenLine } from "lucide-react";
import { DeleteEntry } from "@/components/admin/aq-content/shared";
import { Card, EmptyState, PageHeader, StatusBadge, btnGhost, btnPrimary } from "@/components/admin/ui";
import { getAqModules } from "@/lib/aq-modules/store";
import { formatDay } from "@/lib/content-types";

export const dynamic = "force-dynamic";

export default async function BriefingAdminPage() {
  const issues = [...(await getAqModules()).briefings].sort((a, b) => b.date.localeCompare(a.date));
  const published = issues.filter((issue) => issue.status === "published").length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="The Briefing"
        description="The desk's weekly written briefing. Published issues appear on the hub newest first, with the full back catalogue."
        actions={
          <Link href="/admin/briefing/new" className={btnPrimary}>
            <PenLine className="h-4 w-4" />
            New issue
          </Link>
        }
      />

      <Card>
        <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
          <p className="text-[12.5px] text-mid">
            {published} published · {issues.length - published} {issues.length - published === 1 ? "draft" : "drafts"}
          </p>
          <Link href="/hub/analytics/briefing" className="text-[12.5px] font-semibold text-blue no-underline">
            Open on the hub
          </Link>
        </div>
        {issues.length === 0 ? (
          <EmptyState
            title="No issues yet"
            body="Write the first issue and publish it when it is ready for members."
            action={
              <Link href="/admin/briefing/new" className={btnPrimary}>
                New issue
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] table-fixed text-left">
              <thead>
                <tr className="border-b border-border font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim">
                  <th className="px-5 py-2.5 font-medium">Issue</th>
                  <th className="w-36 py-2.5 pr-4 font-medium">Status</th>
                  <th className="w-24 py-2.5 pr-4" />
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue.id} className="group border-b border-border align-top last:border-b-0 hover:bg-s2/40">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/briefing/${issue.id}`} className="block no-underline">
                        <span className="line-clamp-1 text-[13.5px] font-semibold leading-snug text-ink group-hover:text-blue">{issue.title}</span>
                        <span className="mt-0.5 line-clamp-1 text-[12.5px] text-mid">{issue.summary || "No summary."}</span>
                      </Link>
                    </td>
                    <td className="py-3.5 pr-4">
                      <StatusBadge status={issue.status} />
                      <p className="mt-1 font-mono text-[11px] text-dim">{formatDay(issue.date)}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex justify-end gap-0.5 opacity-70 transition group-hover:opacity-100">
                        <Link href={`/admin/briefing/${issue.id}`} className={btnGhost} title="Edit">
                          <PenLine className="h-3.5 w-3.5" />
                        </Link>
                        <DeleteEntry kind="briefing" id={issue.id} name={issue.title} compact />
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
